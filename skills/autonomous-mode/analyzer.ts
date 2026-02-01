/**
 * Context Analyzer for Autonomous Coding Mode
 * 
 * Extracts signals from conversation, workspace state, and code structure
 * to build TaskContext for decision-making.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { TaskContext } from './decision.ts';

export interface AnalysisInput {
  userMessage: string;
  workingDirectory: string;
  conversationHistory?: string[];
  modelConfidence?: number; // Optional: from model's own assessment
}

/**
 * Risk patterns to detect in user messages and file operations
 */
const RISK_PATTERNS = {
  critical: [
    /\b(delete|drop|remove)\s+(database|table|all|production)/i,
    /\brm\s+-rf\s+\//,
    /\bsudo\s+rm/i,
    /\bdrop\s+table/i,
  ],
  high: [
    /\b(delete|remove)\s+/i,
    /\b(auth|authentication|password|secret|token|key)\b/i,
    /\b(payment|billing|charge|transaction)\b/i,
    /\bsudo\b/i,
    /\bcurl.*\|\s*(bash|sh)/i,
  ],
  medium: [
    /\b(refactor|migrate|update|modify)\b/i,
    /\bexternal\s+api/i,
    /\bnetwork\s+request/i,
  ],
};

/**
 * Operation type detection from user message
 */
const OPERATION_PATTERNS: Record<string, RegExp[]> = {
  refactor: [
    /\brefactor/i,
    /\brestructure/i,
    /\breorganize/i,
    /\bclean\s+up/i,
  ],
  implement: [
    /\bimplement/i,
    /\badd\s+(feature|functionality)/i,
    /\bcreate\s+(new|a)/i,
    /\bbuild/i,
  ],
  fix: [
    /\bfix/i,
    /\bresolve/i,
    /\bdebug/i,
    /\bpatch/i,
  ],
  delete: [
    /\bdelete/i,
    /\bremove/i,
    /\bdrop/i,
  ],
  deploy: [
    /\bdeploy/i,
    /\brelease/i,
    /\bpublish/i,
    /\bship/i,
  ],
};

/**
 * Detect operation type from user message
 */
export function detectOperation(message: string): TaskContext['operation'] {
  for (const [operation, patterns] of Object.entries(OPERATION_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(message))) {
      return operation as TaskContext['operation'];
    }
  }
  return 'other';
}

/**
 * Detect risk level from message content and patterns
 */
export function detectRiskLevel(message: string, patterns: string[]): TaskContext['riskLevel'] {
  // Check critical patterns first
  for (const pattern of RISK_PATTERNS.critical) {
    if (pattern.test(message)) {
      return 'critical';
    }
  }

  // Check high-risk patterns
  for (const pattern of RISK_PATTERNS.high) {
    if (pattern.test(message)) {
      return 'high';
    }
  }

  // Check medium patterns
  for (const pattern of RISK_PATTERNS.medium) {
    if (pattern.test(message)) {
      return 'medium';
    }
  }

  // Check detected patterns
  if (patterns.some(p => ['delete', 'drop', 'auth', 'payment'].includes(p.toLowerCase()))) {
    return 'high';
  }

  return 'low';
}

/**
 * Extract risk patterns from message
 */
export function extractPatterns(message: string): string[] {
  const patterns: string[] = [];
  const lowerMessage = message.toLowerCase();

  const keywords = [
    'delete', 'drop', 'remove', 'rm', 'sudo',
    'auth', 'authentication', 'password', 'secret', 'token',
    'payment', 'billing', 'charge',
    'external', 'api', 'network',
    'database', 'table', 'production',
  ];

  for (const keyword of keywords) {
    if (lowerMessage.includes(keyword)) {
      patterns.push(keyword);
    }
  }

  return patterns;
}

/**
 * Analyze git diff to count changed files and estimate complexity
 */
export function analyzeGitDiff(workingDirectory: string): {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  complexity: number;
} {
  try {
    // Check if we're in a git repo
    execSync('git rev-parse --git-dir', {
      cwd: workingDirectory,
      stdio: 'ignore',
    });

    // Get diff stats
    const diffStat = execSync('git diff --numstat HEAD 2>/dev/null || git diff --numstat --cached 2>/dev/null || echo ""', {
      cwd: workingDirectory,
      encoding: 'utf-8',
    }).trim();

    if (!diffStat) {
      return { filesChanged: 0, linesAdded: 0, linesRemoved: 0, complexity: 0 };
    }

    const lines = diffStat.split('\n').filter(Boolean);
    let filesChanged = 0;
    let linesAdded = 0;
    let linesRemoved = 0;

    for (const line of lines) {
      const [added, removed] = line.split('\t');
      if (added !== '-' && removed !== '-') {
        filesChanged++;
        linesAdded += parseInt(added, 10) || 0;
        linesRemoved += parseInt(removed, 10) || 0;
      }
    }

    // Complexity heuristic: weighted sum of changes
    // More weight on deletions (riskier) and number of files
    const complexity = Math.min(10, Math.floor(
      (linesAdded * 0.005) +
      (linesRemoved * 0.01) +
      (filesChanged * 0.5)
    ));

    return { filesChanged, linesAdded, linesRemoved, complexity };
  } catch (error) {
    // Not a git repo or error reading diff
    return { filesChanged: 0, linesAdded: 0, linesRemoved: 0, complexity: 0 };
  }
}

