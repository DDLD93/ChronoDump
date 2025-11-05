import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MongoClient } from 'mongodb';
import { createMockMongoClient, mockEnv } from './helpers/index.js';

// Mock mongodb module
vi.mock('mongodb', () => ({
  MongoClient: vi.fn()
}));

describe('listDatabases', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should filter out admin, config, and local databases by default', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017'
      // Don't set INCLUDE flags - use defaults (false)
    });

    const { mockClient, mockAdmin } = createMockMongoClient();
    (MongoClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);

    vi.resetModules();
    const { listDatabases } = await import('../mongo.js');
    
    const databases = await listDatabases();

    expect(databases).not.toContain('admin');
    expect(databases).not.toContain('config');
    expect(databases).not.toContain('local');
    expect(databases).toContain('mydb');
    expect(databases).toContain('otherdb');
    expect(mockClient.connect).toHaveBeenCalled();
    expect(mockClient.close).toHaveBeenCalled();

    restore();
  });

  it('should include admin database when INCLUDE_ADMIN_DB is true', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      INCLUDE_ADMIN_DB: 'true'
      // Don't set other flags - use defaults (false)
    });

    const { mockClient } = createMockMongoClient();
    (MongoClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);

    vi.resetModules();
    const { listDatabases } = await import('../mongo.js');
    
    const databases = await listDatabases();

    expect(databases).toContain('admin');
    expect(databases).not.toContain('config');
    expect(databases).not.toContain('local');

    restore();
  });

  it('should include all system databases when all flags are true', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      INCLUDE_ADMIN_DB: 'true',
      INCLUDE_CONFIG_DB: 'true',
      INCLUDE_LOCAL_DB: 'true'
    });

    const { mockClient } = createMockMongoClient();
    (MongoClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);

    vi.resetModules();
    const { listDatabases } = await import('../mongo.js');
    
    const databases = await listDatabases();

    expect(databases).toContain('admin');
    expect(databases).toContain('config');
    expect(databases).toContain('local');

    restore();
  });

  it('should close client connection even if an error occurs', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017'
    });

    const { mockClient } = createMockMongoClient();
    (mockClient.connect as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection failed'));
    (MongoClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);

    vi.resetModules();
    const { listDatabases } = await import('../mongo.js');
    
    await expect(listDatabases()).rejects.toThrow('Connection failed');
    expect(mockClient.close).toHaveBeenCalled();

    restore();
  });
});

