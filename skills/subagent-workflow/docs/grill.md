# Code Review with `/grill`

**Pre-PR code review powered by AI — catch bugs, security issues, and style problems before CI runs.**

---

## Why Pre-PR Review Matters

Traditional code review happens **after** you open a PR:
- CI pipelines take minutes (or hours) to run
- Reviewers are busy or in different time zones
- You've already context-switched to the next task
- Fixing issues requires another review cycle

**`/grill` changes this:**

✅ **Instant feedback** — get results in seconds, not hours  
✅ **Catch issues early** — before CI runs or reviewers see your code  
✅ **Learn faster** — understand *why* something is flagged  
✅ **Save reviewer time** — fewer rounds of feedback  
✅ **Ship with confidence** — know your code is solid before pushing

---

## Command Reference

### Basic usage

```bash
# Review unstaged changes
openclaw grill

# Review specific files
openclaw grill src/api/users.ts src/utils/validators.ts

# Review all TypeScript files
openclaw grill '**/*.ts'
```

### Flags

#### `--strict`
Enable stricter thresholds — surfaces more CONSIDER and NIT-level issues.

```bash
openclaw grill --strict
```

**Use when:**
- You're working on critical code (auth, payments, security)
- You want to learn best practices
- You have time to address minor improvements

**Skip when:**
- You need quick validation for a prototype
- You're doing exploratory work

---

#### `--focus=<area>`
Focus the review on a specific area.

```bash
# Security-focused review
openclaw grill --focus=security

# Performance-focused review
openclaw grill --focus=performance

# Maintainability-focused review
openclaw grill --focus=maintainability
```

**Available focus areas:**
- `security` — Auth, input validation, injection risks, secrets
- `performance` — Algorithmic complexity, memory usage, database queries
- `maintainability` — Code clarity, duplication, naming, structure
- `correctness` — Logic errors, edge cases, type safety
- `style` — Formatting, conventions, idiomatic patterns

**Combine multiple areas:**
```bash
openclaw grill --focus=security,performance
```

---

#### `--output=<format>`
Control output format.

```bash
# Default: terminal-friendly with colors
openclaw grill

# JSON for CI integration
openclaw grill --output=json

# Markdown for GitHub PR comments
openclaw grill --output=markdown > review.md
```

---

#### `--severity=<level>`
Set minimum severity to display.

```bash
# Only show critical issues
openclaw grill --severity=MUST_FIX

# Show everything including nitpicks
openclaw grill --severity=NIT
```

---

## Interpreting Results

`/grill` categorizes findings into three severity levels:

### 🔴 MUST_FIX
**Critical issues that will likely break production or introduce security vulnerabilities.**

Examples:
- SQL injection vulnerabilities
- Unhandled promise rejections in critical paths
- Authentication bypass bugs
- Memory leaks in long-running processes
- Type errors that will cause runtime crashes

**Action:** Fix these before merging. No exceptions.

---

### 🟡 CONSIDER
**Issues that may cause problems in specific scenarios or violate best practices.**

Examples:
- Missing error handling in edge cases
- Inefficient algorithms that work but don't scale
- Unclear variable names that hurt readability
- Missing input validation (non-critical paths)
- Potential race conditions

**Action:** Evaluate context. Fix if:
- The code path is frequently used
- The issue affects user experience
- The fix is straightforward

Skip if:
- It's a prototype or internal tool
- The scenario is genuinely edge-case
- The refactor would introduce complexity

---

### 🟢 NIT
**Style preferences, minor improvements, or suggestions for idiomatic code.**

Examples:
- Consistent naming conventions
- Simplifying logic with language features (e.g., optional chaining)
- Moving magic numbers to constants
- Adding helpful comments
- Formatting improvements

**Action:** Optional. Fix when:
- You're already editing nearby code
- You want to learn better patterns
- The codebase has strict style guidelines

---

## Example Output

