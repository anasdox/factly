import { startServer } from './backend-server';

export default async function globalSetup() {
  await startServer();
}
