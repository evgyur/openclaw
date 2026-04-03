# Claude Cockpit Stability Execution Map

Date: 2026-04-04
Parent plan: `docs/plans/claude-cockpit-stability-shaw-plan-2026-04-04.md`
Workflow: `/shaw`
Goal: convert the refactor plan into a bounded execution sequence with independent PRs and acceptance gates

## 1. Recommended execution order

1. PR-A: manager retry/recreate hardening
2. PR-B: runtime option and model drift control
3. PR-C: user-facing error propagation and quota messaging
4. PR-D: persistent binding continuity hardening
5. PR-E: observability and live diagnostics cleanup

Reason for this order:
- PR-A removes the biggest state-corruption and stale-identity risk
- PR-B prevents repaired sessions from drifting back into the wrong model path
- PR-C improves operator and user visibility while the deeper refactor lands
- PR-D is safer after manager behavior is deterministic
- PR-E should reflect the final architecture, not the pre-refactor shape

## 2. PR map

## PR-A: ACP manager retry/recreate hardening

### Objective
Make stale identity invalidation and fresh-owner recreate deterministic.

### Primary files
- `src/acp/control-plane/manager.core.ts`
- `src/acp/control-plane/manager.identity-reconcile.ts`
- `src/acp/control-plane/manager.runtime-controls.ts`
- `src/acp/control-plane/manager.types.ts`
- `src/acp/control-plane/manager.test.ts`

### Required changes
- make retry branches explicit: same-handle retry vs fresh-handle retry vs hard recreate
- clear persisted identity before fresh recreate, not after
- stop stale `status` data from rehydrating invalid identity
- ensure `lastError` and state transitions are consistent across failures

### Acceptance criteria
- stale persisted identity cannot survive a failed `load`
- dead-session `load -> new` path is covered by regression tests
- no branch leaves a session in `running` after failure
- tests prove the next attempt does not resume the invalid owner

### Verification
- `src/acp/control-plane/manager.test.ts`
- any nearby runtime-cache/session-identifier tests touched by the refactor

### Must not do
- do not mix user-facing messaging changes here unless strictly required for compile/test compatibility

## PR-B: runtime option and model drift control

### Objective
Define deterministic precedence for requested runtime options, persisted ACP meta, and backend-reported model state.

### Primary files
- `src/acp/control-plane/runtime-options.ts`
- `src/acp/persistent-bindings.lifecycle.ts`
- `src/acp/runtime/session-identifiers.ts`
- `src/acp/runtime/session-identity.ts`
- related tests in `src/acp/persistent-bindings.lifecycle.test.ts`

### Required changes
- document and enforce precedence rules for `runtimeOptions.model`
- preserve intentional `default` model requests through recreate/repair paths
- prevent repaired sessions from writing stale `opus` back into ACP meta
- separate backend-reported current model from requested model where necessary

### Acceptance criteria
- a fresh `default` request remains `default` after recreate
- dead-session repair does not reintroduce stale model metadata
- model convergence logic is test-covered

### Verification
- `src/acp/persistent-bindings.lifecycle.test.ts`
- `src/acp/persistent-bindings.test.ts`
- any targeted session identifier tests

### Must not do
- do not add Claude-only conditionals in the wrong layer; keep model precedence generic

## PR-C: error propagation and quota messaging

### Objective
Preserve real backend failures when available and surface human-readable Claude quota/session-cap guidance when not.

### Primary files
- `src/acp/runtime/error-text.ts`
- ACP dispatch layer files using `formatAcpRuntimeErrorText`
- possibly ACP runtime integration glue if real backend error can be carried further up
- `src/acp/runtime/error-text.test.ts`

### Required changes
- classify quota/session-cap failures explicitly
- preserve the original backend message when available
- ensure generic `acpx exited with code 1` gets upgraded to a useful hint in known Claude limit cases
- keep generic fallback for unknown runtime failures

### Acceptance criteria
- user-facing text clearly distinguishes quota/session-cap from stale session and from unknown runtime failure
- tests cover both explicit backend quota text and generic `acpx exited with code 1`
- final Telegram/user output does not advise `/acp cancel` for quota situations

