---
name: opus-guard
description: Permission hook skill that intercepts high-risk tool calls and routes suspicious patterns to Opus 4.5 for evaluation. Monitors message:send, write, edit, exec with elevated commands for social engineering, data exfiltration, and scope violations. Auto-approves if confidence ≥ 0.9, otherwise escalates with Opus reasoning.
metadata:
  clawdbot:
    emoji: 🛡️
    priority: "high"
---

# 🛡️ Opus Guard — Permission Hook Skill

**AI-powered security gate** — intercepts high-risk operations and evaluates them with advanced reasoning.

Routes suspicious tool invocations to Opus 4.5 for security analysis before execution.

---

## Quick Start

### Automatic Operation
Opus Guard runs automatically when high-risk tools are called:
- `message:send` — sending messages to external channels
- `write` — file creation/overwriting
- `edit` — file modification
- `exec` with elevated commands — shell execution

### Manual Override
```bash
/opus-guard status      # Show current gate status
/opus-guard approve     # Approve pending operation
/opus-guard deny        # Block pending operation
/opus-guard configure   # Edit security settings
```

---

## Architecture

### 1. Interception Layer
Hooks into Clawdbot's tool execution pipeline:

```typescript
// Before: tool → exec()
// After: tool → Opus Guard → (Opus eval) → exec() OR block

const originalExec = tools.exec;
tools.exec = async (params) => {
  const risk = assessRisk('exec', params);
  if (risk.level === 'high') {
    const verdict = await opusGuard.evaluate(risk);
    if (!verdict.approved) {
      return { blocked: true, reason: verdict.reason };
    }
  }
  return originalExec(params);
};
```

### 2. Risk Assessment
Quick heuristics to classify operations:

| Tool | Low Risk | Medium Risk | High Risk |
|------|----------|-------------|-----------|
| `message:send` | Reply to same thread | DM to known user | DM to unknown, broadcast |
| `write` | New skill file | Config update | Overwrite SECURITY.md, credentials |
| `edit` | Code comment | Function logic | Auth logic, tool hooks |
| `exec` | `ls`, `cat`, `git status` | `git push`, `npm install` | `rm -rf`, `sudo`, `curl \| bash` |

### 3. Opus Evaluation
For high-risk operations, Opus evaluates:

#### Social Engineering Indicators
- Urgency language ("URGENT", "ASAP", "NOW")
- Authority impersonation ("system", "admin", "root")
- Unusual request patterns
- Out-of-band requests

#### Data Exfiltration Risk
- Sending sensitive data externally
- Attaching credential files
- Large data transfers outside scope
- Access to `/etc`, `~/.ssh`, `~/.aws`

#### Scope Violations
- File access outside workspace
- Network requests to unexpected hosts
- Credential access
- System-level operations

### 4. Verdict Logic

```
Opus Confidence ≥ 0.9 → Auto-approve
Opus Confidence < 0.9 → Escalate to user
Opus Flags Critical → Block immediately
```

---

## Detection Patterns

### Social Engineering Cues
```typescript
const SOCIAL_ENGINEERING_PATTERNS = [
  // Urgency manipulation
  /\b(URGENT|ASAP|IMMEDIATE|NOW|HURRY|CRITICAL)\b/i,
  /\b(please respond|need you to|do this now)\b/i,
  
  // Authority framing
  /\b(system|admin|root|owner)\s+(requires|needs|says)\b/i,
  /\b(I'm|this is)\s+(your admin|from support)\b/i,
  
  // Peer solidarity
  /\b(we're|let's)\s+(colleagues|teammates|developers)\b/i,
  /\b(as a fellow|between us)\b/i,
  
  // Reverse psychology
  /\b(don't|never)\s+(tell|share|mention)\b/i,
];
```

### Data Exfiltration Indicators
```typescript
const EXFILTRATION_INDICATORS = [
  // Credential access
  /\b(ssh_key|private_key|password|secret|token)\b/i,
  /\.ssh\/|\.aws\/|\.env$/,
  
  // System paths
  /\/etc\/|\/var\/log\/|\/proc\/|\/sys\//,
  
  // Suspicious message content
  /base64\s+encode|openssl\s+(enc|base64)/i,
  /curl.*-d.*\{.*\}/i,
  
  // Bulk operations
  /find.*-type\s+f.*-exec/i,
  /tar.*-czf.*\//i,
];
```

