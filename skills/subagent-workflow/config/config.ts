/**
 * Configuration loader and validator for Subagent Workflow
 * Loads YAML config files with validation against schema
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Config types matching schema.json
export interface GrillConfig {
  strictness: 'lenient' | 'normal' | 'strict';
  focusAreas: Array<'security' | 'performance' | 'api' | 'tests' | 'style' | 'documentation'>;
  requireTestsFor: string[];
  autoApproveOwnPRs: boolean;
  maxReviewDepth: number;
  failOnErrors: boolean;
  baseBranch: string;
}

export interface UseSubagentsConfig {
  enabled: boolean;
  defaultWorkerCount: number;
  maxParallel: number;
  timeoutSeconds: number;
  synthesisModel: string;
  taskQueueSize: number;
  workerRoles: string[];
}

export interface RiskThresholds {
  message_send: number;
  file_write: number;
  file_delete: number;
  exec_elevated: number;
  exec_normal: number;
  browser_sensitive: number;
  api_call: number;
}

export interface AutoApproveRule {
  pattern: string;
  confidence: number;
}

export interface EmergencyOverrideConfig {
  enabled: boolean;
  requireConfirmation: boolean;
  timeoutSeconds: number;
}

export interface AuditLogConfig {
  enabled: boolean;
  path: string;
  maxSizeBytes: number;
  keepDays: number;
}

export interface OpusGuardConfig {
  enabled: boolean;
  riskThresholds: RiskThresholds;
  autoApprove: AutoApproveRule[];
  escalationChannel: string;
  emergencyOverride: EmergencyOverrideConfig;
  auditLog: AuditLogConfig;
}

export interface TelemetryConfig {
  enabled: boolean;
  sampleRate: number;
  anonymize: boolean;
  endpoint?: string;
}

export interface HealthCheckConfig {
  startupCheck: boolean;
  intervalMinutes: number;
  components: string[];
}

export interface SubagentWorkflowConfig {
  version: string;
  grill: GrillConfig;
  useSubagents: UseSubagentsConfig;
  opusGuard: OpusGuardConfig;
  telemetry: TelemetryConfig;
  healthCheck: HealthCheckConfig;
}

// Default configuration
export const DEFAULT_CONFIG: SubagentWorkflowConfig = {
  version: '1.0.0',
  grill: {
    strictness: 'normal',
    focusAreas: ['security', 'performance', 'api', 'tests'],
    requireTestsFor: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/index.ts'],
    autoApproveOwnPRs: false,
    maxReviewDepth: 3,
    failOnErrors: true,
    baseBranch: 'main',
  },
  useSubagents: {
    enabled: true,
    defaultWorkerCount: 4,
    maxParallel: 8,
    timeoutSeconds: 180,
    synthesisModel: 'sonnet',
    taskQueueSize: 20,
    workerRoles: ['research', 'audit', 'draft', 'verify'],
  },
  opusGuard: {
    enabled: true,
    riskThresholds: {
      message_send: 0.6,
      file_write: 0.7,
      file_delete: 0.9,
      exec_elevated: 0.8,
      exec_normal: 0.5,
      browser_sensitive: 0.5,
      api_call: 0.6,
    },
    autoApprove: [
      { pattern: 'write to /home/*/workspace/*', confidence: 0.95 },
      { pattern: 'write to /workspace/*', confidence: 0.95 },
      { pattern: 'edit /home/*/workspace/*', confidence: 0.95 },
      { pattern: 'exec git *', confidence: 0.9 },
      { pattern: 'exec npm *', confidence: 0.9 },
      { pattern: 'exec pnpm *', confidence: 0.9 },
      { pattern: 'exec bun *', confidence: 0.9 },
      { pattern: 'exec node *', confidence: 0.85 },
      { pattern: 'exec tsc *', confidence: 0.95 },
    ],
    escalationChannel: 'security-log',
    emergencyOverride: {
      enabled: true,
      requireConfirmation: true,
      timeoutSeconds: 60,
    },
    auditLog: {
      enabled: true,
      path: '~/.clawdbot/opus-guard-audit.log',
      maxSizeBytes: 10485760,
      keepDays: 30,
    },
  },
  telemetry: {
    enabled: true,
    sampleRate: 1.0,
    anonymize: true,
  },
  healthCheck: {
    startupCheck: true,
    intervalMinutes: 0,
    components: ['grill', 'subagent_router', 'opus_model', 'git_integration', 'config'],
  },
};

// Config file search paths (in order of priority)
function getConfigSearchPaths(): string[] {
  const home = os.homedir();
  const cwd = process.cwd();
  
  return [
    path.join(cwd, '.subagent-workflow.yaml'),
    path.join(cwd, '.subagent-workflow.yml'),
    path.join(cwd, '.clawdbot', 'subagent-workflow.yaml'),
    path.join(home, '.clawdbot', 'subagent-workflow.yaml'),
    path.join(home, '.config', 'clawdbot', 'subagent-workflow.yaml'),
  ];
}

// Simple YAML parser for basic types
function parseYaml(yaml: string): unknown {
  const lines = yaml.split('\n');
  const result: Record<string, unknown> = {};
  let currentKey = '';
  let currentArray: unknown[] = [];
  let inArray = false;
  let indent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check if we're in an array
    if (trimmed.startsWith('- ')) {
      inArray = true;
      const value = trimmed.slice(2).trim();
      
      // Handle inline objects in arrays
      if (value.includes(':')) {
        const [k, ...v] = value.split(':');
        currentArray.push({ [k.trim()]: parseYamlValue(v.join(':').trim()) });
      } else {
        currentArray.push(parseYamlValue(value));
      }
      continue;
    }

    // Close array if we hit a new key
    if (inArray && trimmed.includes(':') && !trimmed.startsWith('-')) {
      if (currentKey) {
        result[currentKey] = currentArray;
      }
      currentArray = [];
      inArray = false;
    }

    // Parse key-value pairs
    if (trimmed.includes(':')) {
      const [key, ...valueParts] = trimmed.split(':');
      const keyTrimmed = key.trim();
      const valueTrimmed = valueParts.join(':').trim();

      if (valueTrimmed) {
        // Inline value
        result[keyTrimmed] = parseYamlValue(valueTrimmed);
      } else {
        // Nested object coming
        currentKey = keyTrimmed;
      }
    }
  }

  // Handle trailing array
  if (inArray && currentKey) {
    result[currentKey] = currentArray;
  }

  return result;
}

function parseYamlValue(value: string): unknown {
  const trimmed = value.trim();
  
  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  
  // Null
  if (trimmed === 'null' || trimmed === '~') return null;
  
  // Number
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  
  // String (remove quotes if present)
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  
  return trimmed;
}

// Deep merge objects
function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(
        (target[key] as Record<string, unknown>) || {},
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  
  return result as T;
}

// Expand path (handle ~ for home)
function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

// Validate config against schema (basic validation)
export function validateConfig(config: Partial<SubagentWorkflowConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Version check
  if (!config.version) {
    errors.push('Missing required field: version');
  }

  // Grill validation
  if (config.grill) {
    const validStrictness = ['lenient', 'normal', 'strict'];
    if (config.grill.strictness && !validStrictness.includes(config.grill.strictness)) {
      errors.push(`Invalid grill.strictness: ${config.grill.strictness}. Must be one of: ${validStrictness.join(', ')}`);
    }
    if (config.grill.maxReviewDepth !== undefined && (config.grill.maxReviewDepth < 1 || config.grill.maxReviewDepth > 10)) {
      errors.push('grill.maxReviewDepth must be between 1 and 10');
    }
  }

  // UseSubagents validation
  if (config.useSubagents) {
    if (config.useSubagents.defaultWorkerCount !== undefined && 
        (config.useSubagents.defaultWorkerCount < 1 || config.useSubagents.defaultWorkerCount > 16)) {
      errors.push('useSubagents.defaultWorkerCount must be between 1 and 16');
    }
    if (config.useSubagents.maxParallel !== undefined && 
        (config.useSubagents.maxParallel < 1 || config.useSubagents.maxParallel > 32)) {
      errors.push('useSubagents.maxParallel must be between 1 and 32');
    }
  }

  // OpusGuard validation
  if (config.opusGuard) {
    const thresholds = config.opusGuard.riskThresholds;
    if (thresholds) {
      for (const [key, value] of Object.entries(thresholds)) {
        if (typeof value !== 'number' || value < 0 || value > 1) {
          errors.push(`opusGuard.riskThresholds.${key} must be a number between 0 and 1`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Load configuration from file or return defaults
 */
