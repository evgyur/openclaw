# Using Subagents Effectively

**Learn when to spawn subagents, how to split tasks, and how to synthesize results from parallel execution.**

---

## When to Parallelize vs Sequential

### Sequential Execution (Single Agent)

Use sequential execution when:

✅ **Tasks are dependent** — step B needs output from step A  
✅ **Shared state is required** — all steps need the same context  
✅ **Low complexity** — the task is straightforward and quick  
✅ **Debugging simplicity** — you want a single trace to follow

**Example:** Building a feature end-to-end
```
1. Create database migration
2. Update API endpoint  
3. Update frontend component
4. Write tests
```

Each step depends on the previous one. Sequential is natural here.

---

### Parallel Execution (Subagents)

Use parallel subagents when:

✅ **Tasks are independent** — no dependencies between them  
✅ **Large research scope** — exploring multiple options  
✅ **Time-sensitive** — need results faster  
✅ **Diverse expertise needed** — security, performance, UX all at once  
✅ **Comparing alternatives** — evaluate multiple approaches

**Example:** Researching a new feature
```
[Agent A] Research FastAPI vs Express
[Agent B] Research PostgreSQL vs MongoDB
[Agent C] Research React Query vs SWR
```

These can all run simultaneously.

---

## Decision Matrix

| Factor | Sequential | Parallel (Subagents) |
|--------|-----------|---------------------|
| **Dependencies** | Required | None |
| **Complexity** | Low | High or splitable |
| **Time pressure** | Relaxed | Tight |
| **Shared context** | Heavy | Minimal |
| **Risk tolerance** | Lower | Higher |
| **Cost sensitivity** | Lower | Higher |

**Rule of thumb:** If tasks can be completed independently without shared state, parallelize.

---

## Task Splitting Heuristics

### The 15-Minute Rule

If a task takes longer than ~15 minutes for a single agent, consider splitting:

```
Before: "Analyze this entire codebase for security issues" (45 min)

After: 
  [Agent A] Auth module (10 min)
  [Agent B] API endpoints (10 min)
  [Agent C] Database layer (10 min)
  [Agent D] Frontend (10 min)
  
Total wall time: ~10 min (parallel)
```

### Domain-Based Splitting

Split by functional domain when tasks require different expertise:

```
[Agent A: Security Specialist] 
  Task: Audit for SQL injection, XSS, auth bypass
  Focus: security

[Agent B: Performance Specialist]
  Task: Find N+1 queries, memory leaks, slow algorithms
  Focus: performance

[Agent C: Maintainability Specialist]
  Task: Check naming, structure, duplication
  Focus: maintainability
```

### Data-Based Splitting

Split by data boundaries when processing large datasets:

```
# Process logs in parallel by date range
[Agent A] January 2024 logs
[Agent B] February 2024 logs
[Agent C] March 2024 logs

# Synthesis: combine findings
```

### Option-Based Splitting

When comparing alternatives, assign one agent per option:

```
[Agent A] Evaluate library X
  - Pros
  - Cons
  - Migration effort

[Agent B] Evaluate library Y
  - Pros
  - Cons
  - Migration effort

[Agent C] Evaluate library Z
  - Pros
  - Cons
  - Migration effort
```

### Anti-Patterns to Avoid

❌ **Over-splitting** — creating 20 subagents for a 5-minute task  
❌ **Hidden dependencies** — tasks that secretly need each other  
❌ **Tight coupling** — subagents frequently calling back to main agent  
❌ **No synthesis plan** — starting parallel work without a way to combine results  

---

## Monitoring Progress

### Label-Based Tracking

Assign labels to group related subagents:

```bash
# Spawn with labels
openclaw subagent spawn --label="migration-research" "Research Django to FastAPI"
openclaw subagent spawn --label="migration-research" "Research Django ORM to SQLAlchemy"
openclaw subagent spawn --label="migration-research" "Research Jinja2 to React"

# List all subagents with this label
openclaw subagent list --label="migration-research"

# Output:
# ID       LABEL               STATUS    AGE
# sub-001  migration-research  running   2m
# sub-002  migration-research  running   2m
# sub-003  migration-research  complete  1m
```

### Session Inspection

View detailed progress for a specific subagent:

```bash
# View logs
openclaw subagent logs sub-002

# View current state
openclaw subagent status sub-002
```

### Polling for Completion

Wait for all subagents in a label group:

```bash
# Wait for all labeled subagents to complete
openclaw subagent wait --label="migration-research" --timeout=300

echo "All research complete. Synthesizing results..."
```

### Live Dashboard

For long-running parallel tasks, open a monitoring session:

```bash
# Watch progress in real-time
openclaw subagent watch --label="migration-research"

# Shows:
# [sub-001] Running: Analyzing Django views...
# [sub-002] Running: Comparing ORM patterns...
# [sub-003] Complete: ✓ Report ready
```

---

## Synthesis and Conflict Resolution

### The Synthesis Problem

Parallel subagents produce independent results. You need to combine them into a coherent output.

### Basic Synthesis Pattern

```bash
# 1. Spawn parallel subagents
openclaw subagent spawn --label="api-design" \
  --output-file=/tmp/agent-a.md \
  "Design REST API for users endpoint"

openclaw subagent spawn --label="api-design" \
  --output-file=/tmp/agent-b.md \
  "Design GraphQL API for users endpoint"

# 2. Wait for completion
openclaw subagent wait --label="api-design"

# 3. Synthesize results
cat /tmp/agent-a.md /tmp/agent-b.md | \
  openclaw agent --message "Compare these two API designs and recommend one"
```

