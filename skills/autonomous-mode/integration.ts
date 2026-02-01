/**
 * Integration Layer for Autonomous Coding Mode
 * 
 * Hooks into main agent's tool calls and conversation flow to automatically
 * trigger autonomous workflows at the right moments.
 */

import type { TaskContext } from './decision.ts';
import { analyzeContext, type AnalysisInput } from './analyzer.ts';
import { makeDecision, type Sensitivity } from './decision.ts';
import { autoSpawnIfNeeded, shouldOverride, type AutomationConfig } from './spawner.ts';

export interface ToolCallContext {
  tool: string;
  params: Record<string, unknown>;
  userMessage: string;
  workingDirectory: string;
}

export interface IntegrationHooks {
  beforeWrite?: (context: ToolCallContext) => Promise<void>;
  beforeEdit?: (context: ToolCallContext) => Promise<void>;
  beforeExec?: (context: ToolCallContext) => Promise<void>;
  afterToolSequence?: (context: ToolCallContext[]) => Promise<void>;
  beforeCommit?: (context: ToolCallContext) => Promise<void>;
}

/**
 * Tool call interceptor - analyzes context before executing
 */
export class AutonomousInterceptor {
  private sensitivity: Sensitivity;
  private config: AutomationConfig;
  private executionLog: Array<{
    timestamp: Date;
    tool: string;
    decision: string;
    triggered: string[];
  }> = [];

  constructor(
    sensitivity: Sensitivity = 'balanced',
    config: Partial<AutomationConfig> = {}
  ) {
    this.sensitivity = sensitivity;
    this.config = {
      silentMode: true,
      presentResults: 'summary',
      enabled: true,
      ...config,
    };
  }

  /**
   * Hook: Before write/edit operations
   */
  async beforeFileOperation(context: ToolCallContext): Promise<{
    shouldProceed: boolean;
    message?: string;
  }> {
    if (!this.config.enabled) {
      return { shouldProceed: true };
    }

    // Check for user override
    if (shouldOverride(context.userMessage)) {
      return {
        shouldProceed: true,
        message: '⏭ Autonomous mode skipped (user override)',
      };
    }

    // Analyze context
    const analysisInput: AnalysisInput = {
      userMessage: context.userMessage,
      workingDirectory: context.workingDirectory,
    };

    const taskContext = analyzeContext(analysisInput);
    const decision = makeDecision(taskContext, this.sensitivity);

    // Log decision
    this.logExecution(context.tool, decision, taskContext);

    // Auto-spawn if needed
    if (decision.shouldParallelize || decision.shouldGuard) {
      const { presentation } = await autoSpawnIfNeeded(
        context.userMessage,
        taskContext,
        decision,
        this.config
      );

      return {
        shouldProceed: !decision.shouldGuard, // Guard might block
        message: presentation,
      };
    }

    return { shouldProceed: true };
  }

  /**
   * Hook: Before exec with git/commit commands
   */
  async beforeCommit(context: ToolCallContext): Promise<{
    shouldProceed: boolean;
    message?: string;
  }> {
    if (!this.config.enabled) {
      return { shouldProceed: true };
    }

    // Check if this is a git commit command
    const command = context.params.command as string;
    const isCommit = /git\s+(commit|push)/.test(command);

    if (!isCommit) {
      return { shouldProceed: true };
    }

    // Analyze changes
    const analysisInput: AnalysisInput = {
      userMessage: 'commit changes',
      workingDirectory: context.workingDirectory,
    };

    const taskContext = analyzeContext(analysisInput);
    const decision = makeDecision(taskContext, this.sensitivity);

    // Auto-trigger grill if needed
    if (decision.shouldGrill) {
      const { presentation } = await autoSpawnIfNeeded(
        'Pre-commit review',
        taskContext,
        decision,
        this.config
      );

      return {
        shouldProceed: true, // Let user see grill results before committing
        message: [
          presentation,
          '',
          '📝 Review the findings above before proceeding with commit.',
        ].join('\n'),
      };
    }

    return { shouldProceed: true };
  }

