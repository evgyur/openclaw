import type { OpenClawConfig } from "../../config/config.js";
import {
  canonicalizeMainSessionAlias,
  resolveMainSessionKey,
} from "../../config/sessions/main-session.js";
import type {
  SessionAcpIdentity,
  SessionAcpMeta,
  SessionAcpQuotaBlock,
  AcpSessionRuntimeOptions,
} from "../../config/sessions/types.js";
import {
  normalizeAgentId,
  normalizeMainKey,
  parseAgentSessionKey,
} from "../../routing/session-key.js";
import { ACP_ERROR_CODES, AcpRuntimeError } from "../runtime/errors.js";
import type { AcpSessionResolution } from "./manager.types.js";

export function resolveAcpAgentFromSessionKey(sessionKey: string, fallback = "main"): string {
  const parsed = parseAgentSessionKey(sessionKey);
  return normalizeAgentId(parsed?.agentId ?? fallback);
}

export function resolveMissingMetaError(sessionKey: string): AcpRuntimeError {
  return new AcpRuntimeError(
    "ACP_SESSION_INIT_FAILED",
    `ACP metadata is missing for ${sessionKey}. Recreate this ACP session with /acp spawn and rebind the thread.`,
  );
}

export function resolveAcpSessionResolutionError(
  resolution: AcpSessionResolution,
): AcpRuntimeError | null {
  if (resolution.kind === "ready") {
    return null;
  }
  if (resolution.kind === "stale") {
    return resolution.error;
  }
  return new AcpRuntimeError(
    "ACP_SESSION_INIT_FAILED",
    `Session is not ACP-enabled: ${resolution.sessionKey}`,
  );
}

export function requireReadySessionMeta(resolution: AcpSessionResolution): SessionAcpMeta {
  if (resolution.kind === "ready") {
    return resolution.meta;
  }
  throw resolveAcpSessionResolutionError(resolution);
}

export function normalizeSessionKey(sessionKey: string): string {
  return sessionKey.trim();
}

export function canonicalizeAcpSessionKey(params: {
  cfg: OpenClawConfig;
  sessionKey: string;
}): string {
  const normalized = normalizeSessionKey(params.sessionKey);
  if (!normalized) {
    return "";
  }
  const lowered = normalized.toLowerCase();
  if (lowered === "global" || lowered === "unknown") {
    return lowered;
  }
  const parsed = parseAgentSessionKey(lowered);
  if (parsed) {
    return canonicalizeMainSessionAlias({
      cfg: params.cfg,
      agentId: parsed.agentId,
      sessionKey: lowered,
    });
  }
  const mainKey = normalizeMainKey(params.cfg.session?.mainKey);
  if (lowered === "main" || lowered === mainKey) {
    return resolveMainSessionKey(params.cfg);
  }
  return lowered;
}

export function normalizeActorKey(sessionKey: string): string {
  return sessionKey.trim().toLowerCase();
}

export function normalizeAcpErrorCode(code: string | undefined): AcpRuntimeError["code"] {
  if (!code) {
    return "ACP_TURN_FAILED";
  }
  const normalized = code.trim().toUpperCase();
  for (const allowed of ACP_ERROR_CODES) {
    if (allowed === normalized) {
      return allowed;
    }
  }
  return "ACP_TURN_FAILED";
}

export function createUnsupportedControlError(params: {
  backend: string;
  control: string;
}): AcpRuntimeError {
  return new AcpRuntimeError(
    "ACP_BACKEND_UNSUPPORTED_CONTROL",
    `ACP backend "${params.backend}" does not support ${params.control}.`,
  );
}

export function resolveRuntimeIdleTtlMs(cfg: OpenClawConfig): number {
  const ttlMinutes = cfg.acp?.runtime?.ttlMinutes;
  if (typeof ttlMinutes !== "number" || !Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
    return 0;
  }
  return Math.round(ttlMinutes * 60 * 1000);
}

export function hasLegacyAcpIdentityProjection(meta: SessionAcpMeta): boolean {
  const raw = meta as Record<string, unknown>;
  return (
    Object.hasOwn(raw, "backendSessionId") ||
    Object.hasOwn(raw, "agentSessionId") ||
    Object.hasOwn(raw, "sessionIdsProvisional")
  );
}

export function createNextAcpMeta(
  base: SessionAcpMeta,
  overrides: {
    backend?: string;
    agent?: string;
    runtimeSessionName?: string;
    identity?: SessionAcpIdentity | null;
    mode?: SessionAcpMeta["mode"];
    runtimeOptions?: AcpSessionRuntimeOptions | null;
    runtimeModel?: string | null;
    runtimeModelUpdatedAt?: number | null;
    quotaBlock?: SessionAcpQuotaBlock | null;
    cwd?: string | null;
    state?: SessionAcpMeta["state"];
    lastActivityAt?: number;
    lastError?: string | null;
  },
): SessionAcpMeta {
  return {
    backend: overrides.backend ?? base.backend,
    agent: overrides.agent ?? base.agent,
    runtimeSessionName: overrides.runtimeSessionName ?? base.runtimeSessionName,
    ...(overrides.identity === null
      ? {}
      : overrides.identity
        ? { identity: overrides.identity }
        : base.identity
          ? { identity: base.identity }
          : {}),
    mode: overrides.mode ?? base.mode,
    ...(overrides.runtimeOptions === null
      ? {}
      : overrides.runtimeOptions
        ? { runtimeOptions: overrides.runtimeOptions }
        : base.runtimeOptions
          ? { runtimeOptions: base.runtimeOptions }
          : {}),
    ...(overrides.runtimeModel === null
      ? {}
      : overrides.runtimeModel
        ? { runtimeModel: overrides.runtimeModel }
        : base.runtimeModel
          ? { runtimeModel: base.runtimeModel }
          : {}),
    ...(overrides.runtimeModelUpdatedAt === null
      ? {}
      : typeof overrides.runtimeModelUpdatedAt === "number"
        ? { runtimeModelUpdatedAt: overrides.runtimeModelUpdatedAt }
        : typeof base.runtimeModelUpdatedAt === "number"
          ? { runtimeModelUpdatedAt: base.runtimeModelUpdatedAt }
          : {}),
    ...(overrides.quotaBlock === null
      ? {}
      : overrides.quotaBlock
        ? { quotaBlock: overrides.quotaBlock }
        : base.quotaBlock
          ? { quotaBlock: base.quotaBlock }
          : {}),
    ...(overrides.cwd === null
      ? {}
      : overrides.cwd
        ? { cwd: overrides.cwd }
        : base.cwd
          ? { cwd: base.cwd }
          : {}),
    state: overrides.state ?? base.state,
    lastActivityAt: overrides.lastActivityAt ?? base.lastActivityAt,
    ...(overrides.lastError === null
      ? {}
      : typeof overrides.lastError === "string"
        ? { lastError: overrides.lastError }
        : base.lastError
          ? { lastError: base.lastError }
          : {}),
  };
}
