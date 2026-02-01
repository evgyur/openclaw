import { describe, test, expect, beforeEach } from 'vitest';
import { MockOpusGuard, createMockOpusGuard, riskScenarios, type AuditEntry } from '../mocks/mock-opus';

/**
 * Opus Guard - Security/Risk Unit Tests
 * 
 * Tests the security guardrail:
 * - Risk scoring accuracy
 * - Opus escalation triggers
 * - Audit log format and integrity
 */

interface RiskAssessment {
  action: string;
  riskScore: number;
  category: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

/**
 * Risk scoring logic
 */
function assessRisk(action: string, context: Record<string, unknown>): number {
  const lowerAction = action.toLowerCase();
  let riskScore = 0.1; // Base risk

  // Production operations
  if (context.production) {
    riskScore += 0.5;
  }

  // Destructive operations
  if (lowerAction.includes('delete') || lowerAction.includes('drop') || 
      lowerAction.includes('rm -rf') || context.destructive) {
    riskScore += 0.4;
  }

  // Publishing
  if (lowerAction.includes('publish') || lowerAction.includes('release')) {
    riskScore += 0.3;
  }

  // Database writes
  if (lowerAction.includes('migrate') || context.database) {
    riskScore += 0.2;
  }

  // External API calls
  if (lowerAction.includes('http:') || lowerAction.includes('https:') || 
      lowerAction.includes('curl')) {
    riskScore += 0.15;
  }

  // File system writes
  if (lowerAction.includes('write:') || lowerAction.includes('edit:')) {
    riskScore += 0.1;
  }

  // Read-only operations (lower risk)
  if (context.readonly || lowerAction.includes('git log') || 
      lowerAction.includes('cat ') || lowerAction.includes('ls ')) {
    riskScore = Math.max(0.1, riskScore - 0.3);
  }

  // Emergency overrides
  if (context.emergency) {
    riskScore += 0.2; // Still high risk, but noted as emergency
  }

  // Cap at 1.0
  return Math.min(1.0, riskScore);
}

/**
 * Determine risk category
 */
function getRiskCategory(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore < 0.3) return 'low';
  if (riskScore < 0.5) return 'medium';
  if (riskScore < 0.8) return 'high';
  return 'critical';
}

describe('guard - Risk Scoring Accuracy', () => {
  test('low-risk operations score below 0.3', () => {
    const risk = assessRisk(riskScenarios.readOperation.action, riskScenarios.readOperation.context);
    
    expect(risk).toBeLessThan(0.3);
    expect(getRiskCategory(risk)).toBe('low');
  });

  test('medium-risk operations score between 0.3 and 0.5', () => {
    const risk = assessRisk(riskScenarios.apiCall.action, riskScenarios.apiCall.context);
    
    expect(risk).toBeGreaterThanOrEqual(0.3);
    expect(risk).toBeLessThan(0.5);
    expect(getRiskCategory(risk)).toBe('medium');
  });

  test('high-risk operations score between 0.5 and 0.8', () => {
    const risk = assessRisk(riskScenarios.databaseWrite.action, riskScenarios.databaseWrite.context);
    
    expect(risk).toBeGreaterThanOrEqual(0.5);
    expect(risk).toBeLessThan(0.8);
    expect(getRiskCategory(risk)).toBe('high');
  });

  test('critical-risk operations score above 0.8', () => {
    const risk = assessRisk(riskScenarios.dangerousOperation.action, riskScenarios.dangerousOperation.context);
    
    expect(risk).toBeGreaterThanOrEqual(0.8);
    expect(getRiskCategory(risk)).toBe('critical');
  });

  test('production deployment scores high', () => {
    const risk = assessRisk(riskScenarios.productionDeploy.action, riskScenarios.productionDeploy.context);
    
    expect(risk).toBeGreaterThanOrEqual(0.7);
    expect(getRiskCategory(risk)).toBe('high');
  });

  test('data deletion scores high with context', () => {
    const risk = assessRisk(riskScenarios.dataDeletion.action, riskScenarios.dataDeletion.context);
    
    expect(risk).toBeGreaterThanOrEqual(0.7);
    expect(getRiskCategory(risk)).toBe('high');
  });

  test('npm publish scores high', () => {
    const risk = assessRisk(riskScenarios.npmPublish.action, riskScenarios.npmPublish.context);
    
    expect(risk).toBeGreaterThanOrEqual(0.8);
    expect(getRiskCategory(risk)).toBe('critical');
  });

  test('emergency revert acknowledges emergency context', () => {
    const risk = assessRisk(riskScenarios.emergencyRevert.action, riskScenarios.emergencyRevert.context);
    
    // Still high risk
    expect(risk).toBeGreaterThan(0.8);
  });

  test('local file edits have moderate risk', () => {
    const risk = assessRisk(riskScenarios.localFileEdit.action, riskScenarios.localFileEdit.context);
    
    expect(risk).toBeLessThan(0.3);
    expect(getRiskCategory(risk)).toBe('low');
  });

  test('risk scores are capped at 1.0', () => {
    const extremeRisk = assessRisk('DELETE DROP rm -rf production emergency', {
      production: true,
      destructive: true,
      database: true,
      emergency: true,
    });
    
    expect(extremeRisk).toBeLessThanOrEqual(1.0);
  });
});

