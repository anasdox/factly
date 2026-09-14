import { Router } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import { findUserByOAuth, createUser } from './user-store';
import { signToken } from './jwt';

const router = Router();

const STATE_COOKIE = 'factly_oauth_state';
const STATE_TTL_SECONDS = 600;

interface OAuthProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  extractUser: (profile: any) => { id: string; username: string; email?: string };
}

/**
 * Pocket ID is a standards-compliant OIDC provider, so one issuer URL yields
 * all three endpoints instead of each being hard-coded.
 */
function getPocketIdConfig(): OAuthProviderConfig | null {
  const issuer = process.env.OAUTH_POCKETID_ISSUER_URL?.replace(/\/+$/, '');
  const clientId = process.env.OAUTH_POCKETID_CLIENT_ID;
  const clientSecret = process.env.OAUTH_POCKETID_CLIENT_SECRET;
  if (!issuer || !clientId || !clientSecret) return null;
  return {
    authorizeUrl: `${issuer}/authorize`,
    tokenUrl: `${issuer}/api/oidc/token`,
    userInfoUrl: `${issuer}/api/oidc/userinfo`,
    clientId,
    clientSecret,
    scope: 'openid email profile',
    extractUser: (profile) => ({
      // `sub` is the only claim the provider promises is stable and unique.
      id: String(profile.sub),
      username: profile.preferred_username || profile.email?.split('@')[0] || String(profile.sub),
      email: profile.email || undefined,
    }),
  };
}

function getGitHubConfig(): OAuthProviderConfig | null {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    clientId,
    clientSecret,
    scope: 'read:user user:email',
    extractUser: (profile) => ({
      id: String(profile.id),
      username: profile.login,
      email: profile.email || undefined,
    }),
  };
}

function getGoogleConfig(): OAuthProviderConfig | null {
  const clientId = process.env.OAUTH_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    clientId,
    clientSecret,
    scope: 'openid email profile',
    extractUser: (profile) => ({
      id: String(profile.id),
      username: profile.email?.split('@')[0] || profile.name || String(profile.id),
      email: profile.email || undefined,
    }),
  };
}

const PROVIDERS: Record<string, () => OAuthProviderConfig | null> = {
  pocketid: getPocketIdConfig,
  github: getGitHubConfig,
  google: getGoogleConfig,
};

function getCallbackUrl(req: any, provider: string): string {
  const base = process.env.OAUTH_CALLBACK_BASE_URL
    || `${req.protocol}://${req.get('host')}`;
  return `${base}/auth/${provider}/callback`;
}

function readCookie(req: any, name: string): string | undefined {
  const header: string = req.headers?.cookie ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/** Compare without leaking, through timing, how much of the value matched. */
function statesMatch(fromQuery: unknown, fromCookie: string | undefined): boolean {
  if (typeof fromQuery !== 'string' || !fromQuery || !fromCookie) return false;
  const a = Buffer.from(fromQuery);
  const b = Buffer.from(fromCookie);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function oauthRoutes(provider: string, getConfig: () => OAuthProviderConfig | null) {
  router.get(`/${provider}`, (req, res) => {
    const config = getConfig();
    if (!config) {
      return res.status(503).json({ error: `${provider} OAuth not configured` });
    }

    // Binds the callback to this sign-in. Without it any site could complete a
    // sign-in in a visitor's browser and silently seat them in an account the
    // attacker controls.
    const state = randomBytes(32).toString('hex');
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      // Lax, not Strict: the callback is a cross-site top-level navigation back
      // from the provider, and Strict would withhold the cookie exactly then.
      sameSite: 'lax',
      // Taken from the callback URL, not from req.protocol: behind the edge the
      // request arrives over plain HTTP and req.protocol would drop the flag on
      // a deployment that is HTTPS everywhere the browser can see.
      secure: getCallbackUrl(req, provider).startsWith('https://'),
      path: '/auth',
      maxAge: STATE_TTL_SECONDS * 1000,
    });

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: getCallbackUrl(req, provider),
      scope: config.scope,
      response_type: 'code',
      state,
    });
    res.redirect(`${config.authorizeUrl}?${params}`);
  });

  router.get(`/${provider}/callback`, async (req, res) => {
    const config = getConfig();
    if (!config) {
      return res.status(503).json({ error: `${provider} OAuth not configured` });
    }

    // Cleared whatever happens: a state value is good for one attempt.
    const expectedState = readCookie(req, STATE_COOKIE);
    res.clearCookie(STATE_COOKIE, { path: '/auth' });

    if (!statesMatch(req.query.state, expectedState)) {
      return res.status(400).json({ error: 'Invalid or expired sign-in state' });
    }

    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    try {
      // Form-encoded, as OAuth 2.0 requires. Pocket ID advertises only
      // client_secret_basic and client_secret_post, and Google rejects JSON.
      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: getCallbackUrl(req, provider),
          grant_type: 'authorization_code',
        }).toString(),
      });

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        return res.status(502).json({ error: 'Failed to obtain access token' });
      }

      const profileResponse = await fetch(config.userInfoUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (!profileResponse.ok) {
        return res.status(502).json({ error: 'Failed to fetch user profile' });
      }
      const profile = await profileResponse.json();
      const oauthUser = config.extractUser(profile);

      // Keyed on the provider's subject, never on email or username: both are
      // mutable at the provider and reusable across people, so keying on either
      // would let one person inherit another's discoveries.
      let user = await findUserByOAuth(provider, oauthUser.id);
      if (!user) {
        await createUser({
          username: `${provider}:${oauthUser.username}`,
          password_hash: '',
          created_at: new Date().toISOString(),
          oauth_provider: provider,
          oauth_id: oauthUser.id,
        });
        user = await findUserByOAuth(provider, oauthUser.id);
      }

      if (!user) {
        return res.status(500).json({ error: 'Failed to create user' });
      }

      const jwt = signToken(user.username);

      const frontendUrl = process.env.OAUTH_FRONTEND_URL || `${req.protocol}://${req.get('host')}/`;
      const separator = frontendUrl.endsWith('/') ? '' : '/';
      res.redirect(`${frontendUrl}${separator}login?token=${encodeURIComponent(jwt)}&user=${encodeURIComponent(user.username)}`);
    } catch (err: any) {
      res.status(502).json({ error: err.message || 'OAuth flow failed' });
    }
  });
}

for (const [name, getConfig] of Object.entries(PROVIDERS)) {
  oauthRoutes(name, getConfig);
}

// Tells the sign-in page which providers to offer.
router.get('/providers', (_req, res) => {
  const providers = Object.entries(PROVIDERS)
    .filter(([, getConfig]) => getConfig() !== null)
    .map(([name]) => name);
  res.json({ providers });
});

export default router;
