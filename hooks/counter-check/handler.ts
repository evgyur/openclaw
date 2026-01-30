import * as fs from 'fs';
import * as path from 'path';

interface HookEvent {
  type: string;
  action: string;
  sessionKey: string;
  timestamp: Date;
  messages: string[];
  context: {
    workspaceDir?: string;
    bootstrapFiles?: Array<{
      name: string;
      content: string;
      truncated?: boolean;
    }>;
    cfg?: unknown;
  };
}

type HookHandler = (event: HookEvent) => Promise<void> | void;

interface MissEntry {
  id: string;
  tag: string;
  miss: string;
  logged: string;
}

function parseLearningsFile(content: string): MissEntry[] {
  const entries: MissEntry[] = [];
  const entryRegex = /## \[(LRN-\d{8}-\w+)\] (\w+)\n\n\*\*Logged\*\*: ([^\n]+)\n\*\*Tag\*\*: ([^\n]+)\n\*\*Status\*\*: ([^\n]+)\n\n### MISS\n([^#]+)/g;
  
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    const status = match[5].trim();
    if (status === 'pending') {
      entries.push({
        id: match[1],
        tag: match[4].trim(),
        miss: match[6].trim().substring(0, 200),
        logged: match[3].trim()
      });
    }
  }
  
  return entries;
}

function getRecentEntries(entries: MissEntry[], days: number = 7): MissEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return entries.filter(entry => {
    const entryDate = new Date(entry.logged);
    return entryDate >= cutoff;
  });
}

const handler: HookHandler = async (event) => {
  if (event.type !== 'agent' || event.action !== 'bootstrap') {
    return;
  }

  const workspaceDir = event.context.workspaceDir;
  if (!workspaceDir) {
    return;
  }

  const learningsPath = path.join(workspaceDir, '.learnings', 'LEARNINGS.md');
  const memoryLearningsPath = path.join(workspaceDir, 'memory', 'learnings.md');
  
  // Sync .learnings/LEARNINGS.md to memory/learnings.md for indexing
  if (fs.existsSync(learningsPath)) {
    const learningsContent = fs.readFileSync(learningsPath, 'utf-8');
    const memoryDir = path.dirname(memoryLearningsPath);
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    fs.writeFileSync(memoryLearningsPath, learningsContent, 'utf-8');
  }
  
  if (!fs.existsSync(learningsPath)) {
    return;
  }

  const content = fs.readFileSync(learningsPath, 'utf-8');
  const allEntries = parseLearningsFile(content);
  const recentEntries = getRecentEntries(allEntries, 7);

  if (recentEntries.length === 0) {
    return;
  }

  const tagCounts: Record<string, number> = {};
  for (const entry of recentEntries) {
    tagCounts[entry.tag] = (tagCounts[entry.tag] || 0) + 1;
  }
  
  const topTag = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const advisory = `## Counter-Check Advisory (auto-injected)

⚠️ **${recentEntries.length} pending MISS entries** in last 7 days.

**Most common tag**: ${topTag ? `${topTag[0]} (${topTag[1]}x)` : 'none'}

**Recent patterns to watch**:
${recentEntries.slice(0, 3).map(e => `- [${e.tag}] ${e.miss.substring(0, 100)}...`).join('\n')}

Before proceeding with complex tasks, consider if current work overlaps with these patterns.
`;

  if (event.context.bootstrapFiles) {
    event.context.bootstrapFiles.push({
      name: 'COUNTER_CHECK.md',
      content: advisory,
      truncated: false
    });
  }
};

export default handler;
