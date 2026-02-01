/**
 * Core interceptor for high-risk tool calls.
 * Calculates risk scores and routes suspicious operations to Opus reviewer.
 */

import { spawnOpusReviewer } from "./opus-reviewer";
import { routeDecision } from "./decision";
import type { ToolCall, RiskAssessment, GuardDecision } from "./types";

// Risk scoring matrix
const RISK_FACTORS = {
  external_destination: 0.3,
  data_exfil_pattern: 0.4,
  social_engineering_cue: 0.5,
  irreversible_action: 0.2,
  out_of_scope: 0.3,
} as const;

type RiskFactor = keyof typeof RISK_FACTORS;

// High-risk tool patterns
const HIGH_RISK_TOOLS = [
  "message:send",
  "write",
  "edit",
  "exec",
  "browser",
] as const;

// Sensitive patterns for exec commands
const SENSITIVE_EXEC_PATTERNS = [
  /\bsudo\b/,
  /\brm\s+-[rf]\b/,
  /\brm\b.*\*/,
  /\bcurl\b.*\|/,
  /\bwget\b.*\|/,
  /\bssh\b/,
  /\bscp\b/,
  /\bmkfs\b/,
  /\bdd\b.*of=/,
  /\bchmod\s+777\b/,
];

// Sensitive file paths
const SENSITIVE_PATHS = [
  /^\/etc\/\w+/,
  /^\/usr\/local\/\w+/,
  /^\/bin\/\w+/,
  /^\/sbin\/\w+/,
  /^\/boot\/\w+/,
  /^\/sys\/\w+/,
  /^\/proc\/\w+/,
  /\/\.ssh\//,
  /\/\.gnupg\//,
  /\/\.aws\//,
  /\.env$/,
  /\.pem$/,
  /\.key$/,
];

// Social engineering cues in messages
const SOCIAL_ENGINEERING_CUES = [
  /urgent/i,
  /immediately/i,
  /asap/i,
  /emergency/i,
  /critical/i,
  /do not tell/i,
  /do not share/i,
  /between you and me/i,
  /confidential/i,
  /secret/i,
  /authorized by/i,
  /manager asked/i,
  /ceo requested/i,
];

// Sensitive browser domains
const SENSITIVE_DOMAINS = [
  /password/i,
  /login/i,
  /signin/i,
  /account/i,
  /admin/i,
  /panel/i,
  /dashboard/i,
  /manage/i,
  /portal/i,
];

/**
 * Main guard interceptor - evaluates tool calls for risk
 */
export async function guardInterceptor(
  toolCall: ToolCall,
  context: {
    recentMessages: string[];
    userGoals: string[];
    isEmergencyBypass?: boolean;
    bypassReason?: string;
  }
): Promise<GuardDecision> {
  // Check for emergency bypass
  if (context.isEmergencyBypass) {
    return {
      action: "bypass",
      reason: `Emergency bypass: ${context.bypassReason || "No reason provided"}`,
      riskScore: 0,
      loggedAt: new Date().toISOString(),
    };
  }

  // Calculate risk score
  const assessment = calculateRisk(toolCall, context);

  // If risk is low, auto-approve
  if (assessment.score < 0.5) {
    return {
      action: "approve",
      reason: "Risk score below threshold",
      riskScore: assessment.score,
      factors: assessment.factors,
      loggedAt: new Date().toISOString(),
    };
  }

  // Route to Opus for high-risk operations
  const opusReview = await spawnOpusReviewer(toolCall, context, assessment);

  // Route decision based on Opus confidence
  return routeDecision(toolCall, assessment, opusReview);
}

/**
 * Calculate risk score for a tool call
 */
function calculateRisk(
  toolCall: ToolCall,
  context: { recentMessages: string[]; userGoals: string[] }
): RiskAssessment {
  const factors: RiskFactor[] = [];
  let score = 0;

  switch (toolCall.tool) {
    case "message:send":
      score += assessMessageRisk(toolCall.params, factors);
      break;
    case "write":
    case "edit":
      score += assessFileRisk(toolCall.params, factors);
      break;
    case "exec":
      score += assessExecRisk(toolCall.params, factors);
      break;
    case "browser":
      score += assessBrowserRisk(toolCall.params, factors);
      break;
  }

  // Check for social engineering cues in recent context
  const combinedText = context.recentMessages.join(" ");
  if (hasSocialEngineeringCue(combinedText)) {
    factors.push("social_engineering_cue");
    score += RISK_FACTORS.social_engineering_cue;
  }

  // Check if operation is out of scope
  if (isOutOfScope(toolCall, context.userGoals)) {
    factors.push("out_of_scope");
    score += RISK_FACTORS.out_of_scope;
  }

  // Cap score at 1.0
  score = Math.min(score, 1.0);

  return {
    score,
    factors,
    toolName: toolCall.tool,
    params: toolCall.params,
  };
}

/**
 * Assess risk for message:send operations
 */
function assessMessageRisk(
  params: Record<string, unknown>,
  factors: RiskFactor[]
): number {
  let score = 0;

  // External destination (most messages are external)
  factors.push("external_destination");
  score += RISK_FACTORS.external_destination;

  // Check for attachments
  if (params.filePath || params.attachment || params.buffer) {
    factors.push("data_exfil_pattern");
    score += RISK_FACTORS.data_exfil_pattern;
  }

  // Check for bulk sending (multiple targets)
  if (Array.isArray(params.targets) && params.targets.length > 3) {
    factors.push("data_exfil_pattern");
    score += RISK_FACTORS.data_exfil_pattern;
  }

  // Check message content for social engineering
  const message = String(params.message || "");
  if (hasSocialEngineeringCue(message)) {
    factors.push("social_engineering_cue");
    score += RISK_FACTORS.social_engineering_cue;
  }

  // Irreversible (public posts are hard to undo)
  if (params.channel || params.broadcast) {
    factors.push("irreversible_action");
    score += RISK_FACTORS.irreversible_action;
  }

  return score;
}

