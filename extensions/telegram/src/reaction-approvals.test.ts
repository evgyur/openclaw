import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { OpenClawConfig } from "openclaw/plugin-sdk/telegram-core";
import { afterEach, describe, expect, it } from "vitest";
import {
  registerTelegramReactionApproval,
  resolveTelegramReactionApproval,
} from "./reaction-approvals.js";

const tempDirs: string[] = [];

async function createConfig(overrides?: {
  reactionApproval?: NonNullable<
    NonNullable<OpenClawConfig["channels"]>["telegram"]
  >["reactionApproval"];
  agentReactionApproval?: NonNullable<
    NonNullable<OpenClawConfig["agents"]>["list"]
  >[number]["reactionApproval"];
}): Promise<OpenClawConfig> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "reaction-approval-test-"));
  tempDirs.push(dir);
  return {
    session: {
      store: path.join(dir, "sessions.json"),
    },
    channels: {
      telegram: {
        dmPolicy: "open",
        reactionApproval: {
          enabled: true,
          allowedActors: ["9"],
          ...overrides?.reactionApproval,
        },
      },
    },
    agents: {
      list: overrides?.agentReactionApproval
        ? [
            {
              id: "chipcdx",
              reactionApproval: overrides.agentReactionApproval,
            },
          ]
        : [],
    },
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("reaction approvals", () => {
  it("resolves deny branch for mapped negative emoji", async () => {
    const cfg = await createConfig();
    await registerTelegramReactionApproval({
      cfg,
      sessionKey: "session:approval-test",
      chatId: 1234,
      messageId: 77,
      isGroup: false,
      request: {
        approveEventText: "approve branch",
        denyEventText: "deny branch",
      },
    });

    const resolution = await resolveTelegramReactionApproval({
      cfg,
      chatId: 1234,
      messageId: 77,
      actorId: 9,
      emoji: "❌",
    });

    expect(resolution).toMatchObject({
      matched: true,
      resolved: true,
      decision: "no",
      eventText: "deny branch",
      record: {
        status: "denied",
        resolvedBy: "9",
        resolvedReaction: "❌",
      },
    });
  });

  it("expires stale approvals instead of resolving them", async () => {
    const nowMs = Date.UTC(2026, 2, 28, 2, 0, 0);
    const cfg = await createConfig({
      reactionApproval: {
        defaultTtlMinutes: 1,
      },
    });
    await registerTelegramReactionApproval({
      cfg,
      sessionKey: "session:approval-test",
      chatId: 1234,
      messageId: 78,
      isGroup: false,
      request: {
        approveEventText: "approve branch",
      },
      nowMs,
    });

    const resolution = await resolveTelegramReactionApproval({
      cfg,
      chatId: 1234,
      messageId: 78,
      actorId: 9,
      emoji: "❤️",
      nowMs: nowMs + 61_000,
    });

    expect(resolution).toMatchObject({
      matched: true,
      resolved: false,
      reason: "expired",
      record: {
        status: "expired",
      },
    });
  });

  it("consumes approvals exactly once", async () => {
    const cfg = await createConfig();
    await registerTelegramReactionApproval({
      cfg,
      sessionKey: "session:approval-test",
      chatId: 1234,
      messageId: 79,
      isGroup: false,
      request: {
        approveEventText: "approve branch",
      },
    });

    const first = await resolveTelegramReactionApproval({
      cfg,
      chatId: 1234,
      messageId: 79,
      actorId: 9,
      emoji: "❤️",
    });
    const second = await resolveTelegramReactionApproval({
      cfg,
      chatId: 1234,
      messageId: 79,
      actorId: 9,
      emoji: "❤️",
    });

    expect(first).toMatchObject({
      matched: true,
      resolved: true,
      decision: "yes",
      record: {
        status: "approved",
      },
    });
    expect(second).toMatchObject({
      matched: true,
      resolved: false,
      reason: "already-resolved",
      record: {
        status: "approved",
      },
    });
  });
});
