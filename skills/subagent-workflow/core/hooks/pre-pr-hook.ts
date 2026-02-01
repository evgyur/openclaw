import type { HookPayload, HookContext } from 'clawdbot/plugin-sdk';
import type { TelemetryCollector } from '../telemetry';

export interface PrePRPayload extends HookPayload {
  prTitle: string;
  prDescription: string;
  branchName: string;
  filesChanged: string[];
  baseBranch: string;
}

export interface PrePROptions {
  telemetry: TelemetryCollector;
}

/**
 * Auto-trigger grill review before PR creation
 * 
 * This hook automatically runs the grill (code review) process
 * before allowing a PR to be created, catching issues early.
 */
export async function autoGrillHook(
  payload: PrePRPayload,
  options: PrePROptions
): Promise<{ proceed: boolean; reason?: string }> {
  const startTime = Date.now();
  
  try {
    // Skip auto-grill if explicitly disabled for this branch
    if (payload.branchName.includes('hotfix/') || payload.branchName.includes('emergency/')) {
      options.telemetry.recordEvent('pre_pr.skipped', { reason: 'hotfix_branch' });
      return { proceed: true, reason: 'Hotfix branch - skipping review' };
    }

    // Run grill on changed files
    const grillResult = await runGrillReview(payload.filesChanged, {
      autoFix: false,
      severity: 'warning'
    });

    const duration = Date.now() - startTime;
    
    options.telemetry.recordMetrics('review_time', duration, {
      file_count: payload.filesChanged.length,
      auto_triggered: true
    });

    if (grillResult.blockingIssues.length > 0) {
      options.telemetry.recordEvent('pre_pr.blocked', {
        issue_count: grillResult.blockingIssues.length
      });
      
      return {
        proceed: false,
        reason: `Grill found ${grillResult.blockingIssues.length} blocking issues. Run '/grill --fix' to auto-resolve.`
      };
    }

    options.telemetry.recordEvent('pre_pr.passed');
    return { proceed: true };

  } catch (error) {
    options.telemetry.recordError('pre_pr_hook', error);
    // Fail open - don't block PR creation if the hook itself fails
    return { proceed: true, reason: 'Grill check failed, proceeding with caution' };
  }
}

interface GrillResult {
  blockingIssues: Array<{ file: string; line: number; message: string }>;
  warnings: Array<{ file: string; line: number; message: string }>;
  suggestions: string[];
}

async function runGrillReview(
  files: string[],
  options: { autoFix: boolean; severity: string }
): Promise<GrillResult> {
  // This would integrate with the actual grill skill
  // Placeholder implementation
  return {
    blockingIssues: [],
    warnings: [],
    suggestions: []
  };
}
