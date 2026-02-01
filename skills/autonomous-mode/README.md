# Autonomous Coding Mode

Automatic decision-making system for intelligent workflow automation during code writing.

## Overview

Autonomous Coding Mode eliminates manual "should I spawn subagents?" decisions by having the main agent automatically:

- **Spawn use-subagents** for complex parallel research
- **Route through opus-guard** for risky operations
- **Trigger grill** for pre-commit code review

All decisions happen silently based on task context analysis.

## Quick Start

```typescript
import { AutonomousInterceptor } from './index.ts';

const interceptor = new AutonomousInterceptor('balanced');
const hooks = createHooks(interceptor);

// Hook into your agent's tool calls
await hooks.beforeWrite(context);
await hooks.beforeEdit(context);
await hooks.beforeExec(context);
```

## Configuration

Edit `config.yaml` to tune sensitivity:

```yaml
autonomous_mode:
  enabled: true
  sensitivity: balanced  # aggressive | balanced | conservative
  silent_mode: true
  present_results: summary
```

## Files

- `decision.ts` — Heuristics engine
- `analyzer.ts` — Context signal extraction
- `spawner.ts` — Auto-spawn logic
- `integration.ts` — Tool call hooks
- `config.yaml` — Configuration
- `SKILL.md` — Full documentation
- `examples/` — Workflow examples
- `tests/` — Test suite

## Commands

```
/autonomous status      # Show decision log
/autonomous sensitivity # Adjust sensitivity
/autonomous off         # Disable for session
```

## Override Per-Task

```
"Skip guard: implement this now"
"No subagents: write code directly"
"Manual mode: disable autonomous"
```

## Version

1.0.0 — "Think Less, Code More"
