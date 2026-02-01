/**
 * Decision Engine for Autonomous Coding Mode
 * 
 * Heuristics-based decision system for automatically triggering:
 * - Subagent parallelization (use-subagents)
 * - Security checks (opus-guard)
 * - Code review (grill)
 */

export interface TaskContext {
  complexity: number;         // 0-10 scale: lines changed, nesting depth, dependencies
  impactFiles: number;        // Number of files touched
  uncertainty: number;        // 0-1 confidence score from model (lower = more uncertain)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  operation: 'refactor' | 'implement' | 'fix' | 'delete' | 'deploy' | 'other';
  patterns?: string[];        // Detected risk patterns (e.g., 'auth', 'payment', 'delete')
  scope?: {
    outsideWorkspace?: boolean;
    systemPaths?: boolean;
    credentials?: boolean;
  };
}

export interface DecisionResult {
  shouldParallelize: boolean;
  shouldGuard: boolean;
  shouldGrill: boolean;
  reasoning: string;
  confidence: number;
}

/**
 * Sensitivity presets
 */
export type Sensitivity = 'aggressive' | 'balanced' | 'conservative';

export interface SensitivityConfig {
  parallelize: {
    complexityThreshold: number;
    impactFilesThreshold: number;
    uncertaintyThreshold: number;
  };
  guard: {
    riskLevels: Array<'low' | 'medium' | 'high' | 'critical'>;
    alwaysCheckPatterns: string[];
  };
  grill: {
    minFilesChanged: number;
    operations: string[];
  };
}

const SENSITIVITY_PRESETS: Record<Sensitivity, SensitivityConfig> = {
  aggressive: {
    parallelize: {
      complexityThreshold: 5,
      impactFilesThreshold: 3,
      uncertaintyThreshold: 0.7,
    },
    guard: {
      riskLevels: ['medium', 'high', 'critical'],
      alwaysCheckPatterns: ['delete', 'drop', 'rm', 'auth', 'payment', 'sudo', 'exec'],
    },
    grill: {
      minFilesChanged: 2,
      operations: ['refactor', 'implement', 'delete'],
    },
  },
  balanced: {
    parallelize: {
      complexityThreshold: 7,
      impactFilesThreshold: 5,
      uncertaintyThreshold: 0.6,
    },
    guard: {
      riskLevels: ['high', 'critical'],
      alwaysCheckPatterns: ['delete', 'drop', 'rm -rf', 'sudo', 'auth', 'payment'],
    },
    grill: {
      minFilesChanged: 3,
      operations: ['refactor', 'implement'],
    },
  },
  conservative: {
    parallelize: {
      complexityThreshold: 9,
      impactFilesThreshold: 8,
      uncertaintyThreshold: 0.5,
    },
    guard: {
      riskLevels: ['critical'],
      alwaysCheckPatterns: ['rm -rf /', 'drop database', 'delete from'],
    },
    grill: {
      minFilesChanged: 5,
      operations: ['refactor'],
    },
  },
};

/**
 * Determine if task should be parallelized via use-subagents
 */
export function shouldParallelize(
  ctx: TaskContext,
  config: SensitivityConfig
): boolean {
  const { complexity, impactFiles, uncertainty } = ctx;
  const { complexityThreshold, impactFilesThreshold, uncertaintyThreshold } = config.parallelize;

  // Multiple criteria increase likelihood
  const triggers = [
    complexity > complexityThreshold,
    impactFiles > impactFilesThreshold,
    uncertainty < uncertaintyThreshold,
  ];

  // Need at least 2 triggers for parallelization
  const triggerCount = triggers.filter(Boolean).length;
  return triggerCount >= 2;
}

/**
 * Determine if task should be routed through opus-guard
 */
export function shouldGuard(
  ctx: TaskContext,
  config: SensitivityConfig
): boolean {
  // Check risk level
  if (config.guard.riskLevels.includes(ctx.riskLevel)) {
    return true;
  }

  // Check for dangerous patterns
  if (ctx.patterns) {
    for (const pattern of ctx.patterns) {
      if (config.guard.alwaysCheckPatterns.some(p => pattern.includes(p))) {
        return true;
      }
    }
  }

  // Check scope violations
  if (ctx.scope) {
    if (ctx.scope.outsideWorkspace || ctx.scope.systemPaths || ctx.scope.credentials) {
      return true;
    }
  }

  return false;
}

/**
 * Determine if code should be reviewed via grill before commit
 */
export function shouldGrill(
  ctx: TaskContext,
  config: SensitivityConfig
): boolean {
  const { impactFiles, operation } = ctx;
  const { minFilesChanged, operations } = config.grill;

  // Always grill if enough files changed
  if (impactFiles >= minFilesChanged) {
    return true;
  }

  // Grill specific operations regardless of file count
  if (operations.includes(operation)) {
    return true;
  }

  return false;
}

/**
 * Main decision function - evaluates all triggers
 */
export function makeDecision(
  ctx: TaskContext,
  sensitivity: Sensitivity = 'balanced'
): DecisionResult {
  const config = SENSITIVITY_PRESETS[sensitivity];

  const parallelize = shouldParallelize(ctx, config);
  const guard = shouldGuard(ctx, config);
  const grill = shouldGrill(ctx, config);

  // Build reasoning
  const reasons: string[] = [];
  
  if (parallelize) {
    reasons.push(
      `Parallelization: complexity=${ctx.complexity}, files=${ctx.impactFiles}, uncertainty=${ctx.uncertainty.toFixed(2)}`
    );
  }
  
  if (guard) {
    const guardReasons: string[] = [];
    if (config.guard.riskLevels.includes(ctx.riskLevel)) {
      guardReasons.push(`risk=${ctx.riskLevel}`);
    }
    if (ctx.patterns?.length) {
      guardReasons.push(`patterns=[${ctx.patterns.join(', ')}]`);
    }
    if (ctx.scope?.outsideWorkspace) guardReasons.push('scope:workspace');
    if (ctx.scope?.systemPaths) guardReasons.push('scope:system');
    if (ctx.scope?.credentials) guardReasons.push('scope:credentials');
    reasons.push(`Guard: ${guardReasons.join(', ')}`);
  }
  
  if (grill) {
    reasons.push(
      `Grill: files=${ctx.impactFiles}, operation=${ctx.operation}`
    );
  }

  // Calculate overall confidence (simplified)
  const confidence = ctx.uncertainty; // Use model's own uncertainty as confidence

  return {
    shouldParallelize: parallelize,
    shouldGuard: guard,
    shouldGrill: grill,
    reasoning: reasons.join(' | '),
    confidence,
  };
}

/**
 * Get sensitivity config for inspection/tuning
 */
export function getConfig(sensitivity: Sensitivity = 'balanced'): SensitivityConfig {
  return SENSITIVITY_PRESETS[sensitivity];
}
