---
name: autonomous-mode
description: Automatic decision-making system that silently spawns subagents, routes risky operations through security checks, and triggers code reviews based on task context. Eliminates manual "should I spawn?" decisions during coding.
metadata:
  clawdbot:
    emoji: 🤖
---

# 🤖 Autonomous Coding Mode

**Silent workflow automation** — the main agent automatically decides when to use subagents, trigger security checks, and request code reviews.

---

## Quick Start

### Automatic Operation
Autonomous mode runs silently in the background:
```
User: Refactor auth to use JWT
Agent: 🤖 Autonomous actions: use-subagents triggered
     → [jwt-auth-research, jwt-auth-audit, jwt-auth-draft, jwt-auth-verify]
     
     [after subagents complete]
     Analyzed 3 approaches. Recommended: Option B (Passport.js with lazy loading)
```

### Manual Control
```bash
/autonomous status        # Show current decision log
/autonomous sensitivity   # View/adjust sensitivity level
/autonomous log           # View recent autonomous actions
/autonomous off           # Disable for this session
```

### Override Per-Task
```
Skip guard: implement this now without checking
No subagents: write the code directly
Manual mode: disable autonomous for this request
```

---

## How It Works

### Architecture Overview

```
User Request
    ↓
┌─────────────────┐
│ Context Analyzer│ ← Analyzes intent, risk, complexity
└────────┬────────┘
         ↓
┌─────────────────┐
│ Decision Engine │ ← Applies heuristics to TaskContext
└────────┬────────┘
         ↓
┌─────────────────┐
│ Auto-Spawner    │ ← Silently triggers workflows
└────────┬────────┘
         ↓
┌─────────────────┐
│ Integration     │ ← Hooks into tool calls
└─────────────────┘
```

### Decision Flow

```
┌─────────────────────────────────────────────────────┐
│  User: "Refactor auth to use JWT"                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  ANALYSIS                                           │
│  operation: refactor                                │
│  complexity: 9 (auth system complexity)             │
│  impactFiles: 8 (git diff count)                    │
│  uncertainty: 0.4 (JWT pattern unfamiliar)          │
│  riskLevel: high (authentication changes)           │
│  patterns: [auth, authentication, refactor]         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  DECISION (balanced sensitivity)                    │
│  shouldParallelize: YES (complexity > 7 ✓)          │
│  shouldGuard: YES (riskLevel = high ✓)              │
│  shouldGrill: YES (files > 3, operation=refactor)   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  EXECUTION (silent mode)                            │
│  1. Route through opus-guard → APPROVED             │
│  2. Spawn use-subagents → 4 workers                 │
│  3. Present synthesis → user approves               │
│  4. Implementation → auto-grill triggers            │
└─────────────────────────────────────────────────────┘
```

---

## Decision Heuristics

### TaskContext Signals

| Signal | Values | Description |
|--------|--------|-------------|
| `complexity` | 0-10 | Estimated from lines changed, nesting depth, dependencies |
| `impactFiles` | ≥0 | Number of files touched (from git diff) |
| `uncertainty` | 0-1 | Model confidence (lower = more uncertain) |
| `riskLevel` | low/medium/high/critical | Based on patterns (auth, delete, etc.) |
| `operation` | refactor/implement/fix/delete/deploy | Parsed from user intent |
| `patterns` | string[] | Detected keywords (delete, auth, payment) |
| `scope` | object | Workspace violations, system paths, credentials |

### Decision Functions

