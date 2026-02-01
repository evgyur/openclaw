# Subagent Workflow Integration Demo

> Full walkthrough: OAuth implementation using all three workflow skills

This document demonstrates how `use-subagents`, `grill`, and `opus-guard` work together in a realistic development workflow.

---

## Scenario: OAuth Integration

**User Goal:** Implement OAuth 2.0 authentication for a web application

**Three-Phase Workflow:**
1. Research & Design (use-subagents)
2. Implementation Review (grill)
3. Production Deployment (opus-guard)

---

## Phase 1: Research & Design

### User Input

```
User: "Build OAuth integration, use subagents"
```

### What Happens

#### Step 1.1: Task Decomposition

The `use-subagents` skill analyzes the complexity and decomposes:

```
Task: OAuth Integration Design
Complexity: HIGH
Estimated workers needed: 4

Subtasks:
1. Security Analysis → Worker Alpha
2. Developer Experience (DX) → Worker Beta
3. Scalability & Performance → Worker Gamma
4. Maintenance & Operations → Worker Delta
```

#### Step 1.2: Parallel Worker Execution

**Worker Alpha: Security Analysis**
```
Focus: Authentication security patterns
Findings:
- JWT with RS256 signing recommended
- Refresh tokens require secure storage
- CSRF protection mandatory for OAuth flows
- PKCE required for SPAs/mobile apps

Risk Assessment:
- Passport.js: mature, well-audited
- Firebase Auth: managed, reduces attack surface
- Custom OAuth: high risk, avoid

Recommendation: Passport.js with passport-oauth2
```

**Worker Beta: Developer Experience**
```
Focus: Ease of integration and maintenance
Findings:
- Passport.js has largest ecosystem
- Good TypeScript support
- Clear documentation
- Middleware-based fits our Express stack

Concerns:
- OAuth 2.0 spec complexity
- Token management boilerplate

Recommendation: Use passport-oauth2 with custom user serialization
```

**Worker Gamma: Scalability & Performance**
```
Focus: Request throughput and caching strategy
Findings:
- Stateless JWT enables horizontal scaling
- Redis recommended for refresh token rotation
- Session storage not needed (stateless)
- Rate limiting required on auth endpoints

Concerns:
- JWT revocation requires distributed cache
- Key rotation needs coordination

Recommendation: JWT + Redis for revocation + horizontal scaling ready
```

**Worker Delta: Maintenance & Operations**
```
Focus: Long-term maintainability and ops burden
Findings:
- Managed solutions (Auth0, Firebase) reduce ops
- Passport.js requires ongoing dependency updates
- Self-hosted needs key rotation, monitoring
- Compliance (GDPR) easier with managed auth

Trade-offs:
- Cost: Managed > Self-hosted (ongoing)
- Control: Self-hosted > Managed

Recommendation: Start with Passport.js, migrate to managed if team grows
```

#### Step 1.3: Synthesis

```
┌─────────────────────────────────────────────────────────────────┐
│                     SYNTHESIS REPORT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RECOMMENDATION: Passport.js with JWT Refresh Tokens            │
│                                                                 │
│  Rationale:                                                     │
│  - ✅ Strong security (4/4 workers agree)                       │
│  - ✅ Good DX, fits our stack                                   │
│  - ✅ Scales horizontally                                       │
│  - ⚠️ Maintenance burden acceptable for current team size       │
│                                                                 │
│  IMPLEMENTATION CHECKLIST:                                      │
│  ┌─ Core Setup                                                  │
│  │  □ Install passport, passport-oauth2, jsonwebtoken          │
│  │  □ Configure JWT signing (RS256) with key rotation          │
│  │  □ Set up OAuth2 strategy for Google                        │
│  │                                                              │
│  ├─ Security                                                    │
│  │  □ Implement PKCE for mobile/SPA flows                      │
│  │  □ Add CSRF protection                                       │
│  │  □ Enable rate limiting on /auth/* endpoints                │
│  │  □ Secure refresh token storage (httpOnly cookies)          │
│  │                                                              │
│  ├─ Scaling                                                     │
│  │  □ Redis integration for token revocation                   │
│  │  □ Stateless session (no server-side sessions)              │
│  │  □ Health check endpoint                                     │
│  │                                                              │
│  └─ Operations                                                  │
│     □ Add auth middleware to protected routes                  │
│     □ Configure monitoring for auth failures                   │
│     □ Document key rotation procedure                          │
│                                                                 │
│  ALTERNATIVES CONSIDERED:                                       │
│  - Auth0: Better for rapid growth but adds cost                │
│  - Firebase Auth: Good mobile support but vendor lock-in       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 1 Output

User receives a comprehensive implementation plan with 4 expert perspectives synthesized into a single recommendation with detailed checklist.

---

## Phase 2: Implementation & Review

### Developer Action

Developer implements the OAuth integration following the checklist, but misses a few items (intentionally simplified for demo).

### User Input

```
User: "/grill"
```

### What Happens

#### Step 2.1: Code Analysis

`grill` scans the changes:

```
Files changed:
- src/auth/oauth.ts (new)
- src/auth/jwt.ts (new)
- src/middleware/auth.ts (new)
- src/config/auth.ts (new)

