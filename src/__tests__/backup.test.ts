import { describe, it, expect, beforeEach, vi } from 'vitest';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { mockEnv } from './helpers/env.js';
import { cleanupOldBackups } from '../backup.js';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    unlinkSync: vi.fn(),
    existsSync: vi.fn()
  }
}));

// Mock other modules
vi.mock('../mongo.js', () => ({
  listDatabases: vi.fn().mockResolvedValue(['mydb', 'otherdb'])
}));

vi.mock('../uploader/s3.js', () => ({
  maybeUpload: vi.fn().mockResolvedValue(undefined)
}));

describe('cleanupOldBackups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete files older than retention period', () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      BACKUP_PATH: '/tmp/test-backups',
      RETENTION_DAYS: '7'
    });

    const now = Date.now();
    const oldFileTime = now - (8 * 24 * 60 * 60 * 1000); // 8 days ago
    const newFileTime = now - (5 * 24 * 60 * 60 * 1000); // 5 days ago

    (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
      'mydb_2025-01-01T00-00-00Z.archive.gz',
      'otherdb_2025-01-10T00-00-00Z.archive.gz'
    ]);

    (fs.statSync as ReturnType<typeof vi.fn>).mockImplementation((filePath: string) => {
      const filename = path.basename(filePath);
      if (filename.includes('2025-01-01')) {
        return { mtimeMs: oldFileTime };
      }
      return { mtimeMs: newFileTime };
    });

    vi.resetModules();
    const { cleanupOldBackups } = require('../backup.js');
    cleanupOldBackups();

    // Should delete old file but not new file
    expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    const deletedPath = (fs.unlinkSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(deletedPath).toContain('2025-01-01');

    restore();
  });

  it('should not delete files within retention period', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      BACKUP_PATH: '/tmp/test-backups',
      RETENTION_DAYS: '7'
    });

    const now = Date.now();
    const newFileTime = now - (5 * 24 * 60 * 60 * 1000); // 5 days ago

    (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
      'mydb_2025-01-10T00-00-00Z.archive.gz'
    ]);

    (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ mtimeMs: newFileTime });

    vi.resetModules();
    const { cleanupOldBackups } = await import('../backup.js');
    cleanupOldBackups();

    expect(fs.unlinkSync).not.toHaveBeenCalled();

    restore();
  });

  it('should handle errors gracefully when deleting files', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      BACKUP_PATH: '/tmp/test-backups',
      RETENTION_DAYS: '7'
    });

    const now = Date.now();
    const oldFileTime = now - (8 * 24 * 60 * 60 * 1000);

    (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
      'mydb_2025-01-01T00-00-00Z.archive.gz'
    ]);

    (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ mtimeMs: oldFileTime });
    (fs.unlinkSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Permission denied');
    });

    vi.resetModules();
    const { cleanupOldBackups } = await import('../backup.js');
    
    // Should not throw, just log warning
    expect(() => cleanupOldBackups()).not.toThrow();

    restore();
  });

  it('should only process .archive.gz files', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      BACKUP_PATH: '/tmp/test-backups',
      RETENTION_DAYS: '7'
    });

    (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
      'mydb_2025-01-01T00-00-00Z.archive.gz',
      'some-other-file.txt',
      'backup.log'
    ]);

    vi.resetModules();
    const { cleanupOldBackups } = await import('../backup.js');
    cleanupOldBackups();

    // Should only check .archive.gz files
    expect(fs.statSync).toHaveBeenCalledTimes(1);
    const checkedFile = (fs.statSync as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(checkedFile).toContain('.archive.gz');

    restore();
  });
});

describe('runAllBackups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should continue with other databases if one fails', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      BACKUP_PATH: '/tmp/test-backups'
    });

    const mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event: string, callback: (code: number) => void) => {
        if (event === 'close') {
          // First DB fails, second succeeds
          const callCount = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.length;
          if (callCount === 1) {
            callback(1); // First fails
          } else {
            callback(0); // Second succeeds
          }
        }
      })
    };

    (spawn as ReturnType<typeof vi.fn>).mockReturnValue(mockProcess);

    vi.resetModules();
    const { runAllBackups } = await import('../backup.js');
    
    // Should not throw, should continue processing
    await expect(runAllBackups()).resolves.not.toThrow();

    restore();
  });
});