/**
 * Detect scope violations (accessing system paths, credentials, etc.)
 */
export function detectScopeViolations(message: string, workingDirectory: string): TaskContext['scope'] {
  const scope = {
    outsideWorkspace: false,
    systemPaths: false,
    credentials: false,
  };

  // Check for system paths in message
  const systemPathPatterns = [
    /\/etc\//,
    /\/var\//,
    /\/usr\//,
    /\/sys\//,
    /\/proc\//,
    /\/root\//,
  ];

  for (const pattern of systemPathPatterns) {
    if (pattern.test(message)) {
      scope.systemPaths = true;
      break;
    }
  }

  // Check for credential paths
  const credentialPatterns = [
    /\.ssh\//,
    /\.aws\//,
    /\.env/,
    /\.npmrc/,
    /credentials/i,
    /secrets?/i,
    /password/i,
  ];

  for (const pattern of credentialPatterns) {
    if (pattern.test(message)) {
      scope.credentials = true;
      break;
    }
  }

  // Check for paths outside workspace
  if (message.includes('~/') || message.includes('../')) {
    scope.outsideWorkspace = true;
  }

  return scope;
}

/**
 * Estimate code complexity from file structure
 * (Called when analyzing specific files mentioned in the task)
 */
export function estimateCodeComplexity(filePaths: string[], workingDirectory: string): number {
  let totalComplexity = 0;

  for (const filePath of filePaths) {
    const fullPath = join(workingDirectory, filePath);
    
    if (!existsSync(fullPath)) {
      continue;
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      // Complexity indicators
      let complexity = 0;
      
      // Line count contributes
      complexity += Math.min(5, lines.length / 200);
      
      // Nesting depth (simplified - count indentation)
      let maxIndent = 0;
      for (const line of lines) {
        const indent = line.search(/\S/);
        if (indent > maxIndent) maxIndent = indent;
      }
      complexity += Math.min(3, maxIndent / 8);
      
      // Keywords suggesting complexity
      const complexKeywords = [
        'async', 'await', 'Promise', 'callback',
        'class', 'extends', 'implements',
        'try', 'catch', 'throw',
        'recursive', 'mutex', 'lock',
      ];
      
      for (const keyword of complexKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        const matches = content.match(regex);
        if (matches) {
          complexity += Math.min(2, matches.length * 0.1);
        }
      }
      
      totalComplexity += complexity;
    } catch (error) {
      // Skip files we can't read
      continue;
    }
  }

  return Math.min(10, Math.round(totalComplexity / Math.max(1, filePaths.length)));
}

/**
 * Main analysis function - builds TaskContext from input
 */
export function analyzeContext(input: AnalysisInput): TaskContext {
  const { userMessage, workingDirectory, modelConfidence = 0.8 } = input;

  // Detect operation type
  const operation = detectOperation(userMessage);

  // Extract risk patterns
  const patterns = extractPatterns(userMessage);

  // Detect risk level
  const riskLevel = detectRiskLevel(userMessage, patterns);

  // Detect scope violations
  const scope = detectScopeViolations(userMessage, workingDirectory);

  // Analyze git changes if available
  const gitAnalysis = analyzeGitDiff(workingDirectory);

  // Start with git-based complexity, or estimate from message
  let complexity = gitAnalysis.complexity;
  
  // If no git changes, estimate from message content
  if (complexity === 0) {
    // Simple heuristic based on message length and keywords
    const messageWords = userMessage.split(/\s+/).length;
    complexity = Math.min(10, Math.floor(
      (messageWords / 20) +
      (patterns.length * 0.5) +
      (operation === 'refactor' ? 2 : 0) +
      (operation === 'implement' ? 1 : 0)
    ));
  }

  return {
    complexity,
    impactFiles: gitAnalysis.filesChanged,
    uncertainty: 1 - modelConfidence, // Convert confidence to uncertainty
    riskLevel,
    operation,
    patterns,
    scope,
  };
}
