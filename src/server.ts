import Fastify from 'fastify';
import underPressure from '@fastify/under-pressure';
import { runAllBackups } from './backup.js';

export function createServer() {
  const app = Fastify({ logger: false });

  app.register(underPressure);

  app.get('/healthz', async () => ({ status: 'ok' }));
  app.post('/backup-now', async () => {
    await runAllBackups();
    return { status: 'started' };
  });

  return app;
}

