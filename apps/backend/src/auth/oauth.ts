import { Router } from 'express';
import { findUserByOAuth, createUser } from './user-store';
import { signToken } from './jwt';

const router = Router();

interface OAuthProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  extractUser: (profile: any) => { id: string; username: string; email?: string };
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

function getCallbackUrl(req: any, provider: string): string {
  const base = process.env.OAUTH_CALLBACK_BASE_URL
    || `${req.protocol}://${req.get('host')}`;
  return `${base}/auth/${provider}/callback`;
}

function oauthRoutes(provider: string, getConfig: () => OAuthProviderConfig | null) {
  router.get(`/${provider}`, (req, res) => {
    const config = getConfig();
    if (!config) {
      return res.status(503).json({ error: `${provider} OAuth not configured` });
    }
    const redirectUri = getCallbackUrl(req, provider);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: config.scope,
      response_type: 'code',
    });
    res.redirect(`${config.authorizeUrl}?${params}`);
  });

  router.get(`/${provider}/callback`, async (req, res) => {
    const config = getConfig();
    if (!config) {
      return res.status(503).json({ error: `${provider} OAuth not configured` });
    }

    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: getCallbackUrl(req, provider),
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        return res.status(502).json({ error: 'Failed to obtain access token' });
      }

      // Fetch user profile
      const profileResponse = await fetch(config.userInfoUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (!profileResponse.ok) {
        return res.status(502).json({ error: 'Failed to fetch user profile' });
      }
      const profile = await profileResponse.json();
      const oauthUser = config.extractUser(profile);

      // Find or create user
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

      // Redirect to frontend with token
      const frontendUrl = process.env.OAUTH_FRONTEND_URL || '/';
      res.redirect(`${frontendUrl}login?token=${encodeURIComponent(jwt)}&user=${encodeURIComponent(user.username)}`);
    } catch (err: any) {
      res.status(502).json({ error: err.message || 'OAuth flow failed' });
    }
  });
}

oauthRoutes('github', getGitHubConfig);
oauthRoutes('google', getGoogleConfig);

// Endpoint to tell the frontend which OAuth providers are available
router.get('/providers', (_req, res) => {
  const providers: string[] = [];
  if (getGitHubConfig()) providers.push('github');
  if (getGoogleConfig()) providers.push('google');
  res.json({ providers });
});

export default router;
