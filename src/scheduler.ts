import cron from 'node-cron';
import { env } from './config.js';
import { runAllBackups } from './backup.js';
import { logger } from './logger.js';

export function scheduleBackups() {
  logger.info({ cron: env.BACKUP_CRON }, 'Scheduling backups');
  // Validate expression (throws if invalid)
  if (!cron.validate(env.BACKUP_CRON)) {
    throw new Error(`Invalid cron expression: ${env.BACKUP_CRON}`);
  }
  cron.schedule(env.BACKUP_CRON, async () => {
    logger.info('Cron tick: starting backups');
    try {
      await runAllBackups();
      logger.info('Cron run complete');
    } catch (e) {
      logger.error({ e }, 'Cron run failed');
    }
  });
}

