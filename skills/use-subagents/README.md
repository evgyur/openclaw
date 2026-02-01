# use-subagents Skill

**Auto-parallelize complex tasks across specialized worker subagents.**

## Overview

The `use-subagents` skill decomposes complex requests into four parallel workstreams:

1. **Research**: Context, documentation, prior art
2. **Audit**: Current implementation, technical debt, risks
3. **Draft**: Alternative approaches, ranked and justified
4. **Verify**: Conflicts, edge cases, testing, migration

Each worker runs concurrently as a subagent. Results are synthesized with conflict detection and ranking.

## Quick Start

Just include `use subagents` in your request:

```
"Refactor the authentication system, use subagents"
```

The router will:
- Extract the task (`"Refactor the authentication system"`)
- Spawn 4 specialized workers
- Track progress with live updates
- Synthesize findings with conflict warnings
- Rank implementation options by verification criteria

## Architecture

```
┌─────────────────────────────────────────────────┐
│              User Request                       │
│   "Refactor auth system, use subagents"        │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  router.ts     │  Parse task, spawn workers
         └────────┬───────┘
                  │
      ┌───────────┼───────────┬───────────┐
      ▼           ▼           ▼           ▼
┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│ Research ││  Audit   ││  Draft   ││  Verify  │ (concurrent)
└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘
     │           │           │           │
     └───────────┴───────────┴───────────┘
                  │
                  ▼
         ┌────────────────┐
         │ synthesizer.ts │  Merge, detect conflicts
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │   Synthesis    │  Unified recommendation
         └────────────────┘
```

## Worker Roles

### Research Worker
**Goal**: Gather comprehensive context

- Searches codebase for related implementations
- Reviews commit history and PRs
- Documents external dependencies
- Identifies best practices

**Output**:
- Context: What exists today
- Prior Art: Similar code in the repo
- External References: Docs, libraries, standards
- Key Insights: Critical findings

### Audit Worker
**Goal**: Assess current state critically

- Reviews existing implementation
- Identifies technical debt and bugs
- Flags security and performance issues
- Documents test coverage gaps

**Output**:
- Current State: How it works
- Technical Debt: What needs fixing
- Risks: Security, performance concerns
- Test Coverage: What's tested/untested
- Breaking Changes: Required API changes

### Draft Worker
**Goal**: Propose implementation options

- Generates 3 alternative approaches
- Ranks by complexity, risk, maintainability
- Estimates effort and timeline
- Recommends preferred option

**Output**:
- Option A/B/C: Description, pros/cons, effort
- Recommendation: Preferred path + rationale

### Verify Worker
**Goal**: Risk mitigation and validation

- Checks for conflicts with other components
- Identifies edge cases
- Documents testing requirements
- Plans migration and rollback

**Output**:
- Conflicts: Integration issues
- Edge Cases: Uncovered scenarios
- Testing Needs: Unit/integration/e2e tests
- Migration Plan: Rollout steps
- Rollback Strategy: Revert process

## Synthesis Process

The synthesizer (`synthesizer.ts`) performs:

1. **Conflict Detection**: Compares research and audit outputs for contradictions
2. **Option Ranking**: Cross-references draft options with verify concerns
3. **Unified Report**: Combines all findings with clear structure

### Conflict Examples

- ⚠️ Research found X is best practice, but Audit shows Y vulnerability
- ⚠️ Research missed test gaps that Audit highlighted

### Ranking Logic

Draft options are re-ranked based on verify worker's risk assessment:
- ✓ Option A (verified) - Low risk, smooth migration
- ⚠️ Option B (verification concerns) - Complex rollback

## Progress Tracking

Workers are polled every 2 seconds. Status indicators:
- ✓ Completed
- ✗ Failed
- ⏱ Timeout (5 minutes)

Partial results are synthesized if some workers timeout.

## Usage Examples

### Refactoring
```
"Refactor the database layer, use subagents"
```

### Feature Development
```
"Add real-time notifications to the app, use subagents"
```

### Architecture Review
```
"Review the microservices architecture for scalability issues, use subagents"
```

### Security Audit
```
"Audit the API authentication flow, use subagents"
```

## Implementation Notes

### Current Limitations

The current implementation includes simulation stubs for:
- `sessions_spawn`: Worker spawning
- `sessions_list`: Status polling

These need to be replaced with actual session API calls when integrated into the OpenClaw platform.

### Integration Points

To integrate with OpenClaw:

1. Replace `spawnWorker` stub with:
   ```typescript
   const session = await sessions_spawn({
     label: config.label,
     prompt: config.prompt,
     background: true,
   });
   ```

2. Replace `getSessionStatus` stub with:
   ```typescript
   const sessions = await sessions_list({ label });
   const session = sessions.find(s => s.id === sessionId);
   ```

3. Wire router into skill trigger detection in main agent loop

## Configuration

### Timeouts

Default: 5 minutes per worker

Adjust in `router.ts`:
```typescript
const WORKER_TIMEOUT_MS = 5 * 60 * 1000; // milliseconds
```

### Poll Interval

Default: 2 seconds

Adjust in `router.ts`:
```typescript
const POLL_INTERVAL_MS = 2000; // milliseconds
```

### Worker Prompts

Customize worker prompts in `createWorkerConfigs()` in `router.ts`.

## Testing

```bash
npm test
```

Tests cover:
- Task extraction and slug generation
- Worker config creation
- Conflict detection logic
- Option ranking
- Synthesis report formatting

## License

MIT
