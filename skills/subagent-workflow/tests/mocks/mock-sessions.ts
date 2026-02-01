/**
 * Mock session management for testing subagent workflows
 */

export interface MockSession {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface SubagentResponse {
  sessionId: string;
  findings: string[];
  recommendation?: string;
  confidence?: number;
}

/**
 * Simulates a subagent session lifecycle
 */
export class MockSessionManager {
  private sessions: Map<string, MockSession> = new Map();
  private responseQueue: Map<string, SubagentResponse> = new Map();

  /**
   * Spawn a mock subagent with predefined response
   */
  spawn(label: string, response: Partial<SubagentResponse> = {}): string {
    const sessionId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    this.sessions.set(sessionId, {
      id: sessionId,
      label,
      status: 'pending',
    });

    this.responseQueue.set(sessionId, {
      sessionId,
      findings: response.findings || [],
      recommendation: response.recommendation,
      confidence: response.confidence ?? 0.8,
    });

    return sessionId;
  }

  /**
   * Simulate session execution
   */
  async execute(sessionId: string, delayMs = 100): Promise<SubagentResponse> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'running';
    await new Promise(resolve => setTimeout(resolve, delayMs));

    const response = this.responseQueue.get(sessionId);
    if (!response) {
      session.status = 'failed';
      session.error = 'No response configured';
      throw new Error('No response configured for session');
    }

    session.status = 'completed';
    session.result = response;
    session.duration = delayMs;

    return response;
  }

  /**
   * Get session status
   */
  getStatus(sessionId: string): MockSession['status'] | undefined {
    return this.sessions.get(sessionId)?.status;
  }

  /**
   * Simulate session failure
   */
  fail(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'failed';
      session.error = error;
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions(): MockSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Reset all sessions
   */
  reset(): void {
    this.sessions.clear();
    this.responseQueue.clear();
  }
}

/**
 * Predefined response templates for common scenarios
 */
export const mockResponses = {
  securityAnalysis: {
    findings: [
      'Authentication uses JWT tokens',
      'Rate limiting implemented',
      'Input validation present',
      'SQL injection protection via parameterized queries',
    ],
    recommendation: 'Add token rotation and audit logging',
    confidence: 0.85,
  },

  performanceAnalysis: {
    findings: [
      'Database queries use indexes',
      'Caching layer implemented',
      'Connection pooling configured',
      'N+1 queries detected in user endpoint',
    ],
    recommendation: 'Optimize user endpoint with eager loading',
    confidence: 0.9,
  },

  scalabilityAnalysis: {
    findings: [
      'Horizontal scaling supported',
      'Stateless API design',
      'Background jobs use queue',
      'File uploads go to S3',
    ],
    recommendation: 'Add load balancer health checks',
    confidence: 0.75,
  },

  maintenanceAnalysis: {
    findings: [
      'Code follows project conventions',
      'Tests cover core logic',
      'Documentation updated',
      'No deprecated dependencies',
    ],
    recommendation: 'Add integration tests for new API endpoints',
    confidence: 0.8,
  },

  failedWorker: {
    findings: [],
    recommendation: undefined,
    confidence: 0,
  },
};

/**
 * Create a mock session manager with predefined responses
 */
export function createMockRouter(): MockSessionManager {
  return new MockSessionManager();
}

/**
 * Simulate parallel subagent execution
 */
export async function spawnParallelWorkers(
  manager: MockSessionManager,
  workers: Array<{ label: string; response: Partial<SubagentResponse> }>,
  options: { delayMs?: number; failureRate?: number } = {}
): Promise<SubagentResponse[]> {
  const { delayMs = 100, failureRate = 0 } = options;

  const sessionIds = workers.map(w => manager.spawn(w.label, w.response));

  const results = await Promise.all(
    sessionIds.map(async (id, index) => {
      // Simulate random failures
      if (Math.random() < failureRate) {
        manager.fail(id, 'Simulated worker failure');
        throw new Error(`Worker ${workers[index].label} failed`);
      }
      return manager.execute(id, delayMs + Math.random() * 50);
    })
  );

  return results;
}

/**
 * Wait for synthesis (simulates result aggregation)
 */
export async function waitForSynthesis(
  responses: SubagentResponse[],
  delayMs = 200
): Promise<{
  recommendation: string;
  confidence: number;
  sources: string[];
}> {
  await new Promise(resolve => setTimeout(resolve, delayMs));

  const validResponses = responses.filter(r => r.recommendation);
  const avgConfidence = validResponses.reduce((sum, r) => sum + (r.confidence || 0), 0) / validResponses.length;

  return {
    recommendation: validResponses.map(r => r.recommendation).join('; '),
    confidence: avgConfidence,
    sources: validResponses.map(r => r.sessionId),
  };
}
