import { AnthropicProvider } from './anthropic-provider';
import { OpenAIProvider } from './openai-provider';

export interface LLMProvider {
  extractFacts(text: string, goal: string): Promise<string[]>;
  extractInsights(facts: string[], goal: string): Promise<string[]>;
  extractRecommendations(insights: string[], goal: string): Promise<string[]>;
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