describe('guard - Opus Escalation Triggers', () => {
  let guard: MockOpusGuard;

  beforeEach(() => {
    guard = createMockOpusGuard({
      riskThreshold: 0.7,
      autoApproveBelow: 0.3,
      alwaysBlockAbove: 0.95,
    });
  });

  test('low-risk actions auto-approve without escalation', async () => {
    const request = {
      action: 'git log --oneline',
      context: { readonly: true },
      riskScore: 0.1,
      timestamp: Date.now(),
    };

    const decision = await guard.evaluate(request);
    
    expect(decision.approved).toBe(true);
    expect(decision.reasoning).toContain('auto-approved');
  });

  test('medium-risk actions auto-approve if below threshold', async () => {
    const request = {
      action: 'edit src/utils.ts',
      context: { workspace: true },
      riskScore: 0.4,
      timestamp: Date.now(),
    };

    const decision = await guard.evaluate(request);
    
    expect(decision.approved).toBe(true);
    expect(decision.reasoning).toContain('below threshold');
  });

  test('high-risk actions escalate to Opus', async () => {
    const request = {
      action: 'deploy --env production',
      context: { production: true },
      riskScore: 0.75,
      timestamp: Date.now(),
    };

    const decision = await guard.evaluate(request);
    
    expect(decision.approved).toBeDefined();
    // Decision depends on context evaluation in Opus
    expect(decision.requiresAudit).toBe(true);
  });

  test('critical-risk actions auto-block', async () => {
    const request = {
      action: 'DELETE FROM production',
      context: { destructive: true },
      riskScore: 0.99,
      timestamp: Date.now(),
    };

    const decision = await guard.evaluate(request);
    
    expect(decision.approved).toBe(false);
    expect(decision.reasoning).toContain('auto-blocked');
  });

  test('customizable risk thresholds', async () => {
    // Lower threshold
    guard.configure({ riskThreshold: 0.5 });
    
    const request = {
      action: 'deploy',
      context: {},
      riskScore: 0.6, // Below original 0.7 threshold, above new 0.5
      timestamp: Date.now(),
    };

    const decision = await guard.evaluate(request);
    
    // Should escalate (>= new threshold of 0.5)
    expect(decision.requiresAudit).toBe(true);
  });

  test('configurable auto-approval threshold', async () => {
    guard.configure({ autoApproveBelow: 0.5 });
    
    const request = {
      action: 'edit file',
      context: {},
      riskScore: 0.45, // Above default 0.3, below new 0.5
      timestamp: Date.now(),
    };

    const decision = await guard.evaluate(request);
    
    expect(decision.approved).toBe(true);
  });

  test('production deployment with proper context gets approved', async () => {
    const request = {
      action: 'deploy --env production',
      context: {
        production: true,
        hasTests: true,
        reviewApproved: true,
      },
      riskScore: 0.75,
      timestamp: Date.now(),
    };

    const decision = await guard.evaluate(request);
    
    expect(decision.approved).toBe(true);
    expect(decision.conditions).toBeDefined();
    expect(decision.conditions).toContainEqual(
      expect.stringContaining('smoke test')
    );
  });

  test('production deployment without tests gets blocked', async () => {
    const request = {
      action: 'deploy --env production',
      context: {
        production: true,
        hasTests: false,
        reviewApproved: true,
      },
      riskScore: 0.75,
      timestamp: Date.now(),
    };

    const decision = await guard.evaluate(request);
    
    expect(decision.approved).toBe(false);
    expect(decision.reasoning).toContain('requires tests');
  });

  test('npm publish with version bump approved', async () => {
    const request = {
      action: 'npm publish',
      context: {
        publishing: true,
        versionBumped: true,
        changelogUpdated: true,
      },
      riskScore: 0.9,
      timestamp: Date.now(),
    };

    const decision = await guard.evaluate(request);
    
    expect(decision.approved).toBe(true);
    expect(decision.conditions).toBeDefined();
  });

  test('npm publish without version bump blocked', async () => {
    const request = {
      action: 'npm publish',
      context: {
        publishing: true,
        versionBumped: false,
        changelogUpdated: false,
      },
      riskScore: 0.9,
      timestamp: Date.now(),
    };

    const decision = await guard.evaluate(request);
    
    expect(decision.approved).toBe(false);
    expect(decision.reasoning).toContain('version bump');
  });
});

