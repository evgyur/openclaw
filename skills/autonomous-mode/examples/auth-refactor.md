# Example: Refactoring Auth System with Autonomous Mode

This example demonstrates a full autonomous workflow for implementing JWT authentication.

---

## User Request

```
User: "Refactor auth to use JWT instead of session cookies"
```

---

## Step 1: Context Analysis

```typescript
// analyzer.ts produces:
const taskContext = {
  complexity: 9,        // Auth systems are complex
  impactFiles: 8,       // Current git diff shows 8 files
  uncertainty: 0.4,     // JWT pattern unfamiliar
  riskLevel: 'high',    // Authentication changes
  operation: 'refactor', // Parsed from message
  patterns: ['auth', 'authentication', 'refactor', 'JWT'],
  scope: {
    outsideWorkspace: false,
    systemPaths: false,
    credentials: true,  // Password/token handling
  },
};
```

---

## Step 2: Decision

```typescript
// decision.ts evaluates (balanced sensitivity):
const decision = {
  shouldParallelize: true,  // complexity 9 > 7 ✓, files 8 > 5 ✓
  shouldGuard: true,        // riskLevel = 'high' ✓
  shouldGrill: true,        // files 8 > 3 ✓, operation = refactor ✓
  reasoning: "Complex auth refactor with high risk",
  confidence: 0.6,
};
```

---

## Step 3: Execution

### 3a. Opus Guard Check (First - Security Gate)
```
→ opus-guard: "JWT auth refactor"

Evaluation:
- Critical risk: Authentication changes can lock out users
- Pattern detected: credentials scope
- Scope: Within workspace ✓

Verdict: APPROVED (with recommendations)
- Recommend: Implement grace period for migration
- Recommend: Add fallback for session users
```

### 3b. Use Subagents Spawn
```
→ use-subagents: "JWT auth implementation"

Spawning 4 workers:
├─ [jwt-auth-research]  ✅ (45s)
├─ [jwt-auth-audit]     ✅ (32s)
├─ [jwt-auth-draft]     ✅ (1m 12s)
└─ [jwt-auth-verify]    ✅ (28s)
```

#### Research Phase Output
```markdown
## Research Report — JWT Authentication

### Current State
- Session-based auth in src/auth/session.ts
- 8 endpoints use session middleware
- User data stored in Redis

### JWT Requirements
- Access token: 15min TTL
- Refresh token: 7day TTL
- Blacklist for logout

### Precedents
- src/auth/api-key.ts uses similar pattern
- Can reuse token storage logic

### Dependencies
- Need: jsonwebtoken
- Optional: jwks-rsa for key rotation
```

#### Audit Phase Output
```markdown
## Audit Report — Current Auth

### Files to Modify
- src/auth/session.ts (convert to JWT)
- src/middleware/auth.ts (JWT verification)
- src/routes/auth.ts (token endpoints)
- src/models/user.ts (token storage)
- src/config/auth.ts (JWT config)
- 3 API route files (update middleware)

### Breaking Changes
- Session cookie → Authorization header
- /api/login response format changes
- Logout behavior (client vs server)

### Risks
- Token refresh race conditions
- Clock skew with exp/iat
- Token size vs cookies
```

#### Draft Phase Output
```markdown
## Implementation Options

### Option 1: jsonwebtoken + Redis Blacklist
**Pros:** Proven, fast lookup for logout
**Cons:** Extra Redis dependency
**Complexity:** Medium

### Option 2: Stateless JWT (no blacklist)
**Pros:** Simple, no storage
**Cons:** Can't revoke tokens immediately
**Complexity:** Low

### Option 3: Custom Token Store
**Pros:** Full control
**Cons:** More code to maintain
**Complexity:** High

**RECOMMENDATION: Option 1** (best balance)
```

#### Verify Phase Output
```markdown
## Verification Report

### Conflicts
- Option 2 vs security requirements: Can't revoke immediately
- Option 3 vs timeline: Too complex for deadline

### Gaps
- Missing: token refresh strategy
- Missing: error handling for expired tokens

### Final Recommendation
→ Option 1 with 15min/7day TTL split
→ Requires: Redis blacklist, refresh endpoint
```

---

## Step 4: Synthesis

