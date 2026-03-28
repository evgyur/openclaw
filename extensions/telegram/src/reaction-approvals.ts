import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  normalizeAccountId,
  DEFAULT_ACCOUNT_ID,
  type OpenClawConfig,
} from "openclaw/plugin-sdk/account-resolution";
import { resolveStorePath } from "openclaw/plugin-sdk/config-runtime";
import { readJsonFileWithFallback, writeJsonFileAtomically } from "openclaw/plugin-sdk/json-store";
import { resolveTelegramAccount } from "./accounts.js";

type ReactionApprovalDecision = "yes" | "no";
type ReactionApprovalRiskClass = "low" | "medium" | "high";

type TelegramReactionApprovalConfigLike = {
  enabled?: boolean;
  dmEnabled?: boolean;
  groupEnabled?: boolean;
  defaultTtlMinutes?: number;
  allowedActors?: Array<string | number>;
  emojiMap?: Record<string, ReactionApprovalDecision>;
  highRiskMode?: "block" | "allow";
};

type TelegramAgentReactionApprovalConfigLike = {
  enabled?: boolean;
  ttlMinutes?: number;
  defaultPolicy?: "owner_or_allowlist" | "allowlist";
};

export type TelegramReactionApprovalRequest = {
  requestId?: string;
  ttlMinutes?: number;
  allowedActors?: Array<string | number>;
  emojiMap?: Record<string, ReactionApprovalDecision>;
  approveEventText?: string;
  denyEventText?: string;
  riskClass?: ReactionApprovalRiskClass;
  metadata?: Record<string, unknown>;
};

export type TelegramReactionApprovalRecord = {
  id: string;
  channel: "telegram";
  accountId: string;
  agentId?: string;
  sessionKey: string;
  chatId: string;
  messageId: number;
  status: "pending" | "approved" | "denied" | "expired" | "cancelled";
  allowedActors: string[];
  emojiMap: Record<string, ReactionApprovalDecision>;
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedReaction?: string;
  riskClass: ReactionApprovalRiskClass;
  approveEventText: string;
  denyEventText?: string;
  metadata?: Record<string, unknown>;
};

type TelegramReactionApprovalStore = {
  version: 1;
  approvals: TelegramReactionApprovalRecord[];
};

export type TelegramReactionApprovalResolution =
  | { matched: false; resolved: false; reason: "not-found" }
  | {
      matched: true;
      resolved: false;
      reason: "expired" | "actor-not-allowed" | "emoji-not-mapped" | "already-resolved";
      record: TelegramReactionApprovalRecord;
    }
  | {
      matched: true;
      resolved: true;
      decision: ReactionApprovalDecision;
      eventText: string;
      record: TelegramReactionApprovalRecord;
      contextKey: string;
    };

const DEFAULT_EMOJI_MAP: Record<string, ReactionApprovalDecision> = {
  "❤️": "yes",
  "❌": "no",
  "👎": "no",
};
const DEFAULT_TTL_MINUTES = 30;

function normalizeAllowedActors(values: Array<string | number> | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeEmojiMap(
  value: Record<string, ReactionApprovalDecision> | undefined,
): Record<string, ReactionApprovalDecision> {
  const merged: Record<string, ReactionApprovalDecision> = { ...DEFAULT_EMOJI_MAP };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return merged;
  }
  for (const [emoji, decision] of Object.entries(value)) {
    if (!emoji) {
      continue;
    }
    if (decision === "yes" || decision === "no") {
      merged[emoji] = decision;
    }
  }
  return merged;
}

function findAgentReactionApprovalOverride(
  cfg: OpenClawConfig,
  agentId: string | undefined,
): TelegramAgentReactionApprovalConfigLike | undefined {
  if (!agentId) {
    return undefined;
  }
  const list = Array.isArray((cfg.agents as { list?: unknown[] } | undefined)?.list)
    ? ((cfg.agents as { list?: unknown[] }).list ?? [])
    : [];
  const match = list.find((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }
    return (entry as { id?: unknown }).id === agentId;
  }) as { reactionApproval?: TelegramAgentReactionApprovalConfigLike } | undefined;
  const override = match?.reactionApproval;
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return undefined;
  }
  return override;
}

