import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';
import http from 'http';

export const BASE_URL = 'http://localhost:3002';
const BACKEND_DIR = resolve(__dirname, '../../../apps/backend');

let serverProcess: ChildProcess | null = null;

export async function startServer(): Promise<void> {
  const alreadyRunning = await isPortOpen(3002);
  if (alreadyRunning) {
    return;
  }

  return new Promise((resolvePromise, reject) => {
    serverProcess = spawn('npx', ['ts-node', 'src/index.ts'], {
      cwd: BACKEND_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const onData = (data: Buffer) => {
      if (data.toString().includes('Server listening')) {
        resolvePromise();
      }
    };

    serverProcess.stdout?.on('data', onData);
    serverProcess.stderr?.on('data', onData);

    serverProcess.on('error', (err) => {
      reject(new Error(`Failed to start server: ${err.message}`));
    });

    serverProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    setTimeout(() => reject(new Error('Server start timeout (30s)')), 30000);
  });
}

export async function stopServer(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
    // Wait for port to be released
    await new Promise((r) => setTimeout(r, 500));
  }
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const req = http.get({ host: 'localhost', port, path: '/status', timeout: 1000 }, (res) => {
      res.resume();
      resolvePromise(true);
    });
    req.on('error', () => resolvePromise(false));
    req.on('timeout', () => {
      req.destroy();
      resolvePromise(false);
    });
  });
}
