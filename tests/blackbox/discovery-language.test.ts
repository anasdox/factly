/**
 * Acceptance tests for Discovery Language.
 * @see specs/functional/discovery-language.feature
 * @see specs/technical/discovery-language.md
 *
 * Black box: a real backend is driven over HTTP, with a fake language model
 * standing in for the provider. The fake records the system prompt it was sent,
 * which is where the language instruction is observable — and returns a canned
 * completion, so the tests are deterministic and cost nothing.
 *
 * FSIDs covered:
 * - FS-DiscoveryDefaultsToEnglish
 * - FS-DiscoveryLanguageIsRemembered
 * - FS-DiscoveryLanguageRejectedWhenUnknown
 * - FS-FactsExtractedInDiscoveryLanguage
 * - FS-SourceExcerptStaysInSourceLanguage
 * - FS-InsightsDerivedInDiscoveryLanguage
 * - FS-RecommendationsFormulatedInDiscoveryLanguage
 * - FS-OutputsFormulatedInDiscoveryLanguage
 * - FS-EnglishDiscoveryAddsNoLanguageInstruction
 */

import { spawn, ChildProcess } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import http from 'http';
import { tmpdir } from 'os';
import { resolve, join } from 'path';

const BACKEND_DIR = resolve(__dirname, '../../apps/backend');

let backendPort: number;
let BACKEND_URL: string;

let backend: ChildProcess | null = null;
let llm: http.Server;
let llmUrl: string;
let dataDir: string;

/** The system prompt of the most recent completion the fake was asked for. */
let lastSystemPrompt = '';

/** What the fake answers with, set per test to match the endpoint under test. */
let cannedCompletion = '[]';

function startFakeLlm(): Promise<void> {
  llm = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url?.endsWith('/chat/completions')) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          lastSystemPrompt = parsed.messages?.find((m: any) => m.role === 'system')?.content ?? '';
        } catch {
          lastSystemPrompt = '';
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: 'fake', object: 'chat.completion', created: 0, model: 'fake',
          choices: [{ index: 0, message: { role: 'assistant', content: cannedCompletion }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  return new Promise((done) => {
    llm.listen(0, '127.0.0.1', () => {
      const address = llm.address();
      if (address && typeof address === 'object') llmUrl = `http://127.0.0.1:${address.port}/v1`;
      done();
    });
  });
}

function freePort(): Promise<number> {
  return new Promise((done) => {
    const probe = http.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      probe.close(() => done(port));
    });
  });
}

async function startBackend(): Promise<void> {
  dataDir = mkdtempSync(join(tmpdir(), 'factly-language-'));
  backendPort = await freePort();
  BACKEND_URL = `http://127.0.0.1:${backendPort}`;

  return new Promise<void>((done, fail) => {
    backend = spawn('npx', ['ts-node', 'src/index.ts'], {
      cwd: BACKEND_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
      env: {
        ...process.env,
        PORT: String(backendPort),
        DATA_DIR: dataDir,
        JWT_SECRET: 'test-secret-for-discovery-language',
        LLM_PROVIDER: 'openai-compatible',
        LLM_BASE_URL: llmUrl,
        LLM_API_KEY: 'fake-key',
        LLM_MODEL: 'fake-model',
      },
    });

    const watch = (data: Buffer) => {
      if (data.toString().includes('Server listening')) done();
    };
    backend.stdout?.on('data', watch);
    backend.stderr?.on('data', watch);
    backend.on('error', (err) => fail(new Error(`backend failed to start: ${err.message}`)));
    setTimeout(() => fail(new Error('backend start timeout (90s)')), 90000);
  });
}

