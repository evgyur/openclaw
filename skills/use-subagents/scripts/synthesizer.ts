import { Issue, SynthesisConfig, PhaseOutput } from './types';

interface Conflict {
  type: string;
  description: string;
  parties: string[];
  resolution?: string;
}

export class Synthesizer {
  private config: SynthesisConfig;
  
  constructor(config: SynthesisConfig) {
    this.config = config;
  }
  
  /**
   * Synthesize outputs from all phases into unified recommendation
   */
  synthesize(task: string, outputs: Record<string, PhaseOutput>): string {
    const research = outputs['research'];
    const audit = outputs['audit'];
    const draft = outputs['draft'];
    const verify = outputs['verify'];
    
    const conflicts = this.detectConflicts(outputs);
    const resolutions = this.resolveConflicts(conflicts);
    const recommendation = this.generateRecommendation(task, outputs, resolutions);
    
    return this.formatReport(task, outputs, conflicts, resolutions, recommendation);
  }
  
  /**
   * Detect conflicts between phase outputs
   */
  private detectConflicts(outputs: Record<string, PhaseOutput>): Conflict[] {
    const conflicts: Conflict[] = [];
    const draft = outputs['draft'];
    const verify = outputs['verify'];
    const audit = outputs['audit'];
    
    // Check for implementation conflicts
    if (draft && verify) {
      // Option 1 vs Option 2 conflicts
      const option1Mentioned = draft.content.includes('Option 1') && draft.content.includes('Option 2');
      const verifyConflicts = verify.content.includes('Conflict');
      
      if (option1Mentioned && verifyConflicts) {
        conflicts.push({
          type: 'implementation-choice',
          description: 'Multiple implementation options with tradeoffs',
          parties: ['draft', 'verify'],
        });
      }
    }
    
    // Check for breaking changes
    if (audit && audit.content.includes('Breaking')) {
      conflicts.push({
        type: 'breaking-change',
        description: 'Changes may break existing functionality',
        parties: ['audit'],
      });
    }
    
    // Check for performance concerns
    if (verify && verify.content.includes('performance')) {
      conflicts.push({
        type: 'performance-risk',
        description: 'Performance implications detected',
        parties: ['verify'],
      });
    }
    
    return conflicts;
  }
  
  /**
   * Auto-resolve detected conflicts
   */
  private resolveConflicts(conflicts: Conflict[]): Conflict[] {
    return conflicts.map(conflict => {
      let resolution: string;
      
      switch (conflict.type) {
        case 'implementation-choice':
          resolution = 'Select Option 1 with modifications per verify recommendations';
          break;
        case 'breaking-change':
          resolution = 'Add backward compatibility layer or migration guide';
          break;
        case 'performance-risk':
          resolution = 'Implement caching/optimization as suggested in verify';
          break;
        default:
          resolution = 'Review manually and decide based on priorities';
      }
      
      return { ...conflict, resolution };
    });
  }
  
  /**
   * Generate final recommendation
   */
  private generateRecommendation(
    task: string,
    outputs: Record<string, PhaseOutput>,
    resolutions: Conflict[]
  ): any {
    const draft = outputs['draft'];
    const verify = outputs['verify'];
    
    // Extract recommended option
    let recommendedOption = 'Option 1';
    if (verify && verify.content.includes('RECOMMENDED')) {
      const match = verify.content.match(/→ Option (\d+)/);
      if (match) {
        recommendedOption = `Option ${match[1]}`;
      }
    }
    
    // Calculate confidence
    const completedPhases = Object.values(outputs).filter(o => o.status === 'complete').length;
    const totalPhases = 4;
    const confidence = Math.round((completedPhases / totalPhases) * 100);
    
    return {
      approach: recommendedOption,
      confidence,
      conflicts: resolutions.length,
      requiresManualDecision: resolutions.some(r => !r.resolution?.includes('with')),
    };
  }
  
