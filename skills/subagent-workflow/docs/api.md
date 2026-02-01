# Subagent Workflow API

**Programmatic interfaces for the subagent workflow system.**

---

## Overview

The subagent workflow system exposes several APIs for programmatic access:

- **Plugin API** — Integrate into Clawdbot as a plugin
- **Config API** — Load, validate, and save configurations
- **Telemetry API** — Collect and report usage metrics
- **Hook API** — Lifecycle hooks for customization
- **Test Mocks** — Mock objects for testing

---

## Plugin API

### `subagentWorkflowPlugin`

The main plugin export for Clawdbot integration.

```typescript
import { subagentWorkflowPlugin } from './skills/subagent-workflow/core/plugin';

// Register with Clawdbot
clawdbot.registerPlugin(subagentWorkflowPlugin);
```

**Plugin Interface:**

```typescript
interface ClawdbotPlugin {
  name: string;
  version: string;
  description: string;
  onLoad(context: PluginContext): void;
  onUnload(): void;
}
```

**Plugin Context:**

```typescript
interface PluginContext {
  config: SubagentWorkflowConfig;
  logger: Logger;
  registerCommand(name: string, handler: CommandHandler): void;
  registerPhraseTrigger(phrase: string, handler: PhraseHandler): void;
  registerToolInterceptor(tools: string[], interceptor: ToolInterceptor): void;
  on(event: string, handler: HookHandler): void;
  listCommands?(): Promise<Command[]>;
  listAvailableModels?(): Promise<Model[]>;
  emit(event: string, payload: unknown): void;
}
```

### Command Handlers

#### `grillHandler`

Code review command handler.

```typescript
import { grillHandler } from './skills/subagent-workflow/core/commands/grill';

const handler = async (context: CommandContext, options: GrillHandlerOptions) => {
  // Run grill review
  const results = await runGrillReview({ files, autoFix, severity });
  
  // Format and reply
  await context.reply(formatGrillReport(results));
  
  // Record metrics
  options.telemetry.recordMetrics('review_time', duration, { file_count });
};
```

**Command Context:**

```typescript
interface CommandContext {
  command: string;
  args: string[];
  userId?: string;
  sessionId: string;
  channel: string;
  reply(message: string): Promise<void>;
}
```

#### `routerHandler`

Subagent routing command handler.

```typescript
import { routerHandler } from './skills/subagent-workflow/core/commands/router';

const handler = async (context: CommandContext, options: RouterOptions) => {
  const task = context.args.join(' ').trim();
  
  // Check capacity
  if (!hasSubagentCapacity()) {
    await context.reply('Maximum concurrent subagents reached');
    return;
  }
  
  // Analyze and route
  const routing = await analyzeAndRoute(task);
  const subagentId = await spawnSubagent(routing);
  
  await context.reply(`Spawned subagent: ${subagentId}`);
};
```

### Tool Interceptors

#### `guardInterceptor`

Safety guardrail for tool invocations.

```typescript
import { guardInterceptor } from './skills/subagent-workflow/core/interceptors/guard-interceptor';

const interceptor = async (context: ToolInterceptorContext, options: GuardInterceptorOptions) => {
  // Evaluate risk
  const riskLevel = assessRiskLevel(context.toolName, context.args);
  const decision = await evaluateRisk(payload);
  
  // Handle confirmation
  if (decision.requiresConfirmation) {
    const confirmed = await requestConfirmation(context, decision);
    if (!confirmed) {
      return { proceed: false, reason: 'Declined by user' };
    }
  }
  
  return { proceed: decision.allowed, reason: decision.reason };
};

// Register interceptor
context.registerToolInterceptor(['message:send', 'write', 'edit', 'exec', 'browser'], interceptor);
```

---

## Config API

### Load Configuration

```typescript
import { loadConfig, getConfigPath, type SubagentWorkflowConfig } from './config';

// Load from default location
const config = loadConfig();

// Load from specific path
const config = loadConfig('./my-config.yaml');

// Get the config file path that would be used
const configPath = getConfigPath(); // Returns path or null if using defaults
```

