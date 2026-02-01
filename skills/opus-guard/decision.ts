/**
 * Decision routing logic for Opus Guard
 * Routes decisions based on Opus confidence scores
 */

import type { ToolCall, RiskAssessment, OpusReview, GuardDecision } from "./types";
import { loadConfig } from "./config";

/**
 * Route decision based on Opus review confidence
 */
export function routeDecision(
  toolCall: ToolCall,
  assessment: RiskAssessment,
  opusReview: OpusReview
): GuardDecision {
  const config = loadConfig();

  // Check auto-approve patterns first
  const autoApprove = checkAutoApprovePatterns(toolCall, config);
  if (autoApprove.match && opusReview.confidence >= autoApprove.confidence) {
    return {
      action: "approve",
      reason: `Auto-approved by pattern: ${autoApprove.pattern}`,
      riskScore: assessment.score,
      factors: assessment.factors,
      opusConfidence: opusReview.confidence,
      opusReasoning: opusReview.reasoning,
      loggedAt: new Date().toISOString(),
    };
  }

  // Auto-approve if Opus is highly confident (≥ 0.9)
  if (opusReview.confidence >= 0.9) {
    return {
      action: opusReview.approve ? "approve" : "reject",
      reason: `Opus ${opusReview.approve ? "approved" : "rejected"} with high confidence (${opusReview.confidence.toFixed(2)}): ${opusReview.reasoning}`,
      riskScore: assessment.score,
      factors: assessment.factors,
      opusConfidence: opusReview.confidence,
      opusReasoning: opusReview.reasoning,
      loggedAt: new Date().toISOString(),
    };
  }

  // Escalate to user if confidence is medium (0.5 - 0.9)
  if (opusReview.confidence >= 0.5) {
    return {
      action: "escalate",
      reason: `Opus uncertain (${opusReview.confidence.toFixed(2)}): ${opusReview.reasoning}`,
      riskScore: assessment.score,
      factors: assessment.factors,
      opusConfidence: opusReview.confidence,
      opusReasoning: opusReview.reasoning,
      escalationPrompt: buildEscalationPrompt(toolCall, assessment, opusReview),
      loggedAt: new Date().toISOString(),
    };
  }

  // Low confidence - be conservative and escalate with warning
  return {
    action: "escalate",
    reason: `Opus has low confidence (${opusReview.confidence.toFixed(2)}). Conservative escalation recommended.`,
    riskScore: assessment.score,
    factors: assessment.factors,
    opusConfidence: opusReview.confidence,
    opusReasoning: opusReview.reasoning,
    escalationPrompt: buildEscalationPrompt(toolCall, assessment, opusReview),
    loggedAt: new Date().toISOString(),
  };
}

/**
 * Check if tool call matches auto-approve patterns
 */
function checkAutoApprovePatterns(
  toolCall: ToolCall,
  config: ReturnType<typeof loadConfig>
): { match: boolean; pattern?: string; confidence: number } {
  const path = String(
    toolCall.params.path || toolCall.params.file_path || toolCall.params.url || ""
  );

  for (const rule of config.autoApprove) {
    // Convert pattern to regex
    const pattern = rule.pattern
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, ".");
    
    const regex = new RegExp(`^${pattern}$`);
    
    if (regex.test(path) || regex.test(`${toolCall.tool} ${path}`)) {
      return {
        match: true,
        pattern: rule.pattern,
        confidence: rule.confidence,
      };
    }
  }

  return { match: false, confidence: 0 };
}

/**
 * Build escalation prompt for user
 */
function buildEscalationPrompt(
  toolCall: ToolCall,
  assessment: RiskAssessment,
  opusReview: OpusReview
): string {
  const riskLevel = assessment.score > 0.8 ? "🔴 HIGH" : assessment.score > 0.6 ? "🟡 MEDIUM" : "🟢 LOW";
  
  let prompt = `⚠️  **Security Review Required**

**Operation:** \`${toolCall.tool}\`
**Risk Level:** ${riskLevel} (${assessment.score.toFixed(2)})

**Risk Factors:**
${assessment.factors.map((f) => `- ${f.replace(/_/g, " ")}`).join("\n") || "- None identified"}

**Opus Analysis:**
${opusReview.reasoning}

**Opus Confidence:** ${(opusReview.confidence * 100).toFixed(0)}%
**Recommendation:** ${opusReview.approve ? "✅ Likely Safe" : "❌ Likely Unsafe"}

`;

  // Add tool-specific details
  if (toolCall.tool === "message:send") {
    prompt += `**Target:** ${toolCall.params.target || toolCall.params.targets || "Unknown"}\n`;
    if (toolCall.params.filePath || toolCall.params.attachment) {
      prompt += `**Attachment:** ${toolCall.params.filePath || toolCall.params.attachment}\n`;
    }
  } else if (toolCall.tool === "write" || toolCall.tool === "edit") {
    prompt += `**Path:** ${toolCall.params.path || toolCall.params.file_path}\n`;
  } else if (toolCall.tool === "exec") {
    prompt += `**Command:** \`${toolCall.params.command}\`\n`;
  } else if (toolCall.tool === "browser") {
    prompt += `**URL:** ${toolCall.params.url}\n`;
    prompt += `**Action:** ${toolCall.params.action}\n`;
  }

  prompt += `
**Proceed?** (yes/no/bypass)
- \`yes\` - Approve this operation
- \`no\` - Reject this operation  
- \`bypass <reason>\` - Emergency override (will be logged)`;

  return prompt;
}

/**
 * Handle user response to escalation
 */
export function handleUserDecision(
  originalDecision: GuardDecision,
  userResponse: string
): GuardDecision {
  const response = userResponse.trim().toLowerCase();

  if (response === "yes" || response === "y") {
    return {
      ...originalDecision,
      action: "approve",
      userDecision: "approved",
      reason: `${originalDecision.reason} | User approved escalation`,
    };
  }

  if (response === "no" || response === "n") {
    return {
      ...originalDecision,
      action: "reject",
      userDecision: "rejected",
      reason: `${originalDecision.reason} | User rejected escalation`,
    };
  }

  // Handle bypass with reason
  const bypassMatch = response.match(/^bypass\s+(.+)$/i);
  if (bypassMatch) {
    const bypassReason = bypassMatch[1].trim();
    return {
      ...originalDecision,
      action: "bypass",
      userDecision: "bypassed",
      bypassReason,
      reason: `${originalDecision.reason} | User bypassed: ${bypassReason}`,
    };
  }

  // Unknown response - stay in escalate state
  return {
    ...originalDecision,
    userDecision: "pending",
    reason: `${originalDecision.reason} | User response unclear: "${userResponse}"`,
  };
}

/**
 * Log decision for audit trail
 */
export function logDecision(decision: GuardDecision): void {
  const logEntry = {
    timestamp: decision.loggedAt || new Date().toISOString(),
    action: decision.action,
    reason: decision.reason,
    riskScore: decision.riskScore,
    factors: decision.factors,
    opusConfidence: decision.opusConfidence,
    userDecision: decision.userDecision,
    bypassReason: decision.bypassReason,
  };

  // In production, this would write to a proper audit log
  // For now, log to console with structured format
  console.log("[OPUS_GUARD_AUDIT]", JSON.stringify(logEntry));
}

export { checkAutoApprovePatterns, buildEscalationPrompt };
