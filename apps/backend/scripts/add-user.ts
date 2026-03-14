import bcrypt from 'bcrypt';
import { loadUsers, saveUsers, findUser } from '../src/auth/user-store';

const username = process.env.USER;
const password = process.env.PASS;

if (!username || !password) {
  console.error('Error: USER and PASS are required');
  process.exit(1);
}

if (findUser(username)) {
  console.error(`Error: User "${username}" already exists`);
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
const users = loadUsers();
users.push({
  username,
  password_hash: hash,
  created_at: new Date().toISOString(),
});
saveUsers(users);

console.log(`User "${username}" created successfully`);
