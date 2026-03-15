import { store } from '../store';

export interface User {
  username: string;
  password_hash: string;
  created_at: string;
}

function userKey(username: string): string {
  return `user:${username}`;
}

export async function findUser(username: string): Promise<User | undefined> {
  const data = await store.get(userKey(username));
  return data ?? undefined;
}

export async function createUser(user: User): Promise<void> {
  await store.set(userKey(user.username), user);
}
