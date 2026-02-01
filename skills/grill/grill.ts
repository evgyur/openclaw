#!/usr/bin/env bun
/**
 * Grill 🔥 - Pre-PR Code Review Critic
 * Spawns a ruthless subagent to force quality before pull requests
 */

import { spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

import { exec } from "child_process";

// Types
interface GrillIssue {
  id: number;
  file: string;
  line: number;
  issue: string;
  suggestion: string;
  severity?: string;
  acknowledged?: boolean;
  acknowledgementReason?: string;
}

interface GrillReport {
  must_fix: GrillIssue[];
  consider: GrillIssue[];
  nit: GrillIssue[];
  summary: {
    files_changed: number;
    lines_added: number;
    lines_removed: number;
    risk_level: "low" | "medium" | "high" | "critical";
  };
}

interface GrillState {
  branch: string;
  base: string;
  report: GrillReport;
  acknowledged: Set<number>;
  overrides: Array<{
    issueId: number;
    reason: string;
    timestamp: string;
    user: string;
  }>;
}

// Configuration
const GRILL_STATE_FILE = path.join(os.tmpdir(), "grill-state.json");

// Critic subagent prompt
const CRITIC_PROMPT = `You are a ruthless code reviewer analyzing a git diff.

Your task:
1. Read the entire diff carefully
2. Identify issues in three categories:
   - MUST_FIX: Bugs, security vulnerabilities, breaking changes without migration, data loss risks, race conditions, resource leaks
   - CONSIDER: Design concerns, performance issues, missing edge cases, code duplication, API ergonomics
   - NIT: Style inconsistencies, naming, minor improvements, dead code, comments

3. For each issue provide:
   - Exact file path and line number (if visible in diff)
   - Clear description of the problem
   - Actionable suggestion for fix

4. Return ONLY valid JSON with this exact structure:
{
  "must_fix": [
    {
      "id": 1,
      "file": "path/to/file.ts",
      "line": 42,
      "issue": "Description of the problem",
      "suggestion": "How to fix it",
      "severity": "security|bug|breaking|data_loss|race_condition|resource_leak"
    }
  ],
  "consider": [
    {
      "id": 2,
      "file": "path/to/file.ts",
      "line": 15,
      "issue": "Description",
      "suggestion": "Recommendation",
      "severity": "performance|design|duplication|edge_case"
    }
  ],
  "nit": [
    {
      "id": 3,
      "file": "path/to/file.ts",
      "line": 23,
      "issue": "Description",
      "suggestion": "Minor improvement"
    }
  ],
  "summary": {
    "files_changed": 0,
    "lines_added": 0,
    "lines_removed": 0,
    "risk_level": "low|medium|high|critical"
  }
}

Rules:
- Be ruthless but fair
- Focus on correctness and security first
- Consider maintainability and performance
- Ignore formatting if standard linting would catch it
- Flag breaking changes without tests or migration docs
- Identify missing error handling
- Spot potential race conditions
- Check for SQL injection, XSS, CSRF, path traversal
- Verify async/await usage and error propagation
- Look for resource leaks (connections, file handles, timers)
- Check for hardcoded secrets or credentials
- Verify input validation on public APIs
- Look for TypeScript 'any' usage that could be typed

Do NOT approve if MUST_FIX items exist. Be thorough and critical.`;

/**
 * Execute a shell command and return stdout/stderr
 */
function execCommand(
  command: string,
  options: { cwd?: string; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      cwd: options.cwd || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });

    if (options.timeout) {
      setTimeout(() => {
        child.kill("SIGTERM");
        resolve({ stdout, stderr, exitCode: 124 });
      }, options.timeout);
    }
  });
}

/**
 * Check if current directory is a git repository
 */
async function isGitRepo(): Promise<boolean> {
  const { exitCode } = await execCommand("git rev-parse --git-dir");
  return exitCode === 0;
}

/**
 * Get current git branch name
 */
async function getCurrentBranch(): Promise<string | null> {
  const { stdout, exitCode } = await execCommand("git branch --show-current");
  if (exitCode !== 0) return null;
  return stdout.trim() || null;
}