describe('guard - Audit Log Format', () => {
  let guard: MockOpusGuard;

  beforeEach(() => {
    guard = createMockOpusGuard();
    guard.clearAuditLog();
  });

  test('audit entries include required fields', async () => {
    const request = {
      action: 'deploy production',
      context: {},
      riskScore: 0.8,
      timestamp: Date.now(),
    };

    await guard.evaluate(request);
    
    const auditLog = guard.getAuditLog();
    
    expect(auditLog).toHaveLength(1);
    const entry = auditLog[0];
    
    expect(entry.id).toBeDefined();
    expect(entry.id).toMatch(/^audit-\d+-[a-z0-9]+$/);
    expect(entry.action).toBe(request.action);
    expect(entry.riskScore).toBe(request.riskScore);
    expect(entry.timestamp).toBe(request.timestamp);
    expect(entry.decision).toBeDefined();
    expect(entry.model).toMatch(/^(sonnet|opus)$/);
  });

  test('audit log tracks escalation decisions', async () => {
    const request = {
      action: 'deploy',
      context: { production: true },
      riskScore: 0.8,
      timestamp: Date.now(),
    };

    await guard.evaluate(request);
    
    const auditLog = guard.getAuditLog();
    const entry = auditLog[0];
    
    expect(entry.escalated).toBe(true);
    expect(entry.model).toBe('opus');
  });

  test('audit log tracks non-escalated decisions', async () => {
    const request = {
      action: 'git log',
      context: { readonly: true },
      riskScore: 0.1,
      timestamp: Date.now(),
    };

    await guard.evaluate(request);
    
    const auditLog = guard.getAuditLog();
    const entry = auditLog[0];
    
    expect(entry.escalated).toBe(false);
    expect(entry.model).toBe('sonnet');
  });

  test('audit log includes decision reasoning', async () => {
    const request = {
      action: 'safe operation',
      context: {},
      riskScore: 0.2,
      timestamp: Date.now(),
    };

    await guard.evaluate(request);
    
    const auditLog = guard.getAuditLog();
    const entry = auditLog[0];
    
    expect(entry.decision.reasoning).toBeDefined();
    expect(entry.decision.reasoning).not.toBe('');
  });

  test('audit log includes conditions when present', async () => {
    const request = {
      action: 'deploy --env production',
      context: {
        production: true,
        hasTests: true,
        reviewApproved: true,
      },
      riskScore: 0.75,
      timestamp: Date.now(),
    };

    await guard.evaluate(request);
    
    const auditLog = guard.getAuditLog();
    const entry = auditLog[0];
    
    if (entry.decision.approved) {
      expect(entry.decision.conditions).toBeDefined();
      expect(entry.decision.conditions?.length).toBeGreaterThan(0);
    }
  });

  test('audit log includes emergency override reason', async () => {
    const request = {
      action: 'emergency revert',
      context: {
        emergency: true,
        justification: 'Critical bug causing data loss',
      },
      riskScore: 0.95,
      timestamp: Date.now(),
    };

    await guard.evaluate(request);
    
    const auditLog = guard.getAuditLog();
    const entry = auditLog[0];
    
    expect(entry.decision.approved).toBe(true);
    expect(entry.decision.overrideReason).toBeDefined();
    expect(entry.decision.overrideReason).toContain('data loss');
  });

  test('audit log can filter by escalation status', async () => {
    await guard.evaluate({ action: 'low', context: {}, riskScore: 0.1, timestamp: Date.now() });
    await guard.evaluate({ action: 'high', context: {}, riskScore: 0.8, timestamp: Date.now() });
    
    const escalatedOnly = guard.getAuditLog({ escalatedOnly: true });
    
    expect(escalatedOnly).toHaveLength(1);
    expect(escalatedOnly[0].action).toBe('high');
  });

  test('audit log can filter by approval status', async () => {
    await guard.evaluate({ action: 'low', context: {}, riskScore: 0.1, timestamp: Date.now() });
    await guard.evaluate({ action: 'danger', context: { destructive: true }, riskScore: 0.99, timestamp: Date.now() });
    
    const approvedOnly = guard.getAuditLog({ approvedOnly: true });
    const blockedOnly = guard.getAuditLog({ approvedOnly: false });
    
    expect(approvedOnly.length).toBeGreaterThan(0);
    expect(blockedOnly.length).toBeGreaterThan(0);
  });

  test('audit log can filter by time', async () => {
    const before = Date.now();
    await guard.evaluate({ action: 'action1', context: {}, riskScore: 0.2, timestamp: before + 100 });
    await guard.evaluate({ action: 'action2', context: {}, riskScore: 0.3, timestamp: before + 200 });
    
    const recent = guard.getAuditLog({ since: before + 150 });
    
    expect(recent).toHaveLength(1);
    expect(recent[0].action).toBe('action2');
  });

  test('clearing audit log empties all entries', async () => {
    await guard.evaluate({ action: 'action1', context: {}, riskScore: 0.2, timestamp: Date.now() });
    
    guard.clearAuditLog();
    
    const auditLog = guard.getAuditLog();
    expect(auditLog).toHaveLength(0);
  });
});

