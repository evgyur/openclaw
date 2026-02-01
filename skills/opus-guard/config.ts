import { loadConfig } from "./config";
import type { GuardConfig } from "./types";

/**
 * Configuration loader for Opus Guard
 */

const DEFAULT_CONFIG: GuardConfig = {
  riskThresholds: {
    message_send: 0.6,
    file_write: 0.7,
    exec_elevated: 0.8,
    default: 0.5,
  },
  autoApprove: [
    {
      pattern: "write to /home/user/workspace/*",
      confidence: 0.95,
    },
    {
      pattern: "write to /workspace/*",
      confidence: 0.95,
    },
    {
      pattern: "edit /home/user/workspace/*",
      confidence: 0.95,
    },
    {
      pattern: "exec git *",
      confidence: 0.9,
    },
    {
      pattern: "exec npm *",
      confidence: 0.9,
    },
    {
      pattern: "exec pnpm *",
      confidence: 0.9,
    },
  ],
  auditLogPath: "~/.clawdbot/opus-guard-audit.log",
};

/**
 * Load configuration from YAML or use defaults
 */
export function loadConfig(): GuardConfig {
  // TODO: Implement YAML loading from config.yaml
  // For now, return default config
  return DEFAULT_CONFIG;
}

/**
 * Get risk threshold for a specific tool
 */
export function getRiskThreshold(
  config: GuardConfig,
  toolName: string
): number {
  const thresholds: Record<string, number> = {
    "message:send": config.riskThresholds.message_send,
    write: config.riskThresholds.file_write,
    edit: config.riskThresholds.file_write,
    exec: config.riskThresholds.exec_elevated,
  };

  return thresholds[toolName] ?? config.riskThresholds.default;
}

export { DEFAULT_CONFIG };