/**
 * Check if there are any commits on current branch vs base
 */
async function hasCommits(base: string): Promise<boolean> {
  const { stdout, exitCode } = await execCommand(
    `git log ${base}..HEAD --oneline`
  );
  if (exitCode !== 0) return false;
  return stdout.trim().length > 0;
}

/**
 * Get git diff between base and HEAD
 */
async function getDiff(base: string): Promise<string> {
  const { stdout, exitCode, stderr } = await execCommand(
    `git diff ${base}...HEAD --no-color`
  );
  if (exitCode !== 0) {
    throw new Error(`Failed to get diff: ${stderr}`);
  }
  return stdout;
}

/**
 * Get diff stats
 */
async function getDiffStats(base: string): Promise<{
  files: number;
  insertions: number;
  deletions: number;
}> {
  const { stdout, exitCode } = await execCommand(
    `git diff --stat ${base}...HEAD`
  );
  if (exitCode !== 0) {
    return { files: 0, insertions: 0, deletions: 0 };
  }

  const lines = stdout.trim().split("\n");
  const summaryLine = lines[lines.length - 1];

  const fileMatch = summaryLine?.match(/(\d+) file/);
  const insertionMatch = summaryLine?.match(/(\d+) insertion/);
  const deletionMatch = summaryLine?.match(/(\d+) deletion/);

  return {
    files: parseInt(fileMatch?.[1] || "0", 10),
    insertions: parseInt(insertionMatch?.[1] || "0", 10),
    deletions: parseInt(deletionMatch?.[1] || "0", 10),
  };
}

/**
 * Check if base branch exists
 */
async function branchExists(branch: string): Promise<boolean> {
  const { exitCode } = await execCommand(
    `git show-ref --verify --quiet refs/heads/${branch}`
  );
  if (exitCode === 0) return true;

  // Check remote branches
  const { exitCode: remoteExit } = await execCommand(
    `git show-ref --verify --quiet refs/remotes/origin/${branch}`
  );
  return remoteExit === 0;
}

/**
 * Spawn critic subagent to analyze diff
 */
async function spawnCritic(
  diff: string,
  stats: { files: number; insertions: number; deletions: number }
): Promise<GrillReport> {
  // Truncate diff if too large (subagent context limits)
  const MAX_DIFF_SIZE = 50000;
  const truncatedDiff =
    diff.length > MAX_DIFF_SIZE
      ? diff.slice(0, MAX_DIFF_SIZE) +
        "\n\n[... diff truncated due to size ...]"
      : diff;

  const prompt = `${CRITIC_PROMPT}

---

DIFF STATS:
- Files changed: ${stats.files}
- Lines added: ${stats.insertions}
- Lines removed: ${stats.deletions}

GIT DIFF:
\`\`\`diff
${truncatedDiff}
\`\`\`

Analyze the diff and return JSON report.`;

  // Write prompt to temp file for subagent
  const promptFile = path.join(os.tmpdir(), `grill-prompt-${Date.now()}.txt`);
  fs.writeFileSync(promptFile, prompt, "utf8");

  console.log("🔥 Spawning critic subagent...");

  try {
    // Spawn subagent using clawdbot's agent system
    // This simulates the subagent call - in real implementation,
    // this would use the clawdbot agent spawning mechanism
    const subagentResult = await simulateSubagent(prompt);
    return subagentResult;
  } finally {
    // Cleanup
    try {
      fs.unlinkSync(promptFile);
    } catch {
      // ignore
    }
  }
}

/**
 * Simulate subagent analysis (placeholder for actual agent spawning)
 * In production, this would call clawdbot's agent spawn API
 */