describe('guard - Statistics', () => {
  let guard: MockOpusGuard;

  beforeEach(() => {
    guard = createMockOpusGuard();
    guard.clearAuditLog();
  });

  test('calculates accurate total decisions', async () => {
    await guard.evaluate({ action: 'a', context: {}, riskScore: 0.1, timestamp: Date.now() });
    await guard.evaluate({ action: 'b', context: {}, riskScore: 0.2, timestamp: Date.now() });
    await guard.evaluate({ action: 'c', context: {}, riskScore: 0.3, timestamp: Date.now() });
    
    const stats = guard.getStats();
    
    expect(stats.total).toBe(3);
  });

  test('calculates approved vs blocked counts', async () => {
    await guard.evaluate({ action: 'safe', context: {}, riskScore: 0.1, timestamp: Date.now() });
    await guard.evaluate({ action: 'safe2', context: {}, riskScore: 0.2, timestamp: Date.now() });
    await guard.evaluate({ action: 'danger', context: { destructive: true }, riskScore: 0.99, timestamp: Date.now() });
    
    const stats = guard.getStats();
    
    expect(stats.total).toBe(3);
    expect(stats.approved).toBe(2);
    expect(stats.blocked).toBe(1);
  });

  test('tracks escalation count', async () => {
    await guard.evaluate({ action: 'low', context: {}, riskScore: 0.1, timestamp: Date.now() });
    await guard.evaluate({ action: 'high', context: {}, riskScore: 0.8, timestamp: Date.now() });
    
    const stats = guard.getStats();
    
    expect(stats.escalated).toBe(1);
  });

  test('calculates average risk score', async () => {
    await guard.evaluate({ action: 'a', context: {}, riskScore: 0.2, timestamp: Date.now() });
    await guard.evaluate({ action: 'b', context: {}, riskScore: 0.4, timestamp: Date.now() });
    await guard.evaluate({ action: 'c', context: {}, riskScore: 0.6, timestamp: Date.now() });
    
    const stats = guard.getStats();
    
    expect(stats.avgRiskScore).toBeCloseTo(0.4, 2);
  });

  test('handles empty statistics', () => {
    const stats = guard.getStats();
    
    expect(stats.total).toBe(0);
    expect(stats.approved).toBe(0);
    expect(stats.blocked).toBe(0);
    expect(stats.escalated).toBe(0);
    expect(stats.avgRiskScore).toBe(0);
  });
});
