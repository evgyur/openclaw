# Claude Cockpit Stability Refactor Plan

Date: 2026-04-04
Owner: `chipcld` / OpenClaw ACP stack
Workflow: `/shaw`
Architecture option: `C` (pragmatic balance)
Status: planned

## 1. Problem statement

The current Claude cockpit path in OpenClaw is operational but not stable enough under persistent ACP usage.

Observed failure modes:
- dead or stale ACP identities are resumed from persisted session state
- runtime recreate and retry paths are split across multiple layers and are hard to reason about
- user-facing failures collapse into generic `ACP_TURN_FAILED: acpx exited with code 1`
- Claude quota/session-cap failures are not surfaced clearly to the user
- ACP meta can drift away from the real backend session state after repair flows
- persistent continuity depends on cleanup luck rather than an explicit state machine

This plan treats the problem as a manager/runtime refactor, not a hotfix.

## 2. Definition of done

The refactor is done when all of the following are true:
- persistent `chipcld` continuity survives normal multi-turn use without manual `/acp cancel`
- dead backend sessions do not get resurrected from stale persisted identity
- `session/load -> session/new` fallback is deterministic and test-covered
- runtime recreate does not break the conversation lane or thread binding
- Claude quota/session-cap failures produce explicit, human-readable user messages
- ACP meta in session storage converges to the actual backend state after repair or recreate
- dead-session repair, fresh-owner recreate, and quota-failure messaging are covered by regression tests

## 3. Scope

In scope:
- ACP control-plane manager lifecycle
- ACP session identity reconciliation
- persistent binding lifecycle for ACP-backed sessions
- user-facing ACP error mapping for Claude runtime failures
- telemetry and diagnostics around dead-session repair and recreate
- cockpit-specific regression coverage for `chipcld`

Out of scope for this run:
- Telegram transport redesign
- general chat UX changes unrelated to ACP
- non-Claude runtime architecture changes unless needed for a fallback path
- a full rewrite of ACP storage format

## 4. Confirmed findings

From live incident work and source inspection:
- stale persisted `acpxSessionId` / `acpxRecordId` can be reused after backend death
- current recovery logic partially clears runtime cache but still allows stale resume chains in some paths
- Claude quota/session-cap failures can occur even on fresh `session/new` with `model=default`
- the real backend error can be lost and replaced by generic `acpx exited with code 1`
- OpenClaw may rehydrate `runtimeOptions.model` from repaired state in a way that drifts from the intended runtime request
- `acpx` already contains strong primitives we should lean on instead of re-implementing informally

## 5. External repos to mine

### `openclaw/acpx`
Use as the main source for:
- named session lifecycle model
- queue-owner TTL policy
- cooperative cancel semantics
- dead-session detection and `load -> new` fallback behavior
- explicit local status states like `running`, `dead`, `no-session`

### `Enderfga/openclaw-claude-code`
Use as the main source for:
- dedicated session manager patterns
- richer session control surface
- persistent session orchestration patterns around Claude Code
- operational observability and session introspection ideas

### `freema/openclaw-mcp`
Use for:
- external control plane patterns
- secure remote control / OAuth-facing architecture
- optional future path for cockpit operations outside Telegram

### `dazzaji/OpenClawGuide`
Use for:
- bootstrap and doctor flows
- runtime/auth sanity checks for Claude Code and subscription-backed auth

### `openclaw/openclaw`
Use as the integration target for:
- manager changes
- persistent binding changes
- user-facing error propagation
- regression tests

## 6. Target architecture

### 6.1 Core principle
Separate three concerns cleanly:
- persisted conversation binding state
- runtime session handle state
- backend truth learned from `acpx status/load/new`

### 6.2 Session model
Introduce or tighten a single canonical lifecycle:
- `idle`
- `running`
- `repairing`
- `recreating`
- `error`
- `closed`

The manager should never treat persisted identity as authoritative by itself. Persisted identity is only a hint until verified by backend status.

### 6.3 Identity policy
Persisted identity must carry a trust level:
- `verified` from fresh backend status
- `suspect` from stale storage only
- `invalid` after load failure / resource not found / queue owner unavailable

Rules:
- `suspect` identity may be tried once under controlled conditions
- `invalid` identity must be cleared before the next retry path
- `status` output should be merged back into ACP meta only after reconciliation rules pass

### 6.4 Retry policy
Make retry branches explicit:
- branch A: same handle retry when turn failed but session is still healthy
- branch B: fresh runtime handle with persisted identity cleared
- branch C: named-session repair through verified `load`
- branch D: hard recreate through `new` when `load` says dead or missing

Each branch must emit telemetry and update session meta consistently.

## 7. Workstreams

### Workstream 1: Manager state machine cleanup
Files likely involved:
- `src/acp/control-plane/manager.core.ts`
- `src/acp/control-plane/manager.identity-reconcile.ts`
- `src/acp/control-plane/manager.runtime-controls.ts`
- `src/acp/control-plane/manager.types.ts`

Tasks:
- make retry/recreate branches explicit in code
- isolate persisted identity clearing into one canonical path
- distinguish `retry same`, `retry fresh`, and `recreate`
- prevent stale `status` data from resurrecting invalid identity

### Workstream 2: Runtime option and model drift control
Files likely involved:
- `src/acp/control-plane/runtime-options.ts`
- `src/acp/persistent-bindings.lifecycle.ts`
- session metadata helpers