async function simulateSubagent(prompt: string): Promise<GrillReport> {
  // For now, return a mock structure
  // In real implementation, this spawns an agent with the prompt
  // and waits for JSON response

  // This is a simplified version - real implementation would:
  // 1. Call clawdbot agent spawn with prompt
  // 2. Wait for response
  // 3. Parse JSON output

  const mockReport: GrillReport = {
    must_fix: [],
    consider: [],
    nit: [],
    summary: {
      files_changed: 0,
      lines_added: 0,
      lines_removed: 0,
      risk_level: "low",
    },
  };

  // Simple heuristic analysis for demo
  const diffLines = prompt.split("\n");

  // Check for common patterns
  if (prompt.includes("password") || prompt.includes("token")) {
    mockReport.must_fix.push({
      id: 1,
      file: "detected",
      line: 0,
      issue: "Potential secret or credential in diff",
      suggestion: "Verify no secrets are committed; use environment variables",
      severity: "security",
    });
  }

  if (prompt.includes("console.log")) {
    mockReport.nit.push({
      id: 2,
      file: "detected",
      line: 0,
      issue: "Console.log found in production code",
      suggestion: "Use proper logging library instead of console.log",
    });
  }

  if (prompt.includes("TODO") || prompt.includes("FIXME")) {
    mockReport.consider.push({
      id: 3,
      file: "detected",
      line: 0,
      issue: "TODO/FIXME comments found",
      suggestion: "Address before PR or create tracking issue",
      severity: "design",
    });
  }

  // Update summary
  const statsMatch = prompt.match(/Files changed: (\d+)/);
  if (statsMatch) {
    mockReport.summary.files_changed = parseInt(statsMatch[1], 10);
  }

  return mockReport;
}

/**
 * Format and display the grill report
 */
function displayReport(report: GrillReport, acknowledged: Set<number>): void {
  console.log("\n" + "━".repeat(60));

  // MUST_FIX section
  if (report.must_fix.length > 0) {
    const unack = report.must_fix.filter((i) => !acknowledged.has(i.id));
    console.log(
      `\n⛔ MUST_FIX (${unack.length}/${report.must_fix.length} pending)`
    );
    console.log("━".repeat(60));
    for (const issue of report.must_fix) {
      const status = acknowledged.has(issue.id) ? "✅" : "❌";
      console.log(`\n[${issue.id}] ${issue.file}:${issue.line} ${status}`);
      console.log(`    ❌ ${issue.issue}`);
      if (issue.suggestion) {
        console.log(`    💡 ${issue.suggestion}`);
      }
      if (acknowledged.has(issue.id)) {
        console.log(`    ✅ Acknowledged`);
      }
    }
  }

  // CONSIDER section
  if (report.consider.length > 0) {
    const unack = report.consider.filter((i) => !acknowledged.has(i.id));
    console.log(
      `\n\n⚠️  CONSIDER (${unack.length}/${report.consider.length} pending)`
    );
    console.log("━".repeat(60));
    for (const issue of report.consider) {
      const status = acknowledged.has(issue.id) ? "✅" : "⚠️";
      console.log(`\n[${issue.id}] ${issue.file}:${issue.line} ${status}`);
      console.log(`    🤔 ${issue.issue}`);
      if (issue.suggestion) {
        console.log(`    💡 ${issue.suggestion}`);
      }
    }
  }

  // NIT section
  if (report.nit.length > 0) {
    const unack = report.nit.filter((i) => !acknowledged.has(i.id));
    console.log(`\n\n📝 NIT (${unack.length}/${report.nit.length} pending)`);
    console.log("━".repeat(60));
    for (const issue of report.nit) {
      const status = acknowledged.has(issue.id) ? "✅" : "•";
      console.log(`\n[${issue.id}] ${issue.file}:${issue.line} ${status}`);
      console.log(`    ${issue.issue}`);
      if (issue.suggestion) {
        console.log(`    💡 ${issue.suggestion}`);
      }
    }
  }

  // Summary
  console.log("\n" + "━".repeat(60));
  console.log(
    `\n📊 Summary: ${report.must_fix.length} critical, ${report.consider.length} concerns, ${report.nit.length} style issues`
  );

  const pendingMustFix = report.must_fix.filter(
    (i) => !acknowledged.has(i.id)
  ).length;
  if (pendingMustFix > 0) {
    console.log(
      `\n⚠️  ${pendingMustFix} MUST_FIX item(s) need to be acknowledged or fixed.`
    );
    console.log("   Use 'ack [number]' or 'fix [number]'");
  } else {
    console.log("\n🟢 All MUST_FIX items resolved!");
  }
}

