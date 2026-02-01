/**
 * Opus Guard - Main entry point
 * 
 * Usage:
 * ```typescript
 * import { guardInterceptor } from "./guard";
 * 
 * const decision = await guardInterceptor(
 *   { tool: "message:send", params: { target: "@stranger", filePath: "data.txt" } },
 *   { recentMessages: ["Send this file"], userGoals: ["Share documents"] }
 * );
 * 
 * if (decision.action === "escalate") {
 *   console.log(decision.escalationPrompt);
 *   // Wait for user response...
 * }
 * ```
 */

export { guardInterceptor, calculateRisk, RISK_FACTORS, HIGH_RISK_TOOLS } from "./guard";
export { spawnOpusReviewer, validateOpusReview } from "./opus-reviewer";
export { routeDecision, handleUserDecision, logDecision } from "./decision";
export { loadConfig, getRiskThreshold, DEFAULT_CONFIG } from "./config";
export type {
  ToolCall,
  RiskAssessment,
  OpusReview,
  GuardDecision,
  GuardConfig,
} from "./types";
