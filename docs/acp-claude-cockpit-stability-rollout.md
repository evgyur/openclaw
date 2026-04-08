# ACP Claude cockpit stability rollout

## What changed

This ports the live ACP Claude recovery fixes from installed `dist/` back into the OpenClaw source repo so future builds keep them.

### Source files

- `src/acp/control-plane/manager.core.ts`
- `src/acp/control-plane/manager.test.ts`
- `src/acp/runtime/error-text.ts`
- `src/acp/runtime/error-text.test.ts`

### Behavioral changes

1. Early Claude/acpx turn failures that indicate a stale cockpit now retry once with a fresh runtime handle when the error text includes:
   - `acpx exited with code N`
   - `queue owner unavailable`
   - `NO_SESSION` / `no_session`
   - `no session`
   - `status=dead`
2. Before that retry, persisted ACP identity is cleared more aggressively, including the stale `runtimeSessionName`, so a restart cannot rehydrate the broken cockpit again.
3. Claude quota guidance is now narrower:
   - usage exhaustion messages still show quota/reset guidance
   - stale-session messages no longer get misclassified as quota exhaustion

## Why this matters

Without this port, a rebuild from source can silently regress to the pre-fix behavior:

- persistent Claude ACP sessions keep trying to reuse a dead cockpit
- restart/redeploy can preserve stale session metadata
- `queue owner unavailable` / `NO_SESSION` failures may surface as generic errors instead of self-healing retries
- dead-session failures can be mislabeled as Claude quota exhaustion

## Verification

Run targeted regression coverage:

```bash
pnpm exec vitest run --config vitest.unit.config.ts \
  src/acp/control-plane/manager.test.ts \
  src/acp/runtime/error-text.test.ts \
  src/agents/auth-profiles.runtime-snapshot-save.test.ts \
  extensions/acpx/src/runtime.test.ts
```

Optional broader guard after merge:

```bash
pnpm exec vitest run --config vitest.unit.config.ts src/acp/control-plane/manager.test.ts src/acp/runtime/error-text.test.ts
pnpm build
```

## Rollout

1. Merge this change into the canonical `openclaw/openclaw` source branch.
2. Rebuild from source:

```bash
pnpm build
```

3. Install/deploy the rebuilt package or artifact through the normal release path.
4. Smoke-test a persistent Claude ACP session:
   - create or reuse a persistent session
   - force/reproduce a stale cockpit case if possible
   - confirm the first early failure triggers exactly one fresh-handle retry
   - confirm `/acp status` normalizes dead idle acpx sessions to resumable cold-start display

## Rollback

If this regresses unexpectedly:

1. Revert the source commit touching the files above.
2. Rebuild and redeploy the previous artifact.
3. If a live environment is already stuck on stale Claude ACP metadata, clear the affected ACP session metadata before retrying so the old artifact does not keep rehydrating the dead cockpit.

## Operator notes

- The installed `dist/` tree is not the source of truth; patching it alone is disposable.
- Keep these regression tests green before any OpenClaw runtime release that touches ACP, acpx, or session rehydration.