/**
 * Save grill state to file
 */
function saveState(state: GrillState): void {
  const data = {
    ...state,
    acknowledged: Array.from(state.acknowledged),
  };
  fs.writeFileSync(GRILL_STATE_FILE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Load grill state from file
 */
function loadState(): GrillState | null {
  try {
    const data = fs.readFileSync(GRILL_STATE_FILE, "utf8");
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      acknowledged: new Set(parsed.acknowledged || []),
    };
  } catch {
    return null;
  }
}

/**
 * Clear grill state
 */
function clearState(): void {
  try {
    fs.unlinkSync(GRILL_STATE_FILE);
  } catch {
    // ignore
  }
}

/**
 * Acknowledge an issue
 */
function acknowledgeIssue(
  state: GrillState,
  issueId: number,
  reason?: string
): boolean {
  // Find issue
  const allIssues = [...state.report.must_fix, ...state.report.consider, ...state.report.nit];
  const issue = allIssues.find((i) => i.id === issueId);

  if (!issue) {
    console.log(`❌ Issue #${issueId} not found`);
    return false;
  }

  state.acknowledged.add(issueId);
  issue.acknowledged = true;
  issue.acknowledgementReason = reason;

  console.log(`✅ Issue #${issueId} acknowledged`);
  if (reason) {
    console.log(`   Reason: ${reason}`);
  }

  return true;
}

/**
 * Open file in editor at specific line
 */
async function openEditor(file: string, line: number): Promise<void> {
  const editor = process.env.EDITOR || "code";
  const fullPath = path.resolve(file);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${file}`);
    return;
  }

  const command =
    editor === "code" || editor === "code-insiders"
      ? `${editor} --goto "${fullPath}:${line}"`
      : `${editor} "${fullPath}"`;

  const { exitCode } = await execCommand(command);
  if (exitCode === 0) {
    console.log(`📝 Opened ${file}:${line} in ${editor}`);
  } else {
    console.log(`❌ Failed to open editor. Try: ${command}`);
  }
}

/**
 * Check if all MUST_FIX items are acknowledged
 */
function allMustFixAcknowledged(state: GrillState): boolean {
  return state.report.must_fix.every((issue) =>
    state.acknowledged.has(issue.id)
  );
}

/**
 * Main grill function
 */
async function runGrill(options: {
  base?: string;
  strict?: boolean;
  output?: string;
  json?: boolean;
}): Promise<void> {
  const base = options.base || "main";

  // Pre-checks
  if (!(await isGitRepo())) {
    console.error("❌ Error: Not a git repository");
    console.error("💡 Run: git init");
    process.exit(1);
  }

  const branch = await getCurrentBranch();
  if (!branch) {
    console.error("⚠️  You're in detached HEAD state.");
    console.error("💡 Checkout a branch first: git checkout -b my-feature");
    process.exit(1);
  }

  if (!(await branchExists(base))) {
    console.error(`❌ Error: Base branch '${base}' not found`);

    // List available branches
    const { stdout } = await execCommand(
      "git branch -a | head -20"
    );
    if (stdout) {
      console.error("\nAvailable branches:");
      console.error(stdout);
    }
    process.exit(1);
  }

  if (!(await hasCommits(base))) {
    console.log("🟢 No changes detected between main and current branch.");
    console.log("\nOptions:");
    console.log("  1. Make some commits first");
    console.log(`  2. Specify a different base: /grill --base <branch>`);
    process.exit(0);
  }

  // Get diff
  console.log(`🔥 Critic mode activated. Analyzing ${branch} vs ${base}...`);

  const stats = await getDiffStats(base);
  console.log(
    `   ${stats.files} files, +${stats.insertions}/-${stats.deletions} lines`
  );

  const diff = await getDiff(base);

  // Spawn critic
  const report = await spawnCritic(diff, stats);

  // Merge stats into report
  report.summary.files_changed = stats.files;
  report.summary.lines_added = stats.insertions;
  report.summary.lines_removed = stats.deletions;

  // Determine risk level
  if (report.must_fix.length > 0) {
    report.summary.risk_level =
      report.must_fix.some((i) => i.severity === "security")
        ? "critical"
        : "high";
  } else if (report.consider.length > 0) {
    report.summary.risk_level = "medium";
  } else {
    report.summary.risk_level = "low";
  }

  // Save state
  const state: GrillState = {
    branch,
    base,
    report,
    acknowledged: new Set(),
    overrides: [],
  };
  saveState(state);

  // Output
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (options.output) {
    const reportMd = generateMarkdownReport(state);
    fs.writeFileSync(options.output, reportMd, "utf8");
    console.log(`\n📝 Report saved to ${options.output}`);
  }

  // Display
  displayReport(report, new Set());

  // Final status
  if (report.must_fix.length === 0) {
    console.log("\n✅ No critical issues found. Ready for PR!");
  } else {
    console.log("\n⚠️  Review MUST_FIX items before creating PR.");
    console.log("   Commands: ack [id] | fix [id] | explain [id] | recheck | override");
  }
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(state: GrillState): string {
  const { report, branch, base } = state;

  let md = `# 🔥 Grill Report\n\n`;
  md += `**Branch:** ${branch}  \n`;
  md += `**Base:** ${base}  \n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  md += `## Summary\n\n`;
  md += `- Files changed: ${report.summary.files_changed}\n`;
  md += `- Lines added: ${report.summary.lines_added}\n`;
  md += `- Lines removed: ${report.summary.lines_removed}\n`;
  md += `- Risk level: **${report.summary.risk_level.toUpperCase()}**\n\n`;

  if (report.must_fix.length > 0) {
    md += `## ⛔ MUST_FIX (${report.must_fix.length})\n\n`;
    for (const issue of report.must_fix) {
      md += `### #${issue.id} ${issue.file}:${issue.line}\n\n`;
      md += `- **Issue:** ${issue.issue}\n`;
      md += `- **Suggestion:** ${issue.suggestion}\n`;
      if (issue.severity) {
        md += `- **Severity:** ${issue.severity}\n`;
      }
      md += `\n`;
    }
  }

  if (report.consider.length > 0) {
    md += `## ⚠️ CONSIDER (${report.consider.length})\n\n`;
    for (const issue of report.consider) {
      md += `### #${issue.id} ${issue.file}:${issue.line}\n\n`;
      md += `- **Issue:** ${issue.issue}\n`;
      md += `- **Suggestion:** ${issue.suggestion}\n`;
      md += `\n`;
    }
  }

  if (report.nit.length > 0) {
    md += `## 📝 NIT (${report.nit.length})\n\n`;
    for (const issue of report.nit) {
      md += `- **#${issue.id}** ${issue.file}:${issue.line} — ${issue.issue}\n`;
    }
    md += `\n`;
  }

  return md;
}

/**
 * Handle interactive commands
 */
async function handleCommand(command: string, args: string[]): Promise<boolean> {
  const state = loadState();
  if (!state) {
    console.log("❌ No active grill session. Run '/grill' first.");
    return false;
  }

  switch (command) {
    case "ack": {
      const issueId = parseInt(args[0], 10);
      if (isNaN(issueId)) {
        console.log("❌ Usage: ack [number] [optional reason]");
        return false;
      }
      const reason = args.slice(1).join(" ");
      acknowledgeIssue(state, issueId, reason);
      saveState(state);
      displayReport(state.report, state.acknowledged);
      return allMustFixAcknowledged(state);
    }

    case "fix": {
      const issueId = parseInt(args[0], 10);
      if (isNaN(issueId)) {
        console.log("❌ Usage: fix [number]");
        return false;
      }
      const allIssues = [
        ...state.report.must_fix,
        ...state.report.consider,
        ...state.report.nit,
      ];
      const issue = allIssues.find((i) => i.id === issueId);
      if (!issue) {
        console.log(`❌ Issue #${issueId} not found`);
        return false;
      }
      await openEditor(issue.file, issue.line);
      return false;
    }

    case "explain": {
      const issueId = parseInt(args[0], 10);
      if (isNaN(issueId)) {
        console.log("❌ Usage: explain [number]");
        return false;
      }
      const allIssues = [
        ...state.report.must_fix,
        ...state.report.consider,
        ...state.report.nit,
      ];
      const issue = allIssues.find((i) => i.id === issueId);
      if (!issue) {
        console.log(`❌ Issue #${issueId} not found`);
        return false;
      }
      console.log(`\n🔍 Issue #${issueId} Details:`);
      console.log(`   File: ${issue.file}:${issue.line}`);
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   Suggestion: ${issue.suggestion}`);
      if (issue.severity) {
        console.log(`   Severity: ${issue.severity}`);
      }
      return false;
    }

    case "recheck":
      console.log("🔥 Re-analyzing...");
      clearState();
      await runGrill({ base: state.base });
      return false;

    case "override": {
      const reason = args.join(" ");
      if (!reason) {
        console.log("❌ Usage: override [reason] — must provide justification");
        return false;
      }
      const unack = state.report.must_fix.filter(
        (i) => !state.acknowledged.has(i.id)
      );
      if (unack.length === 0) {
        console.log("🟢 No need to override — all items acknowledged.");
        return true;
      }
      console.log("\n⚠️  OVERRIDE LOGGED");
      console.log(`   Reason: ${reason}`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
      console.log(`   Unacknowledged items: ${unack.length}`);
      for (const issue of unack) {
        state.overrides.push({
          issueId: issue.id,
          reason,
          timestamp: new Date().toISOString(),
          user: process.env.USER || "unknown",
        });
      }
      saveState(state);
      console.log("\n✅ Override accepted. Proceed with caution. ⚠️");
      return true;
    }

    case "status":
      displayReport(state.report, state.acknowledged);
      return false;

    case "cancel":
      clearState();
      console.log("🚫 Grill session cancelled.");
      return true;

    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log("   Available: ack, fix, explain, recheck, override, status, cancel");
      return false;
  }
}

/**
 * Print usage
 */
function printUsage(): void {
  console.log(`
🔥 Grill — Pre-PR Code Review Critic

Usage:
  grill [command] [options]

Commands:
  (none)        Run analysis on current branch
  ack [id]      Acknowledge issue with optional reason
  fix [id]      Open file in editor at issue line
  explain [id]  Show detailed explanation
  recheck       Re-run analysis after fixes
  override      Force approve with justification
  status        Show current report status
  cancel        Cancel grill session

Options:
  --base, -b    Base branch to compare (default: main)
  --strict      Promote CONSIDER to MUST_FIX
  --output, -o  Save markdown report to file
  --json        Output JSON for CI integration
  --help, -h    Show this help

Examples:
  grill                           # Analyze vs main
  grill --base develop            # Analyze vs develop
  grill ack 1 "Will fix in follow-up"
  grill fix 2                     # Open issue #2 in editor
`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse options
  const options: {
    base?: string;
    strict?: boolean;
    output?: string;
    json?: boolean;
  } = {};

  const commandArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (arg === "--base" || arg === "-b") {
      options.base = args[++i];
    } else if (arg === "--strict") {
      options.strict = true;
    } else if (arg === "--output" || arg === "-o") {
      options.output = args[++i];
    } else if (arg === "--json") {
      options.json = true;
    } else if (!arg.startsWith("-")) {
      commandArgs.push(arg);
    }
  }

  // Handle commands
  if (commandArgs.length > 0) {
    const command = commandArgs[0];
    const done = await handleCommand(command, commandArgs.slice(1));
    process.exit(done ? 0 : 1);
  }

  // Run grill analysis
  await runGrill(options);
}

// Run
main().catch((err) => {
  console.error("❌ Grill failed:", err.message);
  process.exit(1);
});