function post(path: string, body: unknown) {
  return fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const FACTS_BODY = (language?: string) => ({
  input_id: 'i1',
  input_text: 'The global temperature rose by 1.1 degrees in 2023.',
  goal: 'Understand climate trends',
  ...(language === undefined ? {} : { language }),
});

const INSIGHTS_BODY = (language?: string) => ({
  facts: [{ fact_id: 'f1', text: 'Temperature rose by 1.1 degrees in 2023' }],
  goal: 'Understand climate trends',
  ...(language === undefined ? {} : { language }),
});

const RECOMMENDATIONS_BODY = (language?: string) => ({
  insights: [{ insight_id: 'n1', text: 'Warming is accelerating' }],
  goal: 'Understand climate trends',
  ...(language === undefined ? {} : { language }),
});

const OUTPUTS_BODY = (language?: string) => ({
  recommendations: [{ recommendation_id: 'r1', text: 'Reduce emissions' }],
  goal: 'Understand climate trends',
  output_type: 'report',
  ...(language === undefined ? {} : { language }),
});

beforeAll(async () => {
  await startFakeLlm();
  await startBackend();
}, 100000);

afterAll(async () => {
  if (backend?.pid) {
    try { process.kill(-backend.pid, 'SIGTERM'); } catch { /* already gone */ }
    await new Promise((r) => setTimeout(r, 500));
    try { process.kill(-backend.pid, 'SIGKILL'); } catch { /* already gone */ }
  }
  await new Promise<void>((r) => llm.close(() => r()));
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

beforeEach(() => {
  lastSystemPrompt = '';
  cannedCompletion = '[]';
});

describe('Discovery Language', () => {

  // @fsid:FS-DiscoveryDefaultsToEnglish
  describe('FS-DiscoveryDefaultsToEnglish', () => {
    it('generates without a language when none is given', async () => {
      const response = await post('/extract/facts', FACTS_BODY(undefined));
      expect(response.status).toBe(200);
      expect(lastSystemPrompt).not.toMatch(/Write .* in French/i);
    });

    it('treats an empty language as English', async () => {
      const response = await post('/extract/facts', FACTS_BODY(''));
      expect(response.status).toBe(200);
      expect(lastSystemPrompt).not.toMatch(/\bWrite\b.*\bin\b.*\b(French|Spanish|German)\b/i);
    });
  });

  // @fsid:FS-EnglishDiscoveryAddsNoLanguageInstruction
  describe('FS-EnglishDiscoveryAddsNoLanguageInstruction', () => {
    it('adds nothing to the prompt for an English discovery', async () => {
      await post('/extract/facts', FACTS_BODY('en'));
      const withEnglish = lastSystemPrompt;

      lastSystemPrompt = '';
      await post('/extract/facts', FACTS_BODY(undefined));
      const withNothing = lastSystemPrompt;

      expect(withEnglish).toBe(withNothing);
    });
  });

  // @fsid:FS-DiscoveryLanguageRejectedWhenUnknown
  describe('FS-DiscoveryLanguageRejectedWhenUnknown', () => {
    it('refuses a language it does not offer', async () => {
      const response = await post('/extract/facts', FACTS_BODY('klingon'));
      expect(response.status).toBe(400);

      const { error } = await response.json();
      expect(error).toMatch(/language/i);
      expect(error).toMatch(/\bfr\b/);
    });

    it('reaches no language model when the language is refused', async () => {
      await post('/extract/facts', FACTS_BODY('klingon'));
      expect(lastSystemPrompt).toBe('');
    });

    it('refuses to save a discovery carrying it', async () => {
      const response = await post('/documents', {
        title: 'Study', goal: 'Understand', date: '2026-09-21', language: 'klingon',
        inputs: [], facts: [], insights: [], recommendations: [], outputs: [],
      });
      expect(response.status).toBe(400);

      const { error } = await response.json();
      expect(error).toMatch(/language/i);
    });

    it('refuses it on every generating endpoint', async () => {
      for (const [path, body] of [
        ['/extract/insights', INSIGHTS_BODY('klingon')],
        ['/extract/recommendations', RECOMMENDATIONS_BODY('klingon')],
        ['/extract/outputs', OUTPUTS_BODY('klingon')],
      ] as const) {
        const response = await post(path, body);
        expect(response.status).toBe(400);
      }
    });
  });

  // @fsid:FS-FactsExtractedInDiscoveryLanguage
  describe('FS-FactsExtractedInDiscoveryLanguage', () => {
    it('asks for facts in the discovery language', async () => {
      const response = await post('/extract/facts', FACTS_BODY('fr'));
      expect(response.status).toBe(200);
      expect(lastSystemPrompt).toMatch(/French/i);
    });

    it('carries the language for every supported code', async () => {
      for (const [code, name] of [['es', 'Spanish'], ['de', 'German'], ['it', 'Italian'], ['pt', 'Portuguese'], ['nl', 'Dutch']] as const) {
        lastSystemPrompt = '';
        const response = await post('/extract/facts', FACTS_BODY(code));
        expect(response.status).toBe(200);
        expect(lastSystemPrompt).toMatch(new RegExp(name, 'i'));
      }
    });
  });

  // @fsid:FS-SourceExcerptStaysInSourceLanguage
  describe('FS-SourceExcerptStaysInSourceLanguage', () => {
    it('tells the model to leave the excerpt in the source language', async () => {
      await post('/extract/facts', FACTS_BODY('fr'));
      expect(lastSystemPrompt).toMatch(/source_excerpt/);
      expect(lastSystemPrompt).toMatch(/verbatim/i);
    });
  });

  // @fsid:FS-InsightsDerivedInDiscoveryLanguage
  describe('FS-InsightsDerivedInDiscoveryLanguage', () => {
    it('asks for insights in the discovery language', async () => {
      const response = await post('/extract/insights', INSIGHTS_BODY('fr'));
      expect(response.status).toBe(200);
      expect(lastSystemPrompt).toMatch(/French/i);
    });
  });

  // @fsid:FS-RecommendationsFormulatedInDiscoveryLanguage
  describe('FS-RecommendationsFormulatedInDiscoveryLanguage', () => {
    it('asks for recommendations in the discovery language', async () => {
      const response = await post('/extract/recommendations', RECOMMENDATIONS_BODY('fr'));
      expect(response.status).toBe(200);
      expect(lastSystemPrompt).toMatch(/French/i);
    });
  });

  // @fsid:FS-OutputsFormulatedInDiscoveryLanguage
  describe('FS-OutputsFormulatedInDiscoveryLanguage', () => {
    it('asks for the document in the discovery language', async () => {
      cannedCompletion = '["# Rapport"]';
      const response = await post('/extract/outputs', OUTPUTS_BODY('fr'));
      expect(response.status).toBe(200);
      expect(lastSystemPrompt).toMatch(/French/i);
    });
  });

  // @fsid:FS-DiscoveryLanguageIsRemembered
  describe('FS-DiscoveryLanguageIsRemembered', () => {
    it('keeps the language with the stored discovery', async () => {
      const created = await post('/documents', {
        title: 'Étude de marché',
        goal: 'Comprendre le marché',
        date: '2026-09-21',
        language: 'fr',
        inputs: [], facts: [], insights: [], recommendations: [], outputs: [],
      });
      expect(created.status).toBe(200);
      const { documentId } = await created.json();

      const reopened = await fetch(`${BACKEND_URL}/documents/${documentId}`);
      expect(reopened.status).toBe(200);

      const stored = await reopened.json();
      expect(stored.language).toBe('fr');
    });

    it('leaves a discovery saved without a language untouched', async () => {
      const created = await post('/documents', {
        title: 'Market study',
        goal: 'Understand the market',
        date: '2026-09-21',
        inputs: [], facts: [], insights: [], recommendations: [], outputs: [],
      });
      expect(created.status).toBe(200);
      const { documentId } = await created.json();

      const reopened = await fetch(`${BACKEND_URL}/documents/${documentId}`);
      const stored = await reopened.json();
      expect(stored.language).toBeUndefined();
    });
  });
});
