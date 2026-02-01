/**
 * Test Mocks Exports
 * 
 * Mock objects for testing subagent workflow components.
 */

// Git mocks
export {
  parseDiff,
  getChangedFiles,
  countChanges,
  mockGitDiff,
  mockGitStatus,
  mockRepoStates,
} from './mock-git';

export type {
  GitDiff,
  DiffHunk,
  DiffLine,
} from './mock-git';

// Opus guard mocks
export {
  MockOpusGuard,
  createMockOpusGuard,
  riskScenarios,
} from './mock-opus';

export type {
  OpusRequest,
  OpusDecision,
  AuditEntry,
} from './mock-opus';

// Session mocks
export {
  MockSessionManager,
  createMockRouter,
  spawnParallelWorkers,
  waitForSynthesis,
  mockResponses,
} from './mock-sessions';

export type {
  MockSession,
  SubagentResponse,
} from './mock-sessions';
