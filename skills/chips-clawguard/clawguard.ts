/**
 * Chip's Clawguard - Ultimate Prompt Injection Defense
 * Combines ACIP v1.3 + Prompt Guard patterns + homoglyph detection
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  safe: boolean;
  severity: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  reasons: string[];
  normalized?: string;
}

interface CheckOptions {
  userId?: string;
  conversationHistory?: string[];
  source?: string;
}

interface PatternCategory {
  severity: string;
  score: number;
  patterns: string[];
}

interface InjectionPatterns {
  categories: Record<string, PatternCategory>;
  multilingual: Record<string, Record<string, string>>;
}

export class Clawguard {
  private patterns: InjectionPatterns;
  private homoglyphs: Record<string, Record<string, string>>;
  private ownerNumbers = ['617744661', '119596130'];

  constructor() {
    this.patterns = this.loadPatterns();
    this.homoglyphs = this.loadHomoglyphs();
  }

  private loadPatterns(): InjectionPatterns {
    const patternsPath = path.join(__dirname, 'patterns', 'injections.json');
    return JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
  }

  private loadHomoglyphs(): Record<string, Record<string, string>> {
    const homoglyphsPath = path.join(__dirname, 'patterns', 'homoglyphs.json');
    const data = JSON.parse(fs.readFileSync(homoglyphsPath, 'utf8'));
    return data.mappings;
  }

  /**
   * Main entry point - check message for injection attempts
   */
  check(message: string, options?: CheckOptions): CheckResult {
    const reasons: string[] = [];
    let maxScore = 0;

    // Layer 1: Normalize homoglyphs
    const normalized = this.normalizeHomoglyphs(message);
    if (normalized !== message) {
      reasons.push('Unicode homoglyphs detected');
    }

    // Layer 2-5: Pattern matching
    const patternResult = this.checkPatterns(normalized);
    maxScore = Math.max(maxScore, patternResult.score);
    reasons.push(...patternResult.reasons);

    // Layer 3: Base64 detection
    const base64Result = this.checkBase64(message);
    if (base64Result.found) {
      maxScore = Math.max(maxScore, base64Result.score);
      reasons.push(base64Result.reason);
    }

    // Layer 6-8: Trust hierarchy (if options provided)
    if (options?.userId) {
      const trustResult = this.checkTrust(options.userId, options.source);
      if (!trustResult.trusted) {
        reasons.push(`Unverified source: ${options.source}`);
      }
    }

    // Layer 9: Context anomaly detection
    if (options?.conversationHistory) {
      const contextResult = this.checkContext(message, options.conversationHistory);
      if (contextResult.anomaly) {
        maxScore = Math.max(maxScore, contextResult.score);
        reasons.push(contextResult.reason);
      }
    }

    return {
      safe: maxScore < 60,
      severity: this.scoreToSeverity(maxScore),
      score: maxScore,
      reasons: reasons.length > 0 ? reasons : ['No threats detected'],
      normalized: normalized !== message ? normalized : undefined
    };
  }

  /**
   * Layer 1: Normalize Unicode homoglyphs
   */
  normalizeHomoglyphs(text: string): string {
    let normalized = text.normalize('NFKC');
    
    for (const script of Object.values(this.homoglyphs)) {
      for (const [homoglyph, ascii] of Object.entries(script)) {
        normalized = normalized.split(homoglyph).join(ascii);
      }
    }
    
    return normalized;
  }

  /**
   * Layer 2-5: Check against injection patterns
   */
  private checkPatterns(text: string): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let maxScore = 0;
    const lowerText = text.toLowerCase();

    for (const [category, data] of Object.entries(this.patterns.categories)) {
      for (const pattern of data.patterns) {
        if (lowerText.includes(pattern.toLowerCase())) {
          maxScore = Math.max(maxScore, data.score);
          reasons.push(`${data.severity}: ${category} pattern detected`);
          break; // One match per category is enough
        }
      }
    }

    return { score: maxScore, reasons };
  }

  /**
   * Layer 3: Check for Base64 encoded attacks
   */
  private checkBase64(text: string): { found: boolean; score: number; reason: string } {
    const base64Regex = /[A-Za-z0-9+/]{40,}={0,2}/g;
    const matches = text.match(base64Regex);
    
    if (!matches) {
      return { found: false, score: 0, reason: '' };
    }

    for (const match of matches) {
      try {
        const decoded = Buffer.from(match, 'base64').toString('utf8');
        if (decoded.length > 10 && /ignore|instructions|system|admin/i.test(decoded)) {
          return { 
            found: true, 
            score: 90, 
            reason: 'CRITICAL: Base64 encoded attack detected' 
          };
        }
      } catch {
        // Not valid Base64, ignore
      }
    }

    return { found: false, score: 0, reason: '' };
  }

  /**
   * Layer 6-8: Trust hierarchy check
   */
  private checkTrust(userId: string, source?: string): { trusted: boolean } {
    if (source === 'telegram' && this.ownerNumbers.includes(userId)) {
      return { trusted: true };
    }
    // Add other source checks as needed
    return { trusted: false };
  }

  /**
   * Layer 9: Context anomaly detection
   */
  private checkContext(
    message: string, 
    history: string[]
  ): { anomaly: boolean; score: number; reason: string } {
    const lowerMsg = message.toLowerCase();
    
    // Check for sudden topic shift to system/instructions
    if (/system|instructions|rules|prompt/i.test(lowerMsg)) {
      const recentTopics = history.slice(-3).join(' ').toLowerCase();
      if (!/system|instructions|rules|prompt/i.test(recentTopics)) {
        return {
          anomaly: true,
          score: 35,
          reason: 'LOW: Sudden topic shift to system instructions'
        };
      }
    }

    // Check for escalation pattern
    if (history.length >= 3) {
      const recent = history.slice(-3);
      const hasSimilarRequests = recent.some(r => 
        this.similarity(r, message) > 0.7
      );
      if (hasSimilarRequests) {
        return {
          anomaly: true,
          score: 30,
          reason: 'LOW: Repeated similar requests (possible brute force)'
        };
      }
    }

    return { anomaly: false, score: 0, reason: '' };
  }

  /**
   * Calculate similarity between two strings
   */
  private similarity(a: string, b: string): number {
    const aWords = new Set(a.toLowerCase().split(/\s+/));
    const bWords = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...aWords].filter(x => bWords.has(x)));
    return intersection.size / Math.max(aWords.size, bWords.size);
  }

  /**
   * Convert score to severity level
   */
  private scoreToSeverity(score: number): CheckResult['severity'] {
    if (score <= 20) return 'SAFE';
    if (score <= 40) return 'LOW';
    if (score <= 60) return 'MEDIUM';
    if (score <= 80) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Quick check - returns true if safe
   */
  isSafe(message: string, options?: CheckOptions): boolean {
    return this.check(message, options).safe;
  }

  /**
   * Get severity color for display
   */
  getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      SAFE: '🟢',
      LOW: '🟡',
      MEDIUM: '🟠',
      HIGH: '🔴',
      CRITICAL: '⛔'
    };
    return colors[severity] || '⚪';
  }
}

// Export singleton instance
export const clawguard = new Clawguard();
