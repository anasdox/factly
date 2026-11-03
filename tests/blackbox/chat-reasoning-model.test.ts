/**
 * Regression test: the chat works on a reasoning model that refuses function
 * tools unless `reasoning_effort` is `none`, and refuses any explicit
 * temperature. Bug fix, no functional scenario (UoR, 2026-11-02).
 *
 * Production error this guards against:
 *   400 Function tools with reasoning_effort are not supported for
 *   gpt-5.6-luna in /v1/chat/completions. To use function tools, use
 *   /v1/responses or set reasoning_effort to 'none'.
 *
 * Black box: a real backend is driven over HTTP, once per OpenAI-style
 * provider, in front of a fake model that answers exactly as that model does:
 * it refuses with the provider's own messages, and otherwise streams one token
 * and one tool call. Every request it receives is recorded.
 */

import { spawn, ChildProcess } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import http from 'http';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const BACKEND_DIR = resolve(__dirname, '../../apps/backend');

const TOOLS_REFUSAL =
  "Function tools with reasoning_effort are not supported for gpt-5.6-luna in /v1/chat/completions. " +
  "To use function tools, use /v1/responses or set reasoning_effort to 'none'.";
const TEMPERATURE_REFUSAL =
  "Unsupported value: 'temperature' does not support 0.4 with this model. Only the default (1) value is supported.";

let requests: any[] = [];
let llm: http.Server;
let llmUrl = '';

function refuse(res: http.ServerResponse, message: string, param: string) {
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message, type: 'invalid_request_error', param, code: null } }));
}

function streamReply(res: http.ServerResponse) {
  const chunk = (delta: object, finish: string | null = null) =>
    `data: ${JSON.stringify({
      id: 'fake', object: 'chat.completion.chunk', created: 0, model: 'gpt-5.6-luna',
      choices: [{ index: 0, delta, finish_reason: finish }],
    })}\n\n`;
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  res.write(chunk({ role: 'assistant', content: 'Adding it.' }));
  res.write(chunk({
    tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'add_item', arguments: '' } }],
  }));
  res.write(chunk({ tool_calls: [{ index: 0, function: { arguments: '{"column":"facts","text":"Sky is blue"}' } }] }));
  res.write(chunk({}, 'tool_calls'));
  res.end('data: [DONE]\n\n');
}

/** Behaves like gpt-5.6-luna on /v1/chat/completions. */
function startFakeReasoningModel(): Promise<void> {
  llm = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      if (req.method !== 'POST' || !req.url?.endsWith('/chat/completions')) {
        res.writeHead(404);
        res.end();
        return;
      }
      const body = JSON.parse(raw);
      requests.push(body);
      if (body.tools?.length && body.reasoning_effort !== 'none') {
        return refuse(res, TOOLS_REFUSAL, 'reasoning_effort');
      }
      if ('temperature' in body) {
        return refuse(res, TEMPERATURE_REFUSAL, 'temperature');
      }
      streamReply(res);
    });
  });
  return new Promise((done) =>
    llm.listen(0, '127.0.0.1', () => {
      const address = llm.address();
      if (address && typeof address === 'object') llmUrl = `http://127.0.0.1:${address.port}/v1`;
      done();
    }),
  );
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

type Backend = { url: string; process: ChildProcess; dataDir: string };

async function startBackend(provider: 'openai' | 'openai-compatible'): Promise<Backend> {
  const dataDir = mkdtempSync(join(tmpdir(), 'factly-chat-reasoning-'));
  const port = await freePort();
  const child = spawn('npx', ['ts-node', 'src/index.ts'], {
    cwd: BACKEND_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: true,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      JWT_SECRET: 'test-secret-for-chat-reasoning',
      LLM_PROVIDER: provider,
      LLM_API_KEY: 'fake-key',
      LLM_MODEL: 'gpt-5.6-luna',
      LLM_TEMP_CHAT: '0.4',
      LLM_BASE_URL: llmUrl,
      OPENAI_BASE_URL: llmUrl,
    },
  });
  await new Promise<void>((done, fail) => {
    const watch = (data: Buffer) => {
      if (data.toString().includes('Server listening')) done();
    };
    child.stdout?.on('data', watch);
    child.stderr?.on('data', watch);
    child.on('error', (err) => fail(new Error(`backend failed to start: ${err.message}`)));
    setTimeout(() => fail(new Error('backend start timeout (90s)')), 90000);
  });
  return { url: `http://127.0.0.1:${port}`, process: child, dataDir };
}

function stopBackend(backend: Backend) {
  try {
    process.kill(-backend.process.pid!, 'SIGTERM');
  } catch {
    // already gone
  }
  rmSync(backend.dataDir, { recursive: true, force: true });
}

/** Sends a chat message and returns the SSE events the backend streamed back. */
async function chat(backendUrl: string): Promise<{ event: string; data: any }[]> {
  const res = await fetch(`${backendUrl}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Add the fact that the sky is blue',
      discovery_context: { title: 'Sky', goal: 'Understand the sky', facts: [] },
    }),
  });
  const text = await res.text();
  return text
    .split('\n\n')
    .filter((block) => block.startsWith('event: '))
    .map((block) => {
      const [eventLine, dataLine] = block.split('\n');
      return { event: eventLine.slice('event: '.length), data: JSON.parse(dataLine.slice('data: '.length)) };
    });
}

beforeAll(startFakeReasoningModel);
afterAll(() => new Promise((done) => llm.close(() => done(null))));

describe.each(['openai', 'openai-compatible'] as const)('Chat on a reasoning model (%s provider)', (provider) => {
  let backend: Backend;

  beforeAll(async () => {
    backend = await startBackend(provider);
  }, 120_000);

  afterAll(() => stopBackend(backend));

  beforeEach(() => {
    requests = [];
  });

  test('the reply streams with its tool call instead of failing with the 400', async () => {
    const events = await chat(backend.url);

    expect(events.filter((e) => e.event === 'error')).toEqual([]);
    expect(events).toContainEqual({ event: 'token', data: { text: 'Adding it.' } });
    expect(events).toContainEqual({
      event: 'tool_call',
      data: { tool: 'add_item', params: { column: 'facts', text: 'Sky is blue' } },
    });
    expect(events[events.length - 1].event).toBe('done');
  });

  test('the request that succeeds keeps the tools and sets reasoning_effort to none', async () => {
    await chat(backend.url);

    const accepted = requests[requests.length - 1];
    expect(accepted.tools.map((t: any) => t.function.name)).toContain('add_item');
    expect(accepted.reasoning_effort).toBe('none');
    expect(accepted).not.toHaveProperty('temperature');
    expect(accepted.stream).toBe(true);
  });

  test('the first attempt is sent as configured: no reasoning_effort, the chat temperature', async () => {
    await chat(backend.url);

    expect(requests[0]).not.toHaveProperty('reasoning_effort');
    expect(requests[0].temperature).toBe(0.4);
  });
});
