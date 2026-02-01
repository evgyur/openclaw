/**
 * Mock Opus model for testing security/risk decisions
 */

export interface OpusRequest {
  action: string;
  context: Record<string, unknown>;
  riskScore: number;
  timestamp: number;
}

export interface OpusDecision {
  approved: boolean;
  reasoning: string;
  conditions?: string[];
  requiresAudit: boolean;
  overrideReason?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  riskScore: number;
  decision: OpusDecision;
  escalated: boolean;
  model: 'sonnet' | 'opus';
}

/**
 * Mock Opus security model
 */
export class MockOpusGuard {
  private auditLog: AuditEntry[] = [];
  private riskThreshold = 0.7;
  private autoApproveBelow = 0.3;
  private alwaysBlockAbove = 0.95;

  /**
   * Configure risk thresholds
   */
  configure(options: {
    riskThreshold?: number;
    autoApproveBelow?: number;
    alwaysBlockAbove?: number;
  }): void {
    if (options.riskThreshold !== undefined) {
      this.riskThreshold = options.riskThreshold;
    }
    if (options.autoApproveBelow !== undefined) {
      this.autoApproveBelow = options.autoApproveBelow;
    }
    if (options.alwaysBlockAbove !== undefined) {
      this.alwaysBlockAbove = options.alwaysBlockAbove;
    }
  }

  /**
   * Evaluate action and decide whether to proceed
   */
  async evaluate(request: OpusRequest): Promise<OpusDecision> {
    const { action, riskScore } = request;

    // Auto-approve low-risk
    if (riskScore < this.autoApproveBelow) {
      const decision = {
        approved: true,
        reasoning: 'Low-risk operation, auto-approved',
        requiresAudit: true,
      };
      
      this.logDecision(request, decision, false, 'sonnet');
      return decision;
    }

    // Auto-block extremely high-risk
    if (riskScore > this.alwaysBlockAbove) {
      const decision = {
        approved: false,
        reasoning: 'Risk score exceeds maximum threshold, auto-blocked',
        requiresAudit: true,
      };
      
      this.logDecision(request, decision, false, 'sonnet');
      return decision;
    }

    // Escalate to Opus for medium-high risk
    if (riskScore >= this.riskThreshold) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate Opus latency
      const decision = this.opusEvaluate(request);
      this.logDecision(request, decision, true, 'opus');
      return decision;
    }

    // Default approval for below-threshold
    const decision = {
      approved: true,
      reasoning: 'Risk score below threshold, approved',
      requiresAudit: true,
    };
    
