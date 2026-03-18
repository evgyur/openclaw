import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectChangedExtensionIds,
  listAvailableExtensionIds,
  resolveExtensionTestPlan,
} from "../../scripts/test-extension.mjs";

const scriptPath = path.join(process.cwd(), "scripts", "test-extension.mjs");
type DryRunPlan = ReturnType<typeof resolveExtensionTestPlan> & {
  maxTests?: number;
  selectedTestFiles: string[];
};

function readPlan(args: string[], cwd = process.cwd()) {
  const stdout = execFileSync(process.execPath, [scriptPath, ...args, "--dry-run", "--json"], {
    cwd,
    encoding: "utf8",
  });
  return JSON.parse(stdout) as DryRunPlan;
}

function findZeroTestExtensionId(): string | undefined {
  for (const extensionId of listAvailableExtensionIds()) {
    const plan = resolveExtensionTestPlan({ targetArg: extensionId, cwd: process.cwd() });
    if (plan.testFiles.length === 0) {
      return extensionId;
    }
  }
  return undefined;
}

describe("scripts/test-extension.mjs", () => {
  it("resolves channel-root extensions onto the channel vitest config", () => {
    const plan = resolveExtensionTestPlan({ targetArg: "slack", cwd: process.cwd() });

    expect(plan.extensionId).toBe("slack");
    expect(plan.extensionDir).toBe("extensions/slack");
    expect(plan.config).toBe("vitest.channels.config.ts");
    expect(plan.testFiles.some((file) => file.startsWith("extensions/slack/"))).toBe(true);
  });

  it("resolves provider extensions onto the extensions vitest config", () => {
    const plan = resolveExtensionTestPlan({ targetArg: "firecrawl", cwd: process.cwd() });

    expect(plan.extensionId).toBe("firecrawl");
    expect(plan.config).toBe("vitest.extensions.config.ts");
    expect(plan.testFiles.some((file) => file.startsWith("extensions/firecrawl/"))).toBe(true);
  });

  it("includes paired src roots when they contain tests", () => {
    const plan = resolveExtensionTestPlan({ targetArg: "line", cwd: process.cwd() });

    expect(plan.roots).toContain("extensions/line");
    expect(plan.roots).toContain("src/line");
    expect(plan.config).toBe("vitest.channels.config.ts");
    expect(plan.testFiles.some((file) => file.startsWith("src/line/"))).toBe(true);
  });

  it("infers the extension from the current working directory", () => {
    const cwd = path.join(process.cwd(), "extensions", "slack");
    const plan = readPlan([], cwd);

    expect(plan.extensionId).toBe("slack");
    expect(plan.extensionDir).toBe("extensions/slack");
  });

  it("maps changed paths back to extension ids", () => {
    const extensionIds = detectChangedExtensionIds([
      "extensions/slack/src/channel.ts",
      "src/line/message.test.ts",
      "extensions/firecrawl/package.json",
      "src/not-a-plugin/file.ts",
    ]);

    expect(extensionIds).toEqual(["firecrawl", "line", "slack"]);
  });

  it("lists available extension ids", () => {
    const extensionIds = listAvailableExtensionIds();

    expect(extensionIds).toContain("slack");
    expect(extensionIds).toContain("firecrawl");
    expect(extensionIds).toEqual(
      [...extensionIds].toSorted((left, right) => left.localeCompare(right)),
    );
  });

  it("permits zero-test extensions when --allow-empty is passed", () => {
    const extensionId = findZeroTestExtensionId();
    expect(extensionId).toBeTruthy();

    const plan = readPlan([extensionId!, "--allow-empty"]);
    expect(plan.extensionId).toBe(extensionId);
    expect(plan.testFiles).toHaveLength(0);
    expect(plan.selectedTestFiles).toHaveLength(0);
  });

  it("limits selected tests when --max-tests is passed", () => {
    const plan = readPlan(["discord", "--allow-empty", "--max-tests", "1"]);
    expect(plan.extensionId).toBe("discord");
    expect(plan.testFiles.length).toBeGreaterThan(1);
    expect(plan.selectedTestFiles).toHaveLength(1);
    expect(plan.maxTests).toBe(1);
  });
});
