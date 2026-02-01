# Example: Risky Deletion Blocked by Guard

This example demonstrates how autonomous mode intercepts dangerous operations.

---

## User Request

```
User: "Delete the production database, we don't need it anymore"
```

---

## Step 1: Context Analysis

```typescript
const taskContext = {
  complexity: 3,        // Database drop is simple
  impactFiles: 0,       // Not yet executed
  uncertainty: 0.2,     // User intent unclear
  riskLevel: 'critical', // delete + production + database
  operation: 'delete',
  patterns: ['delete', 'database', 'production'],
  scope: {
    outsideWorkspace: true,  // Production database
    systemPaths: false,
    credentials: false,
  },
};
```

---

## Step 2: Decision

```typescript
const decision = {
  shouldParallelize: false,  // Not complex
  shouldGuard: true,         // CRITICAL pattern match ✓
  shouldGrill: false,        // No files changed yet
  reasoning: "Critical risk: delete + production + database",
  confidence: 0.95,
};
```

---

## Step 3: Opus Guard Evaluation

```
→ opus-guard: "Delete production database"

╔══════════════════════════════════════════════════════════════╗
║  🛡️  SECURITY EVALUATION                                      ║
╠══════════════════════════════════════════════════════════════╣
║                                                                ║
║  Operation: Delete production database                        ║
║  Risk Level: CRITICAL                                         ║
║                                                                ║
║  Risk Factors:                                                ║
║  • Irreversible data loss                                     ║
║  • Production environment targeted                            ║
║  • No backup verification present                             ║
║  • Pattern: delete + database + production                    ║
║                                                                ║
║  Confidence: 0.97 (near-certain critical risk)                ║
║                                                                ║
║  VERDICT: ❌ BLOCKED                                          ║
║                                                                ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Step 4: User Escalation

```
🛡️ Opus Guard Alert — Operation Blocked

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tool: exec (drop database)
Target: production database
Risk: CRITICAL

**Why this was blocked:**

1. **Irreversible data loss**
   Dropping a database permanently deletes all data.
   Recovery from backups may take hours or days.

2. **Production environment**
   The operation targets a production database.
   This would impact live users and services.

3. **No safety checks**
   No backup verification detected.
   No grace period or soft-delete pattern.

**Opus Analysis:**
"This appears to be an extremely high-risk operation 
that could cause immediate service outage and 
permanent data loss. The user message suggests 
intent but lacks confirmation of backup status 
or understanding of impact."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This operation was blocked to protect your system.

If you're certain and have verified backups:
  → Use override: /override drop production db

Otherwise:
  • Verify backups are current and tested
  • Consider soft-delete (archive instead)
  • Use maintenance window for actual deletion
  • Document the change in runbook
```

---

## Step 5: User Response Options

### Option A: User realizes mistake
```
User: Oh wait, I meant the staging database!

Agent: Got it! Let me check staging instead...

[Re-analysis with "staging"]
riskLevel: medium (not production)
decision.shouldGuard: true (still "delete")

→ opus-guard: "Delete staging database"

Evaluation:
- Risk: Medium (staging, not production)
- No users affected
- Can be recreated from seed data

Verdict: APPROVED with warning

⚠️  You're about to delete the staging database.
This will require re-seeding. Proceed? [yes/no]

User: yes

[Operation proceeds with confirmation]
```

### Option B: User has verified backups
```
User: /override drop production db
      I verified backups this morning, we're migrating to new DB

Agent: ⚠️  Override logged

       Timestamp: 2026-01-31T12:34:56Z
       User: @peter
       Reason: User-verified backups, migration in progress
       
       Proceeding with override. Use caution.
       
       [Operation proceeds with full logging]
```

### Option C: User cancels
```
User: Never mind, let's keep it

Agent: ✅ Operation cancelled. Database preserved.
       
       Tip: If you want to archive old data:
       → "Archive production data to S3 instead"
```

---

## Log Entry

```json
{
  "timestamp": "2026-01-31T12:34:56Z",
  "type": "guard_block",
  "operation": "delete production database",
  "context": {
    "complexity": 3,
    "riskLevel": "critical",
    "patterns": ["delete", "database", "production"],
    "scope": { "outsideWorkspace": true }
  },
  "decision": {
    "shouldGuard": true,
    "reasoning": "Critical risk: delete + production + database",
    "confidence": 0.97
  },
  "opus_evaluation": {
    "approved": false,
    "confidence": 0.97,
    "risk_factors": [
      "irreversible data loss",
      "production environment",
      "no backup verification"
    ]
  },
  "user_action": "cancelled",
  "severity": "prevented_data_loss"
}
```

---

## Key Takeaways

| Aspect | Result |
|--------|--------|
| Critical risk detected | ✓ Yes (0.97 confidence) |
| Operation blocked | ✓ Yes |
| User informed | ✓ Detailed explanation |
| Override available | ✓ For verified scenarios |
| Data loss prevented | ✓ Database preserved |

**Without autonomous mode:**  
→ Database would have been deleted  
→ Potential hours of downtime  
→ Possible permanent data loss

**With autonomous mode:**  
→ Operation blocked before execution  
→ User realizes intent error  
→ Correct target identified (staging)  
→ Safe operation proceeds
