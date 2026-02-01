import type { CommandContext, CommandHandler } from 'clawdbot/plugin-sdk';
import type { TelemetryCollector } from '../telemetry';

export interface GrillOptions {
  autoFix?: boolean;
  severity?: 'error' | 'warning' | 'info';
  files?: string[];
}

export interface GrillHandlerOptions {
  telemetry: TelemetryCollector;
}

/**
 * Grill command handler - automated code review
 */
export const grillHandler: CommandHandler = async (
  context: CommandContext,
  options: GrillHandlerOptions
) => {
  const startTime = Date.now();
  const args = parseArguments(context.args);
  
  try {
    await context.reply('🔥 Starting grill review...');
    
    // Run the grill review
    const results = await runGrillReview({
      files: args.files,
      autoFix: args.autoFix,
      severity: args.severity
    });
    
    // Format results
    const report = formatGrillReport(results);
    await context.reply(report);
    
    // Record metrics
    const duration = Date.now() - startTime;
    options.telemetry.recordMetrics('review_time', duration, {
      file_count: results.filesScanned,
      issues_found: results.totalIssues,
      auto_fix: args.autoFix
    });
    
    // Record event
    options.telemetry.recordEvent('grill.completed', {
      issues_found: results.totalIssues,
      files_scanned: results.filesScanned,
      duration
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await context.reply(`❌ Grill review failed: ${errorMessage}`);
    
    options.telemetry.recordError('grill_handler', error);
  }
};

function parseArguments(args: string[]): GrillOptions {
  const options: GrillOptions = {
    autoFix: false,
    severity: 'warning',
    files: []
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--fix':
      case '-f':
        options.autoFix = true;
        break;
      case '--severity':
        options.severity = args[++i] as GrillOptions['severity'];
        break;
      case '--files':
        options.files = args[++i].split(',');
        break;
      default:
        if (!arg.startsWith('-')) {
          options.files.push(arg);
        }
    }
  }
  
  return options;
}

interface GrillResults {
  filesScanned: number;
  totalIssues: number;
  blockingIssues: number;
  warnings: number;
  info: number;
  issuesByFile: Record<string, Array<{
    line: number;
    severity: string;
    message: string;
  }>>;
  autoFixesApplied: number;
}

async function runGrillReview(options: GrillOptions): Promise<GrillResults> {
  // This would integrate with the actual grill skill
  // Placeholder implementation
  return {
    filesScanned: options.files.length || 1,
    totalIssues: 0,
    blockingIssues: 0,
    warnings: 0,
    info: 0,
    issuesByFile: {},
    autoFixesApplied: options.autoFix ? 0 : 0
  };
}

function formatGrillReport(results: GrillResults): string {
  const lines = [
    '🔥 Grill Review Report',
    '=====================',
    `Files scanned: ${results.filesScanned}`,
    `Total issues: ${results.totalIssues}`,
    `  • Blocking: ${results.blockingIssues}`,
    `  • Warnings: ${results.warnings}`,
    `  • Info: ${results.info}`,
  ];
  
  if (results.autoFixesApplied > 0) {
    lines.push(`Auto-fixes applied: ${results.autoFixesApplied}`);
  }
  
  if (results.totalIssues === 0) {
    lines.push('', '✅ No issues found! Code looks good.');
  } else {
    lines.push('', 'Issues by file:');
    for (const [file, issues] of Object.entries(results.issuesByFile)) {
      lines.push(`  ${file}:`);
      for (const issue of issues) {
        lines.push(`    Line ${issue.line}: [${issue.severity.toUpperCase()}] ${issue.message}`);
      }
    }
  }
  
  return lines.join('\n');
}
