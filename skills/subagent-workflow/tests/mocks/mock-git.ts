/**
 * Mock git operations for testing code review workflows
 */

export interface GitDiff {
  file: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  lineNumber?: number;
}

/**
 * Parse git diff output into structured format
 */
export function parseDiff(diffText: string): GitDiff[] {
  const diffs: GitDiff[] = [];
  const lines = diffText.split('\n');
  
  let currentDiff: GitDiff | null = null;
  let currentHunk: DiffHunk | null = null;

  for (const line of lines) {
    // File header
    if (line.startsWith('diff --git')) {
      if (currentDiff && currentHunk) {
        currentDiff.hunks.push(currentHunk);
      }
      currentDiff = { file: '', hunks: [] };
      currentHunk = null;
      diffs.push(currentDiff);
      continue;
    }

    // File path
    if (line.startsWith('+++') && currentDiff) {
      currentDiff.file = line.slice(6); // Remove '+++ b/'
      continue;
    }

    // Hunk header
    if (line.startsWith('@@') && currentDiff) {
      if (currentHunk) {
        currentDiff.hunks.push(currentHunk);
      }
      
      const match = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
      if (match) {
        currentHunk = {
          oldStart: Number.parseInt(match[1]),
          oldLines: Number.parseInt(match[2]),
          newStart: Number.parseInt(match[3]),
          newLines: Number.parseInt(match[4]),
          lines: [],
        };
      }
      continue;
    }

    // Diff content
    if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({ type: 'add', content: line.slice(1) });
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({ type: 'remove', content: line.slice(1) });
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({ type: 'context', content: line.slice(1) });
      }
    }
  }

  // Push final hunk
  if (currentDiff && currentHunk) {
    currentDiff.hunks.push(currentHunk);
  }

  return diffs;
}

/**
 * Mock git repository states
 */
export const mockRepoStates = {
  clean: {
    diff: '',
    status: 'On branch main\nnothing to commit, working tree clean',
  },

  simpleChange: {
    diff: `diff --git a/src/auth.ts b/src/auth.ts
index 1234567..abcdefg 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,7 +10,7 @@ export function authenticate(token: string): User | null {
   if (!token) {
     return null;
   }
-  return validateToken(token);
+  return await validateToken(token);
 }`,
    status: 'On branch feature/async-auth\nModified: src/auth.ts',
  },

  securityIssue: {
    diff: `diff --git a/src/api/users.ts b/src/api/users.ts
index 2345678..bcdefgh 100644
--- a/src/api/users.ts
+++ b/src/api/users.ts
@@ -15,8 +15,10 @@ export async function getUser(req: Request): Promise<Response> {
   const userId = req.params.id;
-  const user = await db.query(\`SELECT * FROM users WHERE id = \${userId}\`);
+  const query = \`SELECT * FROM users WHERE id = \${userId}\`;
+  const user = await db.query(query);
   return { data: user };
 }`,
    status: 'On branch feature/user-api\nModified: src/api/users.ts',
  },

  missingTests: {
    diff: `diff --git a/src/payment.ts b/src/payment.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/payment.ts
@@ -0,0 +1,25 @@
+export async function processPayment(
+  amount: number,
+  currency: string,
+  customerId: string
+): Promise<PaymentResult> {
+  const stripe = getStripeClient();
+  
+  const charge = await stripe.charges.create({
+    amount: amount * 100,
+    currency,
+    customer: customerId,
+  });
+  
+  return {
+    success: charge.status === 'succeeded',
+    transactionId: charge.id,
+  };
+}`,
    status: 'On branch feature/payments\nNew file: src/payment.ts',
  },

  complexRefactor: {
    diff: `diff --git a/src/auth/jwt.ts b/src/auth/jwt.ts
index 3456789..cdefghi 100644
--- a/src/auth/jwt.ts
+++ b/src/auth/jwt.ts
@@ -1,15 +1,30 @@
-import jwt from 'jsonwebtoken';
+import { sign, verify } from 'jsonwebtoken';
+import { TokenPayload } from './types';
 
-export function createToken(userId: string): string {
-  return jwt.sign({ userId }, process.env.JWT_SECRET!);
+const SECRET = process.env.JWT_SECRET!;
+const EXPIRES_IN = '7d';
+
+export function createToken(payload: TokenPayload): string {
+  return sign(payload, SECRET, { expiresIn: EXPIRES_IN });
 }
 
-export function verifyToken(token: string): any {
-  return jwt.verify(token, process.env.JWT_SECRET!);
+export function verifyToken(token: string): TokenPayload | null {
+  try {
+    return verify(token, SECRET) as TokenPayload;
+  } catch {
+    return null;
+  }
+}
+
+export function refreshToken(oldToken: string): string | null {
+  const payload = verifyToken(oldToken);
+  if (!payload) return null;
+  
+  return createToken({ userId: payload.userId, role: payload.role });
 }
 
diff --git a/src/auth/types.ts b/src/auth/types.ts
new file mode 100644
index 0000000..9876543
--- /dev/null
+++ b/src/auth/types.ts
@@ -0,0 +1,5 @@
+export interface TokenPayload {
+  userId: string;
+  role: string;
+  iat?: number;
+  exp?: number;
+}`,
    status: 'On branch refactor/auth-module\nModified: src/auth/jwt.ts\nNew file: src/auth/types.ts',
  },

  productionReady: {
    diff: `diff --git a/src/server.ts b/src/server.ts
index 4567890..defghij 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -10,6 +10,11 @@ const app = express();
 app.use(express.json());
 app.use(cors());
+app.use(helmet());
+app.use(compression());
+app.use(rateLimit({
+  windowMs: 15 * 60 * 1000,
+  max: 100,
+}));
 
 app.get('/health', (req, res) => {
   res.json({ status: 'ok' });

diff --git a/test/integration/api.test.ts b/test/integration/api.test.ts
index 5678901..efghijk 100644
--- a/test/integration/api.test.ts
+++ b/test/integration/api.test.ts
@@ -15,4 +15,14 @@ describe('API Integration', () => {
     expect(response.status).toBe(200);
     expect(response.body).toHaveProperty('data');
   });
+
+  it('should enforce rate limiting', async () => {
+    const requests = Array(101).fill(null).map(() =>
+      request(app).get('/api/users')
+    );
+    
+    const responses = await Promise.all(requests);
+    const tooManyRequests = responses.filter(r => r.status === 429);
+    expect(tooManyRequests.length).toBeGreaterThan(0);
+  });
 });`,
    status: 'On branch feature/production-hardening\nModified: src/server.ts, test/integration/api.test.ts',
  },
};

/**
 * Mock git diff execution
 */
export async function mockGitDiff(scenario: keyof typeof mockRepoStates): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate I/O
  return mockRepoStates[scenario].diff;
}

/**
 * Mock git status
 */
export async function mockGitStatus(scenario: keyof typeof mockRepoStates): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 30));
  return mockRepoStates[scenario].status;
}

/**
 * Extract files changed from diff
 */
export function getChangedFiles(diff: string): string[] {
  const files: string[] = [];
  const lines = diff.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      files.push(line.slice(6));
    }
  }
  
  return files;
}

/**
 * Count lines added/removed
 */
export function countChanges(diff: string): { added: number; removed: number } {
  const lines = diff.split('\n');
  let added = 0;
  let removed = 0;
  
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removed++;
    }
  }
  
  return { added, removed };
}
