import type { HookPayload } from 'clawdbot/plugin-sdk';
import type { TelemetryCollector } from '../telemetry';

export interface HighRiskToolPayload extends HookPayload {
  toolName: string;
  toolArgs: Record<string, unknown>;
  sessionId: string;
  userId?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: string;
}

export interface GuardDecision {
  allowed: boolean;
  reason: string;
  requiresConfirmation: boolean;
  alternativeAction?: string;
}

export interface AuditOptions {
  telemetry: TelemetryCollector;
}

/**
 * Audit hook for high-risk tool invocations
 * 
 * Logs all guard decisions for compliance, debugging, and safety analysis.
 * This creates an immutable record of why certain actions were allowed or blocked.
 */
export async function guardHook(
  payload: HighRiskToolPayload,
  options: AuditOptions
): Promise<GuardDecision> {
  const decision = await evaluateRisk(payload);
  
  // Log the decision regardless of outcome
  logGuardDecision(payload, decision, options.telemetry);
  
  return decision;
}

async function evaluateRisk(payload: HighRiskToolPayload): Promise<GuardDecision> {
  const { toolName, riskLevel, toolArgs } = payload;
  
  // Critical tools always require confirmation
  if (riskLevel === 'critical') {
    return {
      allowed: true,
      reason: 'Critical action - user confirmation required',
      requiresConfirmation: true
    };
  }
  
  // Block destructive operations without proper context
  if (isDestructiveOperation(toolName, toolArgs)) {
    const hasSafetyFlag = toolArgs.dryRun === true || toolArgs.confirm === true;
    
    if (!hasSafetyFlag) {
      return {
        allowed: false,
        reason: 'Destructive operation requires --dry-run or --confirm flag',
        requiresConfirmation: false,
        alternativeAction: `Re-run with --dry-run to preview changes`
      };
    }
  }
  
  // High-risk tools require confirmation
  if (riskLevel === 'high') {
    return {
      allowed: true,
      reason: 'High-risk action flagged for review',
      requiresConfirmation: true
    };
  }
  
  // Medium and low risk proceed with logging
  return {
    allowed: true,
    reason: `Risk level ${riskLevel} - proceeding with audit logging`,
    requiresConfirmation: false
  };
}

function isDestructiveOperation(toolName: string, args: Record<string, unknown>): boolean {
  const destructiveTools = ['delete', 'remove', 'drop', 'destroy', 'kill'];
  const destructivePatterns = [/rm\s+-rf/, /drop\s+database/, /delete\s+from/i];
  
  // Check tool name
  if (destructiveTools.some(dt => toolName.toLowerCase().includes(dt))) {
    return true;
  }
  
  // Check arguments for dangerous patterns
  const argString = JSON.stringify(args);
  return destructivePatterns.some(pattern => pattern.test(argString));
}

function logGuardDecision(
  payload: HighRiskToolPayload,
  decision: GuardDecision,
  telemetry: TelemetryCollector
): void {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    session_id: payload.sessionId,
    tool_name: payload.toolName,
    risk_level: payload.riskLevel,
    decision: decision.allowed ? 'allowed' : 'blocked',
    reason: decision.reason,
    requires_confirmation: decision.requiresConfirmation,
    user_id: payload.userId || 'anonymous'
  };
  
  // Record to telemetry
  telemetry.recordEvent('guard.decision', auditEntry);
  
  // Log to dedicated audit log for compliance
  // In production, this might go to a separate audit system
  console.log('[AUDIT]', JSON.stringify(auditEntry));
}

/**
 * Export audit log for analysis
 */
export async function exportAuditLog(
  startTime: Date,
  endTime: Date,
  filter?: { sessionId?: string; toolName?: string }
): Promise<string> {
  // This would query the telemetry store for audit entries
  // Placeholder implementation
  return JSON.stringify({
    period: { start: startTime, end: endTime },
    filter,
    entries: [] // Would be populated from telemetry store
  }, null, 2);
}
