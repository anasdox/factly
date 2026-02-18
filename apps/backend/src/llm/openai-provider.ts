import OpenAI from 'openai';
import { LLMProvider, OutputTraceabilityContext, ChatStreamCallbacks } from './provider';
import { ChatToolDefinition } from './chat-prompts';
import { EXTRACTION_SYSTEM_PROMPT, INSIGHTS_SYSTEM_PROMPT, RECOMMENDATIONS_SYSTEM_PROMPT, DEDUP_CHECK_SYSTEM_PROMPT, DEDUP_SCAN_SYSTEM_PROMPT, UPDATE_PROPOSAL_SYSTEM_PROMPT, IMPACT_CHECK_SYSTEM_PROMPT, buildOutputsPrompt, buildOutputsUserContent, buildDedupCheckUserContent, buildDedupScanUserContent, buildUpdateProposalUserContent, buildImpactCheckUserContent, parseStringArray, parseFactArray, parseInsightArray, parseRecommendationArray, parseDedupCheckResult, parseDedupScanResult, parseUpdateProposal, parseImpactCheckResult, ExtractedFact, ExtractedInsight, ExtractedRecommendation, DedupResult, DedupGroup, UpdateProposal, ImpactCheckResult } from './prompts';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private embeddingsModel?: string;
  private readonly maxCompletionTokens = 4096;
  private tempExtraction: number;
  private tempDedup: number;
  private tempImpact: number;
  private tempProposal: number;

  constructor(apiKey: string, model?: string, embeddingsModel?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model || 'gpt-4o';
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
    const withMaxCompletionTokens = {
      ...params,
      stream: false,
      max_completion_tokens: tokens,
    };

    try {
      return await this.client.chat.completions.create(
        withMaxCompletionTokens as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
      );
    } catch (err: any) {
      if (this.isUnsupportedParamError(err, 'max_completion_tokens')) {
        const withMaxTokens = {
          ...params,
          stream: false,
          max_tokens: tokens,
        };
        return await this.client.chat.completions.create(
          withMaxTokens as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
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

  async chatStream(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    tools: ChatToolDefinition[],
    callbacks: ChatStreamCallbacks,
  ): Promise<void> {
    const tempChat = parseFloat(process.env.LLM_TEMP_CHAT || '0.4');
    const maxTokens = parseInt(process.env.LLM_CHAT_MAX_TOKENS || '4096', 10);

    const openaiTools: OpenAI.Chat.ChatCompletionTool[] = tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    const stream = await this.client.chat.completions.create({
      model: this.model,
      temperature: tempChat,
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      tools: openaiTools,
    });

    // Accumulate tool calls across chunks
    const toolCallAccumulators = new Map<number, { name: string; arguments: string }>();

    try {
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        const delta = choice.delta;

        // Text content
        if (delta.content) {
          callbacks.onToken(delta.content);
        }

        // Tool calls
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCallAccumulators.has(tc.index)) {
              toolCallAccumulators.set(tc.index, { name: '', arguments: '' });
            }
            const acc = toolCallAccumulators.get(tc.index)!;
            if (tc.function?.name) acc.name = tc.function.name;
            if (tc.function?.arguments) acc.arguments += tc.function.arguments;
          }
        }

        // Finish
        if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
          // Emit accumulated tool calls
          toolCallAccumulators.forEach((acc) => {
            try {
              const params = JSON.parse(acc.arguments);
              callbacks.onToolCall(acc.name, params);
            } catch {
              callbacks.onError(`Failed to parse tool call parameters for ${acc.name}`);
            }
          });
        }
      }

      callbacks.onDone();
    } catch (err: any) {
      callbacks.onError(err?.message || 'Unknown streaming error');
    }
  }
}
