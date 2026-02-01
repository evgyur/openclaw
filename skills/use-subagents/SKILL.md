---
name: use-subagents
description: Automatic task parallelization via labeled subagents. Detects "use subagents" in requests and decomposes work into research, audit, draft, and verify phases. Main agent synthesizes outputs with conflict resolution. Use for complex multi-phase tasks that benefit from parallel analysis.
metadata:
  clawdbot:
    emoji: 🔀
---

# 🔀 Use Subagents — Parallel Task Router

**Intelligent work parallelization** — breaks complex tasks into concurrent subagent pipelines.

Auto-detects "use subagents" trigger and spawns labeled workers for research, audit, drafting, and verification phases.

---

## Quick Start

### Basic Usage
```bash
use subagents to implement OAuth2 flow
use subagents: refactor the database layer
implement rate limiting (use subagents)
```

### Manual Control
```bash
/subagents plan       # Show decomposition plan without spawning
/subagents spawn      # Execute planned decomposition
/subagents status     # Check progress of active subagents
/subagents synthesize # Manually trigger synthesis
```

---

## How It Works

### 1. Detection
When user message contains:
- "use subagents"
- "with subagents"
- "/subagents"

The router activates and analyzes the task.

### 2. Task Decomposition
Router parses the request into phases:

```
Task: "Implement OAuth2 authentication"

Decomposition:
├── [oauth2-research]  → Gather context (specs, examples, patterns)
├── [oauth2-audit]     → Review current auth state
├── [oauth2-draft]     → Generate implementation options
└── [oauth2-verify]    → Check for conflicts/gaps
```

### 3. Parallel Execution
Subagents spawn simultaneously:
- Each gets a labeled session: `[task]-[phase]`
- Each has a specific mission (see Phase Definitions)
- Progress tracked via session listing

### 4. Synthesis
Main agent:
- Waits for all subagents to complete
- Collects outputs
- Resolves conflicts
- Generates unified recommendation

---

## Phase Definitions

### 🔍 Research Phase
**Label:** `[task]-research`

**Mission:**
- Gather relevant context from codebase
- Find similar implementations
- Check documentation and specs
- Identify patterns and precedents
- List dependencies and requirements

**Output:**
```markdown
## Research Report — OAuth2

### Context
- Current auth: JWT tokens in src/auth/jwt.ts
- Framework: Express.js
- DB: PostgreSQL with Prisma

### Precedents
- Similar impl in src/auth/api-key.ts
- Uses middleware pattern

### Dependencies
- Need: passport, passport-oauth2
- Compatible with existing session store

### Patterns
- Middleware chain: validate → authenticate → authorize
- Token storage: encrypted in DB
```

### 🔎 Audit Phase
**Label:** `[task]-audit`

**Mission:**
- Review current state
- Find existing related code
- Identify what works/breaks
- Map impact areas
- Flag technical debt

**Output:**
```markdown
## Audit Report — OAuth2

### Current State
- Auth logic in src/auth/
- 3 auth methods: JWT, API key, session
- No OAuth support

### Impact Areas
- src/auth/middleware.ts (add new strategy)
- src/routes/auth.ts (new endpoints)
- src/config/auth.ts (OAuth config)
- Database schema (oauth_tokens table)

### Risks
- Breaking: existing JWT flow if not careful
- Security: token storage, PKCE requirement
- Performance: 2 extra DB queries per request

### Technical Debt
- No unified auth interface (mix of patterns)
- Tests mock DB instead of integration
```

### ✏️ Draft Phase
**Label:** `[task]-draft`

**Mission:**
- Generate 2-3 implementation options
- Show tradeoffs
- Provide code snippets
- Estimate complexity

**Output:**
```markdown
## Draft Options — OAuth2

### Option 1: Passport.js Integration (RECOMMENDED)
**Pros:** Battle-tested, wide provider support, middleware pattern matches existing
**Cons:** Heavyweight dependency, learning curve
**Complexity:** Medium (2-3 days)

**Code:**
```typescript
// src/auth/strategies/oauth.ts
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';

passport.use('oauth2', new OAuth2Strategy({
  authorizationURL: config.oauth.authURL,
  tokenURL: config.oauth.tokenURL,
  clientID: config.oauth.clientID,
  clientSecret: config.oauth.clientSecret,
  callbackURL: config.oauth.callbackURL,
}, async (accessToken, refreshToken, profile, done) => {
  // Token validation and user creation
}));
```

### Option 2: Custom Implementation
**Pros:** Lightweight, full control, no dependencies
**Cons:** Security risk, maintenance burden, testing effort
**Complexity:** High (5-7 days)

### Option 3: Auth0/Clerk Integration
**Pros:** Managed service, zero security burden, fast
**Cons:** External dependency, cost, vendor lock-in
**Complexity:** Low (1 day)
```

### ✅ Verify Phase
**Label:** `[task]-verify`

