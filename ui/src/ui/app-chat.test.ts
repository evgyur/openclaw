/* @vitest-environment jsdom */

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatHost } from "./app-chat.ts";

const { setLastActiveSessionKeyMock } = vi.hoisted(() => ({
  setLastActiveSessionKeyMock: vi.fn(),
}));

vi.mock("./app-settings.ts", () => ({
  setLastActiveSessionKey: (...args: unknown[]) => setLastActiveSessionKeyMock(...args),
}));

let handleSendChat: typeof import("./app-chat.ts").handleSendChat;
let removeQueuedMessage: typeof import("./app-chat.ts").removeQueuedMessage;
let refreshChatAvatar: typeof import("./app-chat.ts").refreshChatAvatar;
let restorePersistedChatState: typeof import("./app-chat.ts").restorePersistedChatState;
let loadPersistedChatAttachments: typeof import("./storage.ts").loadPersistedChatAttachments;
let loadPersistedChatDraft: typeof import("./storage.ts").loadPersistedChatDraft;
let loadPersistedChatQueue: typeof import("./storage.ts").loadPersistedChatQueue;
let persistChatAttachments: typeof import("./storage.ts").persistChatAttachments;
let persistChatDraft: typeof import("./storage.ts").persistChatDraft;
let persistChatQueue: typeof import("./storage.ts").persistChatQueue;

type TestChatHost = ChatHost & {
  toolStreamById: Map<string, unknown>;
  toolStreamOrder: string[];
  chatToolMessages: unknown[];
  chatStreamSegments: Array<{ text: string; ts: number }>;
  toolStreamSyncTimer: number | null;
};

function createStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

async function loadChatHelpers(): Promise<void> {
  vi.resetModules();
  ({ handleSendChat, refreshChatAvatar, removeQueuedMessage, restorePersistedChatState } =
    await import("./app-chat.ts"));
  ({
    loadPersistedChatAttachments,
    loadPersistedChatDraft,
    loadPersistedChatQueue,
    persistChatAttachments,
    persistChatDraft,
    persistChatQueue,
  } = await import("./storage.ts"));
}

function makeHost(overrides?: Partial<TestChatHost>): TestChatHost {
  return {
    client: null,
    chatMessages: [],
    chatStream: null,
    connected: true,
    chatMessage: "",
    chatAttachments: [],
    chatQueue: [],
    settings: {
      gatewayUrl: "wss://gateway.example:8443/openclaw",
      token: "",
      sessionKey: "agent:main",
      lastActiveSessionKey: "agent:main",
      theme: "claw",
      themeMode: "system",
      chatFocusMode: false,
      chatShowThinking: true,
      chatShowToolCalls: true,
      splitRatio: 0.6,
      navCollapsed: false,
      navWidth: 220,
      navGroupsCollapsed: {},
      borderRadius: 50,
    },
    chatRunId: null,
    chatSending: false,
    lastError: null,
    sessionKey: "agent:main",
    basePath: "",
    hello: null,
    chatAvatarUrl: null,
    chatModelOverrides: {},
    chatModelsLoading: false,
    chatModelCatalog: [],
    toolStreamById: new Map(),
    toolStreamOrder: [],
    chatToolMessages: [],
    chatStreamSegments: [],
    toolStreamSyncTimer: null,
    refreshSessionsAfterChat: new Set<string>(),
    updateComplete: Promise.resolve(),
    ...overrides,
  };
}

describe("refreshChatAvatar", () => {
  beforeEach(async () => {
    vi.stubGlobal("localStorage", createStorageMock());
    vi.stubGlobal("sessionStorage", createStorageMock());
    await loadChatHelpers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a route-relative avatar endpoint before basePath bootstrap finishes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ avatarUrl: "/avatar/main" }),
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const host = makeHost({ basePath: "", sessionKey: "agent:main" });
    await refreshChatAvatar(host);

    expect(fetchMock).toHaveBeenCalledWith(
      "avatar/main?meta=1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(host.chatAvatarUrl).toBe("/avatar/main");
  });

  it("keeps mounted dashboard avatar endpoints under the normalized base path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const host = makeHost({ basePath: "/openclaw/", sessionKey: "agent:ops:main" });
    await refreshChatAvatar(host);

    expect(fetchMock).toHaveBeenCalledWith(
      "/openclaw/avatar/ops?meta=1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(host.chatAvatarUrl).toBeNull();
  });
});

