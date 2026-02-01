import type { HookPayload } from 'clawdbot/plugin-sdk';
import type { TelemetryCollector } from '../telemetry';

export interface SubagentSpawnPayload extends HookPayload {
  subagentId: string;
  taskId: string;
  taskType: string;
  parentSessionId: string;
  model: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
  toolsRequested: string[];
}

export interface PostSpawnOptions {
  telemetry: TelemetryCollector;
}

/**
 * Track subagent lifecycle for telemetry and resource management
 * 
 * This hook monitors subagent creation, execution, and completion
 * to maintain system health and optimize resource allocation.
 */
export async function trackSubagentSpawn(
  payload: SubagentSpawnPayload,
  options: PostSpawnOptions
): Promise<void> {
  const spawnTime = Date.now();
  
  // Record spawn event
  options.telemetry.recordEvent('subagent.spawned', {
    subagent_id: payload.subagentId,
    task_type: payload.taskType,
    model: payload.model,
    complexity: payload.estimatedComplexity,
    tool_count: payload.toolsRequested.length
  });

  // Track high-complexity subagents for resource monitoring
  if (payload.estimatedComplexity === 'high') {
    options.telemetry.recordEvent('subagent.high_complexity_spawned', {
      subagent_id: payload.subagentId,
      tools: payload.toolsRequested
    });
  }

  // Set up completion tracking (this would integrate with the actual subagent system)
  trackSubagentCompletion(payload.subagentId, spawnTime, options.telemetry);
}

/**
 * Track when a subagent completes its task
 */
export function trackSubagentCompletion(
  subagentId: string,
  spawnTime: number,
  telemetry: TelemetryCollector,
  result?: { success: boolean; error?: string }
): void {
  const duration = Date.now() - spawnTime;
  
  telemetry.recordMetrics('subagent_duration', duration, { subagent_id: subagentId });
  
  if (result) {
    if (result.success) {
      telemetry.recordEvent('subagent.completed', { subagent_id: subagentId, duration });
    } else {
      telemetry.recordEvent('subagent.failed', { 
        subagent_id: subagentId, 
        duration,
        error: result.error 
      });
    }
  }
}

/**
 * Get active subagent count for resource management
 */
export function getActiveSubagentCount(): number {
  // This would query the actual subagent registry
  // Placeholder returning 0
  return 0;
}

/**
 * Check if system has capacity for another subagent
 */
export function hasSubagentCapacity(): boolean {
  const activeCount = getActiveSubagentCount();
  const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_SUBAGENTS || '5', 10);
  return activeCount < maxConcurrent;
}
