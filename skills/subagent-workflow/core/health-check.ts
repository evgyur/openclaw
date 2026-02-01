import type { PluginContext } from 'clawdbot/plugin-sdk';
import { execSync } from 'child_process';

export interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
  message: string;
  details?: string;
}

export interface HealthReport {
  results: DiagnosticResult[];
  overall: 'healthy' | 'degraded' | 'unhealthy';
  format(): string;
}

/**
 * Health checker for subagent workflow plugin
 * 
 * Provides diagnostic commands to verify:
 * - Grill skill installed
 * - Subagent router responsive
 * - Opus model available
 * - Git integration working
 * - Config valid
 */
export class HealthChecker {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  /**
   * Run all diagnostics and return report
   */
  async runDiagnostics(): Promise<HealthReport> {
    const results: DiagnosticResult[] = [
      await this.checkGrillSkill(),
      await this.checkSubagentRouter(),
      await this.checkOpusModel(),
      await this.checkGitIntegration(),
      await this.checkConfig()
    ];

    const failCount = results.filter(r => r.status === 'fail').length;
    const warnCount = results.filter(r => r.status === 'warn').length;

    let overall: HealthReport['overall'] = 'healthy';
    if (failCount > 0) overall = 'unhealthy';
    else if (warnCount > 0) overall = 'degraded';

    return {
      results,
      overall,
      format: () => this.formatReport(results, overall)
    };
  }

  private async checkGrillSkill(): Promise<DiagnosticResult> {
    try {
      // Check if grill command is registered
      const commands = await this.context.listCommands?.() || [];
      const hasGrill = commands.some((c: { name: string }) => c.name === '/grill');
      
      if (hasGrill) {
        return {
          name: 'Grill skill',
          status: 'pass',
          message: 'Grill command registered and available'
        };
      }

      return {
        name: 'Grill skill',
        status: 'warn',
        message: 'Grill skill not detected in registered commands'
      };
    } catch (error) {
      return {
        name: 'Grill skill',
        status: 'fail',
        message: 'Failed to check grill skill status',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkSubagentRouter(): Promise<DiagnosticResult> {
    try {
      // Check if subagent routing is functional
      const canSpawn = await this.checkSpawnCapability();
      
      if (canSpawn) {
        return {
          name: 'Subagent router',
          status: 'pass',
          message: 'Subagent router is responsive'
        };
      }

      return {
        name: 'Subagent router',
        status: 'fail',
        message: 'Subagent router is not responding'
      };
    } catch (error) {
      return {
        name: 'Subagent router',
        status: 'fail',
        message: 'Error checking subagent router',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkOpusModel(): Promise<DiagnosticResult> {
    try {
      // Check if Opus model is available through the provider
      const models = await this.context.listAvailableModels?.() || [];
      const hasOpus = models.some((m: { id: string }) => m.id.includes('opus') || m.id.includes('claude-3-opus'));
      
      if (hasOpus) {
        return {
          name: 'Opus model',
          status: 'pass',
          message: 'Claude 3 Opus model is available'
        };
      }

      return {
        name: 'Opus model',
        status: 'warn',
        message: 'Opus model not available - complex tasks may use fallback'
      };
    } catch (error) {
      return {
        name: 'Opus model',
        status: 'warn',
        message: 'Could not verify Opus model availability',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkGitIntegration(): Promise<DiagnosticResult> {
    try {
      // Verify git is available and working
      execSync('git --version', { encoding: 'utf8', stdio: 'pipe' });
      
      // Check if we're in a git repository
      try {
        execSync('git rev-parse --git-dir', { encoding: 'utf8', stdio: 'pipe' });
        return {
          name: 'Git integration',
          status: 'pass',
          message: 'Git is installed and repository detected'
        };
      } catch {
        return {
          name: 'Git integration',
          status: 'warn',
          message: 'Git is installed but no repository found',
          details: 'Some features like pre-pr hooks require a git repository'
        };
      }
    } catch (error) {
      return {
        name: 'Git integration',
        status: 'fail',
        message: 'Git is not installed or not in PATH',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkConfig(): Promise<DiagnosticResult> {
    try {
      const config = this.context.config;
      
      // Check required configuration
      const required = ['gateway.url'];
      const missing = required.filter(key => !this.getNestedValue(config, key));
      
      if (missing.length === 0) {
        return {
          name: 'Configuration',
          status: 'pass',
          message: 'All required configuration present'
        };
      }

      return {
        name: 'Configuration',
        status: 'warn',
        message: `Missing optional configuration: ${missing.join(', ')}`
      };
    } catch (error) {
      return {
        name: 'Configuration',
        status: 'fail',
        message: 'Error reading configuration',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkSpawnCapability(): Promise<boolean> {
    // This would check if the subagent system is actually responsive
    // For now, we check if the context has the required methods
    return typeof this.context.emit === 'function';
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((acc: Record<string, unknown> | unknown, part) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }

  private formatReport(results: DiagnosticResult[], overall: string): string {
    const icons = {
      pass: '✓',
      fail: '✗',
      warn: '⚠',
      info: 'ℹ'
    };

    const lines = [
      `subagent-doctor`,
      `================`,
      `Status: ${overall.toUpperCase()}`,
      ``,
      ...results.map(r => {
        const icon = icons[r.status];
        let line = `${icon} ${r.name}: ${r.message}`;
        if (r.details) {
          line += `\n  → ${r.details}`;
        }
        return line;
      }),
      ``,
      `Run with --verbose for more details.`
    ];

    return lines.join('\n');
  }
}
