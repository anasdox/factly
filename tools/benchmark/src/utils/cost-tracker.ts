export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostEstimate {
  tokens: TokenUsage;
  estimatedUsd: number;
}

const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4.1': { input: 0.002, output: 0.008 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015 },
  'claude-haiku-3-5': { input: 0.0008, output: 0.004 },
  'text-embedding-3-small': { input: 0.00002, output: 0 },
  'text-embedding-3-large': { input: 0.00013, output: 0 },
};

export class CostTracker {
  private entries: CostEstimate[] = [];

  track(inputTokens: number, outputTokens: number, model: string): CostEstimate {
    const totalTokens = inputTokens + outputTokens;
    const rates = COST_PER_1K_TOKENS[model] || { input: 0.003, output: 0.015 };
    const estimatedUsd =
      (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;

    const entry: CostEstimate = {
      tokens: { inputTokens, outputTokens, totalTokens },
      estimatedUsd,
    };
    this.entries.push(entry);
    return entry;
  }

  getTotal(): CostEstimate {
    const tokens: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let estimatedUsd = 0;

    for (const e of this.entries) {
      tokens.inputTokens += e.tokens.inputTokens;
      tokens.outputTokens += e.tokens.outputTokens;
      tokens.totalTokens += e.tokens.totalTokens;
      estimatedUsd += e.estimatedUsd;
    }

    return { tokens, estimatedUsd };
  }

  reset(): void {
    this.entries = [];
  }
}