Tasks:
- audit why `runtimeOptions.model` can drift to `opus`
- define precedence between requested runtime options, stored meta, and backend reported model
- preserve `default` when intentionally requested
- stop repair flows from reintroducing stale model selection

### Workstream 3: Error propagation and user-facing diagnosis
Files likely involved:
- `src/acp/runtime/error-text.ts`
- ACP dispatch layer
- acpx extension integration points

Tasks:
- propagate real backend errors when available
- classify Claude quota/session-cap failures explicitly
- preserve structured reason through manager -> dispatcher -> final reply
- reserve generic `acpx exited with code 1` only for unknown failures

Target user text:
- quota/session-cap failures should say this is likely a Claude usage/session limit and suggest retry after reset
- stale-session failures should say the persistent runtime was recreated
- true unknown failures should keep a generic fallback

### Workstream 4: Persistent binding reconciliation
Files likely involved:
- `src/acp/persistent-bindings.lifecycle.ts`
- binding/session storage helpers

Tasks:
- tighten convergence rules between binding record and live runtime state
- ensure thread binding survives recreate
- keep conversation lane stable across repair/recreate
- eliminate manual `/acp cancel` as a normal recovery requirement

### Workstream 5: Observability
Tasks:
- structured log lines for `load_failed`, `identity_cleared`, `fresh_owner_created`, `status_reconciled`, `quota_detected`
- session-level counters for dead-session repair rate and recreate rate
- make debugging possible from logs without reading raw `.acpx` streams first

### Workstream 6: Regression suite
Tests to add or strengthen:
- stale persisted identity + early exit + retry -> fresh recreate
- `status` reports dead owner -> `load` miss -> `new` -> session survives
- quota error from Claude backend -> user receives quota-specific guidance
- model drift does not rewrite `default` to `opus` after recreate
- conversation binding remains attached to the same Telegram topic after recreate

## 8. Implementation sequence (`/shaw` staged)

### Stage 1: Plan & Research
Artifacts:
- this written plan
- source map of manager/persistent-binding/error-flow touchpoints
- extracted patterns from `acpx` and `openclaw-claude-code`

Exit gate:
- clear ownership of manager vs binding vs error-flow changes
- explicit verification matrix defined

### Stage 2: Implement core manager refactor
- clean retry/recreate decision tree
- canonical persisted identity invalidation
- trust-aware reconcile path

Exit gate:
- unit tests for manager decision branches pass

### Stage 3: Implement model/runtime drift fix
- control precedence for runtime options and status merge
- ensure `default` does not drift through repair path

Exit gate:
- tests prove stable runtime option convergence

### Stage 4: Implement error propagation fix
- carry backend quota reason where available
- fallback formatter classifies generic `acpx exited with code 1` for Claude quota cases

Exit gate:
- user-facing text snapshots updated and tested

### Stage 5: Persistent binding hardening
- guarantee conversation lane continuity across recreate
- keep topic binding intact during runtime replacement

Exit gate:
- binding lifecycle tests pass

### Stage 6: LARP / adversarial review
Review the implementation against:
- dead session after restart
- rapid prompt re-send while old owner is dying
- quota fail followed by reset and recovery
- model drift under repaired session
- split-brain between persisted meta and backend truth

Exit gate:
- all `must-fix` findings closed

### Stage 7: Verification
Run focused tests plus live validation:
- manager tests
- persistent binding tests
- runtime error text tests
- live `chipcld` smoke validation in Telegram topic
- forced stale-state simulation when safe

Exit gate:
- fresh evidence for every claimed fix

## 9. Verification matrix

### Automated
- `src/acp/control-plane/manager.test.ts`
- `src/acp/persistent-bindings.test.ts`
- `src/acp/persistent-bindings.lifecycle.test.ts`
- `src/acp/runtime/error-text.test.ts`

### Live
- send prompt in persistent `chipcld` thread
- kill or invalidate owner session
- verify next turn recreates without manual `/acp cancel`
- verify thread/topic continuity
- verify quota failure text is human-readable when limits are exhausted

## 10. Risks

High risk:
- hidden coupling between manager meta writes and binding lifecycle writes
- Claude backend semantics for `default` may differ from stored local expectations
- live bundle rollouts can appear successful while old process still serves traffic

Medium risk:
- regression for non-Claude ACP agents if logic becomes Claude-specific in the wrong layer
- overfitting to Telegram topic bindings

Mitigation:
- keep generic lifecycle logic agent-agnostic
- isolate Claude quota classification to error interpretation layer
- verify with both unit tests and live smoke checks

## 11. Rollout strategy

Phase 1:
- land source-only tests and manager/error-flow changes

Phase 2:
- deploy to non-critical cockpit / staging thread if available

Phase 3:
- deploy to live `chipcld`
- watch logs for recreate/repair churn
- confirm no manual `/acp cancel` is needed in normal recovery

Phase 4:
- optional follow-up: expose richer cockpit status/repair commands to users

## 12. Explicit non-goals for this PR

This planning PR should not:
- ship the full refactor
- modify runtime behavior beyond planning artifacts
- mix in unrelated source fixes already present in the worktree

## 13. Recommended next execution run

Start a focused implementation run with this exact scope:
- manager lifecycle cleanup
- model drift fix
- user-facing quota error propagation
- persistent binding continuity regression coverage

Recommended execution style:
- one implementation branch
- one owner for manager/refactor logic
- one bounded verification pass before any live rollout
- no “hotfix” framing