```typescript
function shouldParallelize(ctx: TaskContext): boolean {
  // Require at least 2 criteria for parallelization
  const triggers = [
    ctx.complexity > COMPLEXITY_THRESHOLD,
    ctx.impactFiles > FILES_THRESHOLD, 
    ctx.uncertainty < CONFIDENCE_THRESHOLD,
  ];
  return triggers.filter(Boolean).length >= 2;
}

function shouldGuard(ctx: TaskContext): boolean {
  // Check risk level against threshold
  if (RISK_LEVELS.includes(ctx.riskLevel)) return true;
  
  // Check for dangerous patterns
  for (const pattern of ctx.patterns) {
    if (ALWAYS_CHECK_PATTERNS.includes(pattern)) return true;
  }
  
  // Check scope violations
  return ctx.scope?.outsideWorkspace || 
         ctx.scope?.systemPaths || 
         ctx.scope?.credentials;
}

function shouldGrill(ctx: TaskContext): boolean {
  // Always grill large changes
  if (ctx.impactFiles >= MIN_FILES_CHANGED) return true;
  
  // Grill specific operations regardless of size
  return OPERATIONS.includes(ctx.operation);
}
```

---

## Sensitivity Levels

Choose your risk tolerance:

### 🟢 Balanced (Default)
```yaml
parallelize:
  complexity_threshold: 7
  impact_files_threshold: 5
  uncertainty_threshold: 0.6
guard:
  risk_levels: [high, critical]
  patterns: [delete, rm -rf, sudo, auth, payment]
grill:
  min_files_changed: 3
  operations: [refactor, implement]
```
**Use for:** Daily development, team workflows, production code

### 🔴 Aggressive
```yaml
parallelize:
  complexity_threshold: 5
  impact_files_threshold: 3
  uncertainty_threshold: 0.7
guard:
  risk_levels: [medium, high, critical]
  patterns: [delete, rm, auth, payment, sudo, external]
grill:
  min_files_changed: 2
  operations: [refactor, implement, delete]
```
**Use for:** High-stakes code, critical infrastructure, learning

### 🔵 Conservative
```yaml
parallelize:
  complexity_threshold: 9
  impact_files_threshold: 8
  uncertainty_threshold: 0.5
guard:
  risk_levels: [critical]
  patterns: [rm -rf /, drop database]
grill:
  min_files_changed: 5
  operations: [refactor]
```
**Use for:** Quick fixes, simple tasks, when autonomy feels intrusive

### Changing Sensitivity
```bash
/autonomous sensitivity aggressive   # Switch to aggressive
/autonomous sensitivity balanced     # Back to balanced
/autonomous sensitivity conservative # Minimal automation
```

---

## Example Workflows

### Scenario 1: Refactoring Auth System
```
User: "Refactor auth to use JWT"

[Context Analyzer]
operation: refactor
complexity: 9 (auth system patterns)
impactFiles: 8 (current git diff)
uncertainty: 0.4 (new pattern)
riskLevel: high (authentication)
patterns: [auth, authentication, refactor]

[Decision Engine]
shouldParallelize: YES (complexity 9 > 7, files 8 > 5)
shouldGuard: YES (riskLevel = high)
shouldGrill: YES (files 8 > 3, operation = refactor)

[Auto-Spawner]
1. → opus-guard: "JWT refactor security check" → APPROVED
2. → use-subagents: "JWT auth implementation"
   - [jwt-auth-research]  → Context gathering
   - [jwt-auth-audit]     → Current auth review
   - [jwt-auth-draft]     → Implementation options
   - [jwt-auth-verify]    → Conflict checking
3. ← Synthesis received

[User sees]
🤖 Autonomous actions: use-subagents triggered

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 JWT Auth — Research Synthesis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I analyzed 3 approaches in parallel:

**Option 1: Passport.js with JWT Strategy** ⭐ RECOMMENDED
- Pros: Battle-tested, middleware pattern matches existing
- Cons: Extra dependency

**Option 2: Custom JWT Implementation**
- Pros: Full control, smaller bundle
- Cons: Security risk, maintenance burden

**Option 3: Auth0 Integration**
- Pros: Zero security burden
- Cons: External dependency, ongoing cost

Recommendation: Option 1 with lazy loading

[User] Yes, implement it

[After implementation]
🤖 Autonomous actions: grill triggered

🔥 Pre-commit review: 1 MUST_FIX
- src/auth.ts:42 — No rate limiting on refresh endpoint

[User fixes] → commit → done
```