function resolveReactionApprovalConfig(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
  agentId?: string;
}) {
  const account = resolveTelegramAccount({
    cfg: params.cfg,
    accountId: params.accountId,
  });
  const accountConfig = account.config as typeof account.config & {
    reactionApproval?: TelegramReactionApprovalConfigLike;
  };
  const agentOverride = findAgentReactionApprovalOverride(params.cfg, params.agentId);
  const accountReactionApproval = accountConfig.reactionApproval;
  const enabled = agentOverride?.enabled ?? accountReactionApproval?.enabled ?? false;
  return {
    accountId: account.accountId,
    enabled,
    dmEnabled: accountReactionApproval?.dmEnabled ?? true,
    groupEnabled: accountReactionApproval?.groupEnabled ?? false,
    defaultTtlMinutes:
      agentOverride?.ttlMinutes ??
      accountReactionApproval?.defaultTtlMinutes ??
      DEFAULT_TTL_MINUTES,
    allowedActors: normalizeAllowedActors(accountReactionApproval?.allowedActors),
    emojiMap: normalizeEmojiMap(accountReactionApproval?.emojiMap),
    highRiskMode: accountReactionApproval?.highRiskMode ?? "block",
  };
}

function buildDefaultEventText(params: {
  decision: ReactionApprovalDecision;
  actorId: string | undefined;
  emoji: string | undefined;
  chatId: string;
  messageId: number;
}): string {
  const action = params.decision === "yes" ? "approved" : "denied";
  const actor = params.actorId ? ` by ${params.actorId}` : "";
  const emoji = params.emoji ? ` with ${params.emoji}` : "";
  return `Telegram reaction approval ${action}${actor}${emoji} for chat ${params.chatId} message ${params.messageId}`;
}

function getStorePath(params: { cfg: OpenClawConfig; accountId?: string | null }): string {
  const sessionStorePath = resolveStorePath(params.cfg.session?.store);
  const accountId = normalizeAccountId(params.accountId ?? DEFAULT_ACCOUNT_ID);
  return path.join(path.dirname(sessionStorePath), `telegram-reaction-approvals.${accountId}.json`);
}

async function loadStore(filePath: string): Promise<TelegramReactionApprovalStore> {
  const fallback: TelegramReactionApprovalStore = { version: 1, approvals: [] };
  const { value } = await readJsonFileWithFallback<TelegramReactionApprovalStore>(
    filePath,
    fallback,
  );
  if (!value || typeof value !== "object" || !Array.isArray(value.approvals)) {
    return fallback;
  }
  return { version: 1, approvals: value.approvals };
}

async function saveStore(filePath: string, store: TelegramReactionApprovalStore): Promise<void> {
  await writeJsonFileAtomically(filePath, {
    version: 1,
    approvals: store.approvals,
  } satisfies TelegramReactionApprovalStore);
}

function expireStoreEntries(
  approvals: TelegramReactionApprovalRecord[],
  nowMs: number,
): TelegramReactionApprovalRecord[] {
  let changed = false;
  const next = approvals.map((record) => {
    if (record.status !== "pending") {
      return record;
    }
    const expiresAtMs = Date.parse(record.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs > nowMs) {
      return record;
    }
    changed = true;
    return {
      ...record,
      status: "expired" as const,
      resolvedAt: new Date(nowMs).toISOString(),
    };
  });
  return changed ? next : approvals;
}

