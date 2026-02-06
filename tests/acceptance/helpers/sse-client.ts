import http from 'http';

export interface SseConnection {
  messages: any[];
  close: () => void;
  waitForMessages: (count: number, timeoutMs?: number) => Promise<any[]>;
}

export function connectSse(url: string): Promise<SseConnection> {
  return new Promise((resolve, reject) => {
    const messages: any[] = [];
    let messageResolvers: Array<() => void> = [];

    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`SSE connection failed with status ${res.statusCode}`));
        return;
      }

      res.setEncoding('utf8');
      let buffer = '';

      res.on('data', (chunk: string) => {
        buffer += chunk;
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                messages.push(JSON.parse(line.slice(6)));
                // Notify waiters
                for (const resolver of messageResolvers) {
                  resolver();
                }
                messageResolvers = [];
              } catch {
                // ignore non-JSON
              }
            }
          }
        }
      });

      const connection: SseConnection = {
        messages,
        close: () => req.destroy(),
        waitForMessages: (count: number, timeoutMs = 5000) => {
          return new Promise((resolve, reject) => {
            if (messages.length >= count) {
              resolve(messages.slice(0, count));
              return;
            }
            const timeout = setTimeout(() => {
              reject(new Error(`Timeout waiting for ${count} messages, got ${messages.length}`));
            }, timeoutMs);

            const check = () => {
              if (messages.length >= count) {
                clearTimeout(timeout);
                resolve(messages.slice(0, count));
              } else {
                messageResolvers.push(check);
              }
            };
            messageResolvers.push(check);
          });
        },
      };

      // Wait a bit for the connection to be established and first message sent
      setTimeout(() => resolve(connection), 300);
    });

    req.on('error', reject);
    req.setTimeout(10000);
  });
}
