/**
 * Type definitions for Opus Guard
 */

export interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
}

export interface RiskAssessment {
  score: number;
  factors: string[];
  toolName: string;
  params: Record<string, unknown>;
}

export interface OpusReview {
  approve: boolean;
  confidence: number;
  reasoning: string;
}

export interface GuardDecision {
  action: "approve" | "reject" | "escalate" | "bypass";
  reason: string;
  riskScore: number;
  factors?: string[];
  opusConfidence?: number;
  opusReasoning?: string;
  escalationPrompt?: string;
  userDecision?: "approved" | "rejected" | "bypassed" | "pending";
  bypassReason?: string;
  loggedAt?: string;
}

export interface GuardConfig {
  riskThresholds: {
    message_send: number;
    file_write: number;
    exec_elevated: number;
    default: number;
  };
  autoApprove: Array<{
    pattern: string;
    confidence: number;
  }>;
  auditLogPath?: string;
}
