import type { ToolInterceptorContext, ToolInterceptor } from 'clawdbot/plugin-sdk';
import type { TelemetryCollector } from '../telemetry';
import { GuardDecision, evaluateRisk } from '../hooks/audit-hook';

export interface GuardInterceptorOptions {
  telemetry: TelemetryCollector;
}

/**
 * Tool interceptor for safety guardrails
 * 
 * Intercepts potentially risky tool invocations and:
 * 1. Evaluates the risk level
 * 2. Requires confirmation for high-risk actions
 * 3. Logs all decisions for audit
 */
export const guardInterceptor: ToolInterceptor = async (
  context: ToolInterceptorContext,
  options: GuardInterceptorOptions
): Promise<{ proceed: boolean; reason?: string }> => {
  const { toolName, args } = context;
  
  // Skip low-risk tools
  if (isLowRiskTool(toolName)) {
    return { proceed: true };
  }
  
  try {
    // Evaluate risk
    const riskLevel = assessRiskLevel(toolName, args);
    const payload = {
      toolName,
      toolArgs: args,
      sessionId: context.sessionId || 'unknown',
      riskLevel,
      estimatedImpact: estimateImpact(toolName, args)
    };
    
    const decision = await evaluateRisk(payload);
    
    // Record to telemetry
    options.telemetry.recordEvent('tool.intercepted', {
      tool_name: toolName,
      risk_level: riskLevel,
      decision: decision.allowed ? 'allowed' : 'blocked',
      requires_confirmation: decision.requiresConfirmation
    });
    
    // Handle confirmation requirement
    if (decision.requiresConfirmation) {
      const confirmed = await requestConfirmation(context, decision);
      
      if (!confirmed) {
        options.telemetry.recordEvent('tool.declined', { tool_name: toolName });
        return {
          proceed: false,
          reason: 'Action declined by user'
        };
      }
    }
    
    return {
      proceed: decision.allowed,
      reason: decision.reason
    };
    
  } catch (error) {
    options.telemetry.recordError('guard_interceptor', error);
    // Fail open - don't break legitimate actions on guard failure
    return { proceed: true };
  }
};

function isLowRiskTool(toolName: string): boolean {
  const lowRiskTools = ['read', 'web_fetch', 'image', 'tts', 'canvas:snapshot'];
  return lowRiskTools.includes(toolName);
}

function assessRiskLevel(toolName: string, args: Record<string, unknown>): 'low' | 'medium' | 'high' | 'critical' {
  // Critical tools
  if (['exec', 'process:kill'].includes(toolName)) {
    return 'critical';
  }
  
  // High-risk tools
  if (['write', 'edit', 'message:send'].includes(toolName)) {
    // Check for destructive operations
    if (hasDestructivePattern(args)) {
      return 'high';
    }
    return 'medium';
  }
  
  return 'low';
}

function hasDestructivePattern(args: Record<string, unknown>): boolean {
  const argString = JSON.stringify(args);
  const destructivePatterns = [
    /rm\s+-rf/i,
    /drop\s+database/i,
    /delete\s+from/i,
    /truncate\s+table/i,
    /\.\.\//, // Directory traversal
    /password/i
  ];
  
  return destructivePatterns.some(pattern => pattern.test(argString));
}

function estimateImpact(toolName: string, args: Record<string, unknown>): string {
  if (toolName === 'exec') {
    const command = args.command as string || '';
    if (command.includes('rm -rf') || command.includes('drop')) {
      return 'high_data_loss';
    }
    return 'system_modification';
  }
  
  if (toolName === 'write' || toolName === 'edit') {
    return 'file_modification';
  }
  
  if (toolName === 'message:send') {
    return 'communication';
  }
  
  return 'unknown';
}

async function requestConfirmation(
  context: ToolInterceptorContext,
  decision: GuardDecision
): Promise<boolean> {
  // This would integrate with the actual confirmation system
  // For now, we'll simulate user confirmation via a prompt
  
  const confirmationPrompt = [
    `⚠️ Risky action detected: ${decision.reason}`,
    `Tool: ${context.toolName}`,
    `Alternative: ${decision.alternativeAction || 'Proceed anyway?'}`,
    '',
    'Confirm? (yes/no)'
  ].join('\n');
  
  // In a real implementation, this would send to the user's channel
  // and wait for a response. For now, we assume auto-confirmation
  // in non-interactive contexts.
  
  console.log('[GUARD]', confirmationPrompt);
  
  // For development/testing, always allow
  return true;
}