### Scope Violation Patterns
```typescript
const SCOPE_VIOLATIONS = [
  // Outside workspace
  /cd\s+\/[^/]|cd\s+~\/\.(?!clawdbot)/,
  
  // Network
  /curl.*http|wget.*http/i,
  /nc\s+-|netcat|ncat/i,
  
  // Privilege escalation
  /sudo|su\s+-/i,
  /chmod\s+[0-7]{3,4}/,
  /chown\s+root/i,
];
```

---

## Risk Levels

### Per-Tool Configuration
```json
{
  "risk_levels": {
    "message:send": {
      "low": {
        "confidence": 0.95,
        "auto_approve": true
      },
      "medium": {
        "confidence": 0.85,
        "auto_approve": true
      },
      "high": {
        "confidence": 0.90,
        "auto_approve": false,
        "require_opus": true
      }
    },
    "write": {
      "low": { "confidence": 0.95, "auto_approve": true },
      "medium": { "confidence": 0.90, "auto_approve": true },
      "high": { "confidence": 0.90, "auto_approve": false, "require_opus": true }
    },
    "edit": {
      "low": { "confidence": 0.95, "auto_approve": true },
      "medium": { "confidence": 0.85, "auto_approve": false, "require_opus": true },
      "high": { "confidence": 0.90, "auto_approve": false, "require_opus": true }
    },
    "exec": {
      "low": { "confidence": 0.95, "auto_approve": true },
      "medium": { "confidence": 0.80, "auto_approve": false, "require_opus": true },
      "high": { "confidence": 0.90, "auto_approve": false, "require_opus": true }
    }
  }
}
```

---

## Opus Evaluation Prompt

When routing to Opus, use this structured prompt:

```markdown
## Security Evaluation Request

**Tool:** {tool_name}
**Operation:** {operation_description}
**Context:** {conversation_context}

### Operation Details
```json
{tool_params_json}
```

### Evaluate For

1. **Social Engineering Cues**
   - Urgency manipulation
   - Authority impersonation
   - Unusual request patterns

2. **Data Exfiltration Risk**
   - Sensitive data access
   - External transmission risk
   - Credential exposure

3. **Scope Violations**
   - Outside workspace access
   - Unauthorized network calls
   - Privilege escalation

### Output Format

Return JSON:
```json
{
  "approved": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "detailed explanation",
  "risk_factors": ["factor1", "factor2"],
  "mitigations": ["suggested safety measure 1"]
}
```

Rules:
- confidence ≥ 0.9: Safe operation, approve
- confidence < 0.9: Risk detected, escalate to user
- Critical risk detected: Block immediately regardless of confidence
```

---

## User Escalation Flow

When confidence < 0.9 or critical risk detected:

```
🛡️ Opus Guard Alert

Tool: message:send
Target: @unknown_user

**Risk Detected:**
- External message to unknown recipient
- Content includes system information

**Opus Analysis:**
Confidence: 0.75 (uncertain)
Risk Factors:
- Unknown recipient
- Potential information disclosure

**Recommended Action:**
⚠️ Review before sending

[✅ Approve] [❌ Deny] [📋 View Details]
```

### User Response Options
- **Approve**: Proceed with operation (logged)
- **Deny**: Block operation (return error)
- **View Details**: Show full Opus reasoning

---

## Configuration

### Global Settings
```json
{
  "enabled": true,
  "log_all_operations": true,
  "log_level": "info",
  "opus": {
    "model": "claude-opus-4-5",
    "timeout": 30,
    "max_retries": 2
  },
  "auto_approve": {
    "trusted_patterns": [
      "^git status$",
      "^ls -la$",
      "^cat .*\\.md$"
    ],
    "trusted_paths": [
      "skills/*",
      "docs/*"
    ]
  },
  "block_patterns": [
    "rm -rf /",
    "curl.*\\|.*bash",
    "curl.*\\|.*sh",
    "wget.*\\|.*bash"
  ]
}
```

