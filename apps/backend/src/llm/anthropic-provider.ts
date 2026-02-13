import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from './provider';
import { EXTRACTION_SYSTEM_PROMPT, INSIGHTS_SYSTEM_PROMPT, RECOMMENDATIONS_SYSTEM_PROMPT, DEDUP_CHECK_SYSTEM_PROMPT, DEDUP_SCAN_SYSTEM_PROMPT, UPDATE_PROPOSAL_SYSTEM_PROMPT, IMPACT_CHECK_SYSTEM_PROMPT, buildOutputsPrompt, buildOutputsUserContent, buildDedupCheckUserContent, buildDedupScanUserContent, buildUpdateProposalUserContent, buildImpactCheckUserContent, parseStringArray, parseFactArray, parseInsightArray, parseRecommendationArray, parseDedupCheckResult, parseDedupScanResult, parseUpdateProposal, parseImpactCheckResult, ExtractedFact, ExtractedInsight, ExtractedRecommendation, OutputTraceabilityContext, DedupResult, DedupGroup, UpdateProposal, ImpactCheckResult } from './prompts';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-sonnet-4-5-20250929';
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
      temperature: 0.2,
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
      temperature: 0.2,
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
      temperature: 0.2,
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
      temperature: 0.2,
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
      temperature: 0.1,
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
      temperature: 0.1,
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
      max_tokens: 4096,
      temperature: 0.3,
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
      max_tokens: 2048,
      temperature: 0.1,
      system: IMPACT_CHECK_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildImpactCheckUserContent(oldText, newText, children) },
      ],
    });

    return parseImpactCheckResult(this.extractText(response), children);
  }
}
