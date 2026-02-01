/**
 * Subagent Workflow Plugin - Main Exports
 * 
 * Integrates three core skills:
 * - Grill: Automated code review and PR gating
 * - Use Subagents: Parallel task routing and execution
 * - Opus Guard: Safety guardrails and risk assessment
 */

// Main plugin export
export { subagentWorkflowPlugin } from './plugin';

// Command handlers
export { grillHandler } from './commands/grill';
export { routerHandler } from './commands/router';

// Tool interceptors
export { guardInterceptor } from './interceptors/guard-interceptor';

// Hooks
export { autoGrillHook } from './hooks/pre-pr-hook';
export { guardHook } from './hooks/audit-hook';
export { trackSubagentSpawn, trackSubagentCompletion } from './hooks/post-spawn-hook';

// Telemetry and health
export { TelemetryCollector } from './telemetry';
export { HealthChecker } from './health-check';

// Re-export types
export type {
  GrillHandlerOptions,
  RouterOptions,
  GuardInterceptorOptions,
  PrePROptions,
  PostSpawnOptions,
  AuditOptions,
  TelemetryConfig,
} from './commands/grill';

export type {
  DiagnosticResult,
  HealthReport,
} from './health-check';

export type {
  MetricData,
  EventData,
} from './telemetry';

// Default export for plugin loading
export default subagentWorkflowPlugin;
