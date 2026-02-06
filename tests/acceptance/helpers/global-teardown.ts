import { stopServer } from './backend-server';

export default async function globalTeardown() {
  await stopServer();
}
