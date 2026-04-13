# Love-Claw: Telegram Reaction Approval

Status: implemented in branch, not deployed to production

Branch:
- `love-claw-reaction-approval`

Primary commit:
- `7e81272670f0aa05ee40ac4aeecfa4062f9f339b`

## Goal

Add explicit Telegram reaction-based approvals to OpenClaw so a bot message can be approved or denied by reaction from an allowlisted Telegram actor.

Target behavior:
- `❤️` resolves approval as `yes`
- `❌` or `👎` resolves approval as `no`
- unauthorized actors are ignored
- expired approvals are ignored
- resolution is one-shot and attributable

## Scope

Included:
- Telegram-only approval records
- config schema for account-level enablement
- per-agent reaction-approval overrides
- persistent approval store
- outbound registration after Telegram send
- inbound resolution from Telegram reaction updates
- focused tests for approve, deny, unauthorized, expired, and one-shot behavior

Excluded in this branch:
- generic approval inference from plain text
- approval rollback on reaction removal
- broad multi-channel workflow support
- production config rollout

## Main implementation areas

- `extensions/telegram/src/reaction-approvals.ts`
- `extensions/telegram/src/reaction-approvals.test.ts`
- `extensions/telegram/src/bot/delivery.replies.ts`
- `extensions/telegram/src/bot-handlers.runtime.ts`
- `extensions/telegram/src/bot-message-dispatch.ts`
- `extensions/telegram/src/bot.test.ts`
- `src/config/types.telegram.ts`
- `src/config/types.agents.ts`
- `src/config/zod-schema.providers-core.ts`
- `src/config/zod-schema.agent-runtime.ts`
- `src/plugin-sdk/telegram-core.ts`
- `extensions/telegram/runtime-api.ts`

## Verification completed on the branch

Passed:
- `vitest run extensions/telegram/src/reaction-approvals.test.ts`
- `vitest run extensions/telegram/src/bot.test.ts -t 'reaction approval|unauthorized approval actor|deny branch|expired approvals'`
- `vitest run extensions/telegram/src/reaction-approvals.test.ts extensions/telegram/src/bot.test.ts extensions/telegram/src/bot-message-dispatch.test.ts`
- `vitest run src/plugin-sdk/runtime-api-guardrails.test.ts src/plugin-sdk/subpaths.test.ts`
- `node scripts/tsdown-build.mjs`

Known limitation:
- full `tsc -p tsconfig.json --noEmit` hit Node/V8 heap OOM in this environment, so that broad repo-wide typecheck was not used as the acceptance gate

## Production status

This branch is being preserved for later continuation.

Current stance:
- code is implemented and pushed to the fork
- production rollout is paused
- no further server-side changes should be made until a safer rollout plan exists

## Suggested future continuation

1. Rebase this branch onto fresh upstream `main`
2. Re-run the focused verification contour
3. Prepare a minimal, reviewed production config snippet for `channels.telegram.reactionApproval`
4. Deploy in a controlled window with rollback already prepared
5. Validate end-to-end in a dedicated Telegram test chat before enabling in main working chats
