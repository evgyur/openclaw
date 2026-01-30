/**
 * Security Self-Check / Audit Module
 * Part of Chip's Clawguard
 * 
 * Performs security audits of:
 * - Clawdbot configuration (14 checks from dont-hack-me)
 * - Environment variables
 * - File permissions
 * - Installed skills
 * - Network exposure
 * - Reverse proxy bypass (CVE-2025-49596)
 * - Tailscale exposure
 * - Browser control
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

interface ClawdbotConfig {
  gateway?: {
    bind?: string;
    auth?: {
      mode?: string;
      token?: string;
    };
    trustedProxies?: string[];
    tailscale?: {
      mode?: string;
    };
    controlUi?: {
      enabled?: boolean;
      allowInsecureAuth?: boolean;
    };
  };
  channels?: Record<string, {
    dmPolicy?: string;
    allowFrom?: string[];
    groupPolicy?: string;
  }>;
  browser?: {
    controlToken?: string;
  };
  logging?: {
    redactSensitive?: string;
  };
}

export class SecuritySelfCheck {
  private results: AuditResult[] = [];
  private config: ClawdbotConfig | null = null;
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.env.HOME || '', '.clawdbot', 'clawdbot.json');
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch {
      this.config = null;
    }
  }

  /**
   * Run complete security audit (14 checks from dont-hack-me + additional)
   */
  runFullAudit(): SecurityReport {
    this.results = [];

    // Clawdbot Config Checks (from dont-hack-me)
    this.checkGatewayBind();
    this.checkGatewayAuth();
    this.checkTokenStrength();
    this.checkDmPolicy();
    this.checkGroupPolicy();
    this.checkReverseProxyBypass();
    this.checkTailscaleExposure();
    this.checkBrowserControl();
    this.checkLoggingRedaction();
    this.checkControlUi();
    this.checkmDnsBroadcasting();
    this.checkPlaintextSecrets();
    
    // File & Permission Checks
    this.checkClawdbotConfigPermissions();
    this.checkClawdbotDirectoryPermissions();
    this.checkSecurityMdExists();
    this.checkEnvFile();
    
    // Skill Checks
    this.checkSkillPermissions();
    this.checkForSuspiciousSkills();
    
    // System Checks
    this.checkSshKeys();
    this.checkCredentialFiles();
    this.checkLogPermissions();
    
    // Network Checks
    this.checkOpenPorts();
    this.checkGatewayExposure();

    return this.generateReport();
  }

  /**
   * Quick security check (critical items only)
   */
  runQuickCheck(): AuditResult[] {
    this.results = [];
    
    this.checkGatewayBind();
    this.checkGatewayAuth();
    this.checkReverseProxyBypass();
    this.checkClawdbotConfigPermissions();
    this.checkCredentialFiles();

    return this.results;
  }

  // ===== Check #1: Gateway Bind =====
  private checkGatewayBind(): void {
    const bind = this.config?.gateway?.bind || 'loopback';
    
    if (bind === 'loopback' || bind === '127.0.0.1') {
      this.addResult('Gateway', 'PASS', `Gateway bound to ${bind} (safe)`);
    } else {
      this.addResult('Gateway', 'FAIL', 
        `Gateway bound to "${bind}" - EXPOSED!`,
        'Set gateway.bind to "loopback" in ~/.clawdbot/clawdbot.json');
    }
  }

  // ===== Check #2: Gateway Auth Mode =====
  private checkGatewayAuth(): void {
    const authMode = this.config?.gateway?.auth?.mode;
    const hasToken = !!this.config?.gateway?.auth?.token;
    const envToken = process.env.CLAWDBOT_GATEWAY_TOKEN;
    
    if (authMode === 'token' || authMode === 'password') {
      this.addResult('Gateway', 'PASS', `Auth mode: ${authMode}`);
    } else if (hasToken || envToken) {
      this.addResult('Gateway', 'PASS', 'Auth token configured');
    } else {
      this.addResult('Gateway', 'FAIL',
        'No authentication configured',
        'Set gateway.auth.mode to "token" and configure gateway.auth.token');
    }
  }

  // ===== Check #3: Token Strength =====
  private checkTokenStrength(): void {
    const token = this.config?.gateway?.auth?.token;
    
    if (!token) {
      this.addResult('Gateway', 'WARN', 'Cannot check token strength - no token in config');
      return;
    }
    
    if (token.length >= 32) {
      this.addResult('Gateway', 'PASS', `Token strength: ${token.length} chars (strong)`);
    } else if (token.length >= 16) {
      this.addResult('Gateway', 'WARN',
        `Token strength: ${token.length} chars (weak)`,
        'Generate stronger token: openssl rand -hex 32');
    } else {
      this.addResult('Gateway', 'FAIL',
        `Token strength: ${token.length} chars (too weak)`,
        'Generate stronger token: openssl rand -hex 32');
    }
  }

  // ===== Check #4: DM Policy =====
  private checkDmPolicy(): void {
    if (!this.config?.channels) {
      this.addResult('Channels', 'SKIP', 'No channels configured');
      return;
    }

    for (const [channel, config] of Object.entries(this.config.channels)) {
      const dmPolicy = config.dmPolicy;
      const hasAllowlist = config.allowFrom && config.allowFrom.length > 0;
      
      if (dmPolicy === 'pairing' || dmPolicy === 'allowlist' || dmPolicy === 'disabled') {
        this.addResult('Channels', 'PASS', `${channel}: DM policy is ${dmPolicy}`);
      } else if (dmPolicy === 'open' && hasAllowlist) {
        this.addResult('Channels', 'WARN',
          `${channel}: DM policy is "open" but allowlist exists`,
          'Change dmPolicy to "allowlist"');
      } else if (dmPolicy === 'open') {
        this.addResult('Channels', 'FAIL',
          `${channel}: DM policy is "open" (anyone can DM)`,
          'Set dmPolicy to "allowlist", "pairing", or "disabled"');
      } else {
        this.addResult('Channels', 'WARN', `${channel}: No DM policy set (defaults may vary)`);
      }
    }
  }

  // ===== Check #5: Group Policy =====
  private checkGroupPolicy(): void {
    if (!this.config?.channels) {
      return;
    }

    for (const [channel, config] of Object.entries(this.config.channels)) {
      const groupPolicy = config.groupPolicy;
      
      if (groupPolicy === 'allowlist' || groupPolicy === 'disabled' || !groupPolicy) {
        this.addResult('Channels', 'PASS', 
          `${channel}: Group policy is ${groupPolicy || 'allowlist (default)'}`);
      } else if (groupPolicy === 'open') {
        this.addResult('Channels', 'FAIL',
          `${channel}: Group policy is "open" (any group can trigger)`,
          'Set groupPolicy to "allowlist" or "disabled"');
      }
    }
  }

  // ===== Check #8: Reverse Proxy (CVE-2025-49596) =====
  private checkReverseProxyBypass(): void {
    const trustedProxies = this.config?.gateway?.trustedProxies;
    const bind = this.config?.gateway?.bind || 'loopback';
    
    if (trustedProxies && trustedProxies.length > 0) {
      this.addResult('Gateway', 'PASS', 
        `Trusted proxies configured: ${trustedProxies.join(', ')}`);
    } else if (bind === 'loopback' || bind === '127.0.0.1') {
      this.addResult('Gateway', 'PASS', 
        'No proxy, bind is loopback (safe)');
    } else {
      this.addResult('Gateway', 'FAIL',
        'CVE-2025-49596: Exposed gateway without trustedProxies',
        'Set gateway.trustedProxies to ["127.0.0.1"] if using reverse proxy, or bind to loopback');
    }
  }

  // ===== Check #9: Tailscale Exposure =====
  private checkTailscaleExposure(): void {
    const tailscaleMode = this.config?.gateway?.tailscale?.mode || 'off';
    
    if (tailscaleMode === 'off' || !tailscaleMode) {
      this.addResult('Network', 'PASS', 'Tailscale mode is off');
    } else if (tailscaleMode === 'serve') {
      this.addResult('Network', 'WARN',
        'Tailscale mode is "serve" (reachable from tailnet)',
        'Set gateway.tailscale.mode to "off" if not needed');
    } else if (tailscaleMode === 'funnel') {
      this.addResult('Network', 'FAIL',
        'Tailscale mode is "funnel" (EXPOSED TO INTERNET!)',
        'CRITICAL: Set gateway.tailscale.mode to "off" immediately');
    }
  }

  // ===== Check #11: Browser Control =====
  private checkBrowserControl(): void {
    const controlToken = this.config?.browser?.controlToken;
    
    if (controlToken && controlToken.length >= 20) {
      this.addResult('Browser', 'PASS', 'Browser control token configured');
    } else if (controlToken) {
      this.addResult('Browser', 'WARN',
        'Browser control token is too short',
        'Generate new token: openssl rand -hex 24');
    } else {
      this.addResult('Browser', 'WARN',
        'No browser control token set',
        'Generate token: openssl rand -hex 24 and set browser.controlToken');
    }
  }

  // ===== Check #12: Logging Redaction =====
  private checkLoggingRedaction(): void {
    const redactMode = this.config?.logging?.redactSensitive;
    
    if (redactMode === 'tools' || redactMode === 'all') {
      this.addResult('Logging', 'PASS', `Sensitive data redaction: ${redactMode}`);
    } else {
      this.addResult('Logging', 'WARN',
        'Sensitive data logging not redacted',
        'Set logging.redactSensitive to "tools" or "all"');
    }
  }

  // ===== Check #13: Control UI =====
  private checkControlUi(): void {
    const controlUiEnabled = this.config?.gateway?.controlUi?.enabled;
    const allowInsecure = this.config?.gateway?.controlUi?.allowInsecureAuth;
    
    if (controlUiEnabled === false) {
      this.addResult('Gateway', 'PASS', 'Control UI is disabled');
    } else {
      this.addResult('Gateway', 'WARN',
        'Control UI is enabled',
        'Set gateway.controlUi.enabled to false if not needed');
    }
    
    if (allowInsecure === true) {
      this.addResult('Gateway', 'FAIL',
        'Control UI allows insecure authentication!',
        'Set gateway.controlUi.allowInsecureAuth to false');
    }
  }

  // ===== Check #14: mDNS Broadcasting =====
  private checkmDnsBroadcasting(): void {
    const bonjourDisabled = process.env.CLAWDBOT_DISABLE_BONJOUR === '1';
    
    if (bonjourDisabled) {
      this.addResult('Network', 'PASS', 'mDNS/Bonjour broadcasting disabled');
    } else {
      this.addResult('Network', 'WARN',
        'mDNS/Bonjour broadcasting enabled',
        'Add export CLAWDBOT_DISABLE_BONJOUR=1 to ~/.bashrc or ~/.zshrc');
    }
  }

  // ===== Check #7: Plaintext Secrets Scan =====
  private checkPlaintextSecrets(): void {
    if (!this.config) return;
    
    const configStr = JSON.stringify(this.config);
    const secretPatterns = [
      { pattern: /"password"\s*:\s*"[^"]+"/i, name: 'password' },
      { pattern: /"secret"\s*:\s*"[^"]+"/i, name: 'secret' },
      { pattern: /"apiKey"\s*:\s*"[^"]+"/i, name: 'apiKey' },
      { pattern: /"api_key"\s*:\s*"[^"]+"/i, name: 'api_key' },
      { pattern: /"privateKey"\s*:\s*"[^"]+"/i, name: 'privateKey' },
      { pattern: /"private_key"\s*:\s*"[^"]+"/i, name: 'private_key' },
    ];
    
    const found: string[] = [];
    for (const { pattern, name } of secretPatterns) {
      if (pattern.test(configStr)) {
        found.push(name);
      }
    }
    
    // Don't flag botToken for Telegram (required)
    if (found.length > 0) {
      this.addResult('Configuration', 'WARN',
        `Plaintext secrets in config: ${found.join(', ')}`,
        'Move secrets to environment variables or use a secrets manager');
    }
  }

  // ===== Additional Checks =====
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
    if (!fs.existsSync(this.configPath)) {
      this.addResult('Configuration', 'WARN', 'clawdbot.json not found');
      return;
    }

    try {
      const stats = fs.statSync(this.configPath);
      const mode = stats.mode & 0o777;
      
      if (mode === 0o600 || mode === 0o400) {
        this.addResult('Configuration', 'PASS', `clawdbot.json permissions: ${mode.toString(8)}`);
      } else if ((mode & 0o044) !== 0 && (mode & 0o022) === 0) {
        this.addResult('Configuration', 'WARN', 
          `clawdbot.json is readable by others (${mode.toString(8)})`,
          'Run: chmod 600 ~/.clawdbot/clawdbot.json');
      } else if ((mode & 0o022) !== 0) {
        this.addResult('Configuration', 'FAIL',
          `clawdbot.json is writable by others (${mode.toString(8)})!`,
          'Run: chmod 600 ~/.clawdbot/clawdbot.json immediately');
      }
    } catch {
      this.addResult('Configuration', 'WARN', 'Cannot check clawdbot.json permissions');
    }
  }

  private checkClawdbotDirectoryPermissions(): void {
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

      const files = fs.readdirSync(skillPath, { recursive: true }) as string[];
      for (const file of files) {
        const filePath = path.join(skillPath, file);
        if (!fs.statSync(filePath).isFile()) continue;

        try {
          const stats = fs.statSync(filePath);
          if (stats.mode & 0o111) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (fileContent.includes('eval(') || fileContent.includes('exec(') || fileContent.includes('child_process')) {
              suspicious++;
            }
          }
        } catch {
          // Ignore
        }
      }
    }

    if (suspicious > 0) {
      this.addResult('Skills', 'WARN', 
        `${suspicious} skills with executable + suspicious patterns`,
        'Review skills with eval/exec/child_process');
    } else {
      this.addResult('Skills', 'PASS', 'No suspicious skill patterns');
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
        `Suspicious skill names: ${suspicious.join(', ')}`,
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
          this.addResult('Credentials', 'PASS', `${key}: permissions 600`);
        } else {
          this.addResult('Credentials', 'WARN',
            `${key}: permissions ${mode.toString(8)}, should be 600`,
            `chmod 600 ~/.ssh/${key}`);
        }
      } catch {
        this.addResult('Credentials', 'WARN', `Cannot check ${key}`);
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
        
        if (mode <= 0o600) {
          this.addResult('Credentials', 'PASS', `${credPath}: secure permissions`);
        } else {
          this.addResult('Credentials', 'WARN',
            `${credPath}: permissions ${mode.toString(8)}`,
            `chmod 600 ~/${credPath}`);
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
          this.addResult('Logs', 'PASS', `Log dir accessible: ${logDir}`);
        } catch {
          this.addResult('Logs', 'WARN', `Cannot access: ${logDir}`);
        }
      }
    }
  }

  private checkOpenPorts(): void {
    try {
      const result = execSync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo "unknown"', 
        { encoding: 'utf8', timeout: 5000 });
      
      if (result.includes('18789') || result.includes('18791')) {
        this.addResult('Network', 'PASS', 'Clawdbot ports detected');
      } else {
        this.addResult('Network', 'WARN', 'Clawdbot ports not detected');
      }

      const exposedPorts = result.match(/0\.0\.0\.0:\d+/g) || [];
      if (exposedPorts.length > 5) {
        this.addResult('Network', 'WARN',
          `${exposedPorts.length} ports exposed`,
          'Review: ss -tlnp');
      }
    } catch {
      this.addResult('Network', 'WARN', 'Cannot check ports');
    }
  }

  private checkGatewayExposure(): void {
    try {
      const result = execSync('systemctl --user is-active clawdbot-gateway.service 2>/dev/null || echo "unknown"',
        { encoding: 'utf8' });
      
      if (result.trim() === 'active') {
        this.addResult('Gateway', 'PASS', 'Gateway running');
      } else {
        this.addResult('Gateway', 'WARN', `Gateway: ${result.trim()}`);
      }
    } catch {
      this.addResult('Gateway', 'WARN', 'Cannot check gateway');
    }
  }

  private addResult(category: string, status: 'PASS' | 'WARN' | 'FAIL' | 'SKIP', message: string, recommendation?: string): void {
    if (status === 'SKIP') return; // Don't add skipped checks
    this.results.push({ category, status, message, recommendation });
  }

  private generateReport(): SecurityReport {
    const pass = this.results.filter(r => r.status === 'PASS').length;
    const warn = this.results.filter(r => r.status === 'WARN').length;
    const fail = this.results.filter(r => r.status === 'FAIL').length;
    
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

  formatReport(report: SecurityReport): string {
    const lines: string[] = [];
    
    lines.push(`🛡️  Chip's Clawguard Security Audit v1.1`);
    lines.push(`Timestamp: ${report.timestamp}`);
    lines.push(`Overall Score: ${report.overallScore}/100`);
    lines.push('');
    lines.push(`📊 Summary: ${report.summary.pass} ✅  ${report.summary.warn} ⚠️  ${report.summary.fail} ❌`);
    lines.push('');

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

export const securitySelfCheck = new SecuritySelfCheck();
