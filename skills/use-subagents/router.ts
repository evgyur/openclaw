/**
 * use-subagents router
 * 
 * Automatically parallelizes complex tasks across specialized worker subagents.
 * Spawns research, audit, draft, and verify workers concurrently, then synthesizes results.
 */

import { synthesizeWorkerOutputs, type WorkerResult } from './synthesizer.js';

interface WorkerConfig {
  label: string;
  prompt: string;
  role: 'research' | 'audit' | 'draft' | 'verify';
}

interface SessionStatus {
  id: string;
  label: string;
  state: 'active' | 'completed' | 'failed' | 'timeout';
  lastMessage?: string;
}

const WORKER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 2000; // 2 seconds

/**
 * Extract the core task from the user request by removing the trigger phrase
 */
function extractTask(request: string): string {
  // Remove "use subagents" and common fluff words
  const cleaned = request
    .replace(/\buse subagents?\b/gi, '')
    .replace(/\bplease\b/gi, '')
    .replace(/\bcan you\b/gi, '')
    .replace(/\bcould you\b/gi, '')
    .trim();
  
  return cleaned || 'the requested task';
}

/**
 * Generate a URL-safe slug from the task description
 */
function generateTaskSlug(task: string): string {
  return task
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30); // Keep labels reasonable
}

/**
 * Create worker configurations for the four specialized roles
 */
function createWorkerConfigs(task: string): WorkerConfig[] {
  const slug = generateTaskSlug(task);
  
  return [
    {
      label: `${slug}-research`,
      role: 'research' as const,
      prompt: `You are the RESEARCH worker for: ${task}

Your mission:
1. Gather all relevant context, documentation, and prior art
2. Search the codebase for related implementations
3. Review commit history and PRs for past decisions
4. Document external dependencies and libraries involved
5. Identify industry best practices and standards

Output format:
- **Context**: What exists today
- **Prior Art**: Similar implementations in the codebase
- **External References**: Docs, libraries, standards
- **Key Insights**: Critical findings that impact implementation

Focus on breadth. Be thorough but concise.`,
    },
    {
      label: `${slug}-audit`,
      role: 'audit' as const,
      prompt: `You are the AUDIT worker for: ${task}

Your mission:
1. Review the current implementation (if it exists)
2. Identify technical debt, bugs, and anti-patterns
3. Flag security vulnerabilities and performance issues
4. Document breaking changes required
5. Assess test coverage and gaps

Output format:
- **Current State**: How it works today
- **Technical Debt**: What needs fixing
- **Risks**: Security, performance, reliability concerns
- **Test Coverage**: What is and is not tested
- **Breaking Changes**: Required API/behavior changes

Focus on depth. Be critical and specific.`,
    },
    {
      label: `${slug}-draft`,
      role: 'draft' as const,
      prompt: `You are the DRAFT worker for: ${task}

Your mission:
1. Generate 3 alternative implementation approaches
2. Rank options by: complexity, risk, maintainability, performance
3. Estimate effort and timeline for each
4. Identify dependencies and prerequisites
5. Recommend a preferred approach with justification

Output format:
- **Option A**: [Brief name]
  - Description, pros/cons, effort estimate, ranking
- **Option B**: [Brief name]
  - Description, pros/cons, effort estimate, ranking
- **Option C**: [Brief name]
  - Description, pros/cons, effort estimate, ranking
- **Recommendation**: Preferred option + rationale

Focus on creativity and trade-offs. Provide concrete implementation sketches.`,
    },
    {
      label: `${slug}-verify`,
      role: 'verify' as const,
      prompt: `You are the VERIFY worker for: ${task}

Your mission:
1. Cross-check for conflicts with other system components
2. Identify missing edge cases and error scenarios
3. Flag integration test requirements
4. Document migration/rollout steps
5. Assess rollback complexity

Output format:
- **Conflicts**: Integration issues with other components
- **Edge Cases**: Scenarios not covered by typical implementations
- **Testing Needs**: Unit, integration, e2e test requirements
- **Migration Plan**: Steps to roll out safely
- **Rollback Strategy**: How to revert if needed

Focus on risk mitigation. Be paranoid and thorough.`,
    },
  ];
}