export async function registerTelegramReactionApproval(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
  agentId?: string;
  sessionKey?: string;
  chatId: string | number;
  messageId: number;
  isGroup: boolean;
  request: TelegramReactionApprovalRequest;
  nowMs?: number;
}): Promise<TelegramReactionApprovalRecord | null> {
  if (!params.sessionKey) {
    return null;
  }
  const resolvedConfig = resolveReactionApprovalConfig({
    cfg: params.cfg,
    accountId: params.accountId,
    agentId: params.agentId,
  });
  if (!resolvedConfig.enabled) {
    return null;
  }
  if (params.isGroup ? !resolvedConfig.groupEnabled : !resolvedConfig.dmEnabled) {
    return null;
  }
  const riskClass = params.request.riskClass ?? "low";
  if (riskClass === "high" && resolvedConfig.highRiskMode !== "allow") {
    return null;
  }
  const allowedActors = normalizeAllowedActors(params.request.allowedActors);
  const effectiveAllowedActors =
    allowedActors.length > 0 ? allowedActors : resolvedConfig.allowedActors;
  if (effectiveAllowedActors.length === 0) {
    return null;
  }
  const emojiMap = normalizeEmojiMap({
    ...resolvedConfig.emojiMap,
    ...params.request.emojiMap,
  });
  const nowMs = params.nowMs ?? Date.now();
  const ttlMinutes = Math.max(
    1,
    Math.trunc(
      params.request.ttlMinutes ?? resolvedConfig.defaultTtlMinutes ?? DEFAULT_TTL_MINUTES,
    ),
  );
  const chatId = String(params.chatId);
  const record: TelegramReactionApprovalRecord = {
    id: params.request.requestId?.trim() || randomUUID(),
    channel: "telegram",
    accountId: resolvedConfig.accountId,
    agentId: params.agentId,
    sessionKey: params.sessionKey,
    chatId,
    messageId: Math.trunc(params.messageId),
    status: "pending",
    allowedActors: effectiveAllowedActors,
    emojiMap,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + ttlMinutes * 60_000).toISOString(),
    riskClass,
    approveEventText:
      params.request.approveEventText?.trim() ||
      buildDefaultEventText({
        decision: "yes",
        chatId,
        messageId: Math.trunc(params.messageId),
        actorId: undefined,
        emoji: undefined,
      }),
    denyEventText:
      params.request.denyEventText?.trim() ||
      buildDefaultEventText({
        decision: "no",
        chatId,
        messageId: Math.trunc(params.messageId),
        actorId: undefined,
        emoji: undefined,
      }),
    metadata: params.request.metadata,
  };

  const filePath = getStorePath({ cfg: params.cfg, accountId: resolvedConfig.accountId });
  const store = await loadStore(filePath);
  const nextApprovals = expireStoreEntries(store.approvals, nowMs).filter(
    (entry) => !(entry.chatId === record.chatId && entry.messageId === record.messageId),
  );
  nextApprovals.push(record);
  await saveStore(filePath, { version: 1, approvals: nextApprovals });
  return record;
}

export async function resolveTelegramReactionApproval(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
  chatId: string | number;
  messageId: number;
  actorId: string | number;
  emoji: string;
  nowMs?: number;
}): Promise<TelegramReactionApprovalResolution> {
  const filePath = getStorePath({ cfg: params.cfg, accountId: params.accountId });
  const nowMs = params.nowMs ?? Date.now();
  const store = await loadStore(filePath);
  const approvals = expireStoreEntries(store.approvals, nowMs);
  const chatId = String(params.chatId);
  const messageId = Math.trunc(params.messageId);
  const actorId = String(params.actorId);
  const index = approvals.findIndex(
    (entry) => entry.chatId === chatId && entry.messageId === messageId,
  );
  if (index < 0) {
    if (approvals !== store.approvals) {
      await saveStore(filePath, { version: 1, approvals });
    }
    return { matched: false, resolved: false, reason: "not-found" };
  }
  const record = approvals[index]!;
  if (record.status !== "pending") {
    if (approvals !== store.approvals) {
      await saveStore(filePath, { version: 1, approvals });
    }
    if (record.status === "expired") {
      return { matched: true, resolved: false, reason: "expired", record };
    }
    return { matched: true, resolved: false, reason: "already-resolved", record };
  }
  const expiresAtMs = Date.parse(record.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
    const expiredRecord: TelegramReactionApprovalRecord = {
      ...record,
      status: "expired",
      resolvedAt: new Date(nowMs).toISOString(),
    };
    approvals[index] = expiredRecord;
    await saveStore(filePath, { version: 1, approvals });
    return { matched: true, resolved: false, reason: "expired", record: expiredRecord };
  }
  if (!record.allowedActors.includes(actorId)) {
    return { matched: true, resolved: false, reason: "actor-not-allowed", record };
  }
  const decision = record.emojiMap[params.emoji];
  if (!decision) {
    return { matched: true, resolved: false, reason: "emoji-not-mapped", record };
  }
  const resolvedRecord: TelegramReactionApprovalRecord = {
    ...record,
    status: decision === "yes" ? "approved" : "denied",
    resolvedAt: new Date(nowMs).toISOString(),
    resolvedBy: actorId,
    resolvedReaction: params.emoji,
  };
  approvals[index] = resolvedRecord;
  await saveStore(filePath, { version: 1, approvals });
  const eventText =
    (decision === "yes" ? resolvedRecord.approveEventText : resolvedRecord.denyEventText)?.trim() ||
    buildDefaultEventText({
      decision,
      actorId,
      emoji: params.emoji,
      chatId,
      messageId,
    });
  return {
    matched: true,
    resolved: true,
    decision,
    eventText,
    record: resolvedRecord,
    contextKey: `telegram:reaction-approval:${resolvedRecord.id}:${decision}`,
  };
}