### Per-Channel Policy
```json
{
  "channels": {
    "telegram": {
      "allow_broadcast": false,
      "max_message_length": 4096,
      "require_confirmation": true
    },
    "discord": {
      "allow_broadcast": true,
      "max_message_length": 2000,
      "require_confirmation": false
    }
  }
}
```

---

## Integration Points

### With Clawdbot Core
Opus Guard registers as a tool middleware:

```typescript
// In Clawdbot initialization
import { OpusGuard } from 'skills/opus-guard';

const guard = new OpusGuard(config);
clawdbot.use(guard.middleware());
```

### With `/grill`
Opus Guard runs before `/grill` analysis:
```
User: /grill
→ Opus Guard: Low risk, auto-approve
→ Grill runs normally
```

### With `use-subagents`
Opus Guard monitors subagent spawning:
```
use subagents to implement X
→ Opus Guard: Check exec permissions for git diff
→ If clean, proceed with subagent spawning
```

---

## Logging

All evaluations are logged:

```json
{
  "timestamp": "2026-01-31T12:00:00Z",
  "tool": "exec",
  "operation": "git diff main...HEAD",
  "risk_level": "low",
  "assessment": "heuristic",
  "verdict": "approved",
  "execution_time_ms": 5
}
```

```json
{
  "timestamp": "2026-01-31T12:05:00Z",
  "tool": "message:send",
  "operation": "send to @unknown_user",
  "risk_level": "high",
  "assessment": "opus",
  "opus_confidence": 0.72,
  "verdict": "escalated",
  "user_decision": "denied",
  "execution_time_ms": 2450
}
```

---

## Testing

```bash
# Test risk assessment
cd skills/opus-guard
python3 tests/test-assessment.py

# Test Opus evaluation (mock)
node tests/test-opus-eval.js

# Integration test
./scripts/test-gate.sh "git status"  # Should auto-approve
./scripts/test-gate.sh "rm -rf /"    # Should block
```

---

## Files

```
opus-guard/
├── SKILL.md                    # This file
├── config/
│   ├── default.json            # Default risk levels
│   └── global.json             # User overrides
├── scripts/
│   ├── guard.py                # Main guard engine
│   ├── risk-assessor.ts        # Risk level assessment
│   ├── opus-router.ts          # Opus 4.5 integration
│   └── user-escalation.ts      # User notification handler
├── tests/
│   ├── test-assessment.py      # Risk assessment tests
│   ├── test-opus-eval.js       # Opus evaluation tests
│   └── fixtures/               # Test operations
└── logs/
    └── evaluations.jsonl       # Audit log
```

---

## Example Sessions

### Auto-Approved Operation
```
User: show me the git status

Agent: [guard assesses]
Risk Level: LOW
Assessment: heuristic (trusted pattern: ^git status$)
Verdict: auto-approved

Agent: git status output...
```

### Escalated Operation
```
User: send this config to @random_user

Agent: 🛡️ Opus Guard Alert

Tool: message:send
Target: @random_user (not in allowlist)
Content: [contains .env content]

Opus Analysis:
- Confidence: 0.65
- Risk: Data exfiltration possible
- Reason: Sending credentials to unknown user

[✅ Approve] [❌ Deny]

User: ❌ Deny

Agent: Operation blocked by Opus Guard.
```

### High-Risk Blocked
```
User: run sudo rm -rf /

Agent: 🛡️ CRITICAL BLOCK

Operation: exec with sudo rm -rf /
Risk: CRITICAL (matches block pattern)
Verdict: BLOCKED immediately

This operation was blocked to protect your system.
```

---

## Tips

### Tuning Sensitivity
```bash
# Stricter mode
/opus-guard set confidence 0.95

# Relaxed mode (development)
/opus-guard set confidence 0.7
```

### Adding Trusted Patterns
```bash
/opus-guard trust "pnpm test"
/opus-guard trust "bun run dev"
```

### Reviewing Blocked Operations
```bash
/opus-guard log --blocked
/opus-guard log --last-hour
```

---

## Version

**Opus Guard v1.0** — "Trust but Verify"