### Scenario 2: Risky Deletion
```
User: "Delete the production database"

[Context Analyzer]
operation: delete
complexity: 3
impactFiles: 0 (not yet executed)
uncertainty: 0.2 (user intent unclear)
riskLevel: critical (delete + production + database)
patterns: [delete, database, production]

[Decision Engine]
shouldParallelize: NO (not complex enough)
shouldGuard: YES (critical riskLevel, matches "delete")
shouldGrill: NO (no files changed yet)

[Auto-Spawner]
→ opus-guard: "Delete production database"
   ⚠️  CRITICAL RISK DETECTED
   
   Risk Factors:
   - Irreversible data loss
   - Production environment
   - No backup verification
   
   Confidence: 0.95 (critical)
   Verdict: BLOCKED

[User sees]
🛡️ Opus Guard Alert — Operation Blocked

Tool: exec (delete database)
Risk: CRITICAL

**Why blocked:**
- Irreversible data loss detected
- Production environment targeted
- No backup verification present

This operation was blocked to protect your system.

If you're sure, use override: "/override delete production db"
```

### Scenario 3: Committing Changes
```
[Main agent finishes writing code]
Files changed: 5

[Auto-trigger]
→ grill --quick

[User sees]
🤖 Autonomous actions: grill triggered

🔥 Critic mode activated. Analyzing 5 changed files...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ MUST_FIX (1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] src/api.ts:89
    ❌ Breaking change to response format, no migration guide
    💡 Add version header or deprecation warning

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CONSIDER (1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[2] src/cache.ts:12
    🤔 No TTL on cache entries
    💡 Add expiration policy

[User] ack 1 Will add in follow-up PR
        fix 2 → [opens file] → [adds TTL]
        recheck

🔥 Re-analyzing...
🟢 All MUST_FIX items resolved!
```

---

## Override Commands

### Per-Session
```bash
/autonomous off          # Disable for this session
/autonomous on           # Re-enable
/autonomous status       # Check current state
```

### Per-Task
```
"Implement this without subagents"
→ skips use-subagents for this request only

"Skip guard check for this file"
→ skips opus-guard for this operation

"No grill this time"
→ skips pre-commit review
```

### Pattern-Based
```yaml
# In .autonomous.yaml in project root
disable_for_operations:
  - delete           # Never auto-guard deletes
  
require_confirmation_for:
  - critical         # Always ask for critical
  
ignore_patterns:
  - "*.test.ts"      # Don't grill tests
  - "docs/**"        # Don't grill docs
```

---

## Integration Points

### Before `write`/`edit`
```typescript
// Automatically checks:
// - Risk patterns (auth, delete, etc.)
// - File count thresholds
// - Scope violations

if (decision.shouldParallelize) {
  // Spawn use-subagents for research
}
if (decision.shouldGuard) {
  // Route through opus-guard
}
```

### Before `exec` with git/commit
```typescript
// Triggers grill if:
// - git commit/push detected
// - Enough files changed
// - Operation matches grill criteria

if (decision.shouldGrill) {
  // Run grill --quick before commit
}
```

### Before `exec` with delete/rm
```typescript
// Forces opus-guard for:
// - rm -rf
// - drop table/database
// - sudo operations

if (dangerousCommand) {
  // Block and escalate immediately
}
```

### After Complex Tool Sequences
```typescript
// Detects 3+ consecutive file operations
// Suggests grill if pattern indicates complexity

if (complexSequence) {
  console.log("💡 Suggestion: Run /grill to review changes");
}
```

---

## Transparency & Logging

### Execution Log
Every autonomous action is logged:
```json
{
  "timestamp": "2026-01-31T12:00:00Z",
  "user_request": "Refactor auth to use JWT",
  "context": {
    "complexity": 9,
    "impactFiles": 8,
    "uncertainty": 0.4,
    "riskLevel": "high",
    "operation": "refactor"
  },
  "decision": {
    "shouldParallelize": true,
    "shouldGuard": true,
    "shouldGrill": true,
    "reasoning": "Complex auth refactor with high risk"
  },
  "triggered": ["opus-guard", "use-subagents"]
}
```

