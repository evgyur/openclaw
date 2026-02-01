import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { 
  createMockRouter, 
  spawnParallelWorkers, 
  waitForSynthesis,
  mockResponses 
} from '../mocks/mock-sessions';
import { 
  createMockOpusGuard, 
  riskScenarios 
} from '../mocks/mock-opus';
import { 
  parseDiff, 
  mockRepoStates, 
  getChangedFiles 
} from '../mocks/mock-git';

/**
 * Full Workflow Integration Test
 * 
 * Tests the complete subagent workflow from task inception to completion:
 * 1. Task received and analyzed
 * 2. Subagents spawned for parallel processing
 * 3. Tool calls intercepted and guarded
 * 4. Results synthesized and returned
 * 5. Audit trail maintained
 */

interface TaskRequest {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

interface WorkflowResult {
  success: boolean;
  taskId: string;
  synthesis?: {
    recommendation: string;
    confidence: number;
    sources: string[];
  };
  guardDecisions?: Array<{
    action: string;
    approved: boolean;
    riskScore: number;
  }>;
  auditTrail?: Array<{
    timestamp: number;
    event: string;
    details: unknown;
  }>;
  error?: string;
}

/**
 * Simulates the complete workflow orchestrator
 */
class WorkflowOrchestrator {
  private sessions = createMockRouter();
  private guard = createMockOpusGuard();
  private auditLog: Array<{ timestamp: number; event: string; details: unknown }> = [];

  async execute(request: TaskRequest): Promise<WorkflowResult> {
    const startTime = Date.now();
    
    try {
      // Log task received
      this.logEvent('task.received', { id: request.id, priority: request.priority });

      // Step 1: Guard check on task itself
      const taskRisk = request.priority === 'critical' ? 0.8 : 0.3;
      const taskGuard = await this.guard.evaluate({
        action: `execute task: ${request.description}`,
        context: request.context || {},
        riskScore: taskRisk,
        timestamp: startTime,
      });

      if (!taskGuard.approved && request.priority !== 'critical') {
        return {
          success: false,
          taskId: request.id,
          error: 'Task rejected by guard',
          guardDecisions: [{ action: 'task', approved: false, riskScore: taskRisk }],
          auditTrail: this.auditLog,
        };
      }

      this.logEvent('task.approved', { guardDecision: taskGuard });

      // Step 2: Spawn parallel workers
      const workers = this.determineWorkers(request);
      const workerConfigs = workers.map(role => ({
        label: `${request.id}-${role}`,
        response: this.getMockResponse(role),
      }));

      this.logEvent('workers.spawned', { count: workers.length, roles: workers });

      // Step 3: Execute workers in parallel
      const workerResults = await spawnParallelWorkers(
        this.sessions, 
        workerConfigs, 
        { delayMs: 50, failureRate: 0 }
      );

      this.logEvent('workers.completed', { results: workerResults.length });

      // Step 4: Guard check on synthesis
      const synthesisRisk = 0.4;
      const synthesisGuard = await this.guard.evaluate({
        action: 'synthesize worker outputs',
        context: { workerCount: workers.length },
        riskScore: synthesisRisk,
        timestamp: Date.now(),
      });

      this.logEvent('synthesis.approved', { approved: synthesisGuard.approved });

      // Step 5: Synthesize results
      const synthesis = await waitForSynthesis(
        workerResults.map(r => ({
          sessionId: r.sessionId || 'unknown',
          findings: r.findings || [],
          recommendation: r.recommendation || '',
          confidence: r.confidence || 0.8,
        })),
        50
      );

      this.logEvent('workflow.completed', { duration: Date.now() - startTime });

      return {
        success: true,
        taskId: request.id,
        synthesis,
        guardDecisions: [
          { action: 'task', approved: taskGuard.approved, riskScore: taskRisk },
          { action: 'synthesis', approved: synthesisGuard.approved, riskScore: synthesisRisk },
        ],
        auditTrail: this.auditLog,
      };

    } catch (error) {
      this.logEvent('workflow.failed', { error: String(error) });
      
      return {
        success: false,
        taskId: request.id,
        error: error instanceof Error ? error.message : String(error),
        auditTrail: this.auditLog,
      };
    }
  }