### Load Preset

```typescript
import { loadPreset } from './config';

const config = loadPreset('enterprise');
// Available: enterprise, solo-dev, team, paranoia
```

### Validate Configuration

```typescript
import { validateConfig } from './config';

const result = validateConfig(partialConfig);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Save Configuration

```typescript
import { saveConfig } from './config';

saveConfig({
  grill: {
    strictness: 'strict',
    focusAreas: ['security', 'tests'],
  },
});

// Save to specific location
saveConfig(config, './custom-config.yaml');
```

### Configuration Types

```typescript
interface GrillConfig {
  strictness: 'lenient' | 'normal' | 'strict';
  focusAreas: Array<'security' | 'performance' | 'api' | 'tests' | 'style' | 'documentation'>;
  requireTestsFor: string[];
  autoApproveOwnPRs: boolean;
  maxReviewDepth: number;
  failOnErrors: boolean;
  baseBranch: string;
}

interface UseSubagentsConfig {
  enabled: boolean;
  defaultWorkerCount: number;
  maxParallel: number;
  timeoutSeconds: number;
  synthesisModel: string;
  taskQueueSize: number;
  workerRoles: string[];
}

interface OpusGuardConfig {
  enabled: boolean;
  riskThresholds: {
    message_send: number;
    file_write: number;
    file_delete: number;
    exec_elevated: number;
    exec_normal: number;
    browser_sensitive: number;
    api_call: number;
  };
  autoApprove: Array<{ pattern: string; confidence: number }>;
  escalationChannel: string;
  emergencyOverride: {
    enabled: boolean;
    requireConfirmation: boolean;
    timeoutSeconds: number;
  };
  auditLog: {
    enabled: boolean;
    path: string;
    maxSizeBytes: number;
    keepDays: number;
  };
}
```

---

## Telemetry API

### `TelemetryCollector`

Usage metrics collector with anonymization support.

```typescript
import { TelemetryCollector } from './core/telemetry';

const telemetry = new TelemetryCollector({
  enabled: true,
  sampleRate: 0.5,  // 50% sampling
  anonymize: true,
});

// Initialize periodic flushing
telemetry.initialize();

// Record metrics
telemetry.recordMetrics('review_time', 1250, {
  file_count: 5,
  auto_fix: false,
});

// Record events
telemetry.recordEvent('subagent.spawned', {
  task_type: 'code',
  complexity: 'high',
});

// Record errors
telemetry.recordError('grill_handler', new Error('File not found'));

// Get stats
const stats = telemetry.getStats();
console.log(stats);
// {
//   subagent_spawns: 42,
//   average_review_time_ms: 1200,
//   review_count: 15,
//   guard_decisions: { allowed: 38, blocked: 4, confirmed: 12 },
//   error_count: 2,
//   collected_metrics: 57,
//   collected_events: 63
// }

// Flush manually
await telemetry.flush();

// Cleanup
telemetry.dispose();
```

### Telemetry Configuration

```typescript
interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;  // Custom endpoint for sending metrics
  sampleRate?: number;  // 0.0 to 1.0
  anonymize: boolean;
}
```

---

## Hook API

### Pre-PR Hook

Auto-trigger grill before pull request creation.

```typescript
import { autoGrillHook } from './core/hooks/pre-pr-hook';

const result = await autoGrillHook(
  {
    prTitle: 'Add user authentication',
    prDescription: 'Implements OAuth2',
    branchName: 'feature/auth',
    filesChanged: ['src/auth.ts', 'src/auth.test.ts'],
    baseBranch: 'main',
  },
  { telemetry }
);

if (!result.proceed) {
  console.log('PR blocked:', result.reason);
}
```

### Post-Spawn Hook

Track subagent lifecycle for telemetry.

```typescript
import { trackSubagentSpawn, trackSubagentCompletion } from './core/hooks/post-spawn-hook';