**Mission:**
- Check for conflicts between draft options
- Validate against constraints
- Ensure test coverage plan
- Check security implications
- Verify documentation needs

**Output:**
```markdown
## Verification Report — OAuth2

### Conflicts
- Option 1 vs Option 2: Passport adds 500KB bundle size
- All options need DB migration
- Callback URL routing conflicts with existing /auth/callback

### Constraints
✅ Security: All options support PKCE
❌ Bundle size: Passport exceeds 200KB limit
✅ Testing: Can use Passport mocking library
⚠️ Performance: 2 extra queries acceptable

### Gaps
- Missing: token refresh strategy
- Missing: provider auto-discovery
- Missing: multi-provider support

### Recommendation
→ Option 1 (Passport) with lazy loading to mitigate bundle size
→ Requires: DB migration, route renaming, Passport mocking setup
```

---

## Synthesis Process

After all phases complete, main agent:

### 1. Collect Outputs
```typescript
const research = await getSubagentOutput('[task]-research');
const audit = await getSubagentOutput('[task]-audit');
const draft = await getSubagentOutput('[task]-draft');
const verify = await getSubagentOutput('[task]-verify');
```

### 2. Resolve Conflicts
```
Conflict: Passport bundle size vs dependency preference
Resolution: Use lazy loading + code splitting

Conflict: Route naming collision
Resolution: Rename existing /auth/callback to /auth/jwt/callback
```

### 3. Generate Recommendation
```markdown
## Final Recommendation — OAuth2 Implementation

### Approach
**Option 1: Passport.js** (with modifications)

### Changes Required
1. Add Passport.js (lazy loaded via dynamic import)
2. Create src/auth/strategies/oauth.ts
3. Rename existing callback routes
4. DB migration: oauth_tokens table
5. Tests: Use passport-mock library

### Migration Path
Phase 1: Add OAuth without breaking JWT (1 day)
Phase 2: Unified auth interface (2 days)
Phase 3: Deprecate old patterns (1 day)

### Risk Mitigation
- Bundle size: Lazy load Passport (saves 400KB on initial load)
- Breaking changes: Keep JWT flow untouched
- Security: Follow OAuth 2.1 spec with PKCE

### Next Steps
1. Review this plan
2. Approve Option 1 with modifications
3. Spawn implementation subagent
```

---

## Auto-Labeling Rules

Router automatically assigns labels based on task type:

| Task Pattern | Label Prefix | Example |
|--------------|-------------|---------|
| "implement X" | `impl-X` | `impl-oauth2-research` |
| "refactor X" | `refactor-X` | `refactor-db-audit` |
| "fix X" | `fix-X` | `fix-auth-bug-draft` |
| "add X" | `add-X` | `add-logging-verify` |
| Default | `task-X` | `task-123-research` |

### Label Format
```
[prefix]-[phase]
```

Examples:
- `impl-oauth2-research`
- `refactor-db-layer-audit`
- `fix-rate-limit-draft`
- `add-caching-verify`

---

## Progress Tracking

### Via Session Listing
```bash
/subagents status

# Output:
🔀 Active Subagents (4)

[impl-oauth2-research]  ✅ Complete (2m ago)
[impl-oauth2-audit]     ✅ Complete (1m ago)
[impl-oauth2-draft]     ⏳ Running (45s elapsed)
[impl-oauth2-verify]    ⏸ Waiting (draft dependency)

Next: Synthesis (waiting for draft + verify)
```

### Progress Indicators
- ⏸ **Waiting** — Not started (dependency pending)
- ⏳ **Running** — Currently executing
- ✅ **Complete** — Finished successfully
- ❌ **Failed** — Error occurred
- 🔄 **Retrying** — Retry after failure

---

## Advanced Features

### Dependency Ordering
Some phases depend on others:

```
research → (no deps, start immediately)
audit    → (no deps, start immediately)
draft    → research + audit (wait for both)
verify   → draft (wait for draft)
```

Router handles dependencies automatically.

### Partial Results
If a subagent fails, synthesis continues with available data:

```
✅ research: Complete
✅ audit: Complete
❌ draft: Failed (timeout)
⏸ verify: Skipped (draft failed)

Synthesis: Proceed with research + audit, manual draft needed
```

### Custom Phases
Add project-specific phases via config:

```json
{
  "custom_phases": [
    {
      "name": "security-review",
      "mission": "Check for security implications",
      "dependencies": ["draft"],
      "timeout": 300
    },
    {
      "name": "performance-test",
      "mission": "Benchmark implementation options",
      "dependencies": ["draft"],
      "timeout": 600
    }
  ]
}
```

---

## Configuration

### Per-Project Settings
Create `skills/use-subagents/.subagents-config.json`:

