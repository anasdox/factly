import * as fs from 'fs';
import * as path from 'path';

export interface User {
  username: string;
  password_hash: string;
  created_at: string;
}

const defaultPath = path.join(__dirname, '..', '..', 'data', 'users.json');

function getUsersFilePath(): string {
  return process.env.USERS_FILE || defaultPath;
}

export function loadUsers(): User[] {
  const filePath = getUsersFilePath();
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function saveUsers(users: User[]): void {
  const filePath = getUsersFilePath();
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

export function findUser(username: string): User | undefined {
  return loadUsers().find((u) => u.username === username);
}