// On spawn
await trackSubagentSpawn(
  {
    subagentId: 'subagent-123',
    taskId: 'task-456',
    taskType: 'code',
    parentSessionId: 'session-789',
    model: 'claude-3-opus',
    estimatedComplexity: 'high',
    toolsRequested: ['read', 'write', 'exec'],
  },
  { telemetry }
);

// On completion
trackSubagentCompletion('subagent-123', spawnTime, telemetry, {
  success: true,
});
```

### Guard Hook

Audit hook for high-risk tool invocations.

```typescript
import { guardHook } from './core/hooks/audit-hook';

const decision = await guardHook(
  {
    toolName: 'exec',
    toolArgs: { command: 'rm -rf /tmp/*' },
    sessionId: 'session-123',
    userId: 'user-456',
    riskLevel: 'critical',
    estimatedImpact: 'data_loss',
  },
  { telemetry }
);

if (!decision.allowed) {
  console.log('Operation blocked:', decision.reason);
  console.log('Alternative:', decision.alternativeAction);
}
```

### Health Check

Diagnostic command for system health.

```typescript
import { HealthChecker } from './core/health-check';

const checker = new HealthChecker(context);

const report = await checker.runDiagnostics();

console.log(report.format());
// subagent-doctor
// ================
// Status: HEALTHY
//
// ✓ Grill skill: Grill command registered and available
// ✓ Subagent router: Subagent router is responsive
// ✓ Opus model: Claude 3 Opus model is available
// ✓ Git integration: Git is installed and repository detected
// ✓ Configuration: All required configuration present
//
// Run with --verbose for more details.
```

---

## Test Mocks API

### Mock Git Operations

```typescript
import {
  parseDiff,
  getChangedFiles,
  countChanges,
  mockRepoStates,
} from '../tests/mocks/mock-git';

// Parse git diff
const diff = mockRepoStates.simpleChange.diff;
const parsed = parseDiff(diff);

// Get changed files
const files = getChangedFiles(diff);
// ['src/auth.ts']

// Count changes
const counts = countChanges(diff);
// { added: 3, removed: 2 }
```

### Mock Opus Guard

```typescript
import { createMockOpusGuard, riskScenarios } from '../tests/mocks/mock-opus';

const guard = createMockOpusGuard({
  riskThreshold: 0.7,
  autoApproveBelow: 0.3,
});

// Evaluate request
const decision = await guard.evaluate({
  action: 'deploy --env production',
  context: { production: true },
  riskScore: 0.8,
  timestamp: Date.now(),
});

// Get audit log
const auditLog = guard.getAuditLog({ escalatedOnly: true });

// Get statistics
const stats = guard.getStats();
// { total: 10, approved: 8, blocked: 2, escalated: 3, avgRiskScore: 0.65 }
```

### Mock Session Manager

```typescript
import {
  createMockRouter,
  spawnParallelWorkers,
  waitForSynthesis,
} from '../tests/mocks/mock-sessions';

const router = createMockRouter();

// Spawn subagents
const workers = [
  { label: 'research', response: { findings: ['Found 1'] } },
  { label: 'audit', response: { findings: ['Found 2'] } },
];

const results = await spawnParallelWorkers(router, workers, { delayMs: 50 });

// Synthesize
const synthesis = await waitForSynthesis(results, 100);
```

---

## Configuration Presets API

### Available Presets

```typescript
const presets = ['enterprise', 'solo-dev', 'team', 'paranoia'];

// Load preset
const config = loadPreset('enterprise');

// Compare presets
const configs = presets.map(name => ({ name, config: loadPreset(name) }));
configs.forEach(({ name, config }) => {
  console.log(`${name}:`);
  console.log(`  Grill: ${config.grill.strictness}`);
  console.log(`  Guard: ${config.opusGuard.enabled ? 'on' : 'off'}`);
});
```

### Custom Presets

Create custom presets by extending base config:

```typescript
import { loadPreset, saveConfig } from './config';

// Start from team preset
const baseConfig = loadPreset('team');

// Customize
const customConfig = {
  ...baseConfig,
  grill: {
    ...baseConfig.grill,
    strictness: 'strict',
    focusAreas: [...baseConfig.grill.focusAreas, 'compliance'],
  },
};

