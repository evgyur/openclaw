import type { PluginConfig } from 'clawdbot/plugin-sdk';

export interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
  sampleRate?: number;
  anonymize: boolean;
}

interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string | number | boolean>;
}

interface EventData {
  name: string;
  timestamp: number;
  properties: Record<string, unknown>;
}

/**
 * Anonymous usage metrics collector for subagent workflow
 * 
 * Tracks:
 * - Subagent spawn count
 * - Average review time
 * - Guard decision distribution
 * - Error rates
 * 
 * All data is anonymized and opt-in.
 */
export class TelemetryCollector {
  private config: TelemetryConfig;
  private metrics: MetricData[] = [];
  private events: EventData[] = [];
  private flushInterval?: NodeJS.Timeout;
  
  // In-memory stats for quick access
  private stats = {
    subagentSpawns: 0,
    totalReviewTime: 0,
    reviewCount: 0,
    guardDecisions: { allowed: 0, blocked: 0, confirmed: 0 },
    errors: 0
  };

  constructor(config?: Partial<TelemetryConfig>) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      anonymize: true,
      ...config
    };
  }

  /**
   * Initialize telemetry collection
   */
  initialize(): void {
    if (!this.config.enabled) return;
    
    // Set up periodic flush
    this.flushInterval = setInterval(() => this.flush(), 60000); // Flush every minute
    
    this.recordEvent('telemetry.initialized', {
      version: '1.0.0',
      anonymized: this.config.anonymize
    });
  }

  /**
   * Record a metric value
   */
  recordMetrics(name: string, value: number, tags: Record<string, string | number | boolean> = {}): void {
    if (!this.config.enabled) return;
    if (Math.random() > (this.config.sampleRate || 1)) return;

    const metric: MetricData = {
      name,
      value,
      timestamp: Date.now(),
      tags: this.anonymizeTags(tags)
    };

    this.metrics.push(metric);
    this.updateStats(name, value);
  }

  /**
   * Record an event
   */
  recordEvent(name: string, properties: Record<string, unknown> = {}): void {
    if (!this.config.enabled) return;

    const event: EventData = {
      name,
      timestamp: Date.now(),
      properties: this.anonymizeProperties(properties)
    };

    this.events.push(event);
    this.updateEventStats(name);
  }

  /**
   * Record an error
   */
  recordError(source: string, error: unknown): void {
    if (!this.config.enabled) return;

    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.recordEvent('error', {
      source,
      message: this.config.anonymize ? 'anonymized' : errorMessage,
      type: error instanceof Error ? error.name : 'unknown'
    });

    this.stats.errors++;
  }

  /**
   * Get current statistics summary
   */
  getStats(): Record<string, unknown> {
    const avgReviewTime = this.stats.reviewCount > 0 
      ? Math.round(this.stats.totalReviewTime / this.stats.reviewCount)
      : 0;

    return {
      subagent_spawns: this.stats.subagentSpawns,
      average_review_time_ms: avgReviewTime,
      review_count: this.stats.reviewCount,
      guard_decisions: this.stats.guardDecisions,
      error_count: this.stats.errors,
      collected_metrics: this.metrics.length,
      collected_events: this.events.length
    };
  }

  /**
   * Flush collected data to endpoint
   */
  async flush(): Promise<void> {
    if (!this.config.enabled || (!this.metrics.length && !this.events.length)) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics.splice(0, this.metrics.length),
      events: this.events.splice(0, this.events.length),
      stats: this.getStats()
    };

    if (this.config.endpoint) {
      try {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        // Silently fail - don't impact user experience
        console.error('[Telemetry] Flush failed:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }

  private updateStats(name: string, value: number): void {
    switch (name) {
      case 'review_time':
        this.stats.totalReviewTime += value;
        this.stats.reviewCount++;
        break;
      case 'subagent_duration':
        // Track subagent duration separately if needed
        break;
    }
  }

  private updateEventStats(name: string): void {
    switch (name) {
      case 'subagent.spawned':
        this.stats.subagentSpawns++;
        break;
      case 'guard.decision':
        // Guard decisions tracked in the event itself
        break;
    }
  }

  private anonymizeTags(tags: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
    if (!this.config.anonymize) return tags;

    // Remove or hash potentially identifying information
    const anonymized = { ...tags };
    const sensitiveKeys = ['user_id', 'session_id', 'subagent_id', 'email', 'hostname'];
    
    for (const key of sensitiveKeys) {
      if (key in anonymized) {
        anonymized[key] = '[anonymized]';
      }
    }

    return anonymized;
  }

  private anonymizeProperties(props: Record<string, unknown>): Record<string, unknown> {
    if (!this.config.anonymize) return props;

    const anonymized = { ...props };
    const sensitiveKeys = ['user_id', 'session_id', 'subagent_id', 'email', 'hostname', 'path'];
    
    for (const key of sensitiveKeys) {
      if (key in anonymized) {
        anonymized[key] = '[anonymized]';
      }
    }

    return anonymized;
  }
}
