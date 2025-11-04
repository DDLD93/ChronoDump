import { createServer } from './server.js';
import { scheduleBackups } from './scheduler.js';
import { logger } from './logger.js';

async function main() {
  const app = createServer();
  await app.listen({ host: '0.0.0.0', port: 8080 });
  logger.info('Health/Control server listening on :8080');
  scheduleBackups();
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

main().catch((e) => {
  logger.error({ e }, 'Fatal error');
  process.exit(1);
});

