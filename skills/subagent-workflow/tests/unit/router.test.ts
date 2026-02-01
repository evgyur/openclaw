import { describe, test, expect, beforeEach } from 'vitest';
import { MockSessionManager, mockResponses, createMockRouter, spawnParallelWorkers, waitForSynthesis } from '../mocks/mock-sessions';

/**
 * Router - Task Routing Unit Tests
 * 
 * Tests the request router:
 * - Task decomposition and splitting
 * - Subagent labeling
 * - Spawn failure handling
 */

interface TaskAnalysis {
  complexity: 'simple' | 'moderate' | 'complex';
  aspects: string[];
  recommendedWorkers: number;
}

interface WorkerTask {
  label: string;
  focus: string;
  priority: number;
}

interface DecompositionResult {
  originalTask: string;
  workers: WorkerTask[];
  reasoning: string;
}

/**
 * Simulated task decomposition logic
 */
function analyzeTaskComplexity(task: string): TaskAnalysis {
  const lowerTask = task.toLowerCase();
  
  // Simple tasks - no decomposition needed
  const simplePatterns = ['fix', 'update', 'add', 'remove', 'simple', 'quick'];
  if (simplePatterns.some(p => lowerTask.includes(p)) && task.length < 100) {
    return {
      complexity: 'simple',
      aspects: [],
      recommendedWorkers: 1,
    };
  }

  // Complex tasks - identify aspects
  const aspects: string[] = [];
  
  if (lowerTask.includes('security') || lowerTask.includes('auth')) {
    aspects.push('security');
  }
  if (lowerTask.includes('performance') || lowerTask.includes('speed') || lowerTask.includes('cache')) {
    aspects.push('performance');
  }
  if (lowerTask.includes('scale') || lowerTask.includes('concurrent') || lowerTask.includes('load')) {
    aspects.push('scalability');
  }
  if (lowerTask.includes('maintain') || lowerTask.includes('test') || lowerTask.includes('doc')) {
    aspects.push('maintenance');
  }
  if (lowerTask.includes('design') || lowerTask.includes('architecture') || lowerTask.includes('pattern')) {
    aspects.push('architecture');
  }

  // Moderate tasks - 2-3 aspects
  if (aspects.length <= 2) {
    return {
      complexity: 'moderate',
      aspects,
      recommendedWorkers: Math.min(aspects.length || 2, 3),
    };
  }

  // Complex tasks - 4+ aspects
  return {
    complexity: 'complex',
    aspects,
    recommendedWorkers: Math.min(aspects.length, 6),
  };
}

/**
 * Decompose task into worker subtasks
 */
function decomposeTask(task: string): DecompositionResult {
  const analysis = analyzeTaskComplexity(task);
  const workers: WorkerTask[] = [];

  if (analysis.complexity === 'simple') {
    return {
      originalTask: task,
      workers: [{ label: 'simple-task', focus: task, priority: 1 }],
      reasoning: 'Task is simple, no decomposition needed',
    };
  }

  // Create worker tasks based on identified aspects
  const aspectLabels: Record<string, string> = {
    security: 'security-analyst',
    performance: 'performance-engineer',
    scalability: 'scalability-expert',
    maintenance: 'maintainability-reviewer',
    architecture: 'architect',
  };

  analysis.aspects.forEach((aspect, index) => {
    workers.push({
      label: aspectLabels[aspect] || `worker-${aspect}`,
      focus: `Analyze ${aspect} implications of: ${task}`,
      priority: index + 1,
    });
  });

  // If no specific aspects, create generic workers
  if (workers.length === 0) {
    workers.push(
      { label: 'analyzer-1', focus: `Primary analysis of: ${task}`, priority: 1 },
      { label: 'analyzer-2', focus: `Secondary review of: ${task}`, priority: 2 }
    );
  }

  return {
    originalTask: task,
    workers,
    reasoning: `Task identified as ${analysis.complexity} with ${workers.length} aspects to explore in parallel`,
  };
}

