import OpenAI from 'openai';
import { LLMProvider, OutputTraceabilityContext } from './provider';
import { EXTRACTION_SYSTEM_PROMPT, INSIGHTS_SYSTEM_PROMPT, RECOMMENDATIONS_SYSTEM_PROMPT, DEDUP_CHECK_SYSTEM_PROMPT, DEDUP_SCAN_SYSTEM_PROMPT, UPDATE_PROPOSAL_SYSTEM_PROMPT, IMPACT_CHECK_SYSTEM_PROMPT, buildOutputsPrompt, buildOutputsUserContent, buildDedupCheckUserContent, buildDedupScanUserContent, buildUpdateProposalUserContent, buildImpactCheckUserContent, parseStringArray, parseFactArray, parseInsightArray, parseRecommendationArray, parseDedupCheckResult, parseDedupScanResult, parseUpdateProposal, parseImpactCheckResult, ExtractedFact, ExtractedInsight, ExtractedRecommendation, DedupResult, DedupGroup, UpdateProposal, ImpactCheckResult } from './prompts';

export class OpenAICompatibleProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private embeddingsModel?: string;
  private readonly maxCompletionTokens = 4096;
  private tempExtraction: number;
  private tempDedup: number;
  private tempImpact: number;
  private tempProposal: number;

  constructor(apiKey: string, baseUrl: string, model?: string, embeddingsModel?: string) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
    this.model = model || 'gpt-oss-120b';
    this.embeddingsModel = embeddingsModel;
    this.tempExtraction = parseFloat(process.env.LLM_TEMP_EXTRACTION || '0.2');
    this.tempDedup = parseFloat(process.env.LLM_TEMP_DEDUP || '0.1');
    this.tempImpact = parseFloat(process.env.LLM_TEMP_IMPACT || '0.1');
    this.tempProposal = parseFloat(process.env.LLM_TEMP_PROPOSAL || '0.3');
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
    maxTokens?: number,
  ): Promise<OpenAI.Chat.ChatCompletion> {
    const tokens = maxTokens ?? this.maxCompletionTokens;
    const withMaxTokens = {
      ...params,
      stream: false,
      max_tokens: tokens,
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
          max_completion_tokens: tokens,
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
      temperature: this.tempExtraction,
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
      temperature: this.tempExtraction,
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
      temperature: this.tempExtraction,
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
      temperature: this.tempExtraction,
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

  async checkDuplicates(text: string, candidates: { id: string; text: string }[]): Promise<DedupResult[]> {
    const response = await this.createChatCompletion({
      model: this.model,
      temperature: this.tempDedup,
      messages: [
        { role: 'system', content: DEDUP_CHECK_SYSTEM_PROMPT },
        { role: 'user', content: buildDedupCheckUserContent(text, candidates) },
      ],
    });

    return parseDedupCheckResult(this.extractText(response), candidates);
  }

  async scanDuplicates(items: { id: string; text: string }[]): Promise<DedupGroup[]> {
    const response = await this.createChatCompletion({
      model: this.model,
      temperature: this.tempDedup,
      messages: [
        { role: 'system', content: DEDUP_SCAN_SYSTEM_PROMPT },
        { role: 'user', content: buildDedupScanUserContent(items) },
      ],
    });

    return parseDedupScanResult(this.extractText(response), items);
  }

  async proposeUpdate(entityType: string, currentText: string, upstreamOldText: string, upstreamNewText: string, upstreamEntityType: string, goal: string, outputType?: string): Promise<UpdateProposal> {
    const systemPrompt = outputType
      ? `${UPDATE_PROPOSAL_SYSTEM_PROMPT}\n\nThe entity is an output of type "${outputType}". Produce the proposed_text in professional Markdown format.`
      : UPDATE_PROPOSAL_SYSTEM_PROMPT;

    const response = await this.createChatCompletion({
      model: this.model,
      temperature: this.tempProposal,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUpdateProposalUserContent(entityType, currentText, upstreamOldText, upstreamNewText, upstreamEntityType, goal) },
      ],
    }, 1024);

    return parseUpdateProposal(this.extractText(response));
  }

  async checkImpact(oldText: string, newText: string, children: { id: string; text: string }[]): Promise<ImpactCheckResult[]> {
    const userContent = buildImpactCheckUserContent(oldText, newText, children);
    console.log('[impact-check] LLM request user content:', userContent);

    const response = await this.createChatCompletion({
      model: this.model,
      temperature: this.tempImpact,
      messages: [
        { role: 'system', content: IMPACT_CHECK_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }, 1024);

    const rawText = this.extractText(response);
    console.log('[impact-check] LLM raw response:', rawText);

    const result = parseImpactCheckResult(rawText, children);
    console.log('[impact-check] Parsed result:', JSON.stringify(result));
    return result;
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.embeddingsModel) {
      throw new Error('Embeddings model not configured');
    }
    const response = await this.client.embeddings.create({
      model: this.embeddingsModel,
      input: texts,
    });
    return response.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}
