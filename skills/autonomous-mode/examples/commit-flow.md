# Example: Auto-Grill on Commit

This example demonstrates autonomous pre-commit code review.

---

## Scenario

Main agent finishes implementing a feature and prepares to commit.

---

## Step 1: Code Completion

```
[Main agent finishes changes]

Files changed: 5
- src/api/rate-limit.ts (new)
- src/middleware/rate-limiter.ts (new)
- src/config/security.ts (modified)
- src/routes/api.ts (modified)
- tests/rate-limit.test.ts (new)

5 files changed, 247 insertions(+), 12 deletions(-)
```

---

## Step 2: Context Analysis (Pre-Commit)

```typescript
const taskContext = {
  complexity: 6,        // Rate limiting logic
  impactFiles: 5,       // 5 files changed
  uncertainty: 0.5,     // Moderate confidence
  riskLevel: 'medium',  // Security-related
  operation: 'implement', // Parsed from task
  patterns: ['security', 'middleware', 'api'],
  scope: { /* normal workspace */ },
};
```

---

## Step 3: Decision

```typescript
const decision = {
  shouldParallelize: false,  // Not complex enough
  shouldGuard: false,        // Medium risk, no critical patterns
  shouldGrill: true,         // files 5 >= 3 ✓, operation = implement
  reasoning: "Grill: files=5, operation=implement",
  confidence: 0.5,
};
```

---

## Step 4: Auto-Grill Triggered

```
[Before commit]
🤖 Autonomous actions: grill triggered

🔥 Critic mode activated. Analyzing 5 changed files...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 5: Critic Analysis

### Research (Background)
- Found: Rate limiting patterns in codebase
- Similar impl: src/auth/api-key.ts uses sliding window
- Dependencies: ioredis already present ✓

### Audit (Background)
- 5 files touched
- Middleware added to express pipeline
- No breaking changes to API format
- Tests included ✓

### Draft (Background)
- Token bucket vs sliding window vs fixed window
- Chose: Token bucket (most flexible)
- Alternative: Fixed window (simpler, less accurate)

### Verify (Background)
- No conflicts with existing auth middleware
- Redis key naming won't collide
- Test coverage adequate

---

## Step 6: Issues Reported

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ MUST_FIX (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] src/api/rate-limit.ts:34
    ❌ Redis connection not closed on error
    💡 Add try/finally or connection pooling
    
    Current code:
    ```typescript
    const client = new Redis(config.redis.url);
    const result = await client.get(key);  // ← connection leaked on error
    ```
    
    Fix:
    ```typescript
    const client = redisPool.acquire();
    try {
      const result = await client.get(key);
    } finally {
      redisPool.release(client);
    }
    ```

[2] src/middleware/rate-limiter.ts:67
    ❌ Rate limit headers missing
    💡 Add X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
    
    Required by RFC 6585 and expected by API clients.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CONSIDER (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[3] src/config/security.ts:89
    🤔 Hardcoded rate limits (100/min, 1000/hour)
    💡 Move to environment config for different tiers
    
    Suggestion:
    ```yaml
    rate_limits:
      default: { per_minute: 100, per_hour: 1000 }
      premium: { per_minute: 1000, per_hour: 10000 }
    ```

[4] tests/rate-limit.test.ts:45
    🤔 Tests use real Redis, not mocked
    💡 Fine for integration tests, but add unit tests with mock
    
    Note: This slows CI by ~2s per test run.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 NIT (4)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[5] src/api/rate-limit.ts:12
    Minor: Unused import `EventEmitter`

[6] src/middleware/rate-limiter.ts:23
    Minor: Inconsistent JSDoc format

[7] src/config/security.ts:45
    Minor: Magic number 60 (seconds) should be constant

[8] tests/rate-limit.test.ts:78
    Minor: Test description could be clearer
    "should limit" → "should reject when limit exceeded"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary: 2 critical, 2 concerns, 4 style issues
⚠️  Cannot proceed with MUST_FIX items unresolved.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commands:
  ack [number]  — Acknowledge issue (with reason)
  fix [number]  — Open file in editor at line
  explain [N]   — Get more details
  recheck       — Re-run analysis after fixes
  override      — Force commit (not recommended)
```

---

## Step 7: Issue Resolution

```
User: fix 1
→ Opens src/api/rate-limit.ts:34
→ User adds connection pooling

User: fix 2
→ Opens src/middleware/rate-limiter.ts:67
→ User adds rate limit headers

User: ack 3 Good point, will do in follow-up PR for premium tier
User: ack 4 Integration tests are intentional for Redis behavior

User: recheck
```

---

## Step 8: Re-Check

```
🔥 Re-analyzing 5 changed files...

✅ Issue #1 resolved (Redis connection pooling added)
✅ Issue #2 resolved (Rate limit headers added)
📝 Issues #3-4 acknowledged

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 All MUST_FIX items resolved!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Still have 2 CONSIDER and 4 NIT items.
Ready to commit?

User: yes
```

---

## Step 9: Commit

```
[git commit -m "feat: add rate limiting middleware

- Implement token bucket rate limiting
- Add Redis-backed storage
- Include standard rate limit headers
- Add connection pooling for Redis
- Add integration tests

Fixes:
- Connection leak on Redis error
- Missing X-RateLimit-* headers

Acknowledged (follow-up):
- Configurable limits for premium tiers
- Additional unit tests with mocks"]

[main a8b4c2d] feat: add rate limiting middleware
 5 files changed, 289 insertions(+), 12 deletions(-)
```

---

## What Was Caught

| Issue | Severity | Impact if Missed |
|-------|----------|------------------|
| Redis connection leak | Critical | Memory exhaustion, service degradation |
| Missing rate limit headers | Critical | API client confusion, RFC non-compliance |
| Hardcoded limits | Medium | Can't adjust for different user tiers |
| Slow tests | Low | CI takes 2s longer per run |

---

## Without Autonomous Mode

```
[Main agent commits]
[main a8b4c2d] feat: add rate limiting middleware
 5 files changed, 247 insertions(+), 12 deletions(-)

[Days later...]
Production incident: Redis connections exhausted
Root cause: Connection leak in rate limiter
Impact: 30min downtime, angry customers
```

---

## With Autonomous Mode

```
🤖 Autonomous actions: grill triggered
[Issues caught and fixed before commit]

[Main agent commits]
[main a8b4c2d] feat: add rate limiting middleware
 5 files changed, 289 insertions(+), 12 deletions(-)

[Production stable]
No incidents. Rate limiting working as expected.
```

---

## Summary

| Metric | Value |
|--------|-------|
| Issues caught pre-commit | 2 critical |
| Time to fix | ~3 minutes |
| User interruptions | 0 (auto-triggered) |
| Production incidents prevented | 1+ |

**Key insight:** The connection leak would have caused a production incident.  
Autonomous grill caught it during development, not during an outage.
