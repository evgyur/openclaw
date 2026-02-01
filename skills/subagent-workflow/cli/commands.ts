/**
 * CLI command registration for subagent workflow skills
 * Integrates with Clawdbot CLI program
 */

import { Command } from 'commander';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface GrillOptions {
  strict?: boolean;
  focus?: 'security' | 'performance' | 'api';
  quick?: boolean;
}

interface SubagentsOptions {
  count?: string;
  labels?: string;
}

interface GuardStatusOptions {
  tail?: string;
}

/**
 * Run pre-PR code review with critic subagent
 */
async function grillCommand(branch?: string, options: GrillOptions = {}) {
  const { strict, focus, quick } = options;
  
  console.log('🔥 Grilling your code...');
  
  // Determine target branch
  const targetBranch = branch || 'main';
  
  // Build agent message
  const parts = ['Review changes in this branch for PR readiness.'];
  
  if (focus) {
    parts.push(`Focus on ${focus} issues.`);
  }
  
  if (strict) {
    parts.push('Use strict mode - fail on CONSIDER items.');
  }
  
  if (quick) {
    parts.push('Quick review only - focus on critical issues.');
  }
  
  const message = parts.join(' ');
  
  try {
    // Spawn critic subagent
    const { stdout, stderr } = await execAsync(
      `openclaw agent spawn --label=critic --message="${message}" --context="git diff ${targetBranch}...HEAD"`
    );
    
    console.log(stdout);
    
    if (stderr) {
      console.error(stderr);
    }
    
    // Parse output for MUST_FIX items if in strict mode
    if (strict && stdout.includes('CONSIDER:')) {
      console.error('\n❌ Review found CONSIDER items in strict mode');
      process.exit(1);
    }
    
    console.log('\n✅ Grill complete');
  } catch (error) {
    console.error('Failed to run grill:', error);
    process.exit(1);
  }
}

/**
 * Parallelize task across worker subagents
 */
async function subagentsCommand(task: string, options: SubagentsOptions = {}) {
  const count = parseInt(options.count || '4', 10);
  const labels = options.labels?.split(',') || [];
  
  console.log(`🔧 Spawning ${count} worker subagents for: ${task}`);
  
  // Generate worker labels
  const workerLabels = labels.length > 0 
    ? labels 
    : Array.from({ length: count }, (_, i) => `worker-${i + 1}`);
  
  try {
    // Spawn workers in parallel
    const spawns = workerLabels.slice(0, count).map((label, i) => {
      const workerTask = `${task} (partition ${i + 1}/${count})`;
      return execAsync(
        `openclaw agent spawn --label="${label}" --message="${workerTask}"`
      );
    });
    
    const results = await Promise.allSettled(spawns);
    
    // Report results
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`\n✅ ${succeeded} workers completed`);
    
    if (failed > 0) {
      console.error(`❌ ${failed} workers failed`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to spawn subagents:', error);
    process.exit(1);
  }
}

/**
 * Show opus-guard security log
 */
async function guardStatusCommand(options: GuardStatusOptions = {}) {
  const tail = options.tail ? parseInt(options.tail, 10) : undefined;
  
  console.log('🛡️  Opus Guard Status\n');
  
  try {
    // Read guard log from agent session
    const guardLogPath = path.join(
      process.env.HOME || '~',
      '.clawdbot/agents/main/guard.log'
    );
    
    let content = await fs.readFile(guardLogPath, 'utf-8');
    const lines = content.trim().split('\n');
    
    // Apply tail filter
    const displayLines = tail ? lines.slice(-tail) : lines;
    
    console.log('Recent security decisions:\n');
    for (const line of displayLines) {
      try {
        const entry = JSON.parse(line);
        const timestamp = new Date(entry.timestamp).toLocaleString();
        const action = entry.allowed ? '✅ ALLOWED' : '🚫 DENIED';
        console.log(`[${timestamp}] ${action}: ${entry.action}`);
        if (entry.reason) {
          console.log(`  Reason: ${entry.reason}`);
        }
      } catch {
        console.log(line);
      }
    }
    
    console.log(`\nShowing ${displayLines.length} of ${lines.length} entries`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('No guard log found. Opus Guard may not be active.');
    } else {
      console.error('Failed to read guard log:', error);
      process.exit(1);
    }
  }
}

/**
 * Register all subagent workflow commands with the CLI program
 */
export function registerSubagentCommands(program: Command): void {
  // grill command
  program
    .command('grill [branch]')
    .description('Pre-PR code review with critic subagent')
    .option('-s, --strict', 'Fail on CONSIDER items')
    .option('-f, --focus <area>', 'Focus: security|performance|api')
    .option('-q, --quick', 'Quick review - critical issues only')
    .action(grillCommand);

  // subagents command
  program
    .command('subagents <task>')
    .description('Parallelize task across worker subagents')
    .option('-n, --count <n>', 'Number of workers', '4')
    .option('--labels <list>', 'Custom worker labels (comma-separated)')
    .action(subagentsCommand);

  // guard command group
  const guard = program
    .command('guard')
    .description('Opus Guard security controls');

  guard
    .command('status')
    .description('Show opus-guard security log')
    .option('--tail <n>', 'Show only the last N decisions')
    .action(guardStatusCommand);
}