```
🤖 Autonomous actions: use-subagents completed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 JWT Auth — Final Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I analyzed 3 approaches in parallel. Recommended: Option B

### Approach: jsonwebtoken + Redis Blacklist

### Changes Required
1. Install: jsonwebtoken, @types/jsonwebtoken
2. Create: src/auth/jwt.ts (token generation/validation)
3. Modify: src/middleware/auth.ts (JWT verification)
4. Modify: src/routes/auth.ts (add /refresh endpoint)
5. Modify: src/models/user.ts (token storage schema)
6. Migration: Keep sessions for 24h grace period

### Security Considerations (from opus-guard)
- ✅ Short-lived access tokens (15min)
- ✅ Refresh token rotation recommended
- ✅ Redis blacklist for immediate logout

### Breaking Changes
- API clients must send Authorization header
- Login response format changes (adds tokens)
- Grace period allows existing sessions

### Migration Path
Phase 1: Add JWT alongside sessions (1 day)
Phase 2: Update clients to use JWT (1 week)
Phase 3: Remove session support (2 weeks)

Ready to implement?
```

---

## Step 5: User Approval

```
User: Yes, implement it
```

---

## Step 6: Implementation

[Main agent implements using the synthesis]

```
✓ Created src/auth/jwt.ts (token utils)
✓ Modified src/middleware/auth.ts (JWT verification)
✓ Modified src/routes/auth.ts (+ /refresh)
✓ Modified src/models/user.ts (token schema)
✓ Modified 3 API route files
✓ Updated src/config/auth.ts

5 files changed, 247 insertions(+), 89 deletions(-)
```

---

## Step 7: Auto-Grill Triggered

```
[After implementation]
🤖 Autonomous actions: grill triggered

🔥 Critic mode activated. Analyzing 5 changed files...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ MUST_FIX (1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] src/routes/auth.ts:156
    ❌ No rate limiting on /refresh endpoint
    💡 Add express-rate-limit: max 5/min per user

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CONSIDER (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[2] src/auth/jwt.ts:42
    🤔 Hardcoded token TTL (900000ms)
    💡 Read from config: config.jwt.accessTokenTTL

[3] src/middleware/auth.ts:89
    🤔 Error message reveals token is expired
    💡 Generic "Unauthorized" for security

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 NIT (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[4] src/models/user.ts:45
    Minor: Inconsistent import order

[5] src/config/auth.ts:23
    Minor: Add JSDoc for new config options

[6] src/auth/jwt.ts:12
    Minor: Magic number 7 for refresh days

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary: 1 critical, 2 concerns, 3 style issues
```

---

## Step 8: Issue Resolution

```
User: fix 1
→ Opens src/routes/auth.ts:156
→ User adds rate limiting

User: ack 2 Will move to config in follow-up
User: fix 3
→ Opens src/middleware/auth.ts:89
→ User makes error message generic

User: recheck

🔥 Re-analyzing...
🟢 All MUST_FIX items resolved!

Still have 1 CONSIDER (acknowledged) and 3 NIT items.
Ready to proceed?

User: yes
```

---

## Step 9: Commit

```
✅ Code review approved!

[git commit -m "refactor: migrate to JWT authentication

- Add JWT token generation and validation
- Implement refresh token flow
- Add Redis blacklist for logout
- Maintain 24h grace period for sessions
- Add rate limiting on refresh endpoint

Security: Uses 15min access / 7day refresh TTL
Breaking: API clients must send Authorization header

MUST_FIX addressed:
- Rate limiting on /refresh endpoint"]

[main 8f3a2c9] refactor: migrate to JWT authentication
 5 files changed, 247 insertions(+), 89 deletions(-)
```

---

## Summary

| Step | Triggered | Notes |
|------|-----------|-------|
| Analysis | — | complexity=9, risk=high |
| Guard | ✓ | Approved with recommendations |
| Subagents | ✓ | 4 workers, analyzed 3 options |
| Grill | ✓ | Found 1 MUST_FIX (rate limiting) |
| Commit | — | User committed after fixes |

**Total time:** ~8 minutes  
**User interruptions:** 1 (approve implementation)  
**Issues caught:** 1 critical security issue  
**User decision fatigue:** Minimal (only key decisions)
