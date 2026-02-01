/**
 * Subagent Workflow - Main Entry Point
 * 
 * Provides the complete subagent workflow plugin with:
 * - Automated code review (Grill)
 * - Parallel subagent routing (Use Subagents)
 * - Safety guardrails (Opus Guard)
 */

// Plugin export for Clawdbot
export { subagentWorkflowPlugin as default, subagentWorkflowPlugin } from './core/plugin';

// Core exports
export {
  grillHandler,
  routerHandler,
  guardInterceptor,
  autoGrillHook,
  guardHook,
  trackSubagentSpawn,
  trackSubagentCompletion,
  TelemetryCollector,
  HealthChecker,
} from './core';

// Config exports
export {
  loadConfig,
  loadPreset,
  saveConfig,
  validateConfig,
  getConfigPath,
  DEFAULT_CONFIG,
} from './config';

// Type exports
export type {
  SubagentWorkflowConfig,
  GrillConfig,
  UseSubagentsConfig,
  OpusGuardConfig,
  GrillHandlerOptions,
  RouterOptions,
  GuardInterceptorOptions,
  PrePROptions,
  PostSpawnOptions,
  AuditOptions,
  TelemetryConfig,
} from './config';

export type {
  DiagnosticResult,
  HealthReport,
} from './core/health-check';

export type {
  GuardDecision,
  ToolCall,
  RiskAssessment,
  OpusReview,
  GuardConfig,
} from '../opus-guard/types';

// Version
export const VERSION = '1.0.0';
