# Full Example Session: OAuth2 Implementation

This is a complete example of using the subagent workflow for implementing OAuth2 authentication.

## Step 1: User Request

```
User: use subagents to implement OAuth2 authentication for our API
```

## Step 2: Task Decomposition

```
🔀 Task Decomposition: implement OAuth2 authentication for our API

Label Prefix: impl-oauth2

Execution Plan:

Stage 1: 🔄 parallel (simultaneous)
  • [impl-oauth2-research] research
    └─ Gather relevant context from codebase...
  • [impl-oauth2-audit] audit
    └─ Review current state, find existing related code...

Stage 2: ➡️ sequential (waits for Stage 1)
  • [impl-oauth2-draft] draft
    └─ Generate 2-3 implementation options with tradeoffs...

Stage 3: ➡️ sequential (waits for Stage 2)
  • [impl-oauth2-verify] verify
    └─ Check for conflicts, validate against constraints...

Total phases: 4
Estimated time: 15-20 minutes

[Spawning 4 subagents...]
```

## Step 3: Research Subagent Output

```
[impl-oauth2-research] ✅ Complete (2m 15s)

## Research Report — OAuth2 Authentication

### Context
- Current auth: JWT tokens in src/auth/jwt.ts
- Framework: Express.js 4.18 with TypeScript
- DB: PostgreSQL with Prisma ORM
- Session store: Redis available
- Existing strategies: JWT, API Key, Session-based

### Precedents
- API key auth in src/auth/api-key.ts uses middleware pattern
- JWT implementation uses passport-jwt strategy
- All strategies implement IAuthStrategy interface

### Dependencies Available
- Already installed: passport, express-session
- Need to add: passport-oauth2, express-session, passport-oauth2-pkce
- Compatible with existing Redis store

### Patterns Found
- Architecture: Middleware chain → validate → authenticate → authorize
- Testing: Integration tests with actual auth flows
- Error handling: Custom AuthError class
- Configuration: Centralized in src/config/auth.ts

### Constraints
- Must work with existing session middleware
- Cannot break current JWT flow
- Need PKCE for mobile clients
- 90% test coverage requirement
- Bundle size limit: 200KB gzipped

### References
- OAuth 2.1 spec: https://oauth.net/2/
- Passport docs: https://www.passportjs.org/
- Internal docs: docs/authentication/architecture.md
```

## Step 4: Audit Subagent Output

```
[impl-oauth2-audit] ✅ Complete (2m 42s)

## Audit Report — OAuth2 Authentication

### Current State
- Implementation location: src/auth/
- Current behavior: JWT for API, session for web
- Existing tests: tests/auth/jwt.test.ts (85% coverage)
- Known issues: No OAuth/OIDC support, PKCE not implemented

### Impact Areas
**Direct changes:**
- src/auth/strategies/oauth.ts (new file)
- src/routes/auth.ts (new OAuth endpoints)
- src/config/auth.ts (OAuth configuration)

**Affected systems:**
- Middleware chain (must add OAuth strategy)
- Session store (needs OAuth token storage)
- User model (needs OAuth token field)

**Breaking changes:**
- None if implemented correctly
- Must maintain backward compatibility with JWT

### Risks Identified
**Critical:**
- Token storage security (must encrypt)
- PKCE implementation complexity

**High:**
- State parameter management (CSRF protection)
- Token refresh flow handling

**Medium:**
- Multiple provider support complexity
- Session invalidation on logout

### Technical Debt
**Current issues:**
- No unified auth interface (mix of strategies)
- Tests mock Redis instead of using in-memory for tests

**Opportunities:**
- While implementing OAuth, create IAuthStrategy interface
- Refactor JWT to use same pattern
- Add auth strategy factory pattern

### Dependencies & Constraints
- Must maintain compatibility with: existing session middleware, user model
- Cannot change: API contracts for existing auth endpoints
- Performance requirements: +50ms max per request overhead

### Recommendations
- Watch out for: PKCE code challenge validation, token expiration handling
- Consider: Multi-provider support from start (Google, GitHub)
```

## Step 5: Draft Subagent Output

