import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, ChatStreamCallbacks } from './provider';
import { ChatToolDefinition } from './chat-prompts';
import { EXTRACTION_SYSTEM_PROMPT, INSIGHTS_SYSTEM_PROMPT, RECOMMENDATIONS_SYSTEM_PROMPT, DEDUP_CHECK_SYSTEM_PROMPT, DEDUP_SCAN_SYSTEM_PROMPT, UPDATE_PROPOSAL_SYSTEM_PROMPT, IMPACT_CHECK_SYSTEM_PROMPT, buildOutputsPrompt, buildOutputsUserContent, buildDedupCheckUserContent, buildDedupScanUserContent, buildUpdateProposalUserContent, buildImpactCheckUserContent, parseStringArray, parseFactArray, parseInsightArray, parseRecommendationArray, parseDedupCheckResult, parseDedupScanResult, parseUpdateProposal, parseImpactCheckResult, ExtractedFact, ExtractedInsight, ExtractedRecommendation, OutputTraceabilityContext, DedupResult, DedupGroup, UpdateProposal, ImpactCheckResult } from './prompts';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private tempExtraction: number;
  private tempDedup: number;
  private tempImpact: number;
  private tempProposal: number;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-sonnet-4-5-20250929';
    this.tempExtraction = parseFloat(process.env.LLM_TEMP_EXTRACTION || '0.2');
    this.tempDedup = parseFloat(process.env.LLM_TEMP_DEDUP || '0.1');
    this.tempImpact = parseFloat(process.env.LLM_TEMP_IMPACT || '0.1');
    this.tempProposal = parseFloat(process.env.LLM_TEMP_PROPOSAL || '0.3');
  }

  private extractText(response: Anthropic.Message): string {
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from LLM');
    }
    return content.text;
  }

  async extractFacts(text: string, goal: string): Promise<ExtractedFact[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: this.tempExtraction,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
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
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: this.tempExtraction,
      system: INSIGHTS_SYSTEM_PROMPT,
      messages: [
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
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: this.tempExtraction,
      system: RECOMMENDATIONS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Research goal: ${goal}\n\nInsights to formulate recommendations from:\n${numberedInsights}`,
        },
      ],
    });

    return parseRecommendationArray(this.extractText(response));
  }

  async formulateOutputs(recommendations: string[], goal: string, outputType: string, context?: OutputTraceabilityContext): Promise<string[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: this.tempExtraction,
      system: buildOutputsPrompt(outputType),
      messages: [
        {
          role: 'user',
          content: buildOutputsUserContent(recommendations, goal, context),
        },
      ],
    });

    return parseStringArray(this.extractText(response));
  }

  async checkDuplicates(text: string, candidates: { id: string; text: string }[]): Promise<DedupResult[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      temperature: this.tempDedup,
      system: DEDUP_CHECK_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildDedupCheckUserContent(text, candidates) },
      ],
    });

    return parseDedupCheckResult(this.extractText(response), candidates);
  }

  async scanDuplicates(items: { id: string; text: string }[]): Promise<DedupGroup[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      temperature: this.tempDedup,
      system: DEDUP_SCAN_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildDedupScanUserContent(items) },
      ],
    });

    return parseDedupScanResult(this.extractText(response), items);
  }

  async proposeUpdate(entityType: string, currentText: string, upstreamOldText: string, upstreamNewText: string, upstreamEntityType: string, goal: string, outputType?: string): Promise<UpdateProposal> {
    const systemPrompt = outputType
      ? `${UPDATE_PROPOSAL_SYSTEM_PROMPT}\n\nThe entity is an output of type "${outputType}". Produce the proposed_text in professional Markdown format.`
      : UPDATE_PROPOSAL_SYSTEM_PROMPT;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      temperature: this.tempProposal,
      system: systemPrompt,
      messages: [
        { role: 'user', content: buildUpdateProposalUserContent(entityType, currentText, upstreamOldText, upstreamNewText, upstreamEntityType, goal) },
      ],
    });

    return parseUpdateProposal(this.extractText(response));
  }

  async checkImpact(oldText: string, newText: string, children: { id: string; text: string }[]): Promise<ImpactCheckResult[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      temperature: this.tempImpact,
      system: IMPACT_CHECK_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildImpactCheckUserContent(oldText, newText, children) },
      ],
    });

    return parseImpactCheckResult(this.extractText(response), children);
  }

  async chatStream(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    tools: ChatToolDefinition[],
    callbacks: ChatStreamCallbacks,
  ): Promise<void> {
    const tempChat = parseFloat(process.env.LLM_TEMP_CHAT || '0.4');
    const maxTokens = parseInt(process.env.LLM_CHAT_MAX_TOKENS || '4096', 10);

    const anthropicTools: Anthropic.Tool[] = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema,
    }));

    console.log('[anthropic-chat] Starting stream', { model: this.model, messageCount: messages.length, toolCount: tools.length, temperature: tempChat, maxTokens });

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: maxTokens,
      temperature: tempChat,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      tools: anthropicTools,
    });

    // Use the high-level events provided by the SDK
    stream.on('text', (textDelta: string) => {
      callbacks.onToken(textDelta);
    });

    // Track tool_use input JSON via inputJson event
    const toolInputBuffers = new Map<string, { name: string; json: string }>();

    stream.on('streamEvent', (event: any) => {
      // Log all event types for debugging
      console.log('[anthropic-chat] streamEvent', { type: event.type, index: event.index, contentBlockType: event.content_block?.type, deltaType: event.delta?.type });

      if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        console.log('[anthropic-chat] Tool use block started', { index: event.index, name: event.content_block.name, id: event.content_block.id });
        toolInputBuffers.set(String(event.index), {
          name: event.content_block.name,
          json: '',
        });
      }
      if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
        const buffer = toolInputBuffers.get(String(event.index));
        if (buffer) {
          buffer.json += event.delta.partial_json;
        }
      }
      if (event.type === 'content_block_stop') {
        const buffer = toolInputBuffers.get(String(event.index));
        if (buffer) {
          console.log('[anthropic-chat] Tool use block complete', { index: event.index, name: buffer.name, jsonLength: buffer.json.length, json: buffer.json.substring(0, 200) });
          try {
            const params = JSON.parse(buffer.json);
            console.log('[anthropic-chat] Emitting tool call', { name: buffer.name, params });
            callbacks.onToolCall(buffer.name, params);
          } catch (e: any) {
            console.error('[anthropic-chat] Failed to parse tool JSON', { name: buffer.name, json: buffer.json, error: e?.message });
            callbacks.onError(`Failed to parse tool call parameters for ${buffer.name}`);
          }
          toolInputBuffers.delete(String(event.index));
        }
      }
    });

    try {
      const finalMsg = await stream.finalMessage();
      console.log('[anthropic-chat] Final message', { stopReason: finalMsg.stop_reason, contentBlocks: finalMsg.content.length, contentTypes: finalMsg.content.map(c => c.type) });
      callbacks.onDone();
    } catch (err: any) {
      console.error('[anthropic-chat] Stream error', { error: err?.message, stack: err?.stack });
      callbacks.onError(err?.message || 'Unknown streaming error');
    }
  }
}
