import { describe, test, expect, beforeEach } from 'vitest';
import { parseDiff, mockRepoStates, getChangedFiles, countChanges } from '../mocks/mock-git';

/**
 * Grill - Code Review Unit Tests
 * 
 * Tests the code review system:
 * - Git diff parsing
 * - Issue categorization (MUST_FIX vs NIT)
 * - Approval blocking with pending MUST_FIX
 */

// Simulated grill review result
interface ReviewIssue {
  severity: 'MUST_FIX' | 'SHOULD_FIX' | 'NICE_TO_HAVE';
  file: string;
  line?: number;
  message: string;
  rule: string;
}

interface GrillReview {
  approved: boolean;
  verdict: 'APPROVED' | 'BLOCKED' | 'WARNED';
  mustFix: ReviewIssue[];
  shouldFix: ReviewIssue[];
  niceToHave: ReviewIssue[];
  summary: string;
}

/**
 * Simulated grill logic - categorizes issues from code analysis
 */
function analyzeDiff(diff: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const lines = diff.split('\n');
  let currentFile = '';

  for (const line of lines) {
    // Track current file
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
      continue;
    }

    // SQL injection detection
    if (line.includes('\\`${') && line.toLowerCase().includes('select')) {
      issues.push({
        severity: 'MUST_FIX',
        file: currentFile,
        message: 'SQL injection vulnerability: template literal in query',
        rule: 'security/sql-injection',
      });
    }

    // Missing tests detection
    if (currentFile.includes('.ts') && !currentFile.includes('.test.') && 
        currentFile !== '/dev/null' && line.startsWith('+') && line.includes('function')) {
      // Check if file has corresponding test
      if (!diff.includes('.test.ts')) {
        issues.push({
          severity: 'MUST_FIX',
          file: currentFile,
          message: 'New function lacks test coverage',
          rule: 'testing/missing-tests',
        });
      }
    }

    // Non-null assertion check
    if (line.includes('process.env.') && line.includes('!')) {
      issues.push({
        severity: 'SHOULD_FIX',
        file: currentFile,
        message: 'Environment variable accessed with non-null assertion',
        rule: 'code-quality/env-null-assertion',
      });
    }

    // Hardcoded secret
    if (/password\s*=\s*["']/.test(line) || /secret\s*=\s*["']/.test(line)) {
      issues.push({
        severity: 'MUST_FIX',
        file: currentFile,
        message: 'Potential hardcoded credential',
        rule: 'security/hardcoded-secret',
      });
    }

    // TODO comment
    if (line.includes('TODO') || line.includes('FIXME')) {
      issues.push({
        severity: 'NICE_TO_HAVE',
        file: currentFile,
        message: 'Outstanding TODO item',
        rule: 'code-quality/todo',
      });
    }
  }

  return issues;
}

/**
 * Apply grill review rules to determine approval
 */
function applyGrillGate(issues: ReviewIssue[], mode: 'strict' | 'balanced' | 'permissive'): GrillReview {
  const mustFix = issues.filter(i => i.severity === 'MUST_FIX');
  const shouldFix = issues.filter(i => i.severity === 'SHOULD_FIX');
  const niceToHave = issues.filter(i => i.severity === 'NICE_TO_HAVE');

  // Strict mode: block on SHOULD_FIX
  if (mode === 'strict' && (mustFix.length > 0 || shouldFix.length > 0)) {
    return {
      approved: false,
      verdict: 'BLOCKED',
      mustFix,
      shouldFix,
      niceToHave,
      summary: `Review blocked: ${mustFix.length} MUST_FIX, ${shouldFix.length} SHOULD_FIX`,
    };
  }

  // Balanced mode: block only on MUST_FIX
  if (mode === 'balanced' && mustFix.length > 0) {
    return {
      approved: false,
      verdict: 'BLOCKED',
      mustFix,
      shouldFix,
      niceToHave,
      summary: `Review blocked: ${mustFix.length} MUST_FIX issues`,
    };
  }

  // Permissive mode: warn on MUST_FIX but don't block
  if (mode === 'permissive' && mustFix.length > 0) {
    return {
      approved: true,
      verdict: 'WARNED',
      mustFix,
      shouldFix,
      niceToHave,
      summary: `Review warned: ${mustFix.length} MUST_FIX (permissive mode)`,
    };
  }

  // Clean approval
  return {
    approved: true,
    verdict: 'APPROVED',
    mustFix,
    shouldFix,
    niceToHave,
    summary: 'All clear - no blocking issues',
  };
}

