---
name: grill
description: Pre-PR code review critic — spawns a ruthless subagent to analyze git diffs for bugs, security issues, design flaws, and style problems before submitting pull requests. Enforces quality gates with MUST_FIX tracking.
metadata:
  clawdbot:
    emoji: 🔥
    command: /grill
---

# Grill 🔥

**Pre-PR Code Review Critic** — spawns a ruthless subagent to force quality before submitting pull requests.

---

## Quick Start

### Command
```bash
/grill                           # Analyze current branch vs main
/grill --branch feature-x        # Analyze specific branch
grill me on these changes        # Natural trigger phrase
```

---

## What It Does

1. **Detects current git branch** and compares to `main`
2. **Runs `git diff main...HEAD`** to get all changes
3. **Spawns a critic subagent** with structured analysis prompt
4. **Categorizes issues** into MUST_FIX, CONSIDER, and NIT
5. **Tracks acknowledgment** — won't let you skip critical issues
6. **Provides line references** for every finding

---

## Output Format

```
🔥 Critic mode activated. Analyzing 47 changed files...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ MUST_FIX (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] src/auth.ts:42
    ❌ No rate limiting on login endpoint
    💡 Add express-rate-limit or similar

[2] src/api.ts:89
    ❌ Breaking change to response format, no migration guide
    💡 Add version header or deprecation warning

[3] src/database.ts:156
    ❌ SQL injection vulnerability - unsanitized user input
    💡 Use parameterized queries or ORM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CONSIDER (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[4] src/utils.ts:15
    🤔 Helper function duplicates existing lib/helpers/formatDate
    💡 Reuse existing implementation

[5] src/cache.ts:78
    🤔 No TTL on cache entries - potential memory leak
    💡 Add expiration policy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 NIT (5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[6] src/config.ts:23
    Minor: Variable naming inconsistent (camelCase vs snake_case)

[7] src/logger.ts:45
    Minor: Console.log in production code

[8] src/types.ts:112
    Minor: Interface could use readonly for immutable fields

[9] src/handlers.ts:234
    Minor: Magic number 3600 should be named constant

[10] src/middleware.ts:67
     Minor: Dead code - unused import

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Summary: 3 critical, 2 concerns, 5 style issues

⚠️  Cannot proceed with MUST_FIX items unresolved.

Commands:
  ack [number]  — Acknowledge issue (with reason)
  fix [number]  — Open file in editor at line
  explain [N]   — Get more details
  recheck       — Re-run analysis after fixes
  override      — Force approve (not recommended)
```

---

## Critic Subagent Behavior

### Analysis Categories

| Category | Severity | Examples |
|----------|----------|----------|
| **MUST_FIX** | ⛔ CRITICAL | Bugs, security issues, breaking changes without tests, data loss risks |
| **CONSIDER** | ⚠️  MEDIUM | Design concerns, performance issues, missing edge cases, code duplication |
| **NIT** | 📝 LOW | Style, naming, minor improvements, unused imports |

### Structured Output

The critic returns **JSON** with:
```json
{
  "must_fix": [
    {
      "id": 1,
      "file": "src/auth.ts",
      "line": 42,
      "issue": "No rate limiting on login endpoint",
      "suggestion": "Add express-rate-limit or similar",
      "severity": "security"
    }
  ],
  "consider": [...],
  "nit": [...],
  "summary": {
    "files_changed": 47,
    "lines_added": 1234,
    "lines_removed": 567,
    "risk_level": "high"
  }
}
```

### Approval Rules

- ✅ **Auto-approve** if zero MUST_FIX items
- ⚠️  **Require acknowledgment** for CONSIDER items
- ❌ **Block** if MUST_FIX items exist
- 🔒 **Override** requires explicit command (logged)

---

## Interactive Commands

| Command | Action | Example |
|---------|--------|---------|
| `ack 1` | Acknowledge issue #1 | `ack 1 Will add in follow-up PR` |
| `fix 2` | Open file at line | `fix 2` → opens `src/api.ts:89` |
| `explain 3` | Get detailed analysis | `explain 3` |
| `recheck` | Re-run after fixes | `recheck` |
| `override` | Force approve (logged) | `override Security reviewed separately` |
| `cancel` | Exit grill mode | `cancel` |

---

## Error Handling

### Not a Git Repo
```
❌ Error: Not a git repository
💡 Run: git init
```

### Clean Working Tree
```
🟢 No changes detected between main and current branch.

Options:
  1. Make some commits first
  2. Specify a different base: /grill --base develop
```

### No Main Branch
```
❌ Error: No 'main' branch found

Available branches:
  - master
  - develop
  
💡 Use: /grill --base master
```

### Detached HEAD
```
⚠️  You're in detached HEAD state.
💡 Checkout a branch first: git checkout -b my-feature
```

---

## Advanced Usage

### Compare to Different Base
```bash
/grill --base develop           # Compare to develop instead of main
/grill --base v1.0.0            # Compare to tagged version
```

### Analyze Specific Files
```bash
/grill src/auth.ts src/api.ts   # Only these files
```