Lines: +340, -0
```

#### Step 2.2: Critic Agent Spawns

```
Spawning critic agent (adversarial stance)
Model: claude-sonnet-4
Context: OAuth implementation review
```

#### Step 2.3: Critic Evaluation

**Security Review:**
```
✅ JWT using RS256 - correct
✅ Refresh tokens in httpOnly cookies - correct
❌ Rate limiting: MISSING on /auth/callback endpoint
❌ Token rotation: No implementation found
⚠️  CSRF: Present but double-check state parameter validation
```

**Test Coverage:**
```
❌ No tests for token refresh flow
❌ No tests for authentication middleware
⚠️  OAuth callback error handling not covered
```

**Code Quality:**
```
✅ Clean separation of concerns
✅ Good TypeScript types
✅ Error handling present
⚠️  Some magic strings could be constants
```

#### Step 2.4: Gate Decision

```
┌─────────────────────────────────────────────────────────────────┐
│                        GRILL REPORT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STATUS: ❌ BLOCKED                                             │
│                                                                 │
│  MUST_FIX (will block merge):                                   │
│  ┌─ [1] Missing rate limiting on OAuth callback                │
│  │     File: src/auth/oauth.ts:45                              │
│  │     Risk: Brute force attacks on OAuth endpoints            │
│  │     Suggested fix: Add express-rate-limit middleware        │
│  │                                                              │
│  └─ [2] No token rotation implementation                       │
│        File: src/auth/jwt.ts (refresh function missing)        │
│        Risk: Compromised refresh tokens persist indefinitely   │
│        Suggested fix: Implement rotation with Redis storage    │
│                                                                 │
│  SHOULD_FIX (recommended):                                      │
│  ┌─ [3] Add tests for token refresh flow                       │
│  │                                                              │
│  └─ [4] Add tests for auth middleware                          │
│                                                                 │
│  NICE_TO_HAVE:                                                  │
│  └─ [5] Extract magic strings to constants                     │
│                                                                 │
│  ACTION REQUIRED: Address MUST_FIX items before merge          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Developer Response

Developer fixes the MUST_FIX items:

```typescript
// src/auth/oauth.ts - Added rate limiting
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests
  message: 'Too many auth attempts, please try again later'
});

app.use('/auth/', authLimiter);
```

```typescript
// src/auth/jwt.ts - Added token rotation
async function rotateRefreshToken(oldToken: string): Promise<string> {
  // Invalidate old token
  await redis.setex(`revoked:${oldToken}`, REFRESH_TOKEN_TTL, '1');
  
  // Issue new token
  const newToken = generateRefreshToken();
  await storeRefreshToken(newToken, userId);
  
  return newToken;
}
```

### Second Grill Pass

```
User: "/grill"
```

```
┌─────────────────────────────────────────────────────────────────┐
│                        GRILL REPORT                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STATUS: ✅ APPROVED                                            │
│                                                                 │
│  Findings:                                                      │
│  ┌─ Rate limiting implemented ✓                                │
│  ┌─ Token rotation implemented ✓                               │
│  ┌─ Security review passed ✓                                   │
│                                                                 │
│  SHOULD_FIX (non-blocking):                                     │
│  └─ Add integration tests for token refresh flow               │
│                                                                 │
│  Ready for merge!                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Production Deployment

### User Input

```
User: "Deploy to production"
```

### What Happens

#### Step 3.1: Risk Assessment

`opus-guard` intercepts the deployment command:

```
Action detected: Production deployment
Command: npm run deploy:production

Risk factors:
- Target: production environment (+0.3)
- Scope: auth system (critical) (+0.2)
- Change type: new feature (not hotfix) (+0.1)
- Test status: partially tested (+0.1)
- Review status: approved by grill (-0.1)
- Rollback plan: present (-0.1)

