import { describe, it, expect, beforeEach, vi } from 'vitest';
import cron from 'node-cron';
import { mockEnv } from './helpers/env.js';

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    validate: vi.fn(),
    schedule: vi.fn()
  }
}));

// Mock backup module
vi.mock('../backup.js', () => ({
  runAllBackups: vi.fn().mockResolvedValue(undefined)
}));

describe('scheduleBackups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate cron expression', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      BACKUP_CRON: 'invalid-cron'
    });

    (cron.validate as ReturnType<typeof vi.fn>).mockReturnValue(false);

    vi.resetModules();
    const { scheduleBackups } = await import('../scheduler.js');

    expect(() => scheduleBackups()).toThrow('Invalid cron expression');

    restore();
  });

  it('should schedule backups with valid cron expression', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      BACKUP_CRON: '30 1 * * *'
    });

    (cron.validate as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (cron.schedule as ReturnType<typeof vi.fn>).mockReturnValue({ start: vi.fn() });

    vi.resetModules();
    const { scheduleBackups } = await import('../scheduler.js');

    expect(() => scheduleBackups()).not.toThrow();
    expect(cron.validate).toHaveBeenCalledWith('30 1 * * *');
    expect(cron.schedule).toHaveBeenCalledWith('30 1 * * *', expect.any(Function));

    restore();
  });

  it('should call runAllBackups when cron triggers', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      BACKUP_CRON: '30 1 * * *'
    });

    let cronCallback: (() => Promise<void>) | null = null;
    (cron.validate as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (cron.schedule as ReturnType<typeof vi.fn>).mockImplementation((expr: string, callback: () => Promise<void>) => {
      cronCallback = callback;
      return { start: vi.fn() };
    });

    vi.resetModules();
    const { scheduleBackups } = require('../scheduler.js');
    const { runAllBackups } = await import('../backup.js');

    scheduleBackups();

    // Simulate cron trigger
    if (cronCallback) {
      await cronCallback();
    }

    expect(runAllBackups).toHaveBeenCalled();

    restore();
  });

  it('should handle errors in cron callback gracefully', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      BACKUP_CRON: '30 1 * * *'
    });

    let cronCallback: (() => Promise<void>) | null = null;
    (cron.validate as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (cron.schedule as ReturnType<typeof vi.fn>).mockImplementation((expr: string, callback: () => Promise<void>) => {
      cronCallback = callback;
      return { start: vi.fn() };
    });

    vi.resetModules();
    const { scheduleBackups } = require('../scheduler.js');
    const { runAllBackups } = await import('../backup.js');

    (runAllBackups as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Backup failed'));

    scheduleBackups();

    // Should not throw when cron callback fails
    if (cronCallback) {
      await expect(cronCallback()).resolves.not.toThrow();
    }

    restore();
  });
});

