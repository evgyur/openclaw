import crypto from "node:crypto";
import {
  normalizeLowercaseStringOrEmpty,
  normalizeOptionalString,
} from "openclaw/plugin-sdk/text-runtime";
import { validateBrowserRelayRequestParams } from "../browser/relay-contracts.js";
import {
  ErrorCodes,
  applyBrowserProxyPaths,
  createBrowserControlContext,
  createBrowserRouteDispatcher,
  errorShape,
  isNodeCommandAllowed,
  isPersistentBrowserProfileMutation,
  loadConfig,
  persistBrowserProxyFiles,
  resolveNodeCommandAllowlist,
  resolveRequestedBrowserProfile,
  respondUnavailableOnNodeInvokeError,
  safeParseJson,
  startBrowserControlServiceFromConfig,
  withTimeout,
  type GatewayRequestHandlers,
} from "../core-api.js";

type BrowserProxyFile = {
  path: string;
  base64: string;
  mimeType?: string;
};

type BrowserProxyResult = {
  result: unknown;
  files?: BrowserProxyFile[];
};

type BrowserNodeSession = {
  nodeId: string;
  remoteIp?: string;
  displayName?: string;
  caps?: unknown[];
  commands?: unknown[];
  platform?: string;
};

function isBrowserNode(node: BrowserNodeSession) {
  const caps = Array.isArray(node.caps) ? node.caps : [];
  const commands = Array.isArray(node.commands) ? node.commands : [];
  return caps.includes("browser") || commands.includes("browser.proxy");
}

function normalizeNodeKey(value: string) {
  return normalizeLowercaseStringOrEmpty(value).replace(/[^a-z0-9]+/g, "");
}

function resolveBrowserNode(nodes: BrowserNodeSession[], query: string): BrowserNodeSession | null {
  const q = normalizeOptionalString(query) ?? "";
  if (!q) {
    return null;
  }
  const qNorm = normalizeNodeKey(q);
  const matches = nodes.filter((node) => {
    if (node.nodeId === q) {
      return true;
    }
    if (typeof node.remoteIp === "string" && node.remoteIp === q) {
      return true;
    }
    const name = typeof node.displayName === "string" ? node.displayName : "";
    if (name && normalizeNodeKey(name) === qNorm) {
      return true;
    }
    if (q.length >= 6 && node.nodeId.startsWith(q)) {
      return true;
    }
    return false;
  });
  if (matches.length === 1) {
    return matches[0] ?? null;
  }
  if (matches.length === 0) {
    return null;
  }
  throw new Error(
    `ambiguous node: ${q} (matches: ${matches
      .map((node) => node.displayName || node.remoteIp || node.nodeId)
      .join(", ")})`,
  );
}

function resolveBrowserNodeTarget(params: {
  cfg: ReturnType<typeof loadConfig>;
  nodes: BrowserNodeSession[];
}): BrowserNodeSession | null {
  const policy = params.cfg.gateway?.nodes?.browser;
  const mode = policy?.mode ?? "auto";
  if (mode === "off") {
    return null;
  }
  const browserNodes = params.nodes.filter((node) => isBrowserNode(node));
  if (browserNodes.length === 0) {
    if (normalizeOptionalString(policy?.node)) {
      throw new Error("No connected browser-capable nodes.");
    }
    return null;
  }
  const requested = normalizeOptionalString(policy?.node) ?? "";
  if (requested) {
    const resolved = resolveBrowserNode(browserNodes, requested);
    if (!resolved) {
      throw new Error(`Configured browser node not connected: ${requested}`);
    }
    return resolved;
  }
  if (mode === "manual") {
    return null;
  }
  if (browserNodes.length === 1) {
    return browserNodes[0] ?? null;
  }
  return null;
}

async function persistProxyFiles(files: BrowserProxyFile[] | undefined) {
  return await persistBrowserProxyFiles(files);
}

function applyProxyPaths(result: unknown, mapping: Map<string, string>) {
  applyBrowserProxyPaths(result, mapping);
}