```
[impl-oauth2-draft] ✅ Complete (4m 30s)

## Draft Options — OAuth2 Authentication

### Option 1: Passport.js Integration (RECOMMENDED)

**Approach:**
Use passport-oauth2 package with custom callback handler. Implement PKCE support using passport-oauth2-pkce. Store OAuth tokens in Redis session for multi-instance support.

**Pros:**
- Battle-tested, wide provider support
- Matches existing Passport patterns in codebase
- Express middleware compatible
- Community maintained, regular security updates
- PKCE support via passport-oauth2-pkce

**Cons:**
- Extra dependency (~80KB gzipped)
- Learning curve for customizing flow
- Passport session serialization overhead

**Complexity:** Medium (2-3 days)

**Key Files:**
- src/auth/strategies/oauth.ts (new)
- src/routes/auth.ts (modify)
- src/config/auth.ts (modify)

**Code Example:**
```typescript
// src/auth/strategies/oauth.ts
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { Strategy as PKCEStrategy } from 'passport-oauth2-pkce';

export const oauthStrategy = new PKCEStrategy({
  authorizationURL: config.oauth.authURL,
  tokenURL: config.oauth.tokenURL,
  clientID: config.oauth.clientID,
  clientSecret: config.oauth.clientSecret,
  callbackURL: config.oauth.callbackURL,
}, async (accessToken, refreshToken, profile, done) => {
  const user = await findOrCreateUser(profile);
  done(null, user);
});
```

**Dependencies to Add:**
- passport-oauth2 (^1.7.0)
- passport-oauth2-pkce (^0.1.3)

---

### Option 2: Custom OAuth2 Implementation

**Approach:**
Build OAuth2 flow from scratch using axios and custom middleware. Implement PKCE code verifier/challenge generation manually.

**Pros:**
- Full control over flow and error handling
- No external dependency for auth
- Can optimize for specific use case
- Smaller bundle size (~5KB)

**Cons:**
- Security risk (implementing crypto is hard)
- Maintenance burden (OAuth spec changes)
- More test coverage needed (every code path)
- Time-consuming to get right

**Complexity:** High (5-7 days)

**Key Files:**
- src/auth/oauth/flow.ts (new)
- src/auth/oauth/crypto.ts (new)
- src/auth/oauth/pkce.ts (new)
- src/middleware/oauth.ts (new)

**Code Example:**
```typescript
// src/auth/oauth/pkce.ts
import { randomBytes, createHash } from 'crypto';

export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}
```

**Dependencies to Add:**
- axios (^1.6.0)

---

### Option 3: Auth0 Integration

**Approach:**
Use Auth0 Universal Login page. Configure Auth0 as OIDC provider. Handle token validation with JWKS.

**Pros:**
- Managed service, zero security burden
- Fast implementation (1 day)
- Built-in PKCE, token refresh, MFA
- Excellent admin dashboard

**Cons:**
- External dependency, ongoing cost ($23/mo after free tier)
- Vendor lock-in
- Requires network calls for every request
- Loss of control over user database

**Complexity:** Low (1 day)

**Key Files:**
- src/auth/strategies/auth0.ts (new)
- src/config/auth0.ts (new)

**Code Example:**
```typescript
// src/auth/strategies/auth0.ts
import { Strategy as Auth0Strategy } from 'passport-auth0';

export const auth0Strategy = new Auth0Strategy({
  domain: config.auth0.domain,
  clientID: config.auth0.clientID,
  clientSecret: config.auth0.clientSecret,
  callbackURL: config.auth0.callbackURL,
}, async (accessToken, refreshToken, extraParams, profile, done) => {
  const user = await findOrCreateUser(profile);
  return done(null, user, extraParams);
});
```

**Dependencies to Add:**
- passport-auth0 (^1.4.0)
- jwks-rsa (^3.1.0)

---

## Comparison

| Criterion | Option 1 | Option 2 | Option 3 |
|-----------|----------|----------|----------|
| Speed | 2-3 days | 5-7 days | 1 day |
| Complexity | Medium | High | Low |
| Bundle Size | +80KB | +5KB | +40KB |
| Security | High (maintained) | Medium (DIY) | High (managed) |
| Maintenance | Low | High | Medium |
| Cost | Free | Free | $23/mo |
| Control | High | High | Low |
| Multi-provider | Easy | Hard | Easy |

## Recommendation

**RECOMMENDED:** Option 1 — Passport.js Integration

Best balance of security, maintainability, and performance. The bundle size impact is acceptable within the 200KB limit, and using Passport aligns with existing codebase patterns.