### Verification
- `src/acp/runtime/error-text.test.ts`
- smoke validation through the ACP dispatch path if feasible

### Must not do
- do not bury quota detection in transport-specific code

## PR-D: persistent binding continuity hardening

### Objective
Keep the Telegram topic / conversation lane stable across repair and recreate.

### Primary files
- `src/acp/persistent-bindings.lifecycle.ts`
- `src/acp/persistent-bindings.resolve.ts`
- `src/acp/persistent-bindings.types.ts`
- `src/acp/persistent-bindings.lifecycle.test.ts`
- `src/acp/persistent-bindings.test.ts`

### Required changes
- ensure thread binding remains attached while runtime owner changes
- reconcile runtime identity changes without forcing manual `/acp cancel`
- keep binding state convergent after dead-session repair or recreate

### Acceptance criteria
- conversation lane survives recreate without rebind
- stale identity does not force a new lane/thread mapping
- lifecycle tests cover dead owner + recreated backend + same binding continuation

### Verification
- `src/acp/persistent-bindings.lifecycle.test.ts`
- `src/acp/persistent-bindings.test.ts`
- live `chipcld` topic smoke test after merge

### Must not do
- do not redesign all channel binding semantics; keep it ACP-specific and bounded

## PR-E: observability and diagnostics cleanup

### Objective
Make future incidents debuggable without reading raw `.acpx` streams first.

### Primary files
- manager logging touchpoints
- persistent binding lifecycle logging touchpoints
- ACP dispatch diagnostics paths
- any doctor/status command output if appropriate

### Required changes
- add structured events for `identity_cleared`, `dead_resume_failed`, `fresh_owner_created`, `quota_detected`, `binding_reconciled`
- include enough session identifiers to correlate manager state and backend session state
- improve operational status wording where it helps incident response

### Acceptance criteria
- operator can tell from journal logs whether failure was stale identity, load miss, recreate, or quota
- no noisy duplicate logging floods normal success path

### Verification
- focused test coverage where practical
- manual journal inspection after staged/live smoke test

### Must not do
- do not add broad logging spam in hot paths without value

## 3. Implementation checklist

Use this for the actual `/shaw` execution run.

### Before coding
- confirm branch is clean or isolate work in a dedicated worktree
- freeze scope to PR-A first
- list exact touched files before first edit
- write/add failing regression test first when practical

### During each PR
- keep write scope bounded to the PR objective
- do not mix live monkey patches into source PRs
- verify each behavioral claim with a targeted test
- capture one concise note explaining why this PR exists and what it explicitly does not solve

### Before moving to next PR
- green targeted tests
- review diff for accidental architecture bleed
- verify no stale unrelated local changes leaked into the branch
- summarize residual risk that remains for the next PR

## 4. Suggested branch names

- PR-A: `refactor/acp-manager-retry-recreate`
- PR-B: `fix/acp-runtime-option-model-drift`
- PR-C: `fix/acp-quota-error-propagation`
- PR-D: `fix/acp-persistent-binding-continuity`
- PR-E: `chore/acp-observability-diagnostics`

## 5. Suggested ownership split

If one person:
- execute serially in the order above

If two people:
- engineer 1: PR-A then PR-B
- engineer 2: prepare PR-C in parallel after PR-A interfaces stabilize
- PR-D only after PR-A and PR-B merge direction is clear

If using sub-agents:
- keep PR-A local to main owner
- delegate narrow test additions or diagnostics-only work, not the critical retry/recreate core

## 6. What gives the fastest stability win

If only one implementation pass happens, do this subset:
- PR-A core manager retry/recreate hardening
- PR-B minimum model drift fix
- PR-C quota-aware error text

That combination should deliver the highest immediate gain for `chipcld` reliability and operator clarity.

## 7. Exit criteria for the whole execution plan

The execution map is complete when:
- PR-A through PR-D land or are consciously rejected with a replacement design
- `chipcld` persistent path survives stale-session repair without manual `/acp cancel`
- quota failures are explained clearly to the user
- runtime option drift is no longer observed after recreate
- logs are sufficient to diagnose the next incident without raw stream archaeology first