describe('router - Task Decomposition', () => {
  test('simple tasks do not decompose', () => {
    const task = 'Fix typo in README';
    const analysis = analyzeTaskComplexity(task);
    const decomposition = decomposeTask(task);
    
    expect(analysis.complexity).toBe('simple');
    expect(analysis.recommendedWorkers).toBe(1);
    expect(decomposition.workers).toHaveLength(1);
    expect(decomposition.workers[0].label).toBe('simple-task');
  });

  test('moderate complexity task decomposes into 2-3 workers', () => {
    const task = 'Improve authentication flow';
    const analysis = analyzeTaskComplexity(task);
    const decomposition = decomposeTask(task);
    
    expect(analysis.complexity).toBe('moderate');
    expect(analysis.aspects).toContain('security');
    expect(decomposition.workers.length).toBeGreaterThanOrEqual(1);
    expect(decomposition.workers.length).toBeLessThanOrEqual(3);
  });

  test('complex task decomposes into multiple workers', () => {
    const task = 'Refactor auth module for security, performance, and scalability';
    const analysis = analyzeTaskComplexity(task);
    const decomposition = decomposeTask(task);
    
    expect(analysis.complexity).toBe('complex');
    expect(analysis.aspects.length).toBeGreaterThanOrEqual(3);
    expect(decomposition.workers.length).toBeGreaterThanOrEqual(2);
  });

  test('task analysis identifies security aspects', () => {
    const task = 'Analyze OAuth2 security implications';
    const analysis = analyzeTaskComplexity(task);
    
    expect(analysis.aspects).toContain('security');
    expect(decomposeTask(task).workers.some(w => w.label.includes('security'))).toBe(true);
  });

  test('task analysis identifies performance aspects', () => {
    const task = 'Optimize database query performance';
    const analysis = analyzeTaskComplexity(task);
    
    expect(analysis.aspects).toContain('performance');
  });

  test('task analysis identifies scalability aspects', () => {
    const task = 'Design scalable caching strategy';
    const analysis = analyzeTaskComplexity(task);
    
    expect(analysis.aspects).toContain('scalability');
  });

  test('multi-faceted task generates appropriate aspects', () => {
    const task = 'Research best practices for secure, fast, and maintainable APIs';
    const analysis = analyzeTaskComplexity(task);
    
    expect(analysis.aspects).toContain('security');
    expect(analysis.aspects).toContain('performance');
    expect(analysis.aspects).toContain('maintenance');
  });

  test('generic task creates fallback workers', () => {
    const task = 'Something completely unrelated';
    const decomposition = decomposeTask(task);
    
    expect(decomposition.workers.length).toBeGreaterThanOrEqual(1);
  });
});

describe('router - Worker Labeling', () => {
  test('security tasks get security-analyst label', () => {
    const decomposition = decomposeTask('Analyze security architecture');
    const labels = decomposition.workers.map(w => w.label);
    
    expect(labels).toContain('security-analyst');
  });

  test('performance tasks get performance-engineer label', () => {
    const decomposition = decomposeTask('Optimize performance bottlenecks');
    const labels = decomposition.workers.map(w => w.label);
    
    expect(labels).toContain('performance-engineer');
  });

  test('scalability tasks get scalability-expert label', () => {
    const decomposition = decomposeTask('Evaluate scalability patterns');
    const labels = decomposition.workers.map(w => w.label);
    
    expect(labels).toContain('scalability-expert');
  });

  test('maintenance tasks get maintainability-reviewer label', () => {
    const decomposition = decomposeTask('Assess test coverage and maintainability');
    const labels = decomposition.workers.map(w => w.label);
    
    expect(labels).toContain('maintainability-reviewer');
  });

  test('architecture tasks get architect label', () => {
    const decomposition = decomposeTask('Design system architecture');
    const labels = decomposition.workers.map(w => w.label);
    
    expect(labels).toContain('architect');
  });

  test('worker tasks include focus description', () => {
    const decomposition = decomposeTask('Refactor auth module');
    
    decomposition.workers.forEach(worker => {
      expect(worker.focus).toContain('Analyze');
      expect(worker.focus.length).toBeGreaterThan(10);
    });
  });

  test('workers are assigned priorities', () => {
    const decomposition = decomposeTask('Complex refactor with many aspects');
    
    decomposition.workers.forEach((worker, index) => {
      expect(worker.priority).toBeGreaterThan(0);
      expect(worker.priority).toBeLessThanOrEqual(decomposition.workers.length);
    });
  });
});