describe("handleSendChat", () => {
  beforeEach(async () => {
    setLastActiveSessionKeyMock.mockReset();
    vi.stubGlobal("localStorage", createStorageMock());
    vi.stubGlobal("sessionStorage", createStorageMock());
    await loadChatHelpers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps slash-command model changes in sync with the chat header cache", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      }) as unknown as typeof fetch,
    );
    const request = vi.fn(async (method: string, _params?: unknown) => {
      if (method === "sessions.patch") {
        return {
          ok: true,
          key: "main",
          resolved: {
            modelProvider: "openai",
            model: "gpt-5-mini",
          },
        };
      }
      if (method === "chat.history") {
        return { messages: [], thinkingLevel: null };
      }
      if (method === "sessions.list") {
        return {
          ts: 0,
          path: "",
          count: 0,
          defaults: { modelProvider: "openai", model: "gpt-5", contextTokens: null },
          sessions: [],
        };
      }
      if (method === "models.list") {
        return {
          models: [{ id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai" }],
        };
      }
      throw new Error(`Unexpected request: ${method}`);
    });
    const host = makeHost({
      client: { request } as unknown as ChatHost["client"],
      sessionKey: "main",
      chatMessage: "/model gpt-5-mini",
    });

    await handleSendChat(host);

    expect(request).toHaveBeenCalledWith("sessions.patch", {
      key: "main",
      model: "gpt-5-mini",
    });
    expect(host.chatModelOverrides.main).toEqual({
      kind: "qualified",
      value: "openai/gpt-5-mini",
    });
  });

  it("clears persisted draft and attachments after a successful send", async () => {
    const request = vi.fn(async (method: string) => {
      if (method === "chat.send") {
        return {};
      }
      throw new Error(`Unexpected request: ${method}`);
    });
    const host = makeHost({
      client: { request } as unknown as ChatHost["client"],
      sessionKey: "main",
      chatMessage: "hello",
      chatAttachments: [{ id: "1", dataUrl: "data:image/png;base64,AA==", mimeType: "image/png" }],
    });

    persistChatDraft(host.settings.gatewayUrl, host.sessionKey, host.chatMessage);
    persistChatAttachments(host.settings.gatewayUrl, host.sessionKey, host.chatAttachments);

    await handleSendChat(host);

    expect(loadPersistedChatDraft(host.settings.gatewayUrl, host.sessionKey)).toBe("");
    expect(loadPersistedChatAttachments(host.settings.gatewayUrl, host.sessionKey)).toEqual([]);
  });

  it("restores persisted draft and attachments after a failed send", async () => {
    const request = vi.fn(async () => {
      throw new Error("send failed");
    });
    const attachments = [{ id: "1", dataUrl: "data:image/png;base64,AA==", mimeType: "image/png" }];
    const host = makeHost({
      client: { request } as unknown as ChatHost["client"],
      sessionKey: "main",
      chatMessage: "hello",
      chatAttachments: attachments,
    });

    await handleSendChat(host);

    expect(host.chatMessage).toBe("hello");
    expect(host.chatAttachments).toEqual(attachments);
    expect(loadPersistedChatDraft(host.settings.gatewayUrl, host.sessionKey)).toBe("hello");
    expect(loadPersistedChatAttachments(host.settings.gatewayUrl, host.sessionKey)).toEqual(
      attachments,
    );
  });
});

describe("chat persistence helpers", () => {
  beforeEach(async () => {
    vi.stubGlobal("localStorage", createStorageMock());
    vi.stubGlobal("sessionStorage", createStorageMock());
    await loadChatHelpers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists queue removals", () => {
    const host = makeHost({
      sessionKey: "main",
      chatQueue: [
        { id: "keep", text: "keep", createdAt: 1 },
        { id: "drop", text: "drop", createdAt: 2 },
      ],
    });

    persistChatQueue(host.settings.gatewayUrl, host.sessionKey, host.chatQueue);
    removeQueuedMessage(host, "drop");

    expect(loadPersistedChatQueue(host.settings.gatewayUrl, host.sessionKey)).toEqual([
      { id: "keep", text: "keep", createdAt: 1 },
    ]);
  });

  it("restores persisted state for the active gateway only", () => {
    const host = makeHost({
      sessionKey: "main",
      settings: {
        gatewayUrl: "wss://gateway-b.example:8443/openclaw",
        token: "",
        sessionKey: "main",
        lastActiveSessionKey: "main",
        theme: "claw",
        themeMode: "system",
        chatFocusMode: false,
        chatShowThinking: true,
        chatShowToolCalls: true,
        splitRatio: 0.6,
        navCollapsed: false,
        navWidth: 220,
        navGroupsCollapsed: {},
        borderRadius: 50,
      },
    });

    persistChatQueue("wss://gateway-a.example:8443/openclaw", "main", [
      { id: "queue-a", text: "queue-a", createdAt: 1 },
    ]);
    persistChatDraft("wss://gateway-a.example:8443/openclaw", "main", "draft-a");
    persistChatAttachments("wss://gateway-a.example:8443/openclaw", "main", [
      { id: "att-a", dataUrl: "data:image/png;base64,AA==", mimeType: "image/png" },
    ]);

    persistChatQueue(host.settings.gatewayUrl, host.sessionKey, [
      { id: "queue-b", text: "queue-b", createdAt: 2 },
    ]);
    persistChatDraft(host.settings.gatewayUrl, host.sessionKey, "draft-b");
    persistChatAttachments(host.settings.gatewayUrl, host.sessionKey, [
      { id: "att-b", dataUrl: "data:image/png;base64,AA==", mimeType: "image/png" },
    ]);

    restorePersistedChatState(host);

    expect(host.chatQueue).toEqual([{ id: "queue-b", text: "queue-b", createdAt: 2 }]);
    expect(host.chatMessage).toBe("draft-b");
    expect(host.chatAttachments).toEqual([
      { id: "att-b", dataUrl: "data:image/png;base64,AA==", mimeType: "image/png" },
    ]);
  });
});

afterAll(() => {
  vi.doUnmock("./app-settings.ts");
  vi.resetModules();
});
