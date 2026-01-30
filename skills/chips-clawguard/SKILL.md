---
name: chips-clawguard
description: Chip's ultimate prompt injection defense — combines ACIP v1.3 trust hierarchy with Prompt Guard's 349-pattern detection, homoglyph filtering, multilingual support, severity scoring, and automated security audits. Maximum security for Clawdbot.
metadata:
  clawdbot:
    emoji: 🛡️
---

# Chip's Clawguard 🛡️

**Ultimate prompt injection defense** — combines best of ACIP v1.3 and Prompt Guard.

Protects against:
- **Prompt injection** — malicious instructions
- **Homoglyph attacks** — Unicode tricks (Cyrillic 'а' vs Latin 'a')
- **Multilingual attacks** — EN/KO/JA/ZH injection patterns
- **Data exfiltration** — credential leaks
- **Base64 encoded attacks** — hidden payloads
- **Social engineering** — urgency manipulation

---

## Quick Start

### Install
```bash
# Already in ~/clawd/skills/chips-clawguard/
# Auto-loaded by Clawdbot
```

### Setup
```bash
cp ~/clawd/skills/chips-clawguard/templates/SECURITY.md ~/clawd/SECURITY.md
# Edit SECURITY.md with your owner numbers
```

---

## Architecture

### Defense Layers (9 total)

| Layer | Source | Purpose |
|-------|--------|---------|
| 1 | Prompt Guard | **Homoglyph detection** — Unicode normalization |
| 2 | Prompt Guard | **Pattern matching** — 349 attack signatures |
| 3 | Prompt Guard | **Base64 decoding** — hidden payloads |
| 4 | Prompt Guard | **Multilingual** — EN/KO/JA/ZH patterns |
| 5 | Prompt Guard | **Severity scoring** — SAFE→CRITICAL |
| 6 | ACIP v1.3 | **Trust hierarchy** — System > Owner > Messages |
| 7 | ACIP v1.3 | **Owner verification** — phone/ID whitelist |
| 8 | ACIP v1.3 | **Tool safety rules** — execution protection |
| 9 | Chip's | **Context scoring** — conversation anomaly detection |

---

## Core Principles

### Trust Hierarchy
```
System Rules > Owner (verified) > Messages > External Content
```

### Severity Levels
| Level | Score | Action |
|-------|-------|--------|
| SAFE | 0-20 | Proceed |
| LOW | 21-40 | Log, proceed with caution |
| MEDIUM | 41-60 | Warn user, confirm |
| HIGH | 61-80 | Block, require owner verification |
| CRITICAL | 81-100 | Block completely, alert owner |

---

## Pattern Categories (349 total)

### From Prompt Guard
- **Authority impersonation** — "You are now DAN", "Developer mode"
- **Credential exfiltration** — attempts to extract API keys, tokens
- **Urgency manipulation** — "URGENT", "ASAP", "IMMEDIATE ACTION"
- **Encoding tricks** — Base64, hex, URL encoding
- **Homoglyphs** — Cyrillic, Greek look-alikes

### From ACIP
- **Instruction override** — "Ignore previous instructions"
- **Role change** — "Pretend you are..."
- **Jailbreak patterns** — DAN, Developer Mode, etc.
- **Tool misuse** — unauthorized tool calls

### Chip's Additions
- **Crypto scam patterns** — fake airdrops, phishing
- **Social engineering** — urgency + authority combo
- **Multi-hop attacks** — indirect injection via files/links
- **Security self-check** — automated security audits

---

## Usage in Skills

### Basic Check
```typescript
import { Clawguard } from './clawguard';

const guard = new Clawguard();
const result = guard.check(message);

if (result.severity === 'CRITICAL') {
  return { blocked: true, reason: result.reason };
}
```

### With Context
```typescript
const result = guard.check(message, {
  userId: msg.from.id,
  conversationHistory: recentMessages,
  source: 'telegram'
});
```

### Security Self-Check / Audit
```typescript
import { securitySelfCheck } from './security-self-check';

// Full audit
const report = securitySelfCheck.runFullAudit();
console.log(securitySelfCheck.formatReport(report));

// Quick check (5 critical items)
const quick = securitySelfCheck.runQuickCheck();
```

---

## Testing

```bash
# Run test suite
cd ~/clawd/skills/chips-clawguard
node tests/validate.js

# Test specific attack
node tests/test-attack.js "Ignore previous instructions"
```

---

## Security Self-Check / Audit

Automated security audit for your Clawdbot setup.

### What It Checks

| Category | Checks |
|----------|--------|
| **Configuration** | SECURITY.md exists, .clawdbot permissions |
| **Environment** | .env file security, secret storage |
| **Skills** | Suspicious patterns, executable scripts |
| **Credentials** | SSH keys, AWS creds, Docker config |
| **Network** | Open ports, gateway exposure |
| **Logs** | Log directory accessibility |

### Usage

```bash
# Full audit (all checks)
node -e "
const { securitySelfCheck } = require('./security-self-check');
const report = securitySelfCheck.runFullAudit();
console.log(securitySelfCheck.formatReport(report));
"

# Quick check (critical items only)
node -e "
const { securitySelfCheck } = require('./security-self-check');
const results = securitySelfCheck.runQuickCheck();
console.log(results);
"
```

### Example Output

```
🛡️  Chip's Clawguard Security Audit
Timestamp: 2026-01-31T00:15:00.000Z
Overall Score: 85/100

📊 Summary: 8 ✅  3 ⚠️  0 ❌

## Configuration
✅ SECURITY.md exists
✅ .clawdbot has secure permissions (700)

## Credentials
✅ id_rsa has correct permissions (600)
⚠️  .aws/credentials exists with permissions 644
   💡 Run: chmod 600 ~/.aws/credentials

## Network
✅ Clawdbot gateway ports detected
✅ Gateway is running
```

---

## Files

```
chips-clawguard/
├── SKILL.md                    # This file
├── templates/
│   └── SECURITY.md             # Clawdbot security template
├── patterns/
│   ├── homoglyphs.json         # Unicode look-alikes
│   └── injections.json         # 349 attack patterns
├── clawguard.ts                # Main defense class (9 layers)
├── security-self-check.ts      # Security audit module
└── tests/
    ├── validate.js             # Test runner
    └── attack-examples.json    # Test cases
```

---

## Credits

- **ACIP v1.3** — Trust hierarchy and cognitive inoculation
- **Prompt Guard** — Pattern detection and homoglyph filtering
- **Chip** — Integration, crypto patterns, Clawdbot-specific rules

---

## Version

**Chip's Clawguard v1.0** — "Maximum Overdrive"