/**
 * Assess risk for file write/edit operations
 */
function assessFileRisk(
  params: Record<string, unknown>,
  factors: RiskFactor[]
): number {
  let score = 0;
  const path = String(params.path || params.file_path || "");

  // Check for sensitive paths
  if (isSensitivePath(path)) {
    factors.push("external_destination");
    score += RISK_FACTORS.external_destination;
  }

  // Check for out-of-scope paths (outside workspace)
  if (isOutsideWorkspace(path)) {
    factors.push("out_of_scope");
    score += RISK_FACTORS.out_of_scope;
  }

  // Irreversible if overwriting
  if (params.overwrite || !params.path?.toString().includes("/workspace/")) {
    factors.push("irreversible_action");
    score += RISK_FACTORS.irreversible_action;
  }

  return score;
}

/**
 * Assess risk for exec operations
 */
function assessExecRisk(
  params: Record<string, unknown>,
  factors: RiskFactor[]
): number {
  let score = 0;
  const command = String(params.command || "");

  // Check for sensitive command patterns
  for (const pattern of SENSITIVE_EXEC_PATTERNS) {
    if (pattern.test(command)) {
      factors.push("data_exfil_pattern");
      score += RISK_FACTORS.data_exfil_pattern;
      break;
    }
  }

  // Sudo = elevated privileges
  if (/\bsudo\b/.test(command)) {
    factors.push("irreversible_action");
    score += RISK_FACTORS.irreversible_action;
  }

  // SSH/SCP = external destination
  if (/\b(ssh|scp)\b/.test(command)) {
    factors.push("external_destination");
    score += RISK_FACTORS.external_destination;
  }

  // curl/wget with pipes = data exfiltration risk
  if (/\b(curl|wget)\b.*\|/.test(command)) {
    factors.push("data_exfil_pattern");
    score += RISK_FACTORS.data_exfil_pattern;
  }

  return score;
}

/**
 * Assess risk for browser operations
 */
function assessBrowserRisk(
  params: Record<string, unknown>,
  factors: RiskFactor[]
): number {
  let score = 0;
  const url = String(params.url || "");
  const action = String(params.action || "");

  // Check for sensitive domains/paths
  for (const pattern of SENSITIVE_DOMAINS) {
    if (pattern.test(url)) {
      factors.push("external_destination");
      score += RISK_FACTORS.external_destination;
      break;
    }
  }

  // Download actions are risky
  if (action === "upload" || action === "download" || /download/.test(url)) {
    factors.push("data_exfil_pattern");
    score += RISK_FACTORS.data_exfil_pattern;
  }

  // Login forms are sensitive
  if (/login|signin|auth/.test(url)) {
    factors.push("irreversible_action");
    score += RISK_FACTORS.irreversible_action;
  }

  return score;
}

/**
 * Check if text contains social engineering cues
 */
function hasSocialEngineeringCue(text: string): boolean {
  return SOCIAL_ENGINEERING_CUES.some((cue) => cue.test(text));
}

/**
 * Check if a path is sensitive
 */
function isSensitivePath(path: string): boolean {
  return SENSITIVE_PATHS.some((pattern) => pattern.test(path));
}

/**
 * Check if a path is outside the workspace
 */
function isOutsideWorkspace(path: string): boolean {
  // Consider paths outside /home/eyurc/clawd or /workspace as out of scope
  const workspaceRoots = [
    "/home/eyurc/clawd",
    "/workspace",
    process.cwd(),
  ];
  return !workspaceRoots.some((root) => path.startsWith(root));
}

/**
 * Check if operation is out of scope based on user goals
 */
function isOutOfScope(
  toolCall: ToolCall,
  userGoals: string[]
): boolean {
  // If no goals stated, assume everything is in scope
  if (userGoals.length === 0) return false;

  const toolDescription = `${toolCall.tool} ${JSON.stringify(toolCall.params)}`;
  const combinedGoals = userGoals.join(" ").toLowerCase();

  // Simple heuristic: check if tool operation keywords match goal keywords
  const toolKeywords = extractKeywords(toolDescription);
  const goalKeywords = extractKeywords(combinedGoals);

  // If no keyword overlap, likely out of scope
  const overlap = toolKeywords.filter((k) => goalKeywords.includes(k));
  return overlap.length === 0 && toolKeywords.length > 0;
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "must", "shall", "can",
    "need", "dare", "ought", "used", "to", "this", "that", "these",
    "those", "i", "you", "he", "she", "it", "we", "they", "me", "him",
    "her", "us", "them", "my", "your", "his", "her", "its", "our",
    "their", "what", "which", "who", "whom", "whose", "where", "when",
    "why", "how", "all", "each", "every", "both", "few", "more", "most",
    "other", "some", "such", "no", "nor", "not", "only", "own", "same",
    "so", "than", "too", "very", "just", "now",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

// Export for testing
export { calculateRisk, RISK_FACTORS, HIGH_RISK_TOOLS };