describe('grill - Git Diff Parsing', () => {
  test('parses simple diff correctly', () => {
    const diff = parseDiff(mockRepoStates.simpleChange.diff);
    
    expect(diff).toHaveLength(1);
    expect(diff[0].file).toBe('src/auth.ts');
    expect(diff[0].hunks).toHaveLength(1);
    expect(diff[0].hunks[0].lines).toContainEqual({
      type: 'remove',
      content: '  return validateToken(token);',
    });
    expect(diff[0].hunks[0].lines).toContainEqual({
      type: 'add',
      content: '  return await validateToken(token);',
    });
  });

  test('parses multi-file diff correctly', () => {
    const diff = parseDiff(mockRepoStates.complexRefactor.diff);
    
    expect(diff).toHaveLength(2);
    expect(diff[0].file).toBe('src/auth/jwt.ts');
    expect(diff[1].file).toBe('src/auth/types.ts');
  });

  test('handles empty diff', () => {
    const diff = parseDiff('');
    expect(diff).toHaveLength(0);
  });

  test('extracts changed files', () => {
    const diff = mockRepoStates.complexRefactor.diff;
    const files = getChangedFiles(diff);
    
    expect(files).toContain('src/auth/jwt.ts');
    expect(files).toContain('src/auth/types.ts');
  });

  test('counts added and removed lines', () => {
    const diff = mockRepoStates.simpleChange.diff;
    const counts = countChanges(diff);
    
    expect(counts.added).toBeGreaterThan(0);
    expect(counts.removed).toBeGreaterThan(0);
  });
});

describe('grill - Issue Categorization', () => {
  test('categorizes SQL injection as MUST_FIX', () => {
    const diff = mockRepoStates.securityIssue.diff;
    const issues = analyzeDiff(diff);
    
    const sqlInjection = issues.find(i => i.rule === 'security/sql-injection');
    expect(sqlInjection).toBeDefined();
    expect(sqlInjection?.severity).toBe('MUST_FIX');
  });

  test('categorizes missing tests as MUST_FIX', () => {
    const diff = mockRepoStates.missingTests.diff;
    const issues = analyzeDiff(diff);
    
    const missingTests = issues.find(i => i.rule === 'testing/missing-tests');
    expect(missingTests).toBeDefined();
    expect(missingTests?.severity).toBe('MUST_FIX');
  });

  test('categorizes env assertions as SHOULD_FIX', () => {
    const diff = mockRepoStates.simpleChange.diff;
    // Add an env assertion
    const modifiedDiff = diff + '\n+const secret = process.env.SECRET!;';
    const issues = analyzeDiff(modifiedDiff);
    
    const envIssue = issues.find(i => i.rule === 'code-quality/env-null-assertion');
    expect(envIssue?.severity).toBe('SHOULD_FIX');
  });

  test('categorizes TODO as NICE_TO_HAVE', () => {
    const diff = `diff --git a/src/test.ts b/src/test.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/test.ts
@@ -0,0 +1,3 @@
+function foo() {
+  // TODO: implement
+}`;
    const issues = analyzeDiff(diff);
    
    const todo = issues.find(i => i.rule === 'code-quality/todo');
    expect(todo?.severity).toBe('NICE_TO_HAVE');
  });

  test('categorizes hardcoded secrets as MUST_FIX', () => {
    const diff = `diff --git a/src/config.ts b/src/config.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/config.ts
@@ -0,0 +1,2 @@
+const password = "supersecret123";
+const secret = "abc123xyz";`;
    const issues = analyzeDiff(diff);
    
    const secrets = issues.filter(i => i.rule === 'security/hardcoded-secret');
    expect(secrets.length).toBe(2);
    expect(secrets[0].severity).toBe('MUST_FIX');
  });
});

