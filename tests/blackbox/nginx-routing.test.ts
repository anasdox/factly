/**
 * Regression test: a UI route opened directly must get the application, never
 * backend JSON. Bug fix, no functional scenario (UoR, 2026-11-02).
 * @see decisions/20261102-PrefixBackendApiPath.md
 *
 * Black box: the frontend's real production web server — nginx:alpine with the
 * repository's `nginx.conf.template` and `entrypoint.sh` — runs in Docker in
 * front of a fake backend that records every request it receives. A stub
 * `index.html` stands in for the built application, so a response can be told
 * apart from backend JSON by its body alone.
 *
 * Requires a running Docker daemon. Without one the suite fails loudly rather
 * than skipping: a skipped guard is no guard. Where Docker is out of reach,
 * `NGINX_BIN=/path/to/nginx` runs the same template with a local nginx binary
 * instead (only the listen port and the document root are rewritten).
 */

import { ChildProcess, execFileSync, spawn } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import http from 'http';
import { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const FRONTEND_DIR = resolve(__dirname, '../../apps/frontend');
const APP_PAGE_MARKER = 'factly-application-page';
const STREAM_PAUSE_MS = 1500;

type RecordedRequest = { method: string; url: string; body: string };

let recorded: RecordedRequest[] = [];
let fakeBackend: http.Server;
let containerId = '';
let localNginx: ChildProcess | null = null;
let htmlDir = '';
let webServer = '';

function startFakeBackend(): Promise<number> {
  fakeBackend = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const url = req.url ?? '';
      recorded.push({ method: req.method ?? '', url, body });

      // Streamed endpoints: one event now, the end later. A buffering proxy
      // would hold the first event until the end.
      if (url.startsWith('/events/') || url === '/chat') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write('data: first\n\n');
        setTimeout(() => res.end('data: last\n\n'), STREAM_PAUSE_MS);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ from: 'backend', method: req.method, url }));
    });
  });
  return new Promise((done) => {
    fakeBackend.listen(0, '0.0.0.0', () => done((fakeBackend.address() as AddressInfo).port));
  });
}

function docker(args: string[]): string {
  return execFileSync('docker', args, { encoding: 'utf8' }).trim();
}

function requireDocker(): void {
  try {
    docker(['info', '--format', '{{.ServerVersion}}']);
  } catch {
    throw new Error(
      'nginx-routing tests need a running Docker daemon ' +
        '(they run the real frontend nginx config). Start Docker, or set NGINX_BIN, and rerun.',
    );
  }
}

async function waitForWebServer(): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${webServer}/`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`frontend web server did not answer at ${webServer}`);
}

function startInDocker(backendPort: number): void {
  requireDocker();
  containerId = docker([
    'run', '-d', '--rm',
    '--add-host=host.docker.internal:host-gateway',
    '-e', `BACKEND_URL=http://host.docker.internal:${backendPort}`,
    '-v', `${join(FRONTEND_DIR, 'nginx.conf.template')}:/etc/nginx/templates/nginx.conf.template:ro`,
    '-v', `${join(FRONTEND_DIR, 'entrypoint.sh')}:/entrypoint.sh:ro`,
    '-v', `${htmlDir}:/usr/share/nginx/html:ro`,
    '-p', '127.0.0.1::80',
    '--entrypoint', '/bin/sh',
    'nginx:alpine',
    '/entrypoint.sh', 'nginx', '-g', 'daemon off;',
  ]);
  const hostPort = docker(['port', containerId, '80/tcp']).split('\n')[0].split(':').pop();
  webServer = `http://127.0.0.1:${hostPort}`;
}

/** Same template, rendered as entrypoint.sh would, wrapped in a minimal http block. */
async function startLocalNginx(nginxBin: string, backendPort: number): Promise<void> {
  const webPort = await freePort();
  const server = readFileSync(join(FRONTEND_DIR, 'nginx.conf.template'), 'utf8')
    .replace(/\$\{BACKEND_URL\}/g, `http://127.0.0.1:${backendPort}`)
    .replace(/listen 80;/, `listen 127.0.0.1:${webPort};`)
    .replace(/root \/usr\/share\/nginx\/html;/, `root ${htmlDir};`);
  const conf = `${htmlDir}.conf`;
  writeFileSync(conf, [
    'daemon off;',
    'pid /dev/null;',
    'error_log stderr;',
    'events {}',
    'http {',
    '  access_log off;',
    `  client_body_temp_path ${htmlDir}-tmp/body;`,
    `  proxy_temp_path ${htmlDir}-tmp/proxy;`,
    `  fastcgi_temp_path ${htmlDir}-tmp/fastcgi;`,
    `  uwsgi_temp_path ${htmlDir}-tmp/uwsgi;`,
    `  scgi_temp_path ${htmlDir}-tmp/scgi;`,
    server,
    '}',
  ].join('\n'));
  execFileSync('mkdir', ['-p', `${htmlDir}-tmp`]);
  localNginx = spawn(nginxBin, ['-p', `${htmlDir}-tmp`, '-c', conf], { stdio: 'inherit' });
  webServer = `http://127.0.0.1:${webPort}`;
}

function freePort(): Promise<number> {
  const probe = http.createServer();
  return new Promise((done) =>
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => done(port));
    }),
  );
}

beforeAll(async () => {
  const backendPort = await startFakeBackend();

  htmlDir = mkdtempSync(join(tmpdir(), 'factly-nginx-'));
  writeFileSync(
    join(htmlDir, 'index.html'),
    `<!doctype html><html><head><title>${APP_PAGE_MARKER}</title></head><body></body></html>`,
  );

  if (process.env.NGINX_BIN) {
    await startLocalNginx(process.env.NGINX_BIN, backendPort);
  } else {
    startInDocker(backendPort);
  }
  await waitForWebServer();
}, 120_000);

