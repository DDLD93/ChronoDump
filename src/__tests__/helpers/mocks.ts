import { vi } from 'vitest';
import type { MongoClient } from 'mongodb';
import type { S3Client } from '@aws-sdk/client-s3';

export function createMockMongoClient() {
  const mockAdmin = {
    listDatabases: vi.fn().mockResolvedValue({
      databases: [
        { name: 'admin' },
        { name: 'config' },
        { name: 'local' },
        { name: 'mydb' },
        { name: 'otherdb' }
      ]
    })
  };

  const mockDb = {
    admin: vi.fn().mockReturnValue(mockAdmin)
  };

  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue(mockDb)
  } as unknown as MongoClient;

  return {
    mockClient,
    mockAdmin,
    mockDb
  };
}

export function createMockS3Client() {
  const mockSend = vi.fn().mockResolvedValue({});

  const mockClient = {
    send: mockSend
  } as unknown as S3Client;

  return {
    mockClient,
    mockSend
  };
}

export function createMockChildProcess() {
  return {
    stdout: {
      on: vi.fn()
    },
    stderr: {
      on: vi.fn()
    },
    on: vi.fn()
  };
}