### View Log
```bash
/autonomous log              # Last 10 actions
/autonomous log --all        # Full history
/autonomous log --today      # Today's actions
/autonomous log --export     # Export to file
```

---

## Graceful Degradation

### Subagent Failure
```
⚠️ Autonomous spawn failed: connection timeout

Continuing with main agent for: Implement OAuth2

(You can disable autonomous mode with: /autonomous off)
```

### Guard Timeout
```
🛡️ Opus Guard timeout (30s exceeded)

Options:
1. Approve (trusting local heuristics)
2. Deny (block operation)
3. Wait longer
```

### Always Recovers
- If subagents fail → main agent continues solo
- If guard times out → prompt user
- If config is invalid → fall back to defaults

---

## Files

```
autonomous-mode/
├── SKILL.md                    # This documentation
├── config.yaml                 # Default configuration
├── decision.ts                 # Decision engine heuristics
├── analyzer.ts                 # Context analysis
├── spawner.ts                  # Auto-spawn logic
├── integration.ts              # Tool call hooks
├── examples/
│   ├── auth-refactor.md        # Full session example
│   ├── risky-deletion.md       # Guard example
│   └── commit-flow.md          # Grill example
└── tests/
    └── autonomous-mode.test.ts # Test suite
```

---

## Configuration Reference

### Full Config Schema
```yaml
autonomous_mode:
  enabled: true
  sensitivity: balanced
  silent_mode: true
  present_results: summary  # summary | detailed | none
  
  triggers:
    parallelize:
      aggressive: { complexity_threshold: 5, impact_files_threshold: 3, uncertainty_threshold: 0.7 }
      balanced: { complexity_threshold: 7, impact_files_threshold: 5, uncertainty_threshold: 0.6 }
      conservative: { complexity_threshold: 9, impact_files_threshold: 8, uncertainty_threshold: 0.5 }
    
    guard:
      aggressive: { risk_levels: [medium, high, critical], ... }
      balanced: { risk_levels: [high, critical], ... }
      conservative: { risk_levels: [critical], ... }
    
    grill:
      aggressive: { min_files_changed: 2, operations: [refactor, implement, delete] }
      balanced: { min_files_changed: 3, operations: [refactor, implement] }
      conservative: { min_files_changed: 5, operations: [refactor] }
  
  override_keywords:
    - skip guard
    - no subagents
    - disable autonomous
    - manual mode
  
  logging:
    enabled: true
    log_path: ~/.clawdbot/logs/autonomous-mode.jsonl
    retention_days: 30
  
  fallback:
    on_subagent_failure: continue
    on_guard_timeout: prompt
    timeout_seconds: 30
```

### Per-Project Override
Create `.autonomous.yaml` in project root:
```yaml
autonomous_mode:
  sensitivity: aggressive  # Stricter for this project
  
  disable_for_operations:
    - delete  # Never auto-guard here
    
  ignore_patterns:
    - "**/*.spec.ts"  # Don't grill test files
```

---

## Tips

### When Autonomous Mode Helps
✅ Complex multi-file refactors
✅ Unfamiliar patterns or technologies
✅ Authentication/authorization changes
✅ Pre-commit code review
✅ Risky operations (deletes, schema changes)

### When to Disable
❌ Simple one-liner fixes
❌ Quick documentation updates
❌ When it feels intrusive (switch to conservative)

### Tuning Tips
1. Start with `balanced` — most workflows
2. Use `aggressive` for critical systems
3. Use `conservative` for experimentation
4. Check `/autonomous log` after sessions to see what triggered

---

## Version

**Autonomous Coding Mode v1.0** — "Think Less, Code More"

Inspired by:
- Shaw workflow patterns
- Opus Guard security gates
- Use Subagents parallelization
- Grill code review automation

---

## Related Skills

- **use-subagents** — Parallel task decomposition
- **opus-guard** — AI security evaluation
- **grill** — Pre-commit code review
- **shaw** — Full development workflow
