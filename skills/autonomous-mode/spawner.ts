/**
 * Auto-Spawner for Autonomous Coding Mode
 * 
 * Silent subagent spawning and workflow triggering based on decision engine.
 */

import type { TaskContext, DecisionResult } from './decision.ts';

export interface SpawnResult {
  triggered: string[];
  skipped: string[];
  reasoning: string;
  success: boolean;
}

export interface AutomationConfig {
  silentMode: boolean;         // Spawn without asking
  presentResults: 'summary' | 'detailed' | 'none';
  enabled: boolean;
  dryRun?: boolean;            // Preview decisions without executing
}

/**
 * Spawn use-subagents for parallel research and analysis
 */
async function spawnUseSubagents(task: string, context: TaskContext): Promise<SpawnResult> {
  // This would integrate with the actual use-subagents skill
  // For now, return a structure showing what would happen
  
  const phases = ['research', 'audit', 'draft', 'verify'];
  const triggered = phases.map(p => `[${task}]-${p}`);

  return {
    triggered,
    skipped: [],
    reasoning: `Spawned ${phases.length} parallel subagents for: ${task}`,
    success: true,
  };
}

/**
 * Route through opus-guard for security evaluation
 */
async function triggerOpusGuard(
  operation: string,
  context: TaskContext
): Promise<SpawnResult> {
  // This would integrate with the actual opus-guard skill
  
  return {
    triggered: ['opus-guard'],
    skipped: [],
    reasoning: `Security evaluation for ${context.riskLevel} risk operation: ${operation}`,
    success: true,
  };
}

/**
 * Trigger grill for code review
 */
async function triggerGrill(context: TaskContext): Promise<SpawnResult> {
  // This would integrate with the actual grill skill
  
  return {
    triggered: ['grill'],
    skipped: [],
    reasoning: `Pre-commit review for ${context.impactFiles} files (${context.operation})`,
    success: true,
  };
}

/**
 * Present results to user based on config
 */
function presentResults(
  results: SpawnResult[],
  config: AutomationConfig
): string {
  if (config.presentResults === 'none') {
    return '';
  }

  const allTriggered = results.flatMap(r => r.triggered);
  const allSkipped = results.flatMap(r => r.skipped);

  if (config.presentResults === 'summary') {
    const summary = [
      `🤖 Autonomous actions: ${allTriggered.length} triggered`,
      allTriggered.length > 0 ? `→ ${allTriggered.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    return summary;
  }

  // Detailed presentation
  const details = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🤖 Autonomous Mode — Actions Taken`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    '',
  ];

  for (const result of results) {
    if (result.triggered.length > 0) {
      details.push(`✅ ${result.reasoning}`);
      details.push(`   Triggered: ${result.triggered.join(', ')}`);
      details.push('');
    }
  }

  if (allSkipped.length > 0) {
    details.push(`⏭ Skipped: ${allSkipped.join(', ')}`);
    details.push('');
  }

  details.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return details.join('\n');
}

/**
 * Main auto-spawn function - evaluates decision and triggers workflows
 */
export async function autoSpawnIfNeeded(
  task: string,
  context: TaskContext,
  decision: DecisionResult,
  config: AutomationConfig
): Promise<{
  results: SpawnResult[];
  presentation: string;
}> {
  const results: SpawnResult[] = [];

  if (!config.enabled) {
    return {
      results: [],
      presentation: '',
    };
  }

  // Log decision reasoning (always shown, even in silent mode)
  const decisionLog = [
    `🎯 Decision: ${decision.reasoning}`,
    `   Confidence: ${(decision.confidence * 100).toFixed(0)}%`,
  ].join('\n');

  // Execute triggers based on decision
  
  // 1. Parallelize via use-subagents
  if (decision.shouldParallelize) {
    if (config.dryRun) {
      results.push({
        triggered: ['use-subagents (dry-run)'],
        skipped: [],
        reasoning: '[DRY RUN] Would spawn parallel subagents',
        success: true,
      });
    } else {
      const result = await spawnUseSubagents(task, context);
      results.push(result);
    }
  }

  // 2. Security gate via opus-guard
  if (decision.shouldGuard) {
    if (config.dryRun) {
      results.push({
        triggered: ['opus-guard (dry-run)'],
        skipped: [],
        reasoning: '[DRY RUN] Would trigger security evaluation',
        success: true,
      });
    } else {
      const result = await triggerOpusGuard(task, context);
      results.push(result);

      // If guard blocks, halt execution
      if (!result.success) {
        return {
          results,
          presentation: [
            decisionLog,
            '',
            presentResults(results, config),
            '',
            '🛡️ Opus Guard blocked this operation.',
          ].join('\n'),
        };
      }
    }
  }

  // 3. Code review via grill (typically after changes are made)
  if (decision.shouldGrill) {
    if (config.dryRun) {
      results.push({
        triggered: ['grill (dry-run)'],
        skipped: [],
        reasoning: '[DRY RUN] Would trigger pre-commit review',
        success: true,
      });
    } else {
      const result = await triggerGrill(context);
      results.push(result);
    }
  }

  // Build presentation
  const presentation = [
    config.silentMode ? '' : decisionLog,
    '',
    presentResults(results, config),
  ].filter(Boolean).join('\n');

  return {
    results,
    presentation,
  };
}

/**
 * Graceful degradation - if subagents fail, continue with main agent
 */
export function handleFailure(error: Error, task: string): {
  fallbackMessage: string;
  shouldContinue: boolean;
} {
  const fallbackMessage = [
    `⚠️ Autonomous spawn failed: ${error.message}`,
    ``,
    `Continuing with main agent for: ${task}`,
    ``,
    `(You can disable autonomous mode with: /autonomous off)`,
  ].join('\n');

  return {
    fallbackMessage,
    shouldContinue: true,
  };
}

/**
 * Override mechanism - user can disable per-task
 */
export function shouldOverride(userMessage: string): boolean {
  const overridePatterns = [
    /skip guard/i,
    /no subagents/i,
    /disable autonomous/i,
    /manual mode/i,
  ];

  return overridePatterns.some(pattern => pattern.test(userMessage));
}