```
🔍 Reviewing src/api/users.ts...

🔴 MUST_FIX: SQL Injection Risk (line 45)
  ╭─────────────────────────────────────────────────────────╮
  │ const query = `SELECT * FROM users WHERE id = ${userId}` │
  ╰─────────────────────────────────────────────────────────╯
  
  Problem: User input is directly interpolated into SQL query
  Impact: Attackers can execute arbitrary SQL commands
  Fix: Use parameterized queries
  
  ✅ Suggested:
  const query = `SELECT * FROM users WHERE id = ?`
  db.execute(query, [userId])

🟡 CONSIDER: Missing Error Handling (line 78)
  ╭────────────────────────────────────────────╮
  │ const data = await fetchUserData(userId);   │
  │ return res.json(data);                      │
  ╰────────────────────────────────────────────╯
  
  Problem: Network request can fail but no try/catch
  Impact: Unhandled promise rejection crashes the server
  Fix: Wrap in try/catch and return appropriate error response

🟢 NIT: Inconsistent Naming (line 92)
  ╭──────────────────────────────╮
  │ const usr = await getUser(); │
  ╰──────────────────────────────╯
  
  Suggestion: Use full word 'user' for consistency with codebase

✅ Review complete
  • 1 MUST_FIX
  • 1 CONSIDER
  • 1 NIT
```

---

## Integration with GitHub PRs

### Generate PR comment
```bash
# Run grill and save markdown output
openclaw grill --output=markdown > review.md

# Post as PR comment (requires gh CLI)
gh pr comment <PR_NUMBER> --body-file review.md
```

### CI Integration
Add to your GitHub Actions workflow:

```yaml
name: AI Code Review
on: pull_request

jobs:
  grill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install OpenClaw
        run: npm install -g openclaw
      
      - name: Run grill
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          openclaw grill --output=json > grill-results.json
          
      - name: Check for MUST_FIX issues
        run: |
          if grep -q '"severity":"MUST_FIX"' grill-results.json; then
            echo "❌ MUST_FIX issues found"
            exit 1
          fi
          
      - name: Post results
        if: always()
        run: |
          openclaw grill --output=markdown > review.md
          gh pr comment ${{ github.event.pull_request.number }} --body-file review.md
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Tips & Best Practices

### 1. Run grill before committing
Add to your pre-commit hook:

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running grill..."
if ! openclaw grill --severity=MUST_FIX; then
  echo "❌ MUST_FIX issues found. Commit blocked."
  exit 1
fi
```

### 2. Use --focus for targeted reviews
If you're only touching auth code:
```bash
openclaw grill src/auth/*.ts --focus=security
```

### 3. Review incrementally
Don't wait until you have 500+ lines of changes:
```bash
# Review after each logical chunk
git add src/api/users.ts
openclaw grill src/api/users.ts
```

### 4. Learn from NITs
Even if you don't fix every NIT, read them — they teach you patterns and idioms you might not know.

### 5. Combine with linters
`/grill` complements (doesn't replace) ESLint, Prettier, etc.
- **Linters** catch syntax and style
- **`/grill`** catches logic, security, and architectural issues

---

## Limitations

`/grill` is powerful but not perfect:

❌ **Cannot replace human reviewers** — context, design decisions, and business logic still need human judgment  
❌ **May miss issues** — AI can hallucinate or miss edge cases  
❌ **May flag false positives** — especially in strict mode  
❌ **Limited to visible code** — doesn't understand external dependencies or runtime behavior  

**Best practice:** Use `/grill` as a first pass, then have humans review.

---

## FAQ

**Q: Does grill modify my code?**  
A: No. It only analyzes and reports findings. You decide what to fix.

**Q: What models does it use?**  
A: By default, Claude Sonnet 4 for speed and cost. You can configure this in `~/.clawdbot/config.json5`.

**Q: How much does it cost?**  
A: Roughly $0.01–$0.05 per review (depends on file size and model). See [FAQ](./faq.md#cost-considerations).

**Q: Can I customize the review criteria?**  
A: Yes. See `grillDefaults` in your config file.

**Q: Does it work with languages other than TypeScript?**  
A: Yes — Python, Go, Rust, Java, etc. The quality of feedback depends on the model's training.

---

## Next Steps

- **[Using Subagents](./use-subagents.md)** — Learn how grill spawns subagents under the hood
- **[Opus Guard](./opus-guard.md)** — Understand the safety layer
- **[FAQ](./faq.md)** — More questions about performance and debugging
