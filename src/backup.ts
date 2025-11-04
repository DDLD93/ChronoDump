import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { env } from './config.js';
import { logger } from './logger.js';
import { utcTimestamp } from './utils/time.js';
import { listDatabases } from './mongo.js';
import { maybeUpload } from './uploader/s3.js';

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function runDumpForDb(dbName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ensureDir(env.BACKUP_PATH);
    const stamp = utcTimestamp();
    const filename = `${dbName}_${stamp}.archive.gz`;
    const finalPath = path.join(env.BACKUP_PATH, filename);
    const tempPath = finalPath + '.part';

    const args = [
      `--uri=${env.MONGO_URI}`,
      `--db=${dbName}`,
      `--archive=${tempPath}`,
      '--gzip'
    ];

    logger.info({ dbName, finalPath }, 'Starting mongodump');
    const proc = spawn('mongodump', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.on('data', (d) => logger.debug({ dbName, msg: d.toString() }));
    proc.stderr.on('data', (d) => logger.warn({ dbName, err: d.toString() }));

    proc.on('error', (err) => {
      logger.error({ dbName, err }, 'Failed to start mongodump');
      reject(err);
    });

    proc.on('close', async (code) => {
      if (code === 0) {
        fs.renameSync(tempPath, finalPath);
        logger.info({ dbName, path: finalPath }, 'Backup complete');
        try {
          await maybeUpload(finalPath, filename);
        } catch (e) {
          logger.error({ dbName, e }, 'Upload failed');
        }
        resolve(finalPath);
      } else {
        logger.error({ dbName, code }, 'mongodump exited with non-zero code');
        try { fs.existsSync(tempPath) && fs.unlinkSync(tempPath); } catch {}
        reject(new Error(`mongodump failed for ${dbName} (code ${code})`));
      }
    });
  });
}

export async function runAllBackups(): Promise<void> {
  const dbs = await listDatabases();
  for (const db of dbs) {
    try {
      await runDumpForDb(db);
    } catch (e) {
      // continue with other DBs
      logger.error({ db, e }, 'Backup failed for database');
    }
  }
  cleanupOldBackups();
}

export function cleanupOldBackups() {
  const cutoff = Date.now() - env.RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(env.BACKUP_PATH).filter(f => f.endsWith('.archive.gz'));
  for (const f of files) {
    const p = path.join(env.BACKUP_PATH, f);
    try {
      const st = fs.statSync(p);
      if (st.mtimeMs < cutoff) {
        fs.unlinkSync(p);
        logger.info({ file: f }, 'Deleted old archive');
      }
    } catch (e) {
      logger.warn({ file: f, e }, 'Failed to evaluate for cleanup');
    }
  }
}

