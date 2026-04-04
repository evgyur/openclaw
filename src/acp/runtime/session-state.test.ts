import { describe, expect, it } from "vitest";
import {
  createClaudeQuotaBlock,
  formatQuotaRetryAfterText,
  resolveAcpRuntimeModelFromStatus,
} from "./session-state.js";

describe("createClaudeQuotaBlock", () => {
  it("captures retry-after hints from Claude usage limit messages", () => {
    const quotaBlock = createClaudeQuotaBlock({
      message: "Internal error: You're out of extra usage · resets 11pm (Europe/Moscow)",
      now: Date.UTC(2026, 3, 4, 12, 0, 0),
    });

    expect(quotaBlock).toMatchObject({
      kind: "claude_usage_limit",
      retryAfterHint: "11pm (Europe/Moscow)",
    });
    expect(formatQuotaRetryAfterText(quotaBlock)).toBeTruthy();
  });
});

describe("resolveAcpRuntimeModelFromStatus", () => {
  it("prefers currentModelId from runtime status details", () => {
    expect(
      resolveAcpRuntimeModelFromStatus({
        summary: "status=alive",
        details: {
          currentModelId: "default",
          model: "claude-opus-4-6",
        },
      }),
    ).toBe("default");
  });
});
