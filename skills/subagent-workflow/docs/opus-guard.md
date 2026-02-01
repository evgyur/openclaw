# Opus Guard

**Safety layer that intercepts high-risk operations from subagents — protecting your code, data, and infrastructure.**

---

## Threat Model: What Gets Intercepted

Opus Guard acts as a security checkpoint between subagents and the system. It intercepts operations based on risk level and context.

### High-Risk Operations (Always Intercepted)

These operations require explicit approval:

| Operation | Risk | Why Intercepted |
|-----------|------|-----------------|
| `file.delete()` | Data loss | Can destroy code, configs, logs |
| `file.write()` outside workspace | Escalation | Can modify system files |
| `exec()` with `sudo` | Privilege escalation | Can compromise system |
| `exec()` network commands | Exfiltration | Can leak data externally |
| `process.kill()` | Denial of service | Can terminate critical processes |
| Database `DROP` operations | Data loss | Can destroy production data |
| Credential access | Data breach | Can expose secrets |

### Medium-Risk Operations (Context-Dependent)

These may be intercepted based on context:

| Operation | Risk | Context Factor |
|-----------|------|----------------|
| `file.write()` in workspace | Code corruption | Recent git status, file age |
| `file.move()` | Data loss | Source file size, destination |
| `exec()` package installs | Supply chain | Package reputation, scope |
| `git.push()` | Code leakage | Remote URL, branch protection |
| `git.reset --hard` | History loss | Uncommitted changes |

### Low-Risk Operations (Usually Allowed)

These typically pass through:

- `file.read()` anywhere
- `file.write()` to temp directories
- `git.status()`, `git.log()`
- Read-only database queries
- Network requests to known-safe endpoints

### Never Intercepted

Pure read operations that don't affect state:

- Analysis and linting
- Search and grep
- Testing (read-only)
- Reporting and documentation

---

## Risk Scoring Explained

Every intercepted operation is assigned a risk score from 0-100.

### Scoring Dimensions

```
Total Score = Base Score + Context Multipliers + History Modifier
```

#### 1. Base Score (0-60)

Determined by operation type:

| Operation | Base Score |
|-----------|-----------|
| `file.delete` | 50 |
| `exec(sudo)` | 55 |
| `file.write(/etc/*)` | 50 |
| `file.write(~/.*)` | 40 |
| `git.push` | 35 |
| `exec(curl/wget)` | 30 |
| `file.write(workspace)` | 20 |
| `file.read` | 0 |

#### 2. Context Multipliers (±30)

Adjusts based on situation:

| Factor | Modifier | Rationale |
|--------|----------|-----------|
| File is tracked by git | -10 | Recoverable via git |
| File is untracked and large | +10 | Potential data loss |
| Destination is outside workspace | +15 | Escalation risk |
| Recent git commits | -5 | Active development context |
| No recent commits | +10 | Stale workspace |
| Package is popular (>1M downloads) | -5 | Community vetted |
| Package is new (<30 days) | +15 | Supply chain risk |
| Subagent is labeled "security-audit" | -5 | Expected behavior |
| Subagent is unlabeled | +5 | Unknown context |

#### 3. History Modifier (±10)

Based on subagent's recent actions:

| Pattern | Modifier |
|---------|----------|
| Similar operation recently approved | -5 |
| Multiple rapid operations | +5 |
| Previous operation was blocked | +10 |
| No history (new subagent) | 0 |

### Risk Thresholds

```
Score 0-30:   🟢 ALLOW — Auto-approved
Score 31-60:  🟡 CONFIRM — Requires user confirmation
Score 61-80:  🟠 BLOCK — Requires explicit override
Score 81-100: 🔴 DENY — Blocked, no override possible
```

### Example Scenarios

#### Scenario A: Safe file write
```
Operation: Write to src/utils/helpers.ts
Base: 20 (workspace write)
Context: -10 (git tracked), -5 (recent commits)
History: 0 (new subagent)
Score: 5 → ALLOW ✅
```

#### Scenario B: Suspicious package install
```
Operation: npm install unknown-pkg@latest
Base: 30 (exec with network)
Context: +15 (package <30 days old), +5 (unlabeled subagent)
History: +5 (rapid operations)
Score: 55 → CONFIRM ⚠️
```

#### Scenario C: Dangerous deletion
```
Operation: rm -rf /home/user/.clawdbot/
Base: 50 (file.delete)
Context: +15 (outside workspace), +10 (contains configs)
History: 0
Score: 75 → BLOCK ❌
```

---

## Audit Logs and Compliance

Every intercepted operation is logged for compliance and debugging.

### Log Location

```
~/.clawdbot/agents/<agentId>/sessions/*.jsonl
```

### Log Format

```json
{
  "timestamp": "2024-01-15T09:23:45.123Z",
  "sessionId": "sub-001",
  "operation": "file.delete",
  "target": "/home/user/project/temp.txt",
  "riskScore": 45,
  "decision": "CONFIRM",
  "userResponse": "approved",
  "context": {
    "gitTracked": true,
    "fileAge": "2 hours",
    "workspace": "/home/user/project"
  },
  "subagent": {
    "id": "sub-001",
    "label": "cleanup-task",
    "task": "Remove temporary files"
  }
}
```

### Log Retention

- **Local storage**: 90 days by default
- **Export**: JSONL format for external SIEM tools
- **Rotation**: Automatic compression after 30 days

### Compliance Features

For regulated environments:

| Requirement | Feature |
|-------------|---------|
| Immutable logs | Append-only JSONL with checksums |
| Non-repudiation | Cryptographic signatures on critical operations |
| Export | GDPR/CCPA-compliant data export |
| Retention policy | Configurable per compliance requirement |
| Access logs | Who accessed what, when |