  /**
   * Hook: Before exec with delete/rm commands
   */
  async beforeDangerousExec(context: ToolCallContext): Promise<{
    shouldProceed: boolean;
    message?: string;
  }> {
    if (!this.config.enabled) {
      return { shouldProceed: true };
    }

    const command = context.params.command as string;

    // Check for dangerous patterns
    const dangerousPatterns = [
      /\brm\s+-rf/,
      /\bdelete\b/,
      /\bdrop\s+(table|database)/i,
      /\bsudo\b/,
    ];

    const isDangerous = dangerousPatterns.some(pattern => pattern.test(command));

    if (!isDangerous) {
      return { shouldProceed: true };
    }

    // Force opus-guard check
    const analysisInput: AnalysisInput = {
      userMessage: command,
      workingDirectory: context.workingDirectory,
    };

    const taskContext = analyzeContext(analysisInput);
    
    // Override risk level to high/critical for dangerous commands
    taskContext.riskLevel = /\brm\s+-rf\s+\//.test(command) ? 'critical' : 'high';

    const decision = makeDecision(taskContext, this.sensitivity);

    const { presentation, results } = await autoSpawnIfNeeded(
      command,
      taskContext,
      decision,
      this.config
    );

    // Check if opus-guard blocked it
    const guardResult = results.find(r => r.triggered.includes('opus-guard'));
    const blocked = guardResult && !guardResult.success;

    return {
      shouldProceed: !blocked,
      message: presentation,
    };
  }

  /**
   * Hook: After complex tool sequences
   */
  async afterComplexSequence(contexts: ToolCallContext[]): Promise<{
    message?: string;
  }> {
    if (!this.config.enabled || contexts.length < 3) {
      return {};
    }

    // Check if this was a complex multi-file operation
    const fileOps = contexts.filter(ctx => 
      ['write', 'edit'].includes(ctx.tool)
    );

    if (fileOps.length >= 3) {
      const analysisInput: AnalysisInput = {
        userMessage: 'complex changes completed',
        workingDirectory: contexts[0].workingDirectory,
      };

      const taskContext = analyzeContext(analysisInput);
      const decision = makeDecision(taskContext, this.sensitivity);

      if (decision.shouldGrill) {
        return {
          message: [
            '',
            '💡 Suggestion: Run /grill to review the changes before committing.',
          ].join('\n'),
        };
      }
    }

    return {};
  }

  /**
   * Log execution for transparency
   */
  private logExecution(
    tool: string,
    decision: ReturnType<typeof makeDecision>,
    context: TaskContext
  ): void {
    const triggered = [
      decision.shouldParallelize ? 'use-subagents' : null,
      decision.shouldGuard ? 'opus-guard' : null,
      decision.shouldGrill ? 'grill' : null,
    ].filter(Boolean) as string[];

    this.executionLog.push({
      timestamp: new Date(),
      tool,
      decision: decision.reasoning,
      triggered,
    });

    // Keep log size reasonable (last 50 entries)
    if (this.executionLog.length > 50) {
      this.executionLog.shift();
    }
  }

  /**
   * Get execution log for debugging
   */
  getExecutionLog(): typeof this.executionLog {
    return [...this.executionLog];
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(config: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update sensitivity at runtime
   */
  updateSensitivity(sensitivity: Sensitivity): void {
    this.sensitivity = sensitivity;
  }

  /**
   * Clear execution log
   */
  clearLog(): void {
    this.executionLog = [];
  }
}

/**
 * Helper: Create integration hooks for main agent
 */
export function createHooks(interceptor: AutonomousInterceptor): IntegrationHooks {
  return {
    beforeWrite: async (context) => {
      const result = await interceptor.beforeFileOperation(context);
      if (result.message) {
        console.log(result.message);
      }
      if (!result.shouldProceed) {
        throw new Error('Operation blocked by autonomous mode');
      }
    },

    beforeEdit: async (context) => {
      const result = await interceptor.beforeFileOperation(context);
      if (result.message) {
        console.log(result.message);
      }
      if (!result.shouldProceed) {
        throw new Error('Operation blocked by autonomous mode');
      }
    },

    beforeExec: async (context) => {
      // Check for dangerous commands first
      const dangerousResult = await interceptor.beforeDangerousExec(context);
      if (!dangerousResult.shouldProceed) {
        if (dangerousResult.message) {
          console.log(dangerousResult.message);
        }
        throw new Error('Dangerous operation blocked by opus-guard');
      }

      // Check for commit commands
      const commitResult = await interceptor.beforeCommit(context);
      if (commitResult.message) {
        console.log(commitResult.message);
      }
    },

    afterToolSequence: async (contexts) => {
      const result = await interceptor.afterComplexSequence(contexts);
      if (result.message) {
        console.log(result.message);
      }
    },
  };
}
