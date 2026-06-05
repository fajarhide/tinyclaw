import type { LlmUsageStats } from "@tinyclaw/core";
import type { DatabaseAdapter } from "@tinyclaw/db";
import {
  estimateUsageCostUsd,
  type PricingContext,
} from "../providers/pricing";

export class LlmUsageTracker {
  private requestCount = 0;
  private inputTokens = 0;
  private outputTokens = 0;
  private estimatedCostUsd = 0;
  private trackedSince = new Date().toISOString();
  private pricingContext: PricingContext = {};

  private constructor(private readonly db?: DatabaseAdapter) {}

  static async create(db?: DatabaseAdapter): Promise<LlmUsageTracker> {
    const tracker = new LlmUsageTracker(db);
    await tracker.load();
    return tracker;
  }

  private async load(): Promise<void> {
    if (!this.db) {
      return;
    }

    const stored = await this.db.getLlmUsageStats();
    if (!stored) {
      return;
    }

    this.requestCount = stored.requestCount;
    this.inputTokens = stored.inputTokens;
    this.outputTokens = stored.outputTokens;
    this.estimatedCostUsd = stored.estimatedCostUsd;
    this.trackedSince = stored.trackedSince;
  }

  setPricingContext(context: PricingContext): void {
    this.pricingContext = context;
  }

  record(modelId: string, inputTokens: number, outputTokens: number): void {
    const costDelta = estimateUsageCostUsd(
      modelId,
      inputTokens,
      outputTokens,
      this.pricingContext,
    );

    this.requestCount += 1;
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
    this.estimatedCostUsd += costDelta;

    void this.persist({
      requestCount: 1,
      inputTokens,
      outputTokens,
      estimatedCostUsd: costDelta,
    });
  }

  private async persist(delta: {
    requestCount: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  }): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      await this.db.incrementLlmUsageStats(delta, this.trackedSince);
    } catch (error) {
      console.warn("Failed to persist LLM usage stats:", error);
    }
  }

  getStats(): LlmUsageStats {
    return {
      requestCount: this.requestCount,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.inputTokens + this.outputTokens,
      estimatedCostUsd: this.estimatedCostUsd,
      trackedSince: this.trackedSince,
    };
  }
}