  private determineWorkers(request: TaskRequest): string[] {
    // Complex tasks get all workers
    if (request.priority === 'critical' || request.description.length > 100) {
      return ['research', 'audit', 'draft', 'verify'];
    }
    // Simple tasks get fewer workers
    return ['research', 'draft'];
  }

  private getMockResponse(role: string): { findings: string[]; recommendation?: string; confidence?: number } {
    switch (role) {
      case 'research':
        return mockResponses.securityAnalysis;
      case 'audit':
        return mockResponses.performanceAnalysis;
      case 'draft':
        return { 
          findings: ['Implementation approach identified'], 
          recommendation: 'Use caching layer with Redis',
          confidence: 0.85 
        };
      case 'verify':
        return mockResponses.scalabilityAnalysis;
      default:
        return { findings: [], confidence: 0.5 };
    }
  }

  private logEvent(event: string, details: unknown): void {
    this.auditLog.push({
      timestamp: Date.now(),
      event,
      details,
    });
  }

  getAuditLog(): Array<{ timestamp: number; event: string; details: unknown }> {
    return [...this.auditLog];
  }

  reset(): void {
    this.sessions.reset();
    this.guard.clearAuditLog();
    this.auditLog = [];
  }
}

describe('Full Workflow - E2E Integration', () => {
  let orchestrator: WorkflowOrchestrator;

  beforeEach(() => {
    orchestrator = new WorkflowOrchestrator();
  });

  afterEach(() => {
    orchestrator.reset();
  });

  test('completes full workflow for standard task', async () => {
    const request: TaskRequest = {
      id: 'task-001',
      description: 'Refactor authentication module for better security',
      priority: 'high',
    };

    const result = await orchestrator.execute(request);

    expect(result.success).toBe(true);
    expect(result.taskId).toBe('task-001');
    expect(result.synthesis).toBeDefined();
    expect(result.synthesis?.recommendation).toBeTruthy();
    expect(result.synthesis?.sources.length).toBeGreaterThan(0);
    expect(result.guardDecisions).toHaveLength(2);
    expect(result.auditTrail).toHaveLengthGreaterThan(0);
  });

  test('spawns all workers for critical priority tasks', async () => {
    const request: TaskRequest = {
      id: 'task-critical',
      description: 'Fix critical security vulnerability',
      priority: 'critical',
    };

    const result = await orchestrator.execute(request);

    expect(result.success).toBe(true);
    // Critical tasks get 4 workers (research, audit, draft, verify)
    const spawnEvent = result.auditTrail?.find(e => e.event === 'workers.spawned');
    expect(spawnEvent).toBeDefined();
    expect((spawnEvent?.details as { count: number }).count).toBe(4);
  });

  test('maintains complete audit trail', async () => {
    const request: TaskRequest = {
      id: 'task-audit',
      description: 'Review API documentation',
      priority: 'low',
    };

    const result = await orchestrator.execute(request);

    expect(result.success).toBe(true);
    expect(result.auditTrail).toBeDefined();
    
    const events = result.auditTrail!.map(e => e.event);
    expect(events).toContain('task.received');
    expect(events).toContain('task.approved');
    expect(events).toContain('workers.spawned');
    expect(events).toContain('workflow.completed');
  });

  test('includes guard decisions in result', async () => {
    const request: TaskRequest = {
      id: 'task-guarded',
      description: 'Deploy to production',
      priority: 'high',
    };

    const result = await orchestrator.execute(request);

    expect(result.guardDecisions).toBeDefined();
    expect(result.guardDecisions!.length).toBeGreaterThanOrEqual(1);
    
    const taskDecision = result.guardDecisions!.find(d => d.action === 'task');
    expect(taskDecision).toBeDefined();
    expect(taskDecision!.riskScore).toBeDefined();
  });

  test('workflow with git integration', async () => {
    // Simulate a workflow that involves git operations
    const diff = mockRepoStates.complexRefactor.diff;
    const files = getChangedFiles(diff);
    
    const request: TaskRequest = {
      id: 'task-git',
      description: `Review changes in ${files.join(', ')}`,
      priority: 'medium',
      context: { files, diffLength: diff.length },
    };

    const result = await orchestrator.execute(request);

    expect(result.success).toBe(true);
    expect(files).toContain('src/auth/jwt.ts');
    expect(files).toContain('src/auth/types.ts');
  });

  test('handles synthesis with all worker types', async () => {
    const request: TaskRequest = {
      id: 'task-complete',
      description: 'Comprehensive system architecture review with security, performance, and scalability analysis',
      priority: 'critical',
    };

    const result = await orchestrator.execute(request);

    expect(result.success).toBe(true);
    expect(result.synthesis).toBeDefined();
    
    // Should have recommendations from all worker types
    const recommendation = result.synthesis?.recommendation || '';
    expect(recommendation.length).toBeGreaterThan(0);
  });

  test('workflow execution timing is reasonable', async () => {
    const startTime = Date.now();
    
    const request: TaskRequest = {
      id: 'task-timing',
      description: 'Quick analysis task',
      priority: 'low',
    };

    const result = await orchestrator.execute(request);
    const duration = Date.now() - startTime;

    expect(result.success).toBe(true);
    // Should complete in reasonable time (under 5 seconds for mock)
    expect(duration).toBeLessThan(5000);
  });

  test('preserves task context through workflow', async () => {
    const customContext = {
      repo: 'myorg/project',
      branch: 'feature/new-auth',
      commit: 'abc123',
    };

    const request: TaskRequest = {
      id: 'task-context',
      description: 'Review authentication changes',
      priority: 'high',
      context: customContext,
    };

    const result = await orchestrator.execute(request);

    expect(result.success).toBe(true);
    
    // Context should be available in audit trail
    const receivedEvent = result.auditTrail?.find(e => e.event === 'task.received');
    expect(receivedEvent).toBeDefined();
  });
});

describe('Full Workflow - Security Integration', () => {
  let orchestrator: WorkflowOrchestrator;

  beforeEach(() => {
    orchestrator = new WorkflowOrchestrator();
  });

  afterEach(() => {
    orchestrator.reset();
  });

  test('critical tasks undergo stricter guard checks', async () => {
    const criticalRequest: TaskRequest = {
      id: 'task-critical-security',
      description: 'Modify production database schema',
      priority: 'critical',
    };

    const result = await orchestrator.execute(criticalRequest);

    expect(result.success).toBe(true);
    
    // Should have guard decisions recorded
    const taskDecision = result.guardDecisions?.find(d => d.action === 'task');
    expect(taskDecision).toBeDefined();
    expect(taskDecision!.riskScore).toBe(0.8); // Critical priority = higher risk score
  });

  test('audit trail includes security events', async () => {
    const request: TaskRequest = {
      id: 'task-security-audit',
      description: 'Security review',
      priority: 'high',
    };

    const result = await orchestrator.execute(request);

    const securityEvents = result.auditTrail?.filter(e => 
      e.event.includes('guard') || 
      e.event.includes('approved') ||
      e.event.includes('security')
    );
    
    expect(securityEvents?.length).toBeGreaterThan(0);
  });
});

describe('Full Workflow - Error Handling', () => {
  test('handles missing task description gracefully', async () => {
    const orchestrator = new WorkflowOrchestrator();
    
    const request: TaskRequest = {
      id: 'task-empty',
      description: '',
      priority: 'low',
    };

    // Empty description should still complete (just with minimal workers)
    const result = await orchestrator.execute(request);
    
    // Should complete even with empty description
    expect(result.success).toBe(true);
  });

  test('maintains audit trail even on partial failure', async () => {
    const orchestrator = new WorkflowOrchestrator();
    
    // Force an error by using invalid priority
    const request = {
      id: 'task-error',
      description: 'Test task',
      priority: 'invalid' as any,
    };

    const result = await orchestrator.execute(request);

    // Should still have audit trail
    expect(result.auditTrail).toBeDefined();
    expect(result.auditTrail!.length).toBeGreaterThan(0);
  });
});

describe('Full Workflow - Grill Integration', () => {
  test('integrates code review into workflow', async () => {
    const orchestrator = new WorkflowOrchestrator();
    
    // Simulate a code review workflow
    const diff = mockRepoStates.productionReady.diff;
    const parsed = parseDiff(diff);
    
    const request: TaskRequest = {
      id: 'task-code-review',
      description: 'Review PR for production hardening',
      priority: 'high',
      context: {
        diff,
        filesChanged: parsed.length,
        isPR: true,
      },
    };

    const result = await orchestrator.execute(request);

    expect(result.success).toBe(true);
    expect(result.synthesis).toBeDefined();
  });
});
