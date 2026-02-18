import { AnthropicProvider } from './anthropic-provider';
import { OpenAICompatibleProvider } from './openai-compatible-provider';
import { OpenAIProvider } from './openai-provider';
import { ExtractedFact, ExtractedInsight, ExtractedRecommendation, OutputTraceabilityContext, DedupResult, DedupGroup, UpdateProposal, ImpactCheckResult } from './prompts';
import { ChatToolDefinition } from './chat-prompts';

export type { OutputTraceabilityContext };

export interface ChatStreamCallbacks {
  onToken: (text: string) => void;
  onToolCall: (tool: string, params: Record<string, unknown>) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export interface LLMProvider {
  extractFacts(text: string, goal: string): Promise<ExtractedFact[]>;
  extractInsights(facts: string[], goal: string): Promise<ExtractedInsight[]>;
  extractRecommendations(insights: string[], goal: string): Promise<ExtractedRecommendation[]>;
  formulateOutputs(recommendations: string[], goal: string, outputType: string, context?: OutputTraceabilityContext): Promise<string[]>;
  checkDuplicates(text: string, candidates: { id: string; text: string }[]): Promise<DedupResult[]>;
  scanDuplicates(items: { id: string; text: string }[]): Promise<DedupGroup[]>;
  proposeUpdate(entityType: string, currentText: string, upstreamOldText: string, upstreamNewText: string, upstreamEntityType: string, goal: string, outputType?: string): Promise<UpdateProposal>;
  checkImpact(oldText: string, newText: string, children: { id: string; text: string }[]): Promise<ImpactCheckResult[]>;
  getEmbeddings?(texts: string[]): Promise<number[][]>;
  chatStream(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    tools: ChatToolDefinition[],
    callbacks: ChatStreamCallbacks,
  ): Promise<void>;
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
    return new OpenAIProvider(apiKey, process.env.LLM_MODEL, process.env.LLM_EMBEDDINGS_MODEL);
  }

  if (providerName === 'openai-compatible') {
    const baseUrl = process.env.LLM_BASE_URL;
    if (!baseUrl) {
      throw new Error('LLM_BASE_URL is required when using the openai-compatible provider');
    }
    return new OpenAICompatibleProvider(apiKey, baseUrl, process.env.LLM_MODEL, process.env.LLM_EMBEDDINGS_MODEL);
  }

  return null;
}
