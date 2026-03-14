import jwt, { SignOptions } from 'jsonwebtoken';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export function signToken(username: string): string {
  const expiration = process.env.JWT_EXPIRATION || '24h';
  const opts: SignOptions = { expiresIn: expiration as any };
  return jwt.sign({ username }, getSecret(), opts);
}

export function verifyToken(token: string): { username: string } | null {
  try {
    const payload = jwt.verify(token, getSecret()) as { username: string };
    return { username: payload.username };
  } catch {
    return null;
  }
}