export function loadConfig(configPath?: string): SubagentWorkflowConfig {
  const paths = configPath ? [configPath] : getConfigSearchPaths();
  
  for (const filePath of paths) {
    const expandedPath = expandPath(filePath);
    
    if (fs.existsSync(expandedPath)) {
      try {
        const content = fs.readFileSync(expandedPath, 'utf-8');
        const parsed = parseYaml(content) as Partial<SubagentWorkflowConfig>;
        const merged = deepMerge(DEFAULT_CONFIG as Record<string, unknown>, parsed) as SubagentWorkflowConfig;
        
        // Validate
        const validation = validateConfig(merged);
        if (!validation.valid) {
          console.warn(`[Config] Validation warnings for ${expandedPath}:`, validation.errors);
        }
        
        // Expand paths in config
        if (merged.opusGuard?.auditLog?.path) {
          merged.opusGuard.auditLog.path = expandPath(merged.opusGuard.auditLog.path);
        }
        
        return merged;
      } catch (error) {
        console.error(`[Config] Failed to load ${expandedPath}:`, error);
      }
    }
  }
  
  // Return defaults if no config found
  return DEFAULT_CONFIG;
}

/**
 * Load a preset configuration
 */
export function loadPreset(presetName: string): SubagentWorkflowConfig {
  const presetPath = path.join(__dirname, 'presets', `${presetName}.yaml`);
  
  if (!fs.existsSync(presetPath)) {
    throw new Error(`Preset not found: ${presetName}. Available: enterprise, solo-dev, team, paranoia`);
  }
  
  return loadConfig(presetPath);
}

/**
 * Get config file path that would be used
 */
export function getConfigPath(): string | null {
  for (const filePath of getConfigSearchPaths()) {
    const expandedPath = expandPath(filePath);
    if (fs.existsSync(expandedPath)) {
      return expandedPath;
    }
  }
  return null;
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Partial<SubagentWorkflowConfig>, filePath?: string): void {
  const targetPath = filePath || path.join(os.homedir(), '.clawdbot', 'subagent-workflow.yaml');
  
  // Ensure directory exists
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Simple YAML serialization
  const yaml = serializeToYaml(config);
  fs.writeFileSync(targetPath, yaml, 'utf-8');
}

function serializeToYaml(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let yaml = '';
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const entries = Object.entries(item);
        yaml += `${spaces}- ${entries[0][0]}: ${entries[0][1]}\n`;
        for (let i = 1; i < entries.length; i++) {
          yaml += `${spaces}  ${entries[i][0]}: ${entries[i][1]}\n`;
        }
      } else {
        yaml += `${spaces}- ${item}\n`;
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}:\n`;
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n${serializeToYaml(value, indent + 1)}`;
      } else if (typeof value === 'string') {
        yaml += `${spaces}${key}: ${value}\n`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }
  }
  
  return yaml;
}

export default loadConfig;