afterAll(async () => {
  if (containerId) docker(['rm', '-f', containerId]);
  localNginx?.kill();
  if (htmlDir) {
    rmSync(htmlDir, { recursive: true, force: true });
    rmSync(`${htmlDir}-tmp`, { recursive: true, force: true });
    rmSync(`${htmlDir}.conf`, { force: true });
  }
  await new Promise((done) => (fakeBackend ? fakeBackend.close(() => done(null)) : done(null)));
});

beforeEach(() => {
  recorded = [];
});

/** What a browser sends when it opens or reloads a page. */
async function openInBrowser(path: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${webServer}${path}`, {
    headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
  });
  return { status: res.status, body: await res.text() };
}

async function callBackend(method: string, path: string, body?: string) {
  const res = await fetch(`${webServer}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body,
  });
  return { status: res.status, json: await res.json() };
}

/** Time until the first chunk, and until the end, of a streamed response. */
async function readStream(method: string, path: string, body?: string) {
  const started = Date.now();
  const res = await fetch(`${webServer}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body,
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let firstChunkAfterMs = -1;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (firstChunkAfterMs < 0) firstChunkAfterMs = Date.now() - started;
    text += decoder.decode(value);
  }
  return { status: res.status, text, firstChunkAfterMs };
}

describe('Frontend web server routing', () => {
  test('opening a document link directly serves the application', async () => {
    const page = await openInBrowser('/documents/3f6c2a9e-0b1d-4c8e-9f2a-7d5e1b3c4a6f');

    expect(page.status).toBe(200);
    expect(page.body).toContain(APP_PAGE_MARKER);
    expect(recorded).toEqual([]);
  });

  test('reloading a document page serves the application, then the document loads from the backend', async () => {
    const id = '3f6c2a9e-0b1d-4c8e-9f2a-7d5e1b3c4a6f';
    const page = await openInBrowser(`/documents/${id}`);
    expect(page.body).toContain(APP_PAGE_MARKER);

    const doc = await callBackend('GET', `/api/documents/${id}`);
    expect(doc.status).toBe(200);
    expect(doc.json).toEqual({ from: 'backend', method: 'GET', url: `/documents/${id}` });
  });

  test('opening the feedback page directly serves the application', async () => {
    const page = await openInBrowser('/feedback');

    expect(page.status).toBe(200);
    expect(page.body).toContain(APP_PAGE_MARKER);
    expect(recorded).toEqual([]);
  });

  describe('every backend call goes under /api', () => {
    test.each([
      ['GET', '/api/documents/abc', '/documents/abc'],
      ['POST', '/api/documents/abc/update', '/documents/abc/update'],
      ['GET', '/api/auth/providers', '/auth/providers'],
      ['POST', '/api/auth/login', '/auth/login'],
      ['GET', '/api/me/documents', '/me/documents'],
      ['POST', '/api/extract/facts', '/extract/facts'],
      ['POST', '/api/research', '/research'],
      ['POST', '/api/dedup', '/dedup'],
      ['POST', '/api/check', '/check'],
      ['POST', '/api/propose', '/propose'],
      ['POST', '/api/reformulate/facts', '/reformulate/facts'],
      ['GET', '/api/feedback', '/feedback'],
      ['POST', '/api/feedback/42/vote', '/feedback/42/vote'],
      ['GET', '/api/benchmark/runs', '/benchmark/runs'],
      ['GET', '/api/status', '/status'],
      ['GET', '/api/health', '/health'],
    ])('%s %s reaches the backend as %s', async (method, path, backendPath) => {
      const body = method === 'POST' ? JSON.stringify({ probe: true }) : undefined;
      const res = await callBackend(method, path, body);

      expect(res.status).toBe(200);
      expect(res.json).toEqual({ from: 'backend', method, url: backendPath });
      expect(recorded).toEqual([{ method, url: backendPath, body: body ?? '' }]);
    });

    test('a request body up to 5 MB is accepted', async () => {
      const body = JSON.stringify({ text: 'x'.repeat(4 * 1024 * 1024) });
      const res = await callBackend('POST', '/api/documents/abc/update', body);

      expect(res.status).toBe(200);
      expect(recorded[0].body.length).toBe(body.length);
    });

    test('document events stream through unbuffered, query string intact', async () => {
      const res = await readStream('GET', '/api/events/abc?uuid=u1&username=ana');

      expect(res.status).toBe(200);
      expect(recorded[0].url).toBe('/events/abc?uuid=u1&username=ana');
      expect(res.text).toContain('data: first');
      expect(res.text).toContain('data: last');
      expect(res.firstChunkAfterMs).toBeLessThan(STREAM_PAUSE_MS / 2);
    });

    test('chat replies stream through unbuffered', async () => {
      const res = await readStream('POST', '/api/chat', JSON.stringify({ message: 'hi' }));

      expect(res.status).toBe(200);
      expect(recorded[0]).toMatchObject({ method: 'POST', url: '/chat' });
      expect(res.firstChunkAfterMs).toBeLessThan(STREAM_PAUSE_MS / 2);
    });

    test('the sign-in callback registered with the identity provider still reaches the backend', async () => {
      const res = await callBackend('GET', '/auth/pocketid/callback?code=c1&state=s1');

      expect(res.json).toEqual({ from: 'backend', method: 'GET', url: '/auth/pocketid/callback?code=c1&state=s1' });
    });

    test('the production build sends backend calls under /api', () => {
      const dockerfile = readFileSync(join(FRONTEND_DIR, 'Dockerfile'), 'utf8');

      expect(dockerfile).toMatch(/^ENV REACT_APP_API_URL=\/api$/m);
    });
  });
});