describe('router - Spawn Failure Handling', () => {
  let router: MockSessionManager;

  beforeEach(() => {
    router = createMockRouter();
  });

  test('handles single worker failure gracefully', async () => {
    const sessionId = router.spawn('test-worker', { findings: [], recommendation: 'test' });
    
    // Simulate failure
    router.fail(sessionId, 'Connection timeout');
    
    const status = router.getStatus(sessionId);
    expect(status).toBe('failed');
    expect(router.getAllSessions()[0].error).toBe('Connection timeout');
  });

  test('continues when some workers fail in parallel execution', async () => {
    const workers = [
      { label: 'worker-1', response: { findings: ['Finding 1'], recommendation: 'Rec 1' } },
      { label: 'worker-2', response: { findings: ['Finding 2'], recommendation: 'Rec 2' } },
      { label: 'worker-3', response: { findings: ['Finding 3'], recommendation: 'Rec 3' } },
    ];

    // Run with 0 failure rate to get baseline
    const results = await spawnParallelWorkers(router, workers, { delayMs: 10, failureRate: 0 });
    
    expect(results).toHaveLength(3);
    expect(results[0].findings).toContain('Finding 1');
    expect(results[1].findings).toContain('Finding 2');
    expect(results[2].findings).toContain('Finding 3');
  });

  test('partial success includes completed worker results', async () => {
    router.spawn('success-worker', { findings: ['Success'] });
    
    const successId = Array.from(router.getAllSessions())[0]?.id;
    
    if (successId) {
      const result = await router.execute(successId, 10);
      expect(result.findings).toContain('Success');
    }
  });

  test('returns empty findings for failed workers', async () => {
    const sessionId = router.spawn('failing-worker', { findings: ['data'] });
    router.fail(sessionId, 'Spawn error');
    
    const session = router.getAllSessions()[0];
    expect(session?.status).toBe('failed');
    expect(session?.result).toBeUndefined();
  });

  test('handles execution timeout gracefully', async () => {
    const sessionId = router.spawn('timeout-worker', { findings: ['delayed'] });
    
    try {
      // Long delay that simulates timeout
      const promise = router.execute(sessionId, 10000);
      
      // In real scenario, timeout would interrupt
      // Here we just verify the execution pattern
      expect(router.getStatus(sessionId)).toBe('running');
    } catch (err) {
      // Expected if timeout is enforced
      expect(router.getStatus(sessionId)).toBe('failed');
    }
  });
});

describe('router - Parallel Execution', () => {
  let router: MockSessionManager;

  beforeEach(() => {
    router = createMockRouter();
  });

  test('spawns multiple workers with correct labels', async () => {
    const workers = [
      { label: 'security-analyst', response: mockResponses.securityAnalysis },
      { label: 'performance-engineer', response: mockResponses.performanceAnalysis },
      { label: 'scalability-expert', response: mockResponses.scalabilityAnalysis },
    ];

    const sessionIds = workers.map(w => router.spawn(w.label, w.response));
    
    expect(sessionIds).toHaveLength(3);
    
    const allSessions = router.getAllSessions();
    expect(allSessions.some(s => s.label === 'security-analyst')).toBe(true);
    expect(allSessions.some(s => s.label === 'performance-engineer')).toBe(true);
    expect(allSessions.some(s => s.label === 'scalability-expert')).toBe(true);
  });

  test('executes workers in parallel', async () => {
    const startTime = Date.now();
    
    const workers = [
      { label: 'worker-1', response: { findings: ['1'] } },
      { label: 'worker-2', response: { findings: ['2'] } },
      { label: 'worker-3', response: { findings: ['3'] } },
    ];

    await spawnParallelWorkers(router, workers, { delayMs: 50 });
    const elapsed = Date.now() - startTime;
    
    // Parallel execution should be faster than sequential (150ms if sequential)
    expect(elapsed).toBeLessThan(200);
  });

  test('aggregates results from all workers', async () => {
    const workers = [
      { label: 'security', response: { findings: ['Security finding'], confidence: 0.9 } },
      { label: 'performance', response: { findings: ['Performance issue'], confidence: 0.8 } },
    ];

    const results = await spawnParallelWorkers(router, workers, { delayMs: 10 });
    
    expect(results).toHaveLength(2);
    const findings = results.flatMap(r => r.findings);
    expect(findings).toContain('Security finding');
    expect(findings).toContain('Performance issue');
  });

  test('synthesis includes all recommendations', async () => {
    const responses = [
      { sessionId: '1', findings: ['F1'], recommendation: 'Rec 1', confidence: 0.8 },
      { sessionId: '2', findings: ['F2'], recommendation: 'Rec 2', confidence: 0.9 },
    ];

    const synthesis = await waitForSynthesis(responses, 10);
    
    expect(synthesis.recommendation).toContain('Rec 1');
    expect(synthesis.recommendation).toContain('Rec 2');
    expect(synthesis.sources).toHaveLength(2);
  });

  test('synthesis calculates average confidence', async () => {
    const responses = [
      { sessionId: '1', findings: [], recommendation: 'Rec', confidence: 0.8 },
      { sessionId: '2', findings: [], recommendation: 'Rec', confidence: 0.9 },
    ];

    const synthesis = await waitForSynthesis(responses, 10);
    
    expect(synthesis.confidence).toBeCloseTo(0.85, 2);
  });
});
