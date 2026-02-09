import OpenAI from 'openai';
import { LLMProvider, OutputTraceabilityContext } from './provider';
import { EXTRACTION_SYSTEM_PROMPT, INSIGHTS_SYSTEM_PROMPT, RECOMMENDATIONS_SYSTEM_PROMPT, buildOutputsPrompt, buildOutputsUserContent, parseStringArray, parseFactArray, parseInsightArray, parseRecommendationArray, ExtractedFact, ExtractedInsight, ExtractedRecommendation } from './prompts';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o';
  }

  private extractText(response: OpenAI.Chat.ChatCompletion): string {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }
    return content;
  }

  async extractFacts(text: string, goal: string): Promise<ExtractedFact[]> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 2048,
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
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
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
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
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
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
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
