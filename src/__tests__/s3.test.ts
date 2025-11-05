import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockEnv } from './helpers/env.js';

// Mock @aws-sdk/client-s3
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn()
}));

// Mock fs
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn()
  }
}));

import fs from 'fs';

describe('maybeUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should skip upload when UPLOAD_TO_S3 is false', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017'
      // Don't set UPLOAD_TO_S3 - defaults to false
    });

    vi.resetModules();
    const { maybeUpload } = await import('../uploader/s3.js');

    await maybeUpload('/path/to/file.gz', 'file.gz');

    expect(S3Client).not.toHaveBeenCalled();

    restore();
  });

  it('should upload when UPLOAD_TO_S3 is true', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      UPLOAD_TO_S3: 'true',
      S3_BUCKET: 'my-bucket',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: 'access-key',
      S3_SECRET_ACCESS_KEY: 'secret-key'
    });

    const mockSend = vi.fn().mockResolvedValue({});
    const mockClient = {
      send: mockSend
    };

    (S3Client as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);
    (PutObjectCommand as unknown as ReturnType<typeof vi.fn>).mockImplementation((params) => params);

    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(Buffer.from('test data'));

    vi.resetModules();
    const { maybeUpload } = await import('../uploader/s3.js');

    await maybeUpload('/path/to/file.gz', 'file.gz');

    expect(S3Client).toHaveBeenCalled();
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'my-bucket',
      Key: 'file.gz',
      Body: Buffer.from('test data'),
      ContentType: 'application/gzip'
    });
    expect(mockSend).toHaveBeenCalled();

    restore();
  });

  it('should throw error when UPLOAD_TO_S3 is true but S3_BUCKET is missing', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      UPLOAD_TO_S3: 'true',
      // Missing S3_BUCKET
    });

    vi.resetModules();
    const { maybeUpload } = await import('../uploader/s3.js');

    await expect(maybeUpload('/path/to/file.gz', 'file.gz')).rejects.toThrow('S3_BUCKET is required');

    restore();
  });

  it('should use default region when S3_REGION is not provided', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      UPLOAD_TO_S3: 'true',
      S3_BUCKET: 'my-bucket',
      S3_ACCESS_KEY_ID: 'access-key',
      S3_SECRET_ACCESS_KEY: 'secret-key'
      // No S3_REGION
    });

    const mockSend = vi.fn().mockResolvedValue({});
    const mockClient = {
      send: mockSend
    };

    (S3Client as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);
    (PutObjectCommand as unknown as ReturnType<typeof vi.fn>).mockImplementation((params) => params);
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(Buffer.from('test data'));

    vi.resetModules();
    const { maybeUpload } = await import('../uploader/s3.js');

    await maybeUpload('/path/to/file.gz', 'file.gz');

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'us-east-1' // Default region
      })
    );

    restore();
  });

  it('should use custom endpoint when provided', async () => {
    const restore = mockEnv({
      MONGO_URI: 'mongodb://localhost:27017',
      UPLOAD_TO_S3: 'true',
      S3_BUCKET: 'my-bucket',
      S3_ENDPOINT: 'https://s3.example.com',
      S3_REGION: 'us-west-2'
    });

    const mockSend = vi.fn().mockResolvedValue({});
    const mockClient = {
      send: mockSend
    };

    (S3Client as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);
    (PutObjectCommand as unknown as ReturnType<typeof vi.fn>).mockImplementation((params) => params);
    (fs.readFileSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(Buffer.from('test data'));

    vi.resetModules();
    const { maybeUpload } = await import('../uploader/s3.js');

    await maybeUpload('/path/to/file.gz', 'file.gz');

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://s3.example.com'
      })
    );

    restore();
  });
});