```json
{
  "phases": {
    "research": {
      "enabled": true,
      "timeout": 300,
      "model": "claude-sonnet-4"
    },
    "audit": {
      "enabled": true,
      "timeout": 300,
      "model": "claude-sonnet-4"
    },
    "draft": {
      "enabled": true,
      "timeout": 600,
      "model": "claude-sonnet-4",
      "options_count": 3
    },
    "verify": {
      "enabled": true,
      "timeout": 300,
      "model": "claude-sonnet-4"
    }
  },
  "synthesis": {
    "conflict_resolution": "auto",
    "format": "markdown",
    "include_reasoning": true
  },
  "parallel_limit": 4,
  "retry_failed": true,
  "auto_synthesize": true
}
```

---

## Integration with Other Skills

### With `/grill`
```bash
# After synthesis
use subagents to implement OAuth2

[... subagents run ...]

Main Agent: Here's the recommendation. Ready to implement?

User: Yes

Main Agent: [implements]

Main Agent: Implementation complete. Running grill...
/grill

[... grill analyzes ...]
```

### With `/shaw`
```bash
# Start shaw workflow with subagent research
/shaw implement OAuth2 (use subagents for research)

[Shaw Prompt 1: Plan & Research spawns subagents]
- research subagent gathers context
- audit subagent reviews current state

[Shaw continues with enriched context]
```

---

## Example Session

```
User: use subagents to implement rate limiting for the API

Agent: 🔀 Decomposing task into subagent pipeline...

Task: "implement rate limiting for the API"
Phases:
- [impl-rate-limit-research] → Context gathering
- [impl-rate-limit-audit] → Current state review
- [impl-rate-limit-draft] → Implementation options
- [impl-rate-limit-verify] → Conflict checking

Spawning 4 subagents...

[30 seconds later]

✅ [impl-rate-limit-research] Complete
✅ [impl-rate-limit-audit] Complete
⏳ [impl-rate-limit-draft] Running...

[1 minute later]

✅ [impl-rate-limit-draft] Complete
✅ [impl-rate-limit-verify] Complete

Synthesizing results...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Rate Limiting — Final Recommendation

### Context (from research)
- Current API: Express.js, no rate limiting
- 3 endpoints: /users, /posts, /auth
- Traffic: ~1000 req/min peak
- Redis available for shared state

### Current State (from audit)
- No rate limiting at all
- Nginx upstream has basic limits (100/s)
- Need per-user limits, not just IP-based

### Options (from draft)
1. **express-rate-limit + Redis** (RECOMMENDED)
2. **Nginx rate limiting only**
3. **Custom middleware**

### Recommendation
→ Option 1: express-rate-limit with Redis store
→ Why: Proven, flexible, per-user support, works with existing Redis

### Implementation Plan
1. Install express-rate-limit + rate-limit-redis
2. Create src/middleware/rate-limit.ts
3. Apply to routes: 100/min for /users, 20/min for /auth
4. Add Redis-based store for cluster support
5. Tests: Integration tests with Redis

### Conflicts Resolved
- Redis vs in-memory: Redis chosen for multi-instance support
- Global vs per-endpoint: Per-endpoint for flexibility

Ready to proceed?

User: Yes, implement it

Agent: [implements using the plan]
```

---

## Testing

```bash
# Test decomposition logic
cd skills/use-subagents
python3 tests/test-decomposer.py

# Test synthesis
node tests/test-synthesis.js

# Test full pipeline
./scripts/test-pipeline.sh "implement OAuth2"
```

---

## Files

```
use-subagents/
├── SKILL.md                    # This file
├── .subagents-config.json      # Default config
├── scripts/
│   ├── decomposer.py           # Task decomposition engine
│   ├── synthesizer.ts          # Output synthesis logic
│   ├── session-tracker.ts      # Progress tracking
│   └── test-pipeline.sh        # Integration test
├── templates/
│   ├── research-prompt.md      # Research phase template
│   ├── audit-prompt.md         # Audit phase template
│   ├── draft-prompt.md         # Draft phase template
│   └── verify-prompt.md        # Verify phase template
├── examples/
│   ├── oauth2.md               # Full example session
│   └── rate-limiting.md        # Another example
└── tests/
    ├── test-decomposer.py      # Decomposition tests
    ├── test-synthesis.js       # Synthesis tests
    └── fixtures/               # Test data
```

---

## Tips

### When to Use Subagents
✅ Complex multi-phase tasks
✅ Tasks needing parallel research
✅ Multiple implementation options to compare
✅ High-risk changes needing thorough review

❌ Simple one-step tasks
❌ Already have clear implementation
❌ Time-sensitive quick fixes

### Optimization
```bash
# Fast mode (skip verify phase)
use subagents --fast to implement X

# Research only (no implementation)
use subagents --research-only for OAuth2

# Custom phases
use subagents --phases research,draft to add caching
```

---

## Credits

Inspired by:
- **MapReduce** — parallel processing pattern
- **Code review workflows** — multi-reviewer consensus
- **Agent swarms** — collaborative AI systems

---

## Version

**Use Subagents v1.0** — "Divide and Conquer"