### Adjust Severity Thresholds
```bash
/grill --strict                 # Promote CONSIDER → MUST_FIX
/grill --lax                    # Demote some MUST_FIX → CONSIDER
```

### Export Report
```bash
/grill --output grill-report.md  # Save markdown report
/grill --json                    # Output JSON for CI
```

---

## Integration with CI

### GitHub Actions
```yaml
name: Grill Check
on: pull_request

jobs:
  grill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: openclaw grill --json --base ${{ github.base_ref }}
      - run: |
          if [ $? -ne 0 ]; then
            echo "❌ Grill found critical issues"
            exit 1
          fi
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit
openclaw grill --base main --strict
if [ $? -ne 0 ]; then
  echo "Fix issues before committing"
  exit 1
fi
```

---

## Configuration

Add to `~/.clawdbot/config.json`:
```json
{
  "skills": {
    "grill": {
      "defaultBase": "main",
      "autoFix": false,
      "strictMode": true,
      "categories": {
        "must_fix": ["security", "bugs", "breaking", "data_loss"],
        "consider": ["performance", "design", "duplicates"],
        "nit": ["style", "naming", "dead_code"]
      },
      "ignorePatterns": [
        "*.test.ts",
        "*.spec.ts",
        "**/__mocks__/**"
      ]
    }
  }
}
```

---

## Examples

### Typical Session
```
User: /grill
Bot: 🔥 Analyzing changes on feature/auth-refactor vs main...

[Shows 2 MUST_FIX, 3 CONSIDER, 8 NIT]

User: fix 1
Bot: [Opens src/auth.ts:42 in editor]

User: ack 1 Added rate limiting with express-rate-limit
Bot: ✅ Issue #1 acknowledged

User: fix 2
Bot: [Opens src/api.ts:89]

User: ack 2 Migration guide added to CHANGELOG.md
Bot: ✅ Issue #2 acknowledged

User: recheck
Bot: 🔥 Re-analyzing...
     🟢 All MUST_FIX items resolved! 
     
     Still have 3 CONSIDER and 8 NIT items.
     Ready to proceed?

User: yes
Bot: ✅ Code review approved! Good luck with the PR. 🚀
```

### Override Example
```
User: /grill
Bot: [Shows 1 MUST_FIX about missing test]

User: override This endpoint is deprecated, removing next sprint
Bot: ⚠️  OVERRIDE LOGGED
     Reason: This endpoint is deprecated, removing next sprint
     Timestamp: 2026-01-31T12:34:56Z
     User: @peter
     
     ✅ Proceeding with override. Use caution. ⚠️
```

---

## Subagent Prompt (Internal)

```
You are a ruthless code reviewer analyzing a git diff.

Your task:
1. Read the entire diff carefully
2. Identify issues in three categories:
   - MUST_FIX: Bugs, security vulnerabilities, breaking changes without migration, data loss risks
   - CONSIDER: Design concerns, performance issues, missing edge cases, code duplication
   - NIT: Style inconsistencies, naming, minor improvements, dead code

3. For each issue provide:
   - Exact file path and line number
   - Clear description of the problem
   - Actionable suggestion for fix

4. Return structured JSON with categories

5. Do NOT approve if MUST_FIX items exist

Rules:
- Be ruthless but fair
- Focus on correctness and security first
- Consider maintainability and performance
- Ignore formatting if linter passes
- Flag breaking changes without tests
- Identify missing error handling
- Spot potential race conditions
- Check for SQL injection, XSS, CSRF
- Verify async/await usage
- Look for resource leaks (connections, file handles)

Output format:
{
  "must_fix": [...],
  "consider": [...],
  "nit": [...],
  "summary": {
    "files_changed": N,
    "lines_added": N,
    "lines_removed": N,
    "risk_level": "low|medium|high|critical"
  }
}
```

---

## Tips

1. **Run before creating PR** — catch issues early
2. **Acknowledge with context** — explain your reasoning
3. **Don't skip MUST_FIX** — they're critical for a reason
4. **Use `recheck` after fixes** — verify you addressed the issues
5. **Override sparingly** — it's logged and visible to team

---

## Files

```
grill/
├── SKILL.md                    # This file
├── grill.ts                    # Main implementation
├── critic-prompt.md            # Full subagent prompt
├── templates/
│   └── report.md               # Markdown report template
└── tests/
    └── grill.test.ts           # Test suite
```

---

## Related Skills

- **Shaw** — Full development workflow with quality gates
- **Clawguard** — Security-focused prompt injection defense
- **GitHub** — PR management and CI integration

---

## Credits

**Grill v1.0** — "Ruthless but Fair"

Inspired by:
- Shaw's LARP Assessment (prompt 6)
- Code review best practices
- Static analysis tools (ESLint, Clippy, etc.)

---

## Version History

**v1.0** — Initial release
- Git diff analysis
- Three-tier categorization (MUST_FIX, CONSIDER, NIT)
- Interactive acknowledgment tracking
- Subagent-based critic
- JSON structured output
- CI integration support
