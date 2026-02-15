import { EvaluatorConfig } from '../../config/types';
import { MetricScore } from '../types';

export interface JudgeResponse {
  score: number;
  reasoning: string;
}

export class JudgeClient {
  private config: EvaluatorConfig;

  constructor(config: EvaluatorConfig) {
    this.config = config;
  }

  async judge(systemPrompt: string, userContent: string, metricName: string): Promise<MetricScore> {
    const apiKey = this.config.apiKey || process.env.LLM_API_KEY || '';
    if (!apiKey) {
      return { name: metricName, value: 0, type: 'llm-judge', details: 'No evaluator API key configured' };
    }

    try {
      const response = await this.callLLM(systemPrompt, userContent, apiKey);
      return {
        name: metricName,
        value: response.score,
        type: 'llm-judge',
        details: response.reasoning,
      };
    } catch (err: any) {
      return {
        name: metricName,
        value: 0,
        type: 'llm-judge',
        details: `Judge error: ${err.message}`,
      };
    }
  }

  private async callLLM(system: string, user: string, apiKey: string): Promise<JudgeResponse> {
    if (this.config.provider === 'anthropic') {
      return this.callAnthropic(system, user, apiKey);
    }
    return this.callOpenAI(system, user, apiKey);
  }

  private async callOpenAI(system: string, user: string, apiKey: string): Promise<JudgeResponse> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.0,
        max_tokens: 512,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    const data = await response.json() as any;
    const text = data.choices?.[0]?.message?.content || '';
    return this.parseJudgeResponse(text);
  }

  private async callAnthropic(system: string, user: string, apiKey: string): Promise<JudgeResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 512,
        temperature: 0.0,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    const data = await response.json() as any;
    const text = data.content?.[0]?.text || '';
    return this.parseJudgeResponse(text);
  }

  private parseJudgeResponse(text: string): JudgeResponse {
    // Expected format: "SCORE: N\nREASONING: ..."
    const scoreMatch = text.match(/SCORE:\s*(\d(?:\.\d+)?)/i);
    const reasoningMatch = text.match(/REASONING:\s*([\s\S]+)/i);

    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : text;

    return { score: Math.min(5, Math.max(0, score)) / 5, reasoning };
  }
}
