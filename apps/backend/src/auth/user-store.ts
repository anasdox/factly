import { store } from '../store';

export interface User {
  username: string;
  password_hash: string;
  created_at: string;
  oauth_provider?: string;
  oauth_id?: string;
}

function userKey(username: string): string {
  return `user:${username}`;
}

function oauthKey(provider: string, oauthId: string): string {
  return `oauth:${provider}:${oauthId}`;
}

export async function findUser(username: string): Promise<User | undefined> {
  const data = await store.get(userKey(username));
  return data ?? undefined;
}

export async function findUserByOAuth(provider: string, oauthId: string): Promise<User | undefined> {
  const username = await store.get(oauthKey(provider, oauthId));
  if (!username) return undefined;
  return findUser(username);
}

export async function createUser(user: User): Promise<void> {
  await store.set(userKey(user.username), user);
  if (user.oauth_provider && user.oauth_id) {
    await store.set(oauthKey(user.oauth_provider, user.oauth_id), user.username);
  }
}
