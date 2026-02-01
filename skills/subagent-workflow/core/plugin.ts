import type { 
  ClawdbotPlugin, 
  PluginContext, 
  CommandHandler,
  ToolInterceptor,
  HookHandler 
} from 'clawdbot/plugin-sdk';
import { grillHandler } from './commands/grill';
import { routerHandler } from './commands/router';
import { guardInterceptor } from './interceptors/guard-interceptor';
import { autoGrillHook } from './hooks/pre-pr-hook';
import { guardHook } from './hooks/audit-hook';
import { trackSubagentSpawn } from './hooks/post-spawn-hook';
import { TelemetryCollector } from './telemetry';
import { HealthChecker } from './health-check';

/**
 * Subagent Workflow Plugin
 * 
 * Provides automated code review, subagent routing, and safety guardrails
 * for the Clawdbot subagent workflow system.
 */
export const subagentWorkflowPlugin: ClawdbotPlugin = {
  name: 'subagent-workflow',
  version: '1.0.0',
  description: 'Automated subagent workflow with guardrails and telemetry',
  
  onLoad(context: PluginContext): void {
    const telemetry = new TelemetryCollector(context.config.telemetry);
    const healthChecker = new HealthChecker(context);

    // Register diagnostic command
    context.registerCommand('/subagent-doctor', async (ctx) => {
      const report = await healthChecker.runDiagnostics();
      await ctx.reply(report.format());
    });

    // Register main workflow commands
    context.registerCommand('/grill', (ctx) => grillHandler(ctx, { telemetry }));
    context.registerCommand('/subagent', (ctx) => routerHandler(ctx, { telemetry }));
    
    // Register phrase triggers for natural language routing
    context.registerPhraseTrigger('use subagents', (ctx) => routerHandler(ctx, { telemetry }));
    context.registerPhraseTrigger('spawn subagent', (ctx) => routerHandler(ctx, { telemetry, skipConfirm: false }));
    
    // Register tool interceptors for safety guardrails
    context.registerToolInterceptor(['message:send', 'write', 'edit', 'exec'], 
      (ctx) => guardInterceptor(ctx, { telemetry })
    );
    
    // Register lifecycle hooks
    context.on('pre-pr', (payload) => autoGrillHook(payload, { telemetry }));
    context.on('high-risk-tool', (payload) => guardHook(payload, { telemetry }));
    context.on('subagent-spawn', (payload) => trackSubagentSpawn(payload, { telemetry }));
    
    // Initialize telemetry if enabled
    if (context.config.telemetry?.enabled !== false) {
      telemetry.initialize();
    }

    context.logger.info(`[${this.name}] Plugin loaded successfully`);
  },
  
  onUnload(): void {
    // Cleanup resources, flush telemetry, etc.
    // This runs when the plugin is disabled or the gateway shuts down
  }
};

export default subagentWorkflowPlugin;
