/**
 * Acceptance tests for Federated Identity.
 * @see specs/functional/user-management-authentication.feature
 * @see specs/technical/federated-identity.md
 *
 * Black box throughout: the tests drive a real backend over HTTP and stand a
 * fake identity provider in front of it. Nothing imports application code, and
 * the backend under test gets its own data directory so it cannot disturb — or
 * be disturbed by — the shared instance the rest of the suite uses.
 *
 * FSIDs covered:
 * - FS-FederatedProvidersListed
 * - FS-FederatedProviderNotConfigured
 * - FS-FederatedSignInRedirectsToProvider
 * - FS-FederatedFirstSignInCreatesAccount
 * - FS-FederatedReturningSignInReusesAccount
 * - FS-FederatedSignInRejectsForgedState
 * - FS-FederatedSignInRejectsMissingCode
 * - FS-SelfRegistrationRefused
 */

import { spawn, ChildProcess } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import http from 'http';
import { tmpdir } from 'os';
import { resolve, join } from 'path';

const BACKEND_DIR = resolve(__dirname, '../../apps/backend');

/**
 * Claimed at run time rather than hard-coded: a fixed port turns a backend that
 * outlived an earlier run into a confusing failure in this one.
 */
let backendPort: number;
let BACKEND_URL: string;

const SUBJECT = 'pocket-subject-001';
const USERNAME = 'alice';

let backend: ChildProcess | null = null;
let provider: http.Server;
let providerUrl: string;
let dataDir: string;

/** Everything the fake provider was asked, so the tests can assert on it. */
const received: { tokenContentType?: string; tokenBody?: string } = {};

/**
 * The smallest provider that the flow can complete against: it never
 * authenticates anybody, it just answers the two calls the backend makes after
 * the browser comes back.
 */
function startFakeProvider(): Promise<void> {
  provider = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/oidc/token') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        received.tokenContentType = req.headers['content-type'];
        received.tokenBody = body;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: 'fake-access-token', token_type: 'Bearer' }));
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/api/oidc/userinfo') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        sub: SUBJECT,
        preferred_username: USERNAME,
        email: 'alice@example.com',
      }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  return new Promise((done) => {
    provider.listen(0, '127.0.0.1', () => {
      const address = provider.address();
      if (address && typeof address === 'object') {
        providerUrl = `http://127.0.0.1:${address.port}`;
      }
      done();
    });
  });
}

/** A port nothing is listening on, as reported by the OS. */
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
  dataDir = mkdtempSync(join(tmpdir(), 'factly-federated-'));
  backendPort = await freePort();
  BACKEND_URL = `http://127.0.0.1:${backendPort}`;

  return new Promise<void>((done, fail) => {
    backend = spawn('npx', ['ts-node', 'src/index.ts'], {
      cwd: BACKEND_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      // Its own process group: npx is the child but node is the grandchild, and
      // signalling npx alone leaves the server running and holding its port.
      detached: true,
      env: {
        ...process.env,
        PORT: String(backendPort),
        DATA_DIR: dataDir,
        JWT_SECRET: 'test-secret-for-federated-identity',
        OAUTH_POCKETID_ISSUER_URL: providerUrl,
        OAUTH_POCKETID_CLIENT_ID: 'test-client',
        OAUTH_POCKETID_CLIENT_SECRET: 'test-secret',
        OAUTH_CALLBACK_BASE_URL: BACKEND_URL,
        OAUTH_FRONTEND_URL: `${BACKEND_URL}/`,
        // Left unset on purpose: FS-FederatedProviderNotConfigured needs a
        // provider the backend does not know about.
        OAUTH_GITHUB_CLIENT_ID: '',
        OAUTH_GITHUB_CLIENT_SECRET: '',
      },
    });

    const watch = (data: Buffer) => {
      if (data.toString().includes('Server listening')) done();
    };
    backend.stdout?.on('data', watch);
    backend.stderr?.on('data', watch);
    backend.on('error', (err) => fail(new Error(`backend failed to start: ${err.message}`)));

    // Generous: a cold ts-node start competes with the rest of the suite when
    // the whole thing runs in band.
    setTimeout(() => fail(new Error('backend start timeout (90s)')), 90000);
  });
}

/** The state the backend minted, and the cookie it expects to see it back in. */
async function beginSignIn(): Promise<{ state: string; cookie: string; location: string }> {
  const response = await fetch(`${BACKEND_URL}/auth/pocketid`, { redirect: 'manual' });
  const location = response.headers.get('location') ?? '';
  const setCookie = response.headers.get('set-cookie') ?? '';

  const state = new URL(location).searchParams.get('state') ?? '';
  const cookie = setCookie.split(';')[0];
  return { state, cookie, location };
}

beforeAll(async () => {
  await startFakeProvider();
  await startBackend();
}, 100000);

