# FAQ

**Common questions about subagent workflows, performance, costs, and troubleshooting.**

---

## Performance: Overhead of Subagents

### How much overhead do subagents add?

**Spawning overhead:** ~500ms–2s per subagent
- Process initialization: ~200ms
- Context loading: ~100–500ms (depends on workspace size)
- Model warmup: ~200–1000ms

**Runtime overhead:** Minimal
- Each subagent runs in its own isolated session
- No shared state contention
- Parallel subagents don't slow each other down

**Memory overhead:** ~50–100MB per subagent
- Base process: ~30MB
- Model context: ~20–70MB (depends on context window)

### When is the overhead worth it?

Parallel subagents are worth the overhead when:

| Scenario | Break-even Point |
|----------|-----------------|
| Researching alternatives | 2+ independent topics |
| Security audits | 3+ distinct modules |
| Large codebase review | >500 lines or >5 files |
| Data processing | Dataset can be chunked |

**Example:** Reviewing 10 files sequentially takes 30 minutes. In parallel with 5 subagents: ~8 minutes (including overhead).

### How many subagents can I run concurrently?

Default limit: **5 concurrent subagents**

Reasons for the limit:
- API rate limits (Anthropic, OpenAI)
- Memory pressure on local machine
- Cost control

To adjust:

```bash
# Increase limit for this session
openclaw config set agents.subagents.maxConcurrent 10

# Or spawn with specific concurrency
openclaw subagent spawn --concurrency=8 "Task"
```

**Practical limits:**
- **Laptop (16GB RAM)**: 5–8 subagents
- **Workstation (32GB+ RAM)**: 10–15 subagents
- **CI environment**: 20+ subagents (no GUI overhead)

### Does parallel execution affect quality?

No — each subagent gets the same model access and context. Quality is identical to sequential execution.

In fact, parallel execution can improve quality:
- **Specialized focus** — each subagent focuses on one task
- **No context switching** — subagents don't get distracted
- **Cross-validation** — conflicting findings highlight edge cases

### Tips for minimizing overhead

1. **Reuse labels** — batch similar tasks under one label
2. **Set appropriate timeouts** — don't let subagents run forever
3. **Limit context size** — exclude unnecessary files from context
4. **Use smaller models for simple tasks** — faster and cheaper
5. **Synthesize efficiently** — don't spawn subagents just to combine results

---

## Cost Considerations

### How much do subagents cost?

Subagent costs = model usage + overhead

**Model usage (per subagent):**
- Simple task (~1K tokens): $0.01–$0.02
- Medium task (~5K tokens): $0.05–$0.10
- Complex task (~20K tokens): $0.20–$0.50

**Typical workflows:**

| Workflow | Subagents | Est. Cost |
|----------|-----------|-----------|
| Quick code review | 1 | $0.02 |
| Multi-angle PR review | 3 | $0.15 |
| Security audit (medium codebase) | 5 | $0.75 |
| Large refactor research | 8 | $1.50 |

### Cost optimization strategies

#### 1. Use the right model

```bash
# Fast, cheap model for simple tasks
openclaw subagent spawn --model=haiku "Summarize this file"

# Powerful model for complex analysis
openclaw subagent spawn --model=opus "Design system architecture"
```

**Model selection guide:**
- `haiku` — Quick tasks, summaries, simple reviews ($)
- `sonnet` — General purpose, balanced speed/quality ($$)
- `opus` — Complex analysis, architecture, security ($$$)

#### 2. Limit token usage

```bash
# Set max tokens for this subagent
openclaw subagent spawn --max-tokens=2000 "Quick analysis"

# Limit context window
openclaw subagent spawn --context-files="src/api/*.ts" "Review API"
```

#### 3. Batch small tasks

❌ Expensive — 5 separate subagents:
```bash
openclaw subagent spawn "Review file A"
openclaw subagent spawn "Review file B"
# ... etc
```

✅ Cheaper — 1 subagent, 5 files:
```bash
openclaw subagent spawn "Review files A, B, C, D, E"
```

#### 4. Use labels for tracking, not isolation

Labels help organize but don't require separate subagents:

```bash
# Good: Multiple files, one subagent, labeled
openclaw subagent spawn --label="auth-review" \
  "Review auth module: login.ts, register.ts, middleware.ts"
```

### Monitoring costs

```bash
# View session cost summary
openclaw subagent show sub-001 --cost

# Export cost report
openclaw audit export --period=7d --include-costs > costs.csv

# Set budget alerts
openclaw config set billing.dailyBudget 10.00
openclaw config set billing.alertThreshold 0.80
```

### Free tier considerations

If using free tiers:
- Anthropic: Rate limits apply (check current limits)
- OpenAI: Pay-per-use after free credits

**Tips:**
- Use smaller models (`haiku` instead of `opus`)
- Limit concurrent subagents to 2–3
- Run heavy workloads during off-peak hours

---

## Customizing Risk Thresholds

### Understanding thresholds

Risk thresholds control when Opus Guard intervenes:

| Threshold | Score Range | Behavior |
|-----------|-------------|----------|
| `permissive` | 0–70 | Only blocks extremely dangerous operations |
| `balanced` | 0–50 | Confirms medium+ risk (default) |
| `strict` | 0–30 | Confirms almost everything |

### Setting thresholds

**Global default:**
```bash
openclaw config set opusGuard.defaultThreshold strict
```

**Per-session:**
```bash
openclaw subagent spawn --guard-profile=strict "Security audit"
```

**Per-label:**
```bash
# Set policy for all "production" subagents
openclaw guard policy create \
  --label="production" \
  --threshold=strict \
  --reason="Extra caution for production changes"
```

### Custom risk rules

Add organization-specific rules:

```json5
// ~/.clawdbot/config.json5
{
  "opusGuard": {
    "customRules": [
      {
        "name": "Protect financial data",
        "match": "file.read:*financial*",
        "action": "LOG",
        "severity": "high"
      },
      {
        "name": "Block external API calls",
        "match": "exec:curl*api.external.com*",
        "action": "BLOCK",
        "message": "External API calls require security review"
      }
    ]
  }
}
```

### Threshold recommendations by environment

| Environment | Recommended | Rationale |
|-------------|-------------|-----------|
| Personal dev | `permissive` | Speed over caution |
| Team dev | `balanced` | Good default |
| Staging | `balanced` | Catches issues before prod |
| Production access | `strict` | Maximum caution |
| Security audits | `strict` | Expected behavior |
| Experimentation | `permissive` | Don't block exploration |

### Testing threshold changes

Before applying globally:

```bash
# Test with dry-run
openclaw guard test --profile=strict --command="git push"

# Shows: "Would CONFIRM: git push (score: 35)"
```

---

## Debugging Failed Spawns

### Common failure modes

#### 1. Rate limiting

**Symptoms:**
```
Error: Rate limit exceeded (429)
Subagent spawn failed
```

**Resolution:**
```bash
# Check current usage
openclaw status --rate-limits

# Wait and retry
sleep 60
openclaw subagent retry sub-001

# Or reduce concurrency
openclaw config set agents.subagents.maxConcurrent 3
```

#### 2. Context too large

**Symptoms:**
```
Error: Context window exceeded (413)
Failed to initialize subagent
```

**Resolution:**
```bash
# Limit context files
openclaw subagent spawn \
  --context-files="src/api/*.ts" \
  --exclude="node_modules,*.test.ts" \
  "Review API"

# Or use smaller context
openclaw subagent spawn --max-context=10000 "Quick review"
```

#### 3. Permission denied

**Symptoms:**
```
Error: EACCES: permission denied
Cannot read workspace
```

**Resolution:**
```bash
# Check workspace permissions
ls -la

# Fix permissions
chmod -R u+rw .

# Or specify different workspace
openclaw subagent spawn --workspace=/tmp/project "Task"
```

#### 4. Model unavailable

**Symptoms:**
```
Error: Model 'claude-opus-4' not available
Subagent failed to start
```

**Resolution:**
```bash
# Check available models
openclaw models list

# Use available model
openclaw subagent spawn --model=sonnet "Task"
```

#### 5. Timeout

**Symptoms:**
```
Error: Subagent timed out after 300000ms
```

**Resolution:**
```bash
# Increase timeout
openclaw subagent spawn --timeout=600000 "Complex task"

# Or split into smaller tasks
openclaw subagent spawn --timeout=120000 "Part 1: Analyze auth"
openclaw subagent spawn --timeout=120000 "Part 2: Analyze API"
```

### Debugging steps

#### Step 1: Check logs

```bash
# View subagent logs
openclaw subagent logs sub-001

# View with context
openclaw subagent logs sub-001 --tail=50 --follow
```

#### Step 2: Inspect session

```bash
# Get full session details
openclaw subagent show sub-001

# Check for errors
openclaw subagent show sub-001 --format=json | jq '.errors'
```

#### Step 3: Check resource usage

```bash
# See if OOM or resource issue
openclaw subagent stats sub-001

# System resources
openclaw status --resources
```

#### Step 4: Retry with debugging

```bash
# Retry with verbose logging
openclaw subagent retry sub-001 --verbose

# Or spawn new with debug
DEBUG=subagent openclaw subagent spawn "Task"
```

### Getting help

If issues persist:

1. **Check docs** — This FAQ and other docs
2. **Search issues** — [GitHub Issues](https://github.com/openclaw/openclaw/issues)
3. **Community** — [Telegram community](https://t.me/openclawai)
4. **Report bug** — Include session ID and logs:
   ```bash
   openclaw report --session=sub-001 --include-logs
   ```

---

## General Questions

### Q: Can subagents communicate with each other?

Direct communication is intentionally limited for isolation. However, they can:
- Write to shared output files (coordinated via main agent)
- Read from same data sources
- Use the session store for indirect communication

**Pattern for coordination:**
```bash
# Subagent A writes result
echo "{\"step1\": \"complete\"}" > /tmp/state.json

# Subagent B reads and continues
openclaw subagent spawn "Read /tmp/state.json and continue with step 2"
```

### Q: Can I run subagents on remote machines?

Yes — use the node system:

```bash
# Spawn on specific node
openclaw subagent spawn --node=workstation "Heavy computation"

# List available nodes
openclaw nodes list
```

### Q: What happens if the main agent crashes?

Subagents continue running but results may be lost unless:
- You used `--output-file` to save results
- Subagents completed before crash

**Best practice:** Always use `--output-file` for important work.

### Q: Can subagents spawn other subagents?

No — subagents cannot spawn additional subagents. This prevents:
- Runaway resource usage
- Cascade failures
- Complex debugging scenarios

If you need hierarchical workflows, design them at the main agent level.

### Q: Are subagent results deterministic?

Not guaranteed. LLMs can produce different outputs for the same input due to:
- Temperature settings
- Model updates
- Context window variations

For reproducible results:
```bash
openclaw subagent spawn --temperature=0 --seed=42 "Task"
```

### Q: How do I cancel a running subagent?

```bash
# Graceful shutdown
openclaw subagent stop sub-001

# Force kill
openclaw subagent kill sub-001

# Stop all with label
openclaw subagent stop --label="research"
```

---

## Next Steps

- **[Using Subagents](./use-subagents.md)** — Learn effective parallel workflows
- **[Opus Guard](./opus-guard.md)** — Understand security controls
- **[Grill](./grill.md)** — See subagents in action for code review