### Conflict Resolution Examples

#### Example 1: Different Recommendations

```
Agent A: "Use FastAPI — better async support"
Agent B: "Use Express — team knows it better"

Resolution:
- Technical merit favors FastAPI
- Risk favors Express (team expertise)
- Recommendation: FastAPI with training budget
```

#### Example 2: Overlapping Code Changes

```
Agent A modified: src/utils/helpers.ts (lines 10-20)
Agent B modified: src/utils/helpers.ts (lines 15-25)

Conflict: Overlapping edits on same file

Resolution strategies:
1. Manual merge (recommended for complex conflicts)
2. Re-run one agent with updated context
3. Spawn merge agent to resolve automatically
```

#### Example 3: Contradictory Findings

```
Agent A: "No security issues found in auth module"
Agent B: "Found SQL injection in auth/login.ts line 45"

Resolution:
- Agent B's finding is more specific and actionable
- Re-run Agent A with Agent B's context to verify
- Conclusion: Issue exists, needs fix
```

### Automated Synthesis Workflow

```bash
#!/bin/bash
# parallel-security-audit.sh

LABEL="security-audit-$(date +%s)"
OUTPUT_DIR="/tmp/$LABEL"
mkdir -p "$OUTPUT_DIR"

# 1. Spawn parallel security audits
echo "Starting parallel security audits..."
openclaw subagent spawn --label="$LABEL" \
  --output-file="$OUTPUT_DIR/auth.json" \
  --format=json \
  "Security audit of src/auth/ — focus on authentication bypass"

openclaw subagent spawn --label="$LABEL" \
  --output-file="$OUTPUT_DIR/api.json" \
  --format=json \
  "Security audit of src/api/ — focus on injection vulnerabilities"

openclaw subagent spawn --label="$LABEL" \
  --output-file="$OUTPUT_DIR/db.json" \
  --format=json \
  "Security audit of src/db/ — focus on data exposure"

# 2. Wait for all to complete
echo "Waiting for audits to complete..."
openclaw subagent wait --label="$LABEL" --timeout=600

# 3. Synthesize findings
echo "Synthesizing findings..."
cat "$OUTPUT_DIR"/*.json | \
  openclaw agent --format=json \
    --message "Combine these security findings, deduplicate, and prioritize by severity. Output consolidated report." \
    --output-file="$OUTPUT_DIR/consolidated-report.json"

# 4. Generate summary
echo "Audit complete. Results:"
cat "$OUTPUT_DIR/consolidated-report.json" | jq '.summary'
```

### Handling Subagent Failures

```bash
# Check for failures
FAILED=$(openclaw subagent list --label="$LABEL" --status=failed --format=json | jq -r '.[].id')

if [ -n "$FAILED" ]; then
  echo "Some subagents failed: $FAILED"
  
  # Option 1: Retry with same context
  for id in $FAILED; do
    openclaw subagent retry "$id"
  done
  
  # Option 2: Spawn replacements
  for id in $FAILED; do
    TASK=$(openclaw subagent show "$id" --format=json | jq -r '.task')
    openclaw subagent spawn --label="$LABEL" --message "$TASK"
  done
fi
```

---

## Best Practices

### 1. Keep subagents focused

❌ Too broad:
```
"Review the entire codebase"
```

✅ Focused:
```
"Review src/auth/login.ts for SQL injection vulnerabilities"
```

### 2. Define clear outputs

Use `--output-file` and `--format` to ensure results are machine-readable:

```bash
openclaw subagent spawn \
  --output-file=/tmp/result.json \
  --format=json \
  "Task description..."
```

### 3. Set timeouts appropriately

```bash
# Short task: 60 seconds
openclaw subagent spawn --timeout=60000 "Quick analysis"

# Complex task: 10 minutes
openclaw subagent spawn --timeout=600000 "Deep security audit"
```

### 4. Use labels consistently

Establish naming conventions:
- `feat-{name}` — feature work
- `bug-{id}` — bug fixes
- `research-{topic}` — research tasks
- `audit-{scope}` — security audits

### 5. Synthesize immediately

Don't let parallel results sit. Synthesize while context is fresh.

---

## Common Patterns

### Pattern: Parallel Review

```bash
# Review PR from multiple angles simultaneously
openclaw subagent spawn --label="pr-123-review" \
  "Review for security issues"

openclaw subagent spawn --label="pr-123-review" \
  "Review for performance issues"

openclaw subagent spawn --label="pr-123-review" \
  "Review for maintainability issues"

# Synthesize
openclaw subagent wait --label="pr-123-review"
# ... combine results
```

### Pattern: Option Comparison

```bash
# Evaluate alternatives
openclaw subagent spawn --label="db-choice" \
  "Evaluate PostgreSQL for time-series data"

openclaw subagent spawn --label="db-choice" \
  "Evaluate TimescaleDB for time-series data"

openclaw subagent spawn --label="db-choice" \
  "Evaluate InfluxDB for time-series data"

# Synthesize
openclaw subagent wait --label="db-choice"
# ... compare pros/cons
```

### Pattern: Map-Reduce

```bash
# Map: Process chunks in parallel
for chunk in data/*.csv; do
  openclaw subagent spawn --label="data-processing" \
    "Process $chunk and extract metrics"
done

# Reduce: Combine results
openclaw subagent wait --label="data-processing"
# ... aggregate metrics
```

---

## Next Steps

- **[Opus Guard](./opus-guard.md)** — Understand safety controls for subagents
- **[FAQ](./faq.md)** — Common questions about performance and debugging
- **[Grill](./grill.md)** — See how grill uses subagents for code review