afterAll(async () => {
  // The whole group, so the node grandchild goes with npx. SIGKILL follows the
  // polite attempt because jest runs with --forceExit.
  if (backend?.pid) {
    try { process.kill(-backend.pid, 'SIGTERM'); } catch { /* already gone */ }
    await new Promise((r) => setTimeout(r, 500));
    try { process.kill(-backend.pid, 'SIGKILL'); } catch { /* already gone */ }
  }
  await new Promise<void>((r) => provider.close(() => r()));
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

describe('Federated Identity', () => {

  // @fsid:FS-FederatedProvidersListed
  describe('FS-FederatedProvidersListed', () => {
    it('offers pocketid once a client is configured', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/providers`);
      expect(response.status).toBe(200);

      const { providers } = await response.json();
      expect(providers).toContain('pocketid');
    });
  });

  // @fsid:FS-FederatedProviderNotConfigured
  describe('FS-FederatedProviderNotConfigured', () => {
    it('refuses a sign-in with a provider that has no client', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/github`, { redirect: 'manual' });
      expect(response.status).toBe(503);

      const { error } = await response.json();
      expect(error).toMatch(/not configured/i);
    });

    it('does not list a provider that has no client', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/providers`);
      const { providers } = await response.json();
      expect(providers).not.toContain('github');
    });
  });

  // @fsid:FS-FederatedSignInRedirectsToProvider
  describe('FS-FederatedSignInRedirectsToProvider', () => {
    it('redirects to the provider carrying a state value', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/pocketid`, { redirect: 'manual' });
      expect(response.status).toBe(302);

      const location = new URL(response.headers.get('location') ?? '');
      expect(`${location.protocol}//${location.host}${location.pathname}`)
        .toBe(`${providerUrl}/authorize`);
      expect(location.searchParams.get('client_id')).toBe('test-client');
      expect(location.searchParams.get('response_type')).toBe('code');
      expect(location.searchParams.get('state')).toBeTruthy();
    });

    it('stores the same state in a cookie the browser will send back', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/pocketid`, { redirect: 'manual' });
      const state = new URL(response.headers.get('location') ?? '').searchParams.get('state');
      const setCookie = response.headers.get('set-cookie') ?? '';

      expect(setCookie).toContain(`factly_oauth_state=${state}`);
      expect(setCookie).toMatch(/HttpOnly/i);
      // Lax, not Strict: the callback is a cross-site top-level navigation, and
      // Strict would withhold the cookie exactly when it is needed.
      expect(setCookie).toMatch(/SameSite=Lax/i);
    });

    it('mints a different state for every sign-in', async () => {
      const first = await beginSignIn();
      const second = await beginSignIn();
      expect(first.state).not.toBe(second.state);
    });
  });

  // @fsid:FS-FederatedFirstSignInCreatesAccount
  describe('FS-FederatedFirstSignInCreatesAccount', () => {
    it('creates the account and returns the visitor signed in', async () => {
      const { state, cookie } = await beginSignIn();

      const response = await fetch(
        `${BACKEND_URL}/auth/pocketid/callback?code=fake-code&state=${state}`,
        { redirect: 'manual', headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(302);
      const location = new URL(response.headers.get('location') ?? '');
      const token = location.searchParams.get('token');
      expect(token).toBeTruthy();
      expect(location.searchParams.get('user')).toBe(`pocketid:${USERNAME}`);

      // The session is real: it opens an authenticated route.
      const personal = await fetch(`${BACKEND_URL}/me/discoveries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(personal.status).toBe(200);
    });

    it('exchanges the code as form-encoded, as OAuth 2.0 requires', async () => {
      const { state, cookie } = await beginSignIn();
      await fetch(`${BACKEND_URL}/auth/pocketid/callback?code=fake-code&state=${state}`,
        { redirect: 'manual', headers: { Cookie: cookie } });

      expect(received.tokenContentType).toContain('application/x-www-form-urlencoded');
      expect(received.tokenBody).toContain('grant_type=authorization_code');
      expect(received.tokenBody).toContain('code=fake-code');
    });
  });

  // @fsid:FS-FederatedReturningSignInReusesAccount
  describe('FS-FederatedReturningSignInReusesAccount', () => {
    it('signs the same identity back into the same account', async () => {
      const first = await beginSignIn();
      const firstResponse = await fetch(
        `${BACKEND_URL}/auth/pocketid/callback?code=fake-code&state=${first.state}`,
        { redirect: 'manual', headers: { Cookie: first.cookie } },
      );
      const firstUser = new URL(firstResponse.headers.get('location') ?? '')
        .searchParams.get('user');

      const second = await beginSignIn();
      const secondResponse = await fetch(
        `${BACKEND_URL}/auth/pocketid/callback?code=fake-code&state=${second.state}`,
        { redirect: 'manual', headers: { Cookie: second.cookie } },
      );
      const secondUser = new URL(secondResponse.headers.get('location') ?? '')
        .searchParams.get('user');

      expect(secondResponse.status).toBe(302);
      expect(secondUser).toBe(firstUser);
    });
  });

  // @fsid:FS-FederatedSignInRejectsForgedState
  describe('FS-FederatedSignInRejectsForgedState', () => {
    it('rejects a callback whose state the browser does not hold', async () => {
      const response = await fetch(
        `${BACKEND_URL}/auth/pocketid/callback?code=fake-code&state=forged-by-an-attacker`,
        { redirect: 'manual' },
      );

      expect(response.status).toBe(400);
      expect(response.headers.get('location')).toBeNull();
    });

    it('rejects a callback whose state does not match the cookie', async () => {
      const { cookie } = await beginSignIn();

      const response = await fetch(
        `${BACKEND_URL}/auth/pocketid/callback?code=fake-code&state=some-other-state`,
        { redirect: 'manual', headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(400);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  // @fsid:FS-FederatedSignInRejectsMissingCode
  describe('FS-FederatedSignInRejectsMissingCode', () => {
    it('rejects a callback that carries no authorization code', async () => {
      const { state, cookie } = await beginSignIn();

      const response = await fetch(
        `${BACKEND_URL}/auth/pocketid/callback?state=${state}`,
        { redirect: 'manual', headers: { Cookie: cookie } },
      );

      expect(response.status).toBe(400);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  // @fsid:FS-SelfRegistrationRefused
  describe('FS-SelfRegistrationRefused', () => {
    it('has no registration endpoint', async () => {
      const response = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'intruder', password: 'password123' }),
      });

      expect(response.status).toBe(404);
    });

    it('does not create the account it refused', async () => {
      await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'intruder', password: 'password123' }),
      });

      const login = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'intruder', password: 'password123' }),
      });

      expect(login.status).toBe(401);
    });
  });
});
