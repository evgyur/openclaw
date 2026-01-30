/**
 * Security Self-Check / Audit Module
 * Part of Chip's Clawguard
 * 
 * Performs security audits of:
 * - Clawdbot configuration
 * - Environment variables
 * - File permissions
 * - Installed skills
 * - Network exposure
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface AuditResult {
  category: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
  recommendation?: string;
}

interface SecurityReport {
  timestamp: string;
  overallScore: number;
  results: AuditResult[];
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
}

export class SecuritySelfCheck {
  private results: AuditResult[] = [];

  /**
   * Run complete security audit
   */
  runFullAudit(): SecurityReport {
    this.results = [];

    // Configuration checks
    this.checkSecurityMdExists();
    this.checkClawdbotConfigPermissions();
    this.checkEnvFile();
    
    // Skill checks
    this.checkSkillPermissions();
    this.checkForSuspiciousSkills();
    
    // System checks
    this.checkSshKeys();
    this.checkCredentialFiles();
    this.checkLogPermissions();
    
    // Network checks
    this.checkOpenPorts();
    this.checkGatewayExposure();

    return this.generateReport();
  }

  /**
   * Quick security check (5 critical items)
   */
  runQuickCheck(): AuditResult[] {
    this.results = [];
    
    this.checkSecurityMdExists();
    this.checkClawdbotConfigPermissions();
    this.checkEnvFile();
    this.checkCredentialFiles();
    this.checkGatewayExposure();

    return this.results;
  }

  private checkSecurityMdExists(): void {
    const securityMd = path.join(process.env.HOME || '', 'clawd', 'SECURITY.md');
    if (fs.existsSync(securityMd)) {
      this.addResult('Configuration', 'PASS', 'SECURITY.md exists');
    } else {
      this.addResult('Configuration', 'FAIL', 
        'SECURITY.md not found',
        'Copy from chips-clawguard/templates/SECURITY.md to ~/clawd/SECURITY.md');
    }
  }

  private checkClawdbotConfigPermissions(): void {
    const configDir = path.join(process.env.HOME || '', '.clawdbot');
    if (!fs.existsSync(configDir)) {
      this.addResult('Configuration', 'WARN', '.clawdbot directory not found');
      return;
    }

    try {
      const stats = fs.statSync(configDir);
      const mode = stats.mode & 0o777;
      
      if (mode === 0o700) {
        this.addResult('Configuration', 'PASS', '.clawdbot has secure permissions (700)');
      } else {
        this.addResult('Configuration', 'WARN', 
          `.clawdbot permissions are ${mode.toString(8)}, should be 700`,
          'Run: chmod 700 ~/.clawdbot');
      }
    } catch {
      this.addResult('Configuration', 'WARN', 'Cannot check .clawdbot permissions');
    }
  }

  private checkEnvFile(): void {
    const envFile = path.join(process.env.HOME || '', 'clawd', '.env');
    if (!fs.existsSync(envFile)) {
      this.addResult('Environment', 'PASS', 'No .env file (secrets not stored in file)');
      return;
    }

    const content = fs.readFileSync(envFile, 'utf8');
    const hasSecrets = /API_KEY|TOKEN|PRIVATE|SECRET|PASSWORD/i.test(content);
    
    if (hasSecrets) {
      this.addResult('Environment', 'WARN', 
        '.env file contains potential secrets',
        'Consider using 1Password or system keychain instead');
    } else {
      this.addResult('Environment', 'PASS', '.env file exists but no obvious secrets');
    }

    // Check permissions
    const stats = fs.statSync(envFile);
    const mode = stats.mode & 0o777;
    if (mode !== 0o600 && mode !== 0o644) {
      this.addResult('Environment', 'WARN',
        `.env file permissions are ${mode.toString(8)}`,
        'Run: chmod 600 ~/clawd/.env');
    }
  }

  private checkSkillPermissions(): void {
    const skillsDir = path.join(process.env.HOME || '', 'clawd', 'skills');
    if (!fs.existsSync(skillsDir)) {
      this.addResult('Skills', 'WARN', 'Skills directory not found');
      return;
    }

    const skills = fs.readdirSync(skillsDir);
    let suspicious = 0;

    for (const skill of skills) {
      const skillPath = path.join(skillsDir, skill);
      if (!fs.statSync(skillPath).isDirectory()) continue;

      // Check for executable scripts
      const files = fs.readdirSync(skillPath, { recursive: true }) as string[];
      for (const file of files) {
        const filePath = path.join(skillPath, file);
        if (!fs.statSync(filePath).isFile()) continue;

        try {
          const stats = fs.statSync(filePath);
          if (stats.mode & 0o111) { // Executable
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('eval(') || content.includes('exec(') || content.includes('child_process')) {
              suspicious++;
            }
          }
        } catch {
          // Ignore unreadable files
        }
      }
    }

    if (suspicious > 0) {
      this.addResult('Skills', 'WARN', 
        `${suspicious} skills with executable + suspicious code patterns`,
        'Review skills with eval/exec/child_process usage');
    } else {
      this.addResult('Skills', 'PASS', 'No suspicious skill patterns detected');
    }
  }

  private checkForSuspiciousSkills(): void {
    const suspiciousNames = ['hack', 'crack', 'bypass', 'exploit', 'inject'];
    const skillsDir = path.join(process.env.HOME || '', 'clawd', 'skills');
    
    if (!fs.existsSync(skillsDir)) return;

    const skills = fs.readdirSync(skillsDir);
    const suspicious = skills.filter(s => 
      suspiciousNames.some(name => s.toLowerCase().includes(name))
    );

    if (suspicious.length > 0) {
      this.addResult('Skills', 'WARN',
        `Skills with suspicious names: ${suspicious.join(', ')}`,
        'Review these skills manually');
    }
  }

  private checkSshKeys(): void {
    const sshDir = path.join(process.env.HOME || '', '.ssh');
    if (!fs.existsSync(sshDir)) {
      this.addResult('Credentials', 'PASS', 'No .ssh directory');
      return;
    }

    const keys = fs.readdirSync(sshDir).filter(f => 
      f.startsWith('id_') && !f.endsWith('.pub') && !f.endsWith('.pem')
    );

    if (keys.length === 0) {
      this.addResult('Credentials', 'PASS', 'No SSH private keys found');
      return;
    }

    for (const key of keys) {
      const keyPath = path.join(sshDir, key);
      try {
        const stats = fs.statSync(keyPath);
        const mode = stats.mode & 0o777;
        
        if (mode === 0o600) {
          this.addResult('Credentials', 'PASS', `${key} has correct permissions (600)`);
        } else {
          this.addResult('Credentials', 'WARN',
            `${key} permissions are ${mode.toString(8)}, should be 600`,
            `Run: chmod 600 ~/.ssh/${key}`);
        }
      } catch {
        this.addResult('Credentials', 'WARN', `Cannot check ${key} permissions`);
      }
    }
  }

  private checkCredentialFiles(): void {
    const credentialPaths = [
      '.aws/credentials',
      '.docker/config.json',
      '.npmrc',
      '.netrc'
    ];

    for (const credPath of credentialPaths) {
      const fullPath = path.join(process.env.HOME || '', credPath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const mode = stats.mode & 0o777;
        
        if (mode <= 0o644) {
          this.addResult('Credentials', 'WARN',
            `${credPath} exists with permissions ${mode.toString(8)}`,
            `Run: chmod 600 ~/${credPath}`);
        } else {
          this.addResult('Credentials', 'PASS', `${credPath} has secure permissions`);
        }
      }
    }
  }

  private checkLogPermissions(): void {
    const logDirs = [
      path.join(process.env.HOME || '', '.clawdbot', 'logs'),
      '/var/log'
    ];

    for (const logDir of logDirs) {
      if (fs.existsSync(logDir)) {
        try {
          fs.accessSync(logDir, fs.constants.R_OK);
          this.addResult('Logs', 'PASS', `Log directory accessible: ${logDir}`);
        } catch {
          this.addResult('Logs', 'WARN', `Cannot access log directory: ${logDir}`);
        }
      }
    }
  }

  private checkOpenPorts(): void {
    try {
      const result = execSync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo "unknown"', 
        { encoding: 'utf8', timeout: 5000 });
      
      if (result.includes('18789') || result.includes('18791')) {
        this.addResult('Network', 'PASS', 'Clawdbot gateway ports detected');
      } else {
        this.addResult('Network', 'WARN', 'Clawdbot gateway ports not detected');
      }

      // Check for exposed ports
      const exposedPorts = result.match(/0\.0\.0\.0:\d+/g) || [];
      if (exposedPorts.length > 5) {
        this.addResult('Network', 'WARN',
          `${exposedPorts.length} ports exposed to 0.0.0.0`,
          'Review with: ss -tlnp');
      }
    } catch {
      this.addResult('Network', 'WARN', 'Cannot check open ports (ss/netstat not available)');
    }
  }

  private checkGatewayExposure(): void {
    try {
      const result = execSync('systemctl --user is-active clawdbot-gateway.service 2>/dev/null || echo "unknown"',
        { encoding: 'utf8' });
      
      if (result.trim() === 'active') {
        this.addResult('Gateway', 'PASS', 'Clawdbot gateway is running');
      } else if (result.trim() === 'unknown') {
        this.addResult('Gateway', 'WARN', 'Cannot determine gateway status');
      } else {
        this.addResult('Gateway', 'FAIL', 
          `Gateway status: ${result.trim()}`,
          'Check with: systemctl --user status clawdbot-gateway.service');
      }
    } catch {
      this.addResult('Gateway', 'WARN', 'Cannot check gateway status');
    }
  }

  private addResult(category: string, status: 'PASS' | 'WARN' | 'FAIL', message: string, recommendation?: string): void {
    this.results.push({ category, status, message, recommendation });
  }

  private generateReport(): SecurityReport {
    const pass = this.results.filter(r => r.status === 'PASS').length;
    const warn = this.results.filter(r => r.status === 'WARN').length;
    const fail = this.results.filter(r => r.status === 'FAIL').length;
    
    // Calculate score: PASS=10, WARN=5, FAIL=0
    const maxScore = this.results.length * 10;
    const actualScore = (pass * 10) + (warn * 5);
    const overallScore = Math.round((actualScore / maxScore) * 100);

    return {
      timestamp: new Date().toISOString(),
      overallScore,
      results: this.results,
      summary: { pass, warn, fail }
    };
  }

  /**
   * Format report for display
   */
  formatReport(report: SecurityReport): string {
    const lines: string[] = [];
    
    lines.push(`🛡️  Chip's Clawguard Security Audit`);
    lines.push(`Timestamp: ${report.timestamp}`);
    lines.push(`Overall Score: ${report.overallScore}/100`);
    lines.push('');
    lines.push(`📊 Summary: ${report.summary.pass} ✅  ${report.summary.warn} ⚠️  ${report.summary.fail} ❌`);
    lines.push('');

    // Group by category
    const byCategory: Record<string, AuditResult[]> = {};
    for (const result of report.results) {
      if (!byCategory[result.category]) byCategory[result.category] = [];
      byCategory[result.category].push(result);
    }

    for (const [category, results] of Object.entries(byCategory)) {
      lines.push(`\n## ${category}`);
      for (const r of results) {
        const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
        lines.push(`${icon} ${r.message}`);
        if (r.recommendation) {
          lines.push(`   💡 ${r.recommendation}`);
        }
      }
    }

    return lines.join('\n');
  }
}

// Export singleton
export const securitySelfCheck = new SecuritySelfCheck();
