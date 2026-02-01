/**
 * use-subagents synthesizer
 * 
 * Merges parallel worker outputs into a coherent plan with conflict resolution.
 */

export interface WorkerResult {
  role: 'research' | 'audit' | 'draft' | 'verify';
  label: string;
  status: 'completed' | 'failed' | 'timeout';
  output: string;
}

interface ConflictDetection {
  hasConflicts: boolean;
  conflicts: string[];
}

/**
 * Detect contradictions between research and audit findings
 */
function detectConflicts(
  researchOutput: string,
  auditOutput: string
): ConflictDetection {
  const conflicts: string[] = [];
  
  // Simple keyword-based conflict detection
  // In a real implementation, this could use LLM-based semantic analysis
  
  const researchKeywords = extractKeywords(researchOutput);
  const auditKeywords = extractKeywords(auditOutput);
  
  // Look for contradictory sentiment
  const researchPositive = /best practice|recommended|efficient|optimal/gi.test(researchOutput);
  const auditNegative = /technical debt|bug|vulnerability|anti-pattern/gi.test(auditOutput);
  
  if (researchPositive && auditNegative) {
    conflicts.push(
      'Research identifies current approach as best practice, but Audit flags it as problematic'
    );
  }
  
  // Look for missing mentions
  const researchMentionsTests = /test|coverage|spec/gi.test(researchOutput);
  const auditMentionsGaps = /test coverage|gap|missing test/gi.test(auditOutput);
  
  if (!researchMentionsTests && auditMentionsGaps) {
    conflicts.push(
      'Research did not highlight testing concerns, but Audit found test coverage gaps'
    );
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Extract key terms from text (simple implementation)
 */
function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .match(/\b[a-z]{4,}\b/g) || [];
  
  return new Set(words);
}

/**
 * Rank draft options based on verify criteria
 */
function rankDraftOptions(
  draftOutput: string,
  verifyOutput: string
): { rankings: string[]; rationale: string } {
  const rankings: string[] = [];
  const rationale: string[] = [];
  
  // Extract option labels from draft output
  const optionMatches = draftOutput.matchAll(/\*\*Option ([A-C])\*\*/gi);
  const options = Array.from(optionMatches).map(m => m[1].toUpperCase());
  
  // Simple heuristic: prefer options mentioned positively in verify output
  for (const option of options) {
    const optionRegex = new RegExp(`option ${option}`, 'gi');
    const mentionedInVerify = optionRegex.test(verifyOutput);
    
    if (mentionedInVerify) {
      const isRisky = /risk|conflict|complex|difficult/gi.test(
        verifyOutput.split(new RegExp(`option ${option}`, 'i'))[1]?.substring(0, 200) || ''
      );
      
      if (isRisky) {
        rankings.push(`Option ${option} (⚠️ verification concerns)`);
        rationale.push(`Option ${option}: Verify worker flagged potential risks`);
      } else {
        rankings.unshift(`Option ${option} (✓ verified)`);
        rationale.push(`Option ${option}: Passed verification checks`);
      }
    } else {
      rankings.push(`Option ${option}`);
    }
  }
  
  return {
    rankings: rankings.length > 0 ? rankings : ['No clear ranking available'],
    rationale: rationale.join('; '),
  };
}

/**
 * Format worker output section
 */
function formatWorkerSection(
  role: string,
  status: WorkerResult['status'],
  output: string
): string {
  const icon = status === 'completed' ? '✓' : status === 'failed' ? '✗' : '⏱';
  const statusText = status === 'completed' ? 'Completed' : status === 'failed' ? 'Failed' : 'Timeout';
  
  if (status !== 'completed') {
    return `### ${icon} ${role.toUpperCase()} (${statusText})\n\n_Worker did not complete successfully._\n`;
  }
  
  return `### ${icon} ${role.toUpperCase()}\n\n${output}\n`;
}

/**
 * Generate conflict warnings
 */
function formatConflicts(conflicts: string[]): string {
  if (conflicts.length === 0) {
    return '';
  }
  
  const warnings = conflicts.map(c => `- ⚠️ ${c}`).join('\n');
  
  return `## ⚠️ Conflicts Detected\n\n${warnings}\n\n`;
}

/**
 * Generate synthesis summary
 */
function generateSummary(
  task: string,
  results: WorkerResult[],
  conflicts: ConflictDetection,
  rankings: { rankings: string[]; rationale: string }
): string {
  const completed = results.filter(r => r.status === 'completed').length;
  const total = results.length;
  
  const draftResult = results.find(r => r.role === 'draft');
  const recommendationMatch = draftResult?.output.match(/\*\*Recommendation\*\*:?\s*(.+)/i);
  const recommendation = recommendationMatch?.[1] || 'See draft options below';
  
  let summary = `## Synthesis: ${task}\n\n`;
  summary += `**Parallel Analysis Complete** (${completed}/${total} workers)\n\n`;
  
  if (conflicts.hasConflicts) {
    summary += `⚠️ **Conflicts Found**: Review warnings below\n\n`;
  }
  
  summary += `**Recommended Path**: ${recommendation}\n\n`;
  
  if (rankings.rankings.length > 0 && rankings.rankings[0] !== 'No clear ranking available') {
    summary += `**Verified Ranking**:\n`;
    rankings.rankings.forEach((rank, i) => {
      summary += `${i + 1}. ${rank}\n`;
    });
    summary += `\n`;
  }
  
  return summary;
}

/**
 * Main synthesis function
 * 
 * Merges worker outputs into a coherent plan with conflict resolution
 */
export function synthesizeWorkerOutputs(
  task: string,
  results: WorkerResult[]
): string {
  console.log('[synthesizer] Processing worker results...');
  
  // Extract outputs by role
  const research = results.find(r => r.role === 'research');
  const audit = results.find(r => r.role === 'audit');
  const draft = results.find(r => r.role === 'draft');
  const verify = results.find(r => r.role === 'verify');
  
  // Detect conflicts
  const conflicts = detectConflicts(
    research?.output || '',
    audit?.output || ''
  );
  
  // Rank options
  const rankings = rankDraftOptions(
    draft?.output || '',
    verify?.output || ''
  );
  
  // Generate synthesis report
  let synthesis = '';
  
  // Summary
  synthesis += generateSummary(task, results, conflicts, rankings);
  
  // Conflicts section
  if (conflicts.hasConflicts) {
    synthesis += formatConflicts(conflicts.conflicts);
  }
  
  // Worker outputs
  synthesis += '## Worker Outputs\n\n';
  
  if (research) {
    synthesis += formatWorkerSection('Research', research.status, research.output);
  }
  
  if (audit) {
    synthesis += formatWorkerSection('Audit', audit.status, audit.output);
  }
  
  if (draft) {
    synthesis += formatWorkerSection('Draft', draft.status, draft.output);
  }
  
  if (verify) {
    synthesis += formatWorkerSection('Verify', verify.status, verify.output);
  }
  
  // Ranking rationale
  if (rankings.rationale) {
    synthesis += `## Verification Insights\n\n${rankings.rationale}\n\n`;
  }
  
  // Next steps
  synthesis += `## Next Steps\n\n`;
  synthesis += `1. Review conflict warnings and resolve inconsistencies\n`;
  synthesis += `2. Select an implementation option from the ranked drafts\n`;
  synthesis += `3. Address verification concerns (edge cases, testing, migration)\n`;
  synthesis += `4. Proceed with implementation\n`;
  
  return synthesis;
}
