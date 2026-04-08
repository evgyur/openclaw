import { describe, expect, it } from "vitest";
import { formatAcpRuntimeErrorText } from "./error-text.js";
import { AcpRuntimeError } from "./errors.js";

describe("formatAcpRuntimeErrorText", () => {
  it("adds actionable next steps for known ACP runtime error codes", () => {
    const text = formatAcpRuntimeErrorText(
      new AcpRuntimeError("ACP_BACKEND_MISSING", "backend missing"),
    );
    expect(text).toContain("ACP error (ACP_BACKEND_MISSING): backend missing");
    expect(text).toContain("next:");
  });

  it("returns consistent ACP error envelope for runtime failures", () => {
    const text = formatAcpRuntimeErrorText(new AcpRuntimeError("ACP_TURN_FAILED", "turn failed"));
    expect(text).toContain("ACP error (ACP_TURN_FAILED): turn failed");
    expect(text).toContain("next:");
  });

  it("surfaces quota guidance for Claude usage exhaustion", () => {
    const text = formatAcpRuntimeErrorText(
      new AcpRuntimeError(
        "ACP_TURN_FAILED",
        "Your current session is at 100% and out of extra usage until 3pm.",
      ),
    );
    expect(text).toContain(
      "ACP error (ACP_TURN_FAILED): Your current session is at 100% and out of extra usage until 3pm.",
    );
    expect(text).toContain("Claude ACP likely hit a session/extra-usage limit");
  });

  it("keeps stale session failures on the generic retry path", () => {
    const text = formatAcpRuntimeErrorText(
      new AcpRuntimeError("ACP_TURN_FAILED", "status=dead queue owner unavailable"),
    );
    expect(text).toContain("ACP error (ACP_TURN_FAILED): status=dead queue owner unavailable");
    expect(text).toContain("Retry, or use `/acp cancel` and send the message again.");
    expect(text).not.toContain("Claude ACP likely hit a session/extra-usage limit");
  });
});
