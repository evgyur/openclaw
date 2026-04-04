import type { SessionAcpMeta, SessionAcpQuotaBlock } from "../../config/sessions/types.js";
import type { AcpRuntimeStatus } from "./types.js";

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseTimezoneOffsetMinutes(label: string): number | undefined {
  const match = label.trim().match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) {
    return undefined;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? "0");
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

function getTimeZoneOffsetMinutes(timeZone: string, atMs: number): number | undefined {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      year: "numeric",
    }).formatToParts(new Date(atMs));
    const label = parts.find((part) => part.type === "timeZoneName")?.value;
    return label ? parseTimezoneOffsetMinutes(label) : undefined;
  } catch {
    return undefined;
  }
}

function getLocalDateParts(
  timeZone: string,
  atMs: number,
): {
  year: number;
  month: number;
  day: number;
} | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(atMs));
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    return { year, month, day };
  } catch {
    return null;
  }
}

function resolveUtcMsForLocalTime(params: {
  timeZone: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): number | undefined {
  const guess = Date.UTC(params.year, params.month - 1, params.day, params.hour, params.minute);
  const offsetMinutes = getTimeZoneOffsetMinutes(params.timeZone, guess);
  if (offsetMinutes == null) {
    return undefined;
  }
  return (
    Date.UTC(params.year, params.month - 1, params.day, params.hour, params.minute) -
    offsetMinutes * 60_000
  );
}

function resolveRetryAfterAtFromHint(hint: string, now: number): number | undefined {
  const match = hint.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*\(([^)]+)\)/i);
  if (!match) {
    return undefined;
  }
  let hour = Number(match[1] ?? "0");
  const minute = Number(match[2] ?? "0");
  const meridiem = normalizeText(match[3])?.toLowerCase();
  const timeZone = normalizeText(match[4]);
  if (!timeZone || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return undefined;
  }
  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  } else if (meridiem === "am" && hour === 12) {
    hour = 0;
  }
  const localDate = getLocalDateParts(timeZone, now);
  if (!localDate) {
    return undefined;
  }
  let retryAfterAt = resolveUtcMsForLocalTime({
    timeZone,
    year: localDate.year,
    month: localDate.month,
    day: localDate.day,
    hour,
    minute,
  });
  if (retryAfterAt == null) {
    return undefined;
  }
  if (retryAfterAt <= now) {
    retryAfterAt += 24 * 60 * 60 * 1000;
  }
  return retryAfterAt;
}

export function isLikelyClaudeQuotaFailureMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized.includes("out of extra usage") ||
    (normalized.includes("current session") && normalized.includes("100%")) ||
    normalized === "acpx exited with code 1"
  );
}

export function resolveClaudeQuotaRetryAfterHint(message: string): string | undefined {
  const match = message.match(/resets?\s+(.+)$/i);
  return normalizeText(match?.[1]);
}

export function createClaudeQuotaBlock(params: {
  message: string;
  now?: number;
}): SessionAcpQuotaBlock | undefined {
  if (!isLikelyClaudeQuotaFailureMessage(params.message)) {
    return undefined;
  }
  const now = params.now ?? Date.now();
  const retryAfterHint = resolveClaudeQuotaRetryAfterHint(params.message);
  const retryAfterAt = retryAfterHint
    ? resolveRetryAfterAtFromHint(retryAfterHint, now)
    : undefined;
  return {
    kind: "claude_usage_limit",
    message: params.message.trim(),
    detectedAt: now,
    ...(retryAfterHint ? { retryAfterHint } : {}),
    ...(typeof retryAfterAt === "number" ? { retryAfterAt } : {}),
  };
}

export function isQuotaBlockActive(meta: SessionAcpMeta | undefined, now = Date.now()): boolean {
  if (meta?.state !== "quota_blocked" || !meta.quotaBlock) {
    return false;
  }
  if (typeof meta.quotaBlock.retryAfterAt !== "number") {
    return true;
  }
  return meta.quotaBlock.retryAfterAt > now;
}

export function isQuotaBlockExpired(meta: SessionAcpMeta | undefined, now = Date.now()): boolean {
  if (meta?.state !== "quota_blocked") {
    return false;
  }
  return typeof meta.quotaBlock?.retryAfterAt === "number" && meta.quotaBlock.retryAfterAt <= now;
}

export function resolveAcpRuntimeModelFromStatus(
  status: AcpRuntimeStatus | undefined,
): string | undefined {
  const details = status?.details;
  if (!details || typeof details !== "object") {
    return undefined;
  }
  const detailRecord = details;
  return (
    normalizeText(detailRecord.currentModelId) ??
    normalizeText(detailRecord.current_model_id) ??
    normalizeText(detailRecord.modelId) ??
    normalizeText(detailRecord.model_id) ??
    normalizeText(detailRecord.model)
  );
}

export function formatQuotaRetryAfterText(
  quotaBlock: SessionAcpQuotaBlock | undefined,
): string | undefined {
  if (!quotaBlock) {
    return undefined;
  }
  if (typeof quotaBlock.retryAfterAt === "number") {
    return new Date(quotaBlock.retryAfterAt).toISOString();
  }
  return quotaBlock.retryAfterHint;
}
