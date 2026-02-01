/**
 * Autonomous Coding Mode
 * 
 * A system where the main agent automatically decides when to spawn subagents,
 * trigger security checks, and request code reviews based on task context.
 * 
 * @example
 * ```typescript
 * import { AutonomousInterceptor } from 'skills/autonomous-mode';
 * 
 * const interceptor = new AutonomousInterceptor('balanced');
 * const hooks = createHooks(interceptor);
 * 
 * // Use hooks in your agent's tool execution pipeline
 * await hooks.beforeWrite({ tool: 'write', params: {...}, ... });
 * ```
 */

// Decision Engine
export {
  shouldParallelize,
  shouldGuard,
  shouldGrill,
  makeDecision,
  getConfig,
  type TaskContext,
  type DecisionResult,
  type Sensitivity,
  type SensitivityConfig,
} from './decision.ts';

// Context Analyzer
export {
  analyzeContext,
  detectOperation,
  detectRiskLevel,
  extractPatterns,
  analyzeGitDiff,
  detectScopeViolations,
  estimateCodeComplexity,
  type AnalysisInput,
} from './analyzer.ts';

// Auto-Spawner
export {
  autoSpawnIfNeeded,
  shouldOverride,
  handleFailure,
  type SpawnResult,
  type AutomationConfig,
} from './spawner.ts';

// Integration Layer
export {
  AutonomousInterceptor,
  createHooks,
  type ToolCallContext,
  type IntegrationHooks,
} from './integration.ts';

// Version
export const VERSION = '1.0.0';
export const NAME = 'Autonomous Coding Mode';
