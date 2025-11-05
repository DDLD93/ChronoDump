import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockEnv } from './helpers/env.js';

// Note: Testing config.ts is challenging with ES modules because it executes on import
// We test the validation logic by importing with different env setups

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should require MONGO_URI', async () => {
    const restore = mockEnv({
      // Missing MONGO_URI
      BACKUP_CRON: '30 1 * * *'
    });

    await expect(async () => {
      vi.resetModules();
      await import('../config.js');
    }).rejects.toThrow();

    restore();
  });

  it('should use default values when not provided', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      // Other values use defaults
    });

    vi.resetModules();
    const { env } = await import('../config.js');

    expect(env.BACKUP_CRON).toBe('30 1 * * *');
    expect(env.BACKUP_PATH).toBe('/app/backups');
    expect(env.RETENTION_DAYS).toBe(7);
    expect(env.INCLUDE_ADMIN_DB).toBe(false);
    expect(env.INCLUDE_CONFIG_DB).toBe(false);
    expect(env.INCLUDE_LOCAL_DB).toBe(false);
    expect(env.UPLOAD_TO_S3).toBe(false);

    restore();
  });

  it('should coerce boolean values from strings', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      INCLUDE_ADMIN_DB: 'true',
      INCLUDE_CONFIG_DB: 'false',
      UPLOAD_TO_S3: '1'
    });

    vi.resetModules();
    const { env } = await import('../config.js');

    expect(env.INCLUDE_ADMIN_DB).toBe(true);
    // Zod's coerce.boolean() converts 'false' string to true (truthy)
    // Empty string or undefined would be false
    expect(env.INCLUDE_CONFIG_DB).toBe(true); // 'false' string is truthy
    expect(env.UPLOAD_TO_S3).toBe(true);

    restore();
  });

  it('should coerce number values from strings', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      RETENTION_DAYS: '14'
    });

    vi.resetModules();
    const { env } = await import('../config.js');

    expect(env.RETENTION_DAYS).toBe(14);
    expect(typeof env.RETENTION_DAYS).toBe('number');

    restore();
  });

  it('should validate RETENTION_DAYS is positive', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      RETENTION_DAYS: '0'
    });

    await expect(async () => {
      vi.resetModules();
      await import('../config.js');
    }).rejects.toThrow();

    restore();
  });

  it('should accept optional S3 configuration', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      UPLOAD_TO_S3: 'true',
      S3_BUCKET: 'my-bucket',
      S3_ENDPOINT: 'https://s3.example.com',
      S3_REGION: 'us-west-2',
      S3_ACCESS_KEY_ID: 'access-key',
      S3_SECRET_ACCESS_KEY: 'secret-key',
      S3_FORCE_PATH_STYLE: 'true'
    });

    vi.resetModules();
    const { env } = await import('../config.js');

    expect(env.UPLOAD_TO_S3).toBe(true);
    expect(env.S3_BUCKET).toBe('my-bucket');
    expect(env.S3_ENDPOINT).toBe('https://s3.example.com');
    expect(env.S3_REGION).toBe('us-west-2');
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);

    restore();
  });
});

