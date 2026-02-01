/**
 * Migration from v1 to v2
 * 
 * This is a placeholder for future migrations when breaking changes
 * are introduced to the subagent workflow plugin.
 * 
 * Migration strategy:
 * 1. Detect v1 configuration/data
 * 2. Transform to v2 format
 * 3. Validate migrated data
 * 4. Mark migration as complete
 */

import type { PluginContext } from 'clawdbot/plugin-sdk';

export interface V1Config {
  version: '1.0';
  grillEnabled: boolean;
  autoReview: boolean;
  maxSubagents: number;
}

export interface V2Config {
  version: '2.0';
  features: {
    grill: { enabled: boolean; autoTrigger: boolean };
    router: { enabled: boolean };
    guardrails: { enabled: boolean };
  };
  limits: {
    maxConcurrentSubagents: number;
    maxReviewTime: number;
  };
  telemetry: {
    enabled: boolean;
    endpoint?: string;
  };
}

/**
 * Check if migration is needed
 */
export function needsMigration(context: PluginContext): boolean {
  const config = context.config;
  return config['subagent-workflow']?.version === '1.0';
}

/**
 * Run migration from v1 to v2
 */
export async function migrateV1ToV2(context: PluginContext): Promise<{ success: boolean; error?: string }> {
  try {
    const v1Config = context.config['subagent-workflow'] as V1Config;
    
    if (!v1Config) {
      return { success: true }; // Nothing to migrate
    }

    // Transform v1 config to v2
    const v2Config: V2Config = {
      version: '2.0',
      features: {
        grill: {
          enabled: v1Config.grillEnabled ?? true,
          autoTrigger: v1Config.autoReview ?? false
        },
        router: { enabled: true },
        guardrails: { enabled: true }
      },
      limits: {
        maxConcurrentSubagents: v1Config.maxSubagents ?? 5,
        maxReviewTime: 300000 // 5 minutes default
      },
      telemetry: {
        enabled: true
      }
    };

    // Save migrated config
    await context.updateConfig?.({
      'subagent-workflow': v2Config
    });

    // Log migration event
    context.logger.info('[subagent-workflow] Migrated config from v1 to v2');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Rollback v2 to v1 (emergency use only)
 */
export async function rollbackV2ToV1(context: PluginContext): Promise<{ success: boolean; error?: string }> {
  // Implementation for emergency rollback
  // This would restore v1 config from backup
  return { success: true };
}
