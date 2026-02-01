/**
 * Tests for use-subagents synthesizer
 */

import { describe, it, expect } from 'vitest';
import { synthesizeWorkerOutputs, type WorkerResult } from './synthesizer.js';

describe('use-subagents synthesizer', () => {
  describe('synthesizeWorkerOutputs', () => {
    it('generates synthesis from completed workers', () => {
      const results: WorkerResult[] = [
        {
          role: 'research',
          label: 'auth-research',
          status: 'completed',
          output: 'Found OAuth2 best practices in docs.',
        },
        {
          role: 'audit',
          label: 'auth-audit',
          status: 'completed',
          output: 'Current JWT implementation has token expiry bugs.',
        },
        {
          role: 'draft',
          label: 'auth-draft',
          status: 'completed',
          output: '**Option A**: Refresh tokens\n**Recommendation**: Option A',
        },
        {
          role: 'verify',
          label: 'auth-verify',
          status: 'completed',
          output: 'Option A requires database migration.',
        },
      ];

      const synthesis = synthesizeWorkerOutputs('Refactor auth system', results);

      expect(synthesis).toContain('Synthesis: Refactor auth system');
      expect(synthesis).toContain('Parallel Analysis Complete');
      expect(synthesis).toContain('✓ RESEARCH');
      expect(synthesis).toContain('✓ AUDIT');
      expect(synthesis).toContain('✓ DRAFT');
      expect(synthesis).toContain('✓ VERIFY');
    });

    it('handles worker failures gracefully', () => {
      const results: WorkerResult[] = [
        {
          role: 'research',
          label: 'auth-research',
          status: 'completed',
          output: 'Research complete.',
        },
        {
          role: 'audit',
          label: 'auth-audit',
          status: 'failed',
          output: '',
        },
        {
          role: 'draft',
          label: 'auth-draft',
          status: 'timeout',
          output: '',
        },
        {
          role: 'verify',
          label: 'auth-verify',
          status: 'completed',
          output: 'Verify complete.',
        },
      ];

      const synthesis = synthesizeWorkerOutputs('Test task', results);

      expect(synthesis).toContain('(2/4 workers)');
      expect(synthesis).toContain('✗ AUDIT');
      expect(synthesis).toContain('⏱ DRAFT');
    });

    it('detects conflicts between research and audit', () => {
      const results: WorkerResult[] = [
        {
          role: 'research',
          label: 'test-research',
          status: 'completed',
          output: 'Best practice approach recommended.',
        },
        {
          role: 'audit',
          label: 'test-audit',
          status: 'completed',
          output: 'Found critical security vulnerability in current approach.',
        },
        {
          role: 'draft',
          label: 'test-draft',
          status: 'completed',
          output: 'Options listed.',
        },
        {
          role: 'verify',
          label: 'test-verify',
          status: 'completed',
          output: 'Verification complete.',
        },
      ];

      const synthesis = synthesizeWorkerOutputs('Test task', results);

      expect(synthesis).toContain('⚠️ Conflicts Detected');
    });

    it('ranks draft options based on verify output', () => {
      const results: WorkerResult[] = [
        {
          role: 'research',
          label: 'test-research',
          status: 'completed',
          output: 'Context gathered.',
        },
        {
          role: 'audit',
          label: 'test-audit',
          status: 'completed',
          output: 'Audit complete.',
        },
        {
          role: 'draft',
          label: 'test-draft',
          status: 'completed',
          output: '**Option A**: Simple\n**Option B**: Complex\n**Option C**: Hybrid',
        },
        {
          role: 'verify',
          label: 'test-verify',
          status: 'completed',
          output: 'Option A looks good. Option B has migration risks.',
        },
      ];

      const synthesis = synthesizeWorkerOutputs('Test task', results);

      expect(synthesis).toContain('Verified Ranking');
      expect(synthesis).toContain('Option A');
    });
  });
});