    this.logDecision(request, decision, false, 'sonnet');
    return decision;
  }

  /**
   * Simulate Opus model evaluation (high-reasoning capacity)
   */
  private opusEvaluate(request: OpusRequest): OpusDecision {
    const { action, riskScore, context } = request;

    // Production deployment
    if (action.includes('deploy') && action.includes('production')) {
      if (context.hasTests && context.reviewApproved) {
        return {
          approved: true,
          reasoning: 'Production deployment with tests and review approval',
          conditions: [
            'Run smoke tests after deployment',
            'Monitor error rates for 15 minutes',
            'Keep rollback plan ready',
          ],
          requiresAudit: true,
        };
      }
      return {
        approved: false,
        reasoning: 'Production deployment requires tests and review approval',
        requiresAudit: true,
      };
    }

    // Data deletion
    if (action.includes('DELETE') || action.includes('drop')) {
      if (context.hasBackup && context.confirmed) {
        return {
          approved: true,
          reasoning: 'Data deletion with backup and confirmation',
          conditions: ['Verify backup integrity before proceeding'],
          requiresAudit: true,
        };
      }
      return {
        approved: false,
        reasoning: 'Data deletion requires backup and explicit confirmation',
        requiresAudit: true,
      };
    }

    // Publishing
    if (action.includes('publish') || action.includes('npm publish')) {
      if (context.versionBumped && context.changelogUpdated) {
        return {
          approved: true,
          reasoning: 'Package publish with version bump and changelog',
          conditions: ['Verify package contents', 'Check npm registry after publish'],
          requiresAudit: true,
        };
      }
      return {
        approved: false,
        reasoning: 'Publishing requires version bump and changelog update',
        requiresAudit: true,
      };
    }

    // Emergency override
    if (context.emergency) {
      return {
        approved: true,
        reasoning: 'Emergency override granted',
        overrideReason: context.justification as string,
        conditions: ['Document incident post-mortem'],
        requiresAudit: true,
      };
    }

    // Default high-risk decision
    if (riskScore >= 0.8) {
      return {
        approved: false,
        reasoning: 'High-risk operation without sufficient safeguards',
        requiresAudit: true,
      };
    }

    return {
      approved: true,
      reasoning: 'Moderate risk, approved with monitoring',
      conditions: ['Monitor for unexpected outcomes'],
      requiresAudit: true,
    };
  }

  /**
   * Log decision to audit trail
   */
  private logDecision(
    request: OpusRequest,
    decision: OpusDecision,
    escalated: boolean,
    model: 'sonnet' | 'opus'
  ): void {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: request.timestamp,
      action: request.action,
      riskScore: request.riskScore,
      decision,
      escalated,
      model,
    };
    
    this.auditLog.push(entry);
  }

  /**
   * Get audit log
   */
  getAuditLog(filters?: {
    since?: number;
    escalatedOnly?: boolean;
    approvedOnly?: boolean;
  }): AuditEntry[] {
    let log = [...this.auditLog];

    if (filters?.since) {
      log = log.filter(e => e.timestamp >= filters.since);
    }

    if (filters?.escalatedOnly) {
      log = log.filter(e => e.escalated);
    }

    if (filters?.approvedOnly !== undefined) {
      log = log.filter(e => e.decision.approved === filters.approvedOnly);
    }

    return log;
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    approved: number;
    blocked: number;
    escalated: number;
    avgRiskScore: number;
  } {
    const total = this.auditLog.length;
    const approved = this.auditLog.filter(e => e.decision.approved).length;
    const blocked = total - approved;
    const escalated = this.auditLog.filter(e => e.escalated).length;
    const avgRiskScore = total > 0
      ? this.auditLog.reduce((sum, e) => sum + e.riskScore, 0) / total
      : 0;

    return { total, approved, blocked, escalated, avgRiskScore };
  }
}

/**
 * Predefined risk scenarios
 */
export const riskScenarios = {
  readOperation: {
    action: 'exec: git log',
    context: { readonly: true },
    riskScore: 0.1,
  },

  localFileEdit: {
    action: 'write: src/utils.ts',
    context: { workspace: true, tests: true },
    riskScore: 0.2,
  },

  apiCall: {
    action: 'http: GET /api/users',
    context: { readonly: true, authenticated: true },
    riskScore: 0.4,
  },

  databaseWrite: {
    action: 'exec: npm run migrate',
    context: { database: true, hasBackup: true },
    riskScore: 0.65,
  },

  productionDeploy: {
    action: 'exec: deploy --env production',
    context: { production: true, hasTests: true, reviewApproved: true },
    riskScore: 0.75,
  },

  dataDeletion: {
    action: 'exec: DELETE FROM users WHERE inactive=true',
    context: { database: true, hasBackup: true, confirmed: true },
    riskScore: 0.85,
  },

  npmPublish: {
    action: 'exec: npm publish',
    context: { publishing: true, versionBumped: true, changelogUpdated: true },
    riskScore: 0.9,
  },

  emergencyRevert: {
    action: 'exec: git revert HEAD && git push --force origin main',
    context: { production: true, emergency: true, justification: 'Critical bug causing data loss' },
    riskScore: 0.95,
  },

  dangerousOperation: {
    action: 'exec: rm -rf /data/production',
    context: { production: true, destructive: true },
    riskScore: 0.99,
  },
};

/**
 * Create mock Opus guard with default config
 */
export function createMockOpusGuard(config?: {
  riskThreshold?: number;
  autoApproveBelow?: number;
  alwaysBlockAbove?: number;
}): MockOpusGuard {
  const guard = new MockOpusGuard();
  if (config) {
    guard.configure(config);
  }
  return guard;
}