export async function handleBrowserGatewayRequest({
  params,
  respond,
  context,
}: Parameters<GatewayRequestHandlers["browser.request"]>[0]) {
  const contract = validateBrowserRelayRequestParams(params);
  if (!contract.ok) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, contract.error.error, {
        details: contract.error,
      }),
    );
    return;
  }
  const typed = contract.value;
  const methodRaw = (normalizeOptionalString(typed.method) ?? "").toUpperCase();
  const path = normalizeOptionalString(typed.path) ?? "";
  const query = typed.query && typeof typed.query === "object" ? typed.query : undefined;
  const body = typed.body;
  const timeoutMs =
    typeof typed.timeoutMs === "number" && Number.isFinite(typed.timeoutMs)
      ? Math.max(1, Math.floor(typed.timeoutMs))
      : undefined;

  if (!methodRaw || !path) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, "method and path are required"),
    );
    return;
  }
  if (methodRaw !== "GET" && methodRaw !== "POST" && methodRaw !== "DELETE") {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, "method must be GET, POST, or DELETE"),
    );
    return;
  }
  if (isPersistentBrowserProfileMutation(methodRaw, path)) {
    respond(
      false,
      undefined,
      errorShape(
        ErrorCodes.INVALID_REQUEST,
        "browser.request cannot mutate persistent browser profiles",
      ),
    );
    return;
  }

  const cfg = loadConfig();
  let nodeTarget: BrowserNodeSession | null = null;
  try {
    nodeTarget = resolveBrowserNodeTarget({
      cfg,
      nodes: context.nodeRegistry.listConnected(),
    });
  } catch (err) {
    respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    return;
  }

  if (nodeTarget) {
    const allowlist = resolveNodeCommandAllowlist(cfg, nodeTarget);
    const allowed = isNodeCommandAllowed({
      command: "browser.proxy",
      declaredCommands: nodeTarget.commands,
      allowlist,
    });
    if (!allowed.ok) {
      const platform = nodeTarget.platform ?? "unknown";
      const hint = `node command not allowed: ${allowed.reason} (platform: ${platform}, command: browser.proxy)`;
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, hint, {
          details: { reason: allowed.reason, command: "browser.proxy" },
        }),
      );
      return;
    }

    const proxyParams = {
      method: methodRaw,
      path,
      query,
      body,
      timeoutMs,
      profile: resolveRequestedBrowserProfile({ query, body }),
    };
    const res = await context.nodeRegistry.invoke({
      nodeId: nodeTarget.nodeId,
      command: "browser.proxy",
      params: proxyParams,
      timeoutMs,
      idempotencyKey: crypto.randomUUID(),
    });
    if (!respondUnavailableOnNodeInvokeError(respond, res)) {
      return;
    }
    const payload = res.payloadJSON ? safeParseJson(res.payloadJSON) : res.payload;
    const proxy = payload && typeof payload === "object" ? (payload as BrowserProxyResult) : null;
    if (!proxy || !("result" in proxy)) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, "browser proxy failed"));
      return;
    }
    const mapping = await persistProxyFiles(proxy.files);
    applyProxyPaths(proxy.result, mapping);
    respond(true, proxy.result);
    return;
  }

  const ready = await startBrowserControlServiceFromConfig();
  if (!ready) {
    respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, "browser control is disabled"));
    return;
  }

  let dispatcher;
  try {
    dispatcher = createBrowserRouteDispatcher(createBrowserControlContext());
  } catch (err) {
    respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    return;
  }

  let result;
  try {
    result = timeoutMs
      ? await withTimeout(
          (signal) =>
            dispatcher.dispatch({
              method: methodRaw,
              path,
              query,
              body,
              signal,
            }),
          timeoutMs,
          "browser request",
        )
      : await dispatcher.dispatch({
          method: methodRaw,
          path,
          query,
          body,
        });
  } catch (err) {
    respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    return;
  }

  if (result.status >= 400) {
    const message =
      result.body && typeof result.body === "object" && "error" in result.body
        ? String((result.body as { error?: unknown }).error)
        : `browser request failed (${result.status})`;
    const code = result.status >= 500 ? ErrorCodes.UNAVAILABLE : ErrorCodes.INVALID_REQUEST;
    respond(false, undefined, errorShape(code, message, { details: result.body }));
    return;
  }

  respond(true, result.body);
}

export const browserHandlers: GatewayRequestHandlers = {
  "browser.request": handleBrowserGatewayRequest,
};