// Save
saveConfig(customConfig, './custom-preset.yaml');
```

---

## CLI Validator API

The `validator.ts` script provides CLI commands for config management.

```bash
# Validate configuration
bun config/validator.ts validate ./my-config.yaml

# Show preset
bun config/validator.ts preset enterprise

# Initialize config
bun config/validator.ts init team

# Show current config
bun config/validator.ts current

# Show diff from defaults
bun config/validator.ts diff

# Output schema
bun config/validator.ts schema

# List presets
bun config/validator.ts presets
```

---

## Error Handling

All APIs follow error handling best practices:

```typescript
try {
  const config = loadConfig('./invalid.yaml');
} catch (error) {
  if (error instanceof ConfigValidationError) {
    console.error('Config validation failed:', error.errors);
  } else if (error instanceof ConfigLoadError) {
    console.error('Failed to load config:', error.path);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Event Types

### Plugin Events

```typescript
// Pre-PR event
interface PrePREvent {
  prTitle: string;
  prDescription: string;
  branchName: string;
  filesChanged: string[];
  baseBranch: string;
}

// High-risk tool event
interface HighRiskToolEvent {
  toolName: string;
  toolArgs: Record<string, unknown>;
  sessionId: string;
  userId?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: string;
}

// Subagent spawn event
interface SubagentSpawnEvent {
  subagentId: string;
  taskId: string;
  taskType: string;
  parentSessionId: string;
  model: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
  toolsRequested: string[];
}
```

### Telemetry Events

```typescript
// Common event names
'grill.completed'
'subagent.spawned'
'subagent.completed'
'subagent.failed'
'guard.decision'
'tool.intercepted'
'error'

// Metric names
'review_time'
'subagent_duration'
'guard_response_time'
```

---

## Integration Examples

### Simple CLI Integration

```typescript
#!/usr/bin/env bun
import { loadConfig } from './config';
import { TelemetryCollector } from './core/telemetry';
import { grillHandler } from './core/commands/grill';

const config = loadConfig();
const telemetry = new TelemetryCollector(config.telemetry);

const context = {
  command: '/grill',
  args: process.argv.slice(2),
  reply: (msg: string) => console.log(msg),
};

await grillHandler(context, { telemetry });
```

### Custom Plugin

```typescript
import type { ClawdbotPlugin } from 'clawdbot/plugin-sdk';

const myPlugin: ClawdbotPlugin = {
  name: 'my-subagent-workflow',
  version: '1.0.0',
  description: 'Custom subagent workflow',
  
  onLoad(context) {
    const config = loadConfig();
    
    // Register custom command
    context.registerCommand('/my-review', async (ctx) => {
      const telemetry = new TelemetryCollector(config.telemetry);
      // Custom logic...
    });
  },
  
  onUnload() {
    // Cleanup
  }
};
```

---

## Type Exports

All types are exported for TypeScript consumers:

```typescript
export {
  // Config
  type SubagentWorkflowConfig,
  type GrillConfig,
  type UseSubagentsConfig,
  type OpusGuardConfig,
  
  // Telemetry
  TelemetryCollector,
  type TelemetryConfig,
  
  // Health
  HealthChecker,
  type HealthReport,
  
  // Hooks
  type PrePRPayload,
  type SubagentSpawnPayload,
  type HighRiskToolPayload,
  
  // Guards
  type GuardDecision,
  type ToolCall,
  type RiskAssessment,
};
```

---

## Version Compatibility

- **Plugin API**: Stable v1.0.0
- **Config Schema**: v1.0.0 (migrations supported)
- **Telemetry**: v1.0.0
- **Test Mocks**: v1.0.0

Future versions will maintain backward compatibility where possible.

---

## See Also

- [Grill Command Reference](./grill.md)
- [Using Subagents](./use-subagents.md)
- [Opus Guard Security Model](./opus-guard.md)
- [FAQ](./faq.md)
- [Config Presets](../config/presets/)