RISK SCORE: 0.92 / 1.0 (HIGH)
```

#### Step 3.2: Opus Escalation

Since risk >= threshold (0.7), escalates to Opus model:

```
Escalating to Opus for high-risk action review
Context: Production deployment of OAuth system
Confidence threshold: 0.85
```

#### Step 3.3: Opus Review

**Opus Analysis:**
```
Risk Assessment: 0.92 (HIGH)

Factors justifying caution:
1. Authentication system - single point of failure
2. Production deployment - user-facing impact
3. OAuth flows - complex, many edge cases

Factors supporting approval:
1. Code passed grill review (security validated)
2. Rollback plan documented
3. Deployment during low-traffic window
4. Feature flagged (can disable without rollback)

Opinion: PROCEED WITH CONDITIONS
Confidence: 0.89
```

#### Step 3.4: Conditional Approval

```
┌─────────────────────────────────────────────────────────────────┐
│                      OPUS GUARD DECISION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ACTION: Production Deployment                                  │
│  RISK SCORE: 0.92 (HIGH)                                        │
│  DECISION: ✅ APPROVED WITH CONDITIONS                          │
│  CONFIDENCE: 0.89                                               │
│                                                                 │
│  PRE-FLIGHT CHECKLIST:                                          │
│  □ Verify feature flag is set to 0% rollout initially          │
│  □ Confirm monitoring dashboards are accessible                │
│  □ Have rollback command ready: npm run rollback:production    │
│  □ Notify on-call team of deployment                           │
│  □ Enable enhanced logging for auth endpoints                  │
│                                                                 │
│  MONITORING CHECKPOINTS (first 30 min):                         │
│  - Auth success rate > 99%                                      │
│  - Error rate < 0.1%                                            │
│  - Token refresh latency < 200ms                                │
│                                                                 │
│  ESCALATION: If any checkpoint fails, auto-rollback enabled    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 3.5: Audit Log

```
┌─────────────────────────────────────────────────────────────────┐
│                      AUDIT LOG ENTRY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Timestamp: 2026-01-30T14:23:15Z                               │
│  Event: OPUS_GUARD_APPROVAL                                    │
│  Action: Production deployment                                 │
│  Risk Score: 0.92                                              │
│  Decision: APPROVED_WITH_CONDITIONS                            │
│  Confidence: 0.89                                              │
│  Model: claude-opus-4                                          │
│  User: @developer                                              │
│  Checksum: sha256:a3f5c8...                                    │
│                                                                 │
│  Context:                                                      │
│  - OAuth integration deployment                                │
│  - Passed grill review (commit: abc1234)                       │
│  - Feature flagged rollout enabled                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Proceeds

```
✅ Pre-flight checklist acknowledged
✅ Deployment initiated
✅ Monitoring activated
✅ Feature flag: 0% → 5% → 10% (gradual rollout)
✅ All health checks passing

Deployment complete! OAuth integration is live.
```

---

## Summary

### Workflow Complete

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW SUMMARY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: RESEARCH   ✅ use-subagents                           │
│  ├─ 4 workers spawned in parallel                              │
│  ├─ Comprehensive analysis: security, DX, scaling, ops         │
│  └─ Output: Implementation plan with checklist                 │
│                                                                 │
│  Phase 2: REVIEW     ✅ grill                                   │
│  ├─ Critic agent found 2 MUST_FIX security issues              │
│  ├─ Blocked merge until fixed                                  │
│  └─ Approved after fixes                                       │
│                                                                 │
│  Phase 3: DEPLOY     ✅ opus-guard                              │
│  ├─ Risk assessment: 0.92 (high)                               │
│  ├─ Escalated to Opus for review                               │
│  ├─ Approved with conditions + checklist                       │
│  └─ Audit log entry created                                    │
│                                                                 │
│  RESULT: OAuth integration deployed with full safety checks    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Benefits Demonstrated

| Aspect | Without Workflow | With Workflow |
|--------|-----------------|---------------|
| **Research** | Single perspective, missed trade-offs | 4 expert perspectives, balanced decision |
| **Quality** | Issues found in production | Security issues caught pre-merge |
| **Safety** | Accidental production breaks | High-risk actions validated by Opus |
| **Traceability** | No audit trail | Complete decision log |

---

## Next Steps

- See [Test Scenarios](./test-scenarios.md) for validation suite
- Run `./install-all.sh` to set up the workflow system
- Read full documentation in [README.md](./README.md)
