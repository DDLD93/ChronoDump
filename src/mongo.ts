import { MongoClient } from 'mongodb';
import { env } from './config.js';
import { logger } from './logger.js';

export async function listDatabases(): Promise<string[]> {
  const client = new MongoClient(env.MONGO_URI, { ignoreUndefined: true });
  try {
    await client.connect();
    const admin = client.db('admin').admin();
    const { databases } = await admin.listDatabases();

    const names = databases.map(d => d.name);

    const filtered = names.filter(name => {
      if (!env.INCLUDE_ADMIN_DB && name === 'admin') return false;
      if (!env.INCLUDE_CONFIG_DB && name === 'config') return false;
      if (!env.INCLUDE_LOCAL_DB && name === 'local') return false;
      return true;
    });

    logger.info({ databases: filtered }, 'Databases to back up');
    return filtered;
  } finally {
    await client.close().catch(() => {});
  }
}