/**
 * Spawn a worker subagent (simulated via process spawning or session API)
 * 
 * In a real implementation, this would call:
 *   await sessions_spawn({ label, prompt, background: true })
 * 
 * For this implementation, we'll simulate the interface.
 */
async function spawnWorker(config: WorkerConfig): Promise<string> {
  console.log(`[router] Spawning worker: ${config.label} (${config.role})`);
  
  // TODO: Replace with actual sessions_spawn API call
  // const session = await sessions_spawn({
  //   label: config.label,
  //   prompt: config.prompt,
  //   background: true,
  // });
  // return session.id;
  
  // Simulated session ID for now
  return `session-${config.label}-${Date.now()}`;
}

/**
 * Poll session status (simulated)
 * 
 * In a real implementation, this would call:
 *   await sessions_list({ label })
 */
async function getSessionStatus(sessionId: string, label: string): Promise<SessionStatus> {
  // TODO: Replace with actual sessions_list API call
  // const sessions = await sessions_list({ label });
  // const session = sessions.find(s => s.id === sessionId);
  // return {
  //   id: session.id,
  //   label: session.label,
  //   state: session.state,
  //   lastMessage: session.lastMessage,
  // };
  
  // Simulated status for now
  return {
    id: sessionId,
    label,
    state: 'completed',
    lastMessage: `Simulated output for ${label}`,
  };
}

/**
 * Wait for all workers to complete or timeout
 */
async function waitForWorkers(
  workers: Array<{ id: string; label: string; role: WorkerConfig['role'] }>,
  timeoutMs: number = WORKER_TIMEOUT_MS
): Promise<WorkerResult[]> {
  const startTime = Date.now();
  const results: WorkerResult[] = [];
  const pending = new Set(workers.map(w => w.id));
  
  console.log(`[router] Waiting for ${workers.length} workers to complete...`);
  
  while (pending.size > 0) {
    const elapsed = Date.now() - startTime;
    
    if (elapsed > timeoutMs) {
      console.warn(`[router] Timeout reached. ${pending.size} workers still pending.`);
      // Mark pending workers as timed out
      for (const id of pending) {
        const worker = workers.find(w => w.id === id)!;
        results.push({
          role: worker.role,
          label: worker.label,
          status: 'timeout',
          output: '',
        });
      }
      break;
    }
    
    // Poll each pending worker
    for (const id of Array.from(pending)) {
      const worker = workers.find(w => w.id === id)!;
      const status = await getSessionStatus(id, worker.label);
      
      if (status.state === 'completed') {
        console.log(`[router] ✓ ${worker.label} completed`);
        results.push({
          role: worker.role,
          label: worker.label,
          status: 'completed',
          output: status.lastMessage || '',
        });
        pending.delete(id);
      } else if (status.state === 'failed') {
        console.warn(`[router] ✗ ${worker.label} failed`);
        results.push({
          role: worker.role,
          label: worker.label,
          status: 'failed',
          output: status.lastMessage || '',
        });
        pending.delete(id);
      }
    }
    
    if (pending.size > 0) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
  
  return results;
}

/**
 * Main router function
 * 
 * Orchestrates the entire parallel subagent workflow:
 * 1. Parse task
 * 2. Spawn workers
 * 3. Track progress
 * 4. Synthesize results
 */
export async function routeUseSubagents(userRequest: string): Promise<string> {
  const task = extractTask(userRequest);
  console.log(`[router] Task: ${task}`);
  
  // Create worker configurations
  const configs = createWorkerConfigs(task);
  console.log(`[router] Created ${configs.length} worker configs`);
  
  // Spawn all workers concurrently
  console.log('[router] Spawning workers...');
  const workerPromises = configs.map(config => 
    spawnWorker(config).then(id => ({ id, label: config.label, role: config.role }))
  );
  const workers = await Promise.all(workerPromises);
  console.log(`[router] Spawned ${workers.length} workers`);
  
  // Wait for completion
  const results = await waitForWorkers(workers);
  
  // Synthesize outputs
  console.log('[router] Synthesizing results...');
  const synthesis = synthesizeWorkerOutputs(task, results);
  
  return synthesis;
}

/**
 * Check if the user request contains the trigger phrase
 */
export function shouldUseSubagents(request: string): boolean {
  return /\buse subagents?\b/i.test(request);
}
