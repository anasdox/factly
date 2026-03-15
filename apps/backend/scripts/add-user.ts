import 'dotenv/config';
import bcrypt from 'bcrypt';
import { findUser, createUser } from '../src/auth/user-store';

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: npx ts-node scripts/add-user.ts <username> <password>');
    process.exit(1);
  }

  const existing = await findUser(username);
  if (existing) {
    console.error(`Error: User "${username}" already exists`);
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, 10);
  await createUser({
    username,
    password_hash: hash,
    created_at: new Date().toISOString(),
  });

  console.log(`User "${username}" created successfully`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
