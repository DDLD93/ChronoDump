import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockEnv } from './helpers/env.js';

// Mock backup module
vi.mock('../backup.js', () => ({
  runAllBackups: vi.fn().mockResolvedValue(undefined)
}));

describe('server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a Fastify server', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017'
    });

    vi.resetModules();
    const { createServer } = await import('../server.js');
    const app = createServer();

    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
    expect(typeof app.get).toBe('function');
    expect(typeof app.post).toBe('function');

    restore();
  });

  it('should respond to /healthz endpoint', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017'
    });

    vi.resetModules();
    const { createServer } = await import('../server.js');
    const app = createServer();

    const response = await app.inject({
      method: 'GET',
      url: '/healthz'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });

    restore();
  });

  it('should trigger backup on /backup-now endpoint', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017'
    });

    vi.resetModules();
    const { createServer } = await import('../server.js');
    const { runAllBackups } = await import('../backup.js');
    const app = createServer();

    const response = await app.inject({
      method: 'POST',
      url: '/backup-now'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'started' });
    expect(runAllBackups).toHaveBeenCalled();

    restore();
  });

  it('should handle errors in /backup-now gracefully', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017'
    });

    vi.resetModules();
    const { createServer } = await import('../server.js');
    const { runAllBackups } = await import('../backup.js');
    
    (runAllBackups as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Backup failed'));
    const app = createServer();

    const response = await app.inject({
      method: 'POST',
      url: '/backup-now'
    });

    // Should return 500 or handle error appropriately
    expect(response.statusCode).toBeGreaterThanOrEqual(400);

    restore();
  });
});

