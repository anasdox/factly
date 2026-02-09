import { AnthropicProvider } from './anthropic-provider';
import { OpenAIProvider } from './openai-provider';
import { ExtractedFact, ExtractedInsight, ExtractedRecommendation, OutputTraceabilityContext } from './prompts';

export type { OutputTraceabilityContext };

export interface LLMProvider {
  extractFacts(text: string, goal: string): Promise<ExtractedFact[]>;
  extractInsights(facts: string[], goal: string): Promise<ExtractedInsight[]>;
  extractRecommendations(insights: string[], goal: string): Promise<ExtractedRecommendation[]>;
  formulateOutputs(recommendations: string[], goal: string, outputType: string, context?: OutputTraceabilityContext): Promise<string[]>;
}

export function createProvider(): LLMProvider | null {
  const providerName = process.env.LLM_PROVIDER;
  const apiKey = process.env.LLM_API_KEY;

  if (!providerName || !apiKey) {
    return null;
  }

  if (providerName === 'anthropic') {
    return new AnthropicProvider(apiKey, process.env.LLM_MODEL);
  }

  if (providerName === 'openai') {
    return new OpenAIProvider(apiKey, process.env.LLM_MODEL);
  }

  return null;
}