describe('grill - Approval Gate', () => {
  let issues: ReviewIssue[] = [];

  beforeEach(() => {
    issues = [
      { severity: 'MUST_FIX', file: 'src/test.ts', message: 'Critical issue', rule: 'security/critical' },
      { severity: 'SHOULD_FIX', file: 'src/test.ts', message: 'Minor issue', rule: 'code-quality/minor' },
      { severity: 'NICE_TO_HAVE', file: 'src/test.ts', message: 'Nice to have', rule: 'style/nice' },
    ];
  });

  test('blocks approval with MUST_FIX in balanced mode', () => {
    const review = applyGrillGate(issues, 'balanced');
    
    expect(review.approved).toBe(false);
    expect(review.verdict).toBe('BLOCKED');
    expect(review.mustFix.length).toBe(1);
  });

  test('blocks approval with MUST_FIX in strict mode', () => {
    const review = applyGrillGate(issues, 'strict');
    
    expect(review.approved).toBe(false);
    expect(review.verdict).toBe('BLOCKED');
    expect(review.shouldFix.length).toBe(1);
  });

  test('warns but approves in permissive mode', () => {
    const review = applyGrillGate(issues, 'permissive');
    
    expect(review.approved).toBe(true);
    expect(review.verdict).toBe('WARNED');
  });

  test('approves clean code', () => {
    const review = applyGrillGate([], 'balanced');
    
    expect(review.approved).toBe(true);
    expect(review.verdict).toBe('APPROVED');
    expect(review.summary).toContain('no blocking');
  });

  test('strict mode blocks on SHOULD_FIX alone', () => {
    const onlyShouldFix = [issues[1]]; // SHOULD_FIX only
    const review = applyGrillGate(onlyShouldFix, 'strict');
    
    expect(review.approved).toBe(false);
    expect(review.verdict).toBe('BLOCKED');
  });

  test('balanced mode approves with SHOULD_FIX only', () => {
    const onlyShouldFix = [issues[1]];
    const review = applyGrillGate(onlyShouldFix, 'balanced');
    
    expect(review.approved).toBe(true);
    expect(review.verdict).toBe('APPROVED');
  });
});

describe('grill - End-to-End Review', () => {
  test('full workflow: security issue detected and blocked', () => {
    const diff = mockRepoStates.securityIssue.diff;
    const parsed = parseDiff(diff);
    const issues = analyzeDiff(diff);
    const review = applyGrillGate(issues, 'balanced');
    
    expect(parsed.length).toBeGreaterThan(0);
    expect(review.approved).toBe(false);
    expect(review.mustFix.length).toBeGreaterThan(0);
  });

  test('full workflow: production ready code approved', () => {
    const diff = mockRepoStates.productionReady.diff;
    const parsed = parseDiff(diff);
    const issues = analyzeDiff(diff);
    const review = applyGrillGate(issues, 'balanced');
    
    expect(parsed.length).toBe(2); // server.ts and test file
    expect(review.approved).toBe(true);
    expect(review.mustFix).toHaveLength(0);
  });

  test('real diff analysis finds missing tests', () => {
    const diff = mockRepoStates.missingTests.diff;
    const review = applyGrillGate(analyzeDiff(diff), 'balanced');
    
    expect(review.mustFix).toContainEqual(
      expect.objectContaining({ rule: 'testing/missing-tests' })
    );
  });
});