  /**
   * Format final synthesis report
   */
  private formatReport(
    task: string,
    outputs: Record<string, PhaseOutput>,
    conflicts: Conflict[],
    resolutions: Conflict[],
    recommendation: any
  ): string {
    const lines: string[] = [
      `## ${task} — Final Recommendation`,
      '',
    ];
    
    // Add reasoning if configured
    if (this.config.include_reasoning) {
      lines.push('### Reasoning');
      lines.push('');
      lines.push('Based on parallel analysis across four dimensions:');
      lines.push('');
      
      if (outputs['research']) {
        const research = outputs['research'];
        lines.push(`- **Context**: ${research.status === 'complete' ? '✅ Gathered' : '❌ Missing'}`);
      }
      if (outputs['audit']) {
        const audit = outputs['audit'];
        lines.push(`- **Current State**: ${audit.status === 'complete' ? '✅ Audited' : '❌ Missing'}`);
      }
      if (outputs['draft']) {
        const draft = outputs['draft'];
        lines.push(`- **Options**: ${draft.status === 'complete' ? '✅ Drafted' : '❌ Missing'}`);
      }
      if (outputs['verify']) {
        const verify = outputs['verify'];
        lines.push(`- **Validation**: ${verify.status === 'complete' ? '✅ Verified' : '❌ Missing'}`);
      }
      lines.push('');
    }
    
    // Recommendation section
    lines.push('### Recommended Approach');
    lines.push('');
    lines.push(`**${recommendation.approach}** (confidence: ${recommendation.confidence}%)`);
    lines.push('');
    
    // Key findings from each phase
    lines.push('### Key Findings');
    lines.push('');
    
    if (outputs['research']?.status === 'complete') {
      lines.push('**From Research:**');
      lines.push(outputs['research'].summary || 'Context gathered successfully');
      lines.push('');
    }
    
    if (outputs['audit']?.status === 'complete') {
      lines.push('**From Audit:**');
      lines.push(outputs['audit'].summary || 'Current state analyzed');
      lines.push('');
    }
    
    // Conflicts and resolutions
    if (conflicts.length > 0) {
      lines.push('### Conflicts Resolved');
      lines.push('');
      resolutions.forEach((r, i) => {
        lines.push(`${i + 1}. **${r.type}**: ${r.description}`);
        lines.push(`   → Resolution: ${r.resolution}`);
        lines.push('');
      });
    }
    
    // Implementation plan
    lines.push('### Implementation Plan');
    lines.push('');
    
    if (outputs['draft']?.content) {
      // Extract implementation steps from draft
      const draftLines = outputs['draft'].content.split('\n');
      const planStart = draftLines.findIndex(l => l.includes('Implementation') || l.includes('Plan'));
      if (planStart >= 0) {
        const planLines = draftLines.slice(planStart, planStart + 10);
        lines.push(...planLines);
      } else {
        lines.push('1. Review and approve recommended approach');
        lines.push('2. Implement with test coverage');
        lines.push('3. Run /grill before final merge');
      }
    }
    
    lines.push('');
    
    // Decision needed
    if (recommendation.requiresManualDecision) {
      lines.push('⚠️ **Decision Required**: Review conflicts and confirm approach before proceeding');
    } else {
      lines.push('✅ **Ready to Implement**: No blocking conflicts detected');
    }
    
    return lines.join('\n');
  }
}

// Types
export interface PhaseOutput {
  phase: string;
  status: 'complete' | 'failed' | 'pending';
  content: string;
  summary?: string;
  timestamp: number;
}

export interface SynthesisConfig {
  conflict_resolution: 'auto' | 'manual' | 'prompt';
  format: 'markdown' | 'json';
  include_reasoning: boolean;
}

// Main function for CLI usage
export function synthesizeOutputs(task: string, outputsJson: string): string {
  const outputs: Record<string, PhaseOutput> = JSON.parse(outputsJson);
  const config: SynthesisConfig = {
    conflict_resolution: 'auto',
    format: 'markdown',
    include_reasoning: true,
  };
  
  const synthesizer = new Synthesizer(config);
  return synthesizer.synthesize(task, outputs);
}

// CLI entry point
if (require.main === module) {
  const [task, outputsJson] = process.argv.slice(2);
  if (!task || !outputsJson) {
    console.error('Usage: synthesizer.ts "<task>" \'<outputs_json>\'');
    process.exit(1);
  }
  console.log(synthesizeOutputs(task, outputsJson));
}
