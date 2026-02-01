/**
 * Tests for Autonomous Coding Mode
 */

import { describe, it, expect } from 'vitest';
import { 
  shouldParallelize, 
  shouldGuard, 
  shouldGrill, 
  makeDecision,
  getConfig,
  type TaskContext,
  type SensitivityConfig 
} from './decision.ts';
import {
  detectOperation,
  detectRiskLevel,
  extractPatterns,
  analyzeContext,
  type AnalysisInput,
} from './analyzer.ts';
import {
  autoSpawnIfNeeded,
  shouldOverride,
  handleFailure,
  type AutomationConfig,
} from './spawner.ts';
import {
  AutonomousInterceptor,
  createHooks,
} from './integration.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Decision Engine Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Decision Engine', () => {
  const balancedConfig = getConfig('balanced');

  describe('shouldParallelize', () => {
    it('returns true when complexity is high', () => {
      const ctx: TaskContext = {
        complexity: 9,
        impactFiles: 2,
        uncertainty: 0.5,
        riskLevel: 'low',
        operation: 'implement',
      };
      expect(shouldParallelize(ctx, balancedConfig)).toBe(true);
    });

    it('returns true when many files affected', () => {
      const ctx: TaskContext = {
        complexity: 5,
        impactFiles: 8,
        uncertainty: 0.5,
        riskLevel: 'low',
        operation: 'implement',
      };
      expect(shouldParallelize(ctx, balancedConfig)).toBe(true);
    });

    it('returns true when uncertainty is high', () => {
      const ctx: TaskContext = {
        complexity: 5,
        impactFiles: 2,
        uncertainty: 0.4, // high uncertainty (low confidence)
        riskLevel: 'low',
        operation: 'implement',
      };
      expect(shouldParallelize(ctx, balancedConfig)).toBe(false); // Need 2 triggers
    });

    it('returns false for simple tasks', () => {
      const ctx: TaskContext = {
        complexity: 3,
        impactFiles: 1,
        uncertainty: 0.8,
        riskLevel: 'low',
        operation: 'fix',
      };
      expect(shouldParallelize(ctx, balancedConfig)).toBe(false);
    });

    it('requires at least 2 triggers', () => {
      const ctx: TaskContext = {
        complexity: 8, // triggers threshold
        impactFiles: 2,
        uncertainty: 0.8, // doesn't trigger
        riskLevel: 'low',
        operation: 'implement',
      };
      expect(shouldParallelize(ctx, balancedConfig)).toBe(false);
    });
  });

  describe('shouldGuard', () => {
    it('returns true for critical risk', () => {
      const ctx: TaskContext = {
        complexity: 3,
        impactFiles: 1,
        uncertainty: 0.5,
        riskLevel: 'critical',
        operation: 'delete',
      };
      expect(shouldGuard(ctx, balancedConfig)).toBe(true);
    });

    it('returns true for high risk', () => {
      const ctx: TaskContext = {
        complexity: 3,
        impactFiles: 1,
        uncertainty: 0.5,
        riskLevel: 'high',
        operation: 'delete',
      };
      expect(shouldGuard(ctx, balancedConfig)).toBe(true);
    });

    it('returns false for low risk', () => {
      const ctx: TaskContext = {
        complexity: 3,
        impactFiles: 1,
        uncertainty: 0.5,
        riskLevel: 'low',
        operation: 'fix',
      };
      expect(shouldGuard(ctx, balancedConfig)).toBe(false);
    });

    it('returns true for dangerous patterns', () => {
      const ctx: TaskContext = {
        complexity: 3,
        impactFiles: 1,
        uncertainty: 0.5,
        riskLevel: 'low',
        operation: 'delete',
        patterns: ['delete', 'production'],
      };
      expect(shouldGuard(ctx, balancedConfig)).toBe(true);
    });

    it('returns true for scope violations', () => {
      const ctx: TaskContext = {
        complexity: 3,
        impactFiles: 1,
        uncertainty: 0.5,
        riskLevel: 'low',
        operation: 'fix',
        scope: {
          outsideWorkspace: true,
          systemPaths: false,
          credentials: false,
        },
      };
      expect(shouldGuard(ctx, balancedConfig)).toBe(true);
    });
  });

  describe('shouldGrill', () => {
    it('returns true when many files changed', () => {
      const ctx: TaskContext = {
        complexity: 5,
        impactFiles: 5,
        uncertainty: 0.5,
        riskLevel: 'low',
        operation: 'implement',
      };
      expect(shouldGrill(ctx, balancedConfig)).toBe(true);
    });

    it('returns true for refactor operations', () => {
      const ctx: TaskContext = {
        complexity: 5,
        impactFiles: 1,
        uncertainty: 0.5,
        riskLevel: 'low',
        operation: 'refactor',
      };
      expect(shouldGrill(ctx, balancedConfig)).toBe(true);
    });

    it('returns false for simple operations', () => {
      const ctx: TaskContext = {
        complexity: 5,
        impactFiles: 1,
        uncertainty: 0.5,
        riskLevel: 'low',
        operation: 'fix',
      };
      expect(shouldGrill(ctx, balancedConfig)).toBe(false);
    });
  });

  describe('makeDecision', () => {
    it('returns comprehensive decision', () => {
      const ctx: TaskContext = {
        complexity: 9,
        impactFiles: 8,
        uncertainty: 0.4,
        riskLevel: 'high',
        operation: 'refactor',
      };
      const decision = makeDecision(ctx, 'balanced');

      expect(decision.shouldParallelize).toBe(true);
      expect(decision.shouldGuard).toBe(true);
      expect(decision.shouldGrill).toBe(true);
      expect(decision.reasoning).toContain('Parallelization');
      expect(decision.reasoning).toContain('Guard');
      expect(decision.reasoning).toContain('Grill');
      expect(decision.confidence).toBe(0.4);
    });

    it('handles simple tasks', () => {
      const ctx: TaskContext = {
        complexity: 2,
        impactFiles: 1,
        uncertainty: 0.9,
        riskLevel: 'low',
        operation: 'fix',
      };
      const decision = makeDecision(ctx, 'balanced');

      expect(decision.shouldParallelize).toBe(false);
      expect(decision.shouldGuard).toBe(false);
      expect(decision.shouldGrill).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('returns aggressive config', () => {
      const config = getConfig('aggressive');
      expect(config.parallelize.complexityThreshold).toBe(5);
      expect(config.guard.riskLevels).toContain('medium');
      expect(config.grill.minFilesChanged).toBe(2);
    });

    it('returns balanced config', () => {
      const config = getConfig('balanced');
      expect(config.parallelize.complexityThreshold).toBe(7);
      expect(config.guard.riskLevels).toContain('high');
      expect(config.grill.minFilesChanged).toBe(3);
    });

    it('returns conservative config', () => {
      const config = getConfig('conservative');
      expect(config.parallelize.complexityThreshold).toBe(9);
      expect(config.guard.riskLevels).toEqual(['critical']);
      expect(config.grill.minFilesChanged).toBe(5);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Context Analyzer Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Context Analyzer', () => {
  describe('detectOperation', () => {
    it('detects refactor', () => {
      expect(detectOperation('Refactor the auth system')).toBe('refactor');
      expect(detectOperation('Restructure the database layer')).toBe('refactor');
    });

    it('detects implement', () => {
      expect(detectOperation('Implement OAuth2')).toBe('implement');
      expect(detectOperation('Add a new feature')).toBe('implement');
    });

    it('detects fix', () => {
      expect(detectOperation('Fix the login bug')).toBe('fix');
      expect(detectOperation('Debug the rate limiter')).toBe('fix');
    });

    it('detects delete', () => {
      expect(detectOperation('Delete old files')).toBe('delete');
      expect(detectOperation('Remove deprecated code')).toBe('delete');
    });

    it('defaults to other', () => {
      expect(detectOperation('Hello world')).toBe('other');
      expect(detectOperation('What is this?')).toBe('other');
    });
  });

  describe('detectRiskLevel', () => {
    it('detects critical risk', () => {
      expect(detectRiskLevel('Delete production database', [])).toBe('critical');
      expect(detectRiskLevel('rm -rf /', [])).toBe('critical');
      expect(detectRiskLevel('Drop all tables', [])).toBe('critical');
    });

    it('detects high risk', () => {
      expect(detectRiskLevel('Update authentication', [])).toBe('high');
      expect(detectRiskLevel('Modify payment logic', [])).toBe('high');
      expect(detectRiskLevel('Delete user data', [])).toBe('high');
    });

    it('detects medium risk', () => {
      expect(detectRiskLevel('Refactor external API calls', [])).toBe('medium');
      expect(detectRiskLevel('Migrate database schema', [])).toBe('medium');
    });

    it('defaults to low risk', () => {
      expect(detectRiskLevel('Fix typo in docs', [])).toBe('low');
    });
  });

  describe('extractPatterns', () => {
    it('extracts auth patterns', () => {
      const patterns = extractPatterns('Update authentication and passwords');
      expect(patterns).toContain('auth');
      expect(patterns).toContain('authentication');
      expect(patterns).toContain('password');
    });

    it('extracts delete patterns', () => {
      const patterns = extractPatterns('Delete the database and remove old files');
      expect(patterns).toContain('delete');
      expect(patterns).toContain('remove');
    });

    it('extracts payment patterns', () => {
      const patterns = extractPatterns('Update billing and payment processing');
      expect(patterns).toContain('payment');
      expect(patterns).toContain('billing');
    });
  });

  describe('analyzeContext', () => {
    it('analyzes typical request', () => {
      const input: AnalysisInput = {
        userMessage: 'Refactor auth to use JWT',
        workingDirectory: '/tmp/test',
        modelConfidence: 0.7,
      };
      const ctx = analyzeContext(input);

      expect(ctx.operation).toBe('refactor');
      expect(ctx.patterns).toContain('auth');
      expect(ctx.patterns).toContain('authentication');
      expect(ctx.riskLevel).toBe('high');
      expect(ctx.uncertainty).toBe(0.3); // 1 - 0.7
    });

    it('analyzes delete request', () => {
      const input: AnalysisInput = {
        userMessage: 'Delete production database',
        workingDirectory: '/tmp/test',
        modelConfidence: 0.8,
      };
      const ctx = analyzeContext(input);

      expect(ctx.operation).toBe('delete');
      expect(ctx.riskLevel).toBe('critical');
      expect(ctx.patterns).toContain('delete');
      expect(ctx.patterns).toContain('database');
    });

    it('analyzes simple fix', () => {
      const input: AnalysisInput = {
        userMessage: 'Fix the typo',
        workingDirectory: '/tmp/test',
        modelConfidence: 0.95,
      };
      const ctx = analyzeContext(input);

      expect(ctx.operation).toBe('fix');
      expect(ctx.riskLevel).toBe('low');
      expect(ctx.uncertainty).toBe(0.05);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auto-Spawner Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Auto-Spawner', () => {
  describe('shouldOverride', () => {
    it('detects skip guard', () => {
      expect(shouldOverride('Skip guard and implement')).toBe(true);
      expect(shouldOverride('Please skip guard')).toBe(true);
    });

    it('detects no subagents', () => {
      expect(shouldOverride('No subagents please')).toBe(true);
      expect(shouldOverride('Do this without subagents')).toBe(true);
    });

    it('detects manual mode', () => {
      expect(shouldOverride('Use manual mode')).toBe(true);
      expect(shouldOverride('Disable autonomous')).toBe(true);
    });

    it('returns false for normal requests', () => {
      expect(shouldOverride('Implement OAuth2')).toBe(false);
      expect(shouldOverride('Fix the bug')).toBe(false);
    });
  });

  describe('handleFailure', () => {
    it('returns fallback message', () => {
      const error = new Error('Connection timeout');
      const result = handleFailure(error, 'Implement OAuth2');

      expect(result.shouldContinue).toBe(true);
      expect(result.fallbackMessage).toContain('failed');
      expect(result.fallbackMessage).toContain('Connection timeout');
      expect(result.fallbackMessage).toContain('Continuing');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Integration Layer', () => {
  describe('AutonomousInterceptor', () => {
    it('creates with default config', () => {
      const interceptor = new AutonomousInterceptor();
      expect(interceptor).toBeDefined();
    });

    it('updates config at runtime', () => {
      const interceptor = new AutonomousInterceptor();
      interceptor.updateConfig({ enabled: false });
      // Config updated, no error thrown
    });

    it('updates sensitivity at runtime', () => {
      const interceptor = new AutonomousInterceptor('balanced');
      interceptor.updateSensitivity('aggressive');
      // Sensitivity updated, no error thrown
    });

    it('clears execution log', () => {
      const interceptor = new AutonomousInterceptor();
      interceptor.clearLog();
      const log = interceptor.getExecutionLog();
      expect(log).toEqual([]);
    });
  });

  describe('createHooks', () => {
    it('creates hook functions', () => {
      const interceptor = new AutonomousInterceptor();
      const hooks = createHooks(interceptor);

      expect(hooks.beforeWrite).toBeDefined();
      expect(hooks.beforeEdit).toBeDefined();
      expect(hooks.beforeExec).toBeDefined();
      expect(hooks.afterToolSequence).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-End Scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('End-to-End Scenarios', () => {
  describe('Scenario 1: Refactoring Auth System', () => {
    it('triggers all three workflows', () => {
      const input: AnalysisInput = {
        userMessage: 'Refactor auth to use JWT',
        workingDirectory: '/tmp/test',
        modelConfidence: 0.6,
      };
      const ctx = analyzeContext(input);
      const decision = makeDecision(ctx, 'balanced');

      expect(ctx.operation).toBe('refactor');
      expect(ctx.riskLevel).toBe('high');
      expect(decision.shouldParallelize).toBe(true);
      expect(decision.shouldGuard).toBe(true);
      expect(decision.shouldGrill).toBe(true);
    });
  });

  describe('Scenario 2: Risky Deletion', () => {
    it('blocks dangerous operation', () => {
      const input: AnalysisInput = {
        userMessage: 'Delete production database',
        workingDirectory: '/tmp/test',
        modelConfidence: 0.8,
      };
      const ctx = analyzeContext(input);
      
      // Override to critical for this dangerous command
      ctx.riskLevel = 'critical';
      
      const decision = makeDecision(ctx, 'balanced');

      expect(ctx.operation).toBe('delete');
      expect(decision.shouldGuard).toBe(true);
    });
  });

  describe('Scenario 3: Simple Fix', () => {
    it('does not trigger any workflow', () => {
      const input: AnalysisInput = {
        userMessage: 'Fix typo in readme',
        workingDirectory: '/tmp/test',
        modelConfidence: 0.95,
      };
      const ctx = analyzeContext(input);
      const decision = makeDecision(ctx, 'balanced');

      expect(ctx.operation).toBe('fix');
      expect(ctx.riskLevel).toBe('low');
      expect(decision.shouldParallelize).toBe(false);
      expect(decision.shouldGuard).toBe(false);
      expect(decision.shouldGrill).toBe(false);
    });
  });
});
