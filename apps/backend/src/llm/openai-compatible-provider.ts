import OpenAI from 'openai';
import { LLMProvider, OutputTraceabilityContext } from './provider';
import { EXTRACTION_SYSTEM_PROMPT, INSIGHTS_SYSTEM_PROMPT, RECOMMENDATIONS_SYSTEM_PROMPT, buildOutputsPrompt, buildOutputsUserContent, parseStringArray, parseFactArray, parseInsightArray, parseRecommendationArray, ExtractedFact, ExtractedInsight, ExtractedRecommendation } from './prompts';

export class OpenAICompatibleProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private readonly maxCompletionTokens = 4096;

  constructor(apiKey: string, baseUrl: string, model?: string) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
    this.model = model || 'gpt-oss-120b';
  }

  private extractText(response: OpenAI.Chat.ChatCompletion): string {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }
    return content;
  }

  private isUnsupportedParamError(err: any, param: string): boolean {
    const message = typeof err?.message === 'string' ? err.message : '';
    return message.includes(`Unsupported parameter: '${param}'`);
  }

  private async createChatCompletion(
    params: Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, 'max_tokens' | 'max_completion_tokens'>,
  ): Promise<OpenAI.Chat.ChatCompletion> {
    const withMaxTokens = {
      ...params,
      stream: false,
      max_tokens: this.maxCompletionTokens,
    };

    try {
      return await this.client.chat.completions.create(
        withMaxTokens as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
      );
    } catch (err: any) {
      if (this.isUnsupportedParamError(err, 'max_tokens')) {
        const withMaxCompletionTokens = {
          ...params,
          stream: false,
          max_completion_tokens: this.maxCompletionTokens,
        };
        return await this.client.chat.completions.create(
          withMaxCompletionTokens as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
        );
      }
      throw err;
    }
  }

  async extractFacts(text: string, goal: string): Promise<ExtractedFact[]> {
    const response = await this.createChatCompletion({
      model: this.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Research goal: ${goal}\n\nText to extract facts from:\n${text}`,
        },
      ],
    });

    return parseFactArray(this.extractText(response));
  }

  async extractInsights(facts: string[], goal: string): Promise<ExtractedInsight[]> {
    const numberedFacts = facts.map((f, i) => `${i + 1}. ${f}`).join('\n');
    const response = await this.createChatCompletion({
      model: this.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: INSIGHTS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Research goal: ${goal}\n\nFacts to derive insights from:\n${numberedFacts}`,
        },
      ],
    });

    return parseInsightArray(this.extractText(response));
  }

  async extractRecommendations(insights: string[], goal: string): Promise<ExtractedRecommendation[]> {
    const numberedInsights = insights.map((ins, i) => `${i + 1}. ${ins}`).join('\n');
    const response = await this.createChatCompletion({
      model: this.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: RECOMMENDATIONS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Research goal: ${goal}\n\nInsights to formulate recommendations from:\n${numberedInsights}`,
        },
      ],
    });

    return parseRecommendationArray(this.extractText(response));
  }

  async formulateOutputs(recommendations: string[], goal: string, outputType: string, context?: OutputTraceabilityContext): Promise<string[]> {
    const response = await this.createChatCompletion({
      model: this.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildOutputsPrompt(outputType) },
        {
          role: 'user',
          content: buildOutputsUserContent(recommendations, goal, context),
        },
      ],
    });

    return parseStringArray(this.extractText(response));
  }
}