### Querying Audit Logs

```bash
# Show all blocked operations
openclaw audit search --decision=BLOCK

# Show operations by subagent
openclaw audit search --subagent=sub-001

# Export for compliance report
openclaw audit export --start-date=2024-01-01 --format=csv > audit.csv

# Show risk score distribution
openclaw audit stats --period=7d
```

---

## Emergency Override Procedures

### When You Need an Override

Sometimes legitimate operations get blocked. Opus Guard provides override mechanisms.

### Level 1: Session Override (Temporary)

Grant temporary permissions for the current subagent session:

```bash
# Start subagent with elevated permissions
openclaw subagent spawn \
  --allow-operations="file.delete,git.push" \
  --duration=3600 \
  "Cleanup old branches"
```

This override:
- Applies only to this subagent
- Expires after 1 hour
- Logs the override decision

### Level 2: Label Override (Scoped)

Grant permissions to all subagents with a specific label:

```bash
# Create label policy
openclaw guard policy create \
  --label="maintenance" \
  --allow="file.delete:temp/*,git.push:origin/main" \
  --expires="2024-02-01"

# Spawn with policy
openclaw subagent spawn --label="maintenance" "Clean temp files"
```

### Level 3: Global Override (Emergency Only)

⚠️ **Dangerous — use sparingly**

```bash
# Disable Opus Guard temporarily
openclaw guard disable --duration=300 --reason="Emergency hotfix"

# All operations allowed for 5 minutes
# Logs marked as "GUARD_DISABLED"

# Re-enable
openclaw guard enable
```

### Level 4: File-Based Whitelist

For persistent exceptions, use configuration:

```json5
// ~/.clawdbot/config.json5
{
  "opusGuard": {
    "overrides": [
      {
        "pattern": "scripts/clean.sh",
        "operations": ["file.delete"],
        "reason": "Maintenance script reviewed"
      }
    ]
  }
}
```

### Override Audit Trail

Every override is heavily logged:

```json
{
  "type": "OVERRIDE",
  "level": "SESSION",
  "grantedBy": "user@host",
  "grantedAt": "2024-01-15T09:30:00Z",
  "permissions": ["file.delete"],
  "subagent": "sub-001",
  "reason": "Required for cleanup task"
}
```

### Best Practices for Overrides

1. **Use minimum scope** — prefer session over global
2. **Set expiration** — never unlimited overrides
3. **Document reason** — required for compliance
4. **Review regularly** — audit override usage monthly
5. **Revoke unused** — clean up expired policies

---

## Configuration

### Default Configuration

```json5
// ~/.clawdbot/config.json5
{
  "opusGuard": {
    "enabled": true,
    "defaultThreshold": "CONFIRM",
    "logLevel": "info",
    "retentionDays": 90,
    "autoAllow": [
      "file.read:*",
      "git.status:*",
      "git.log:*"
    ],
    "autoBlock": [
      "exec:sudo*",
      "file.write:/etc/*",
      "file.write:~/.ssh/*"
    ]
  }
}
```

### Threshold Tuning

Adjust based on your risk tolerance:

| Profile | Threshold | Use Case |
|---------|-----------|----------|
| `strict` | 30 | Production environments, sensitive data |
| `balanced` | 50 | Development (default) |
| `permissive` | 70 | Experimentation, sandboxes |

```bash
# Set profile
openclaw config set opusGuard.defaultThreshold strict
```

### Custom Rules

Add organization-specific rules:

```json5
{
  "opusGuard": {
    "customRules": [
      {
        "name": "Protect prod config",
        "match": "file.write:*/config/production.yml",
        "action": "BLOCK",
        "message": "Production config requires PR review"
      },
      {
        "name": "Allow test deletion",
        "match": "file.delete:*/test/tmp/*",
        "action": "ALLOW"
      }
    ]
  }
}
```

---

## Integration with Subagents

### Automatic Protection

All subagents are automatically protected by Opus Guard — no configuration needed.

### Label-Based Policies

Different labels can have different guard policies:

```bash
# High-security subagent
openclaw subagent spawn \
  --label="security-audit" \
  --guard-profile="strict" \
  "Audit for vulnerabilities"

# Maintenance subagent (more permissive)
openclaw subagent spawn \
  --label="maintenance" \
  --guard-profile="permissive" \
  "Clean up temp files"
```

### Per-Operation Override

For one-time operations:

```bash
# Pre-approve specific operation
openclaw subagent spawn \
  --pre-approve="file.delete:temp/*.log" \
  "Clean old logs"
```

---

## Troubleshooting

### Issue: Legitimate operation blocked

**Symptoms:** Subagent can't complete task due to guard blocking.

**Resolution:**
1. Check the specific operation that was blocked
2. Evaluate if the risk is acceptable
3. Use appropriate override level (see above)
4. Consider if the task should be split differently

### Issue: Too many confirmation prompts

**Symptoms:** Constant interruptions during normal work.

**Resolution:**
```bash
# Temporarily lower threshold for this session
openclaw subagent spawn --guard-profile=permissive "Task description"

# Or add common operations to auto-allow
openclaw config set opusGuard.autoAllow '["file.write:src/**"]'
```

### Issue: Guard not catching suspicious operations

**Symptoms:** Subagent performed risky operation without confirmation.

**Resolution:**
1. Check current threshold: `openclaw config get opusGuard.defaultThreshold`
2. Verify guard is enabled: `openclaw guard status`
3. Add custom rule for the operation type
4. Report false negative to maintainers

---

## Next Steps

- **[FAQ](./faq.md)** — Common questions about risk thresholds and debugging
- **[Using Subagents](./use-subagents.md)** — Learn to work effectively with guard protection
- **[Grill](./grill.md)** — See how grill integrates with Opus Guard
