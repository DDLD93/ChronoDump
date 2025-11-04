import fs from 'fs';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let s3: S3Client | null = null;
function getClient(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: env.S3_REGION || 'us-east-1',
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE ?? true,
      credentials: env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY ? {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY
      } : undefined
    });
  }
  return s3;
}

export async function maybeUpload(fullPath: string, key: string) {
  if (!env.UPLOAD_TO_S3) return;
  if (!env.S3_BUCKET) throw new Error('S3_BUCKET is required when UPLOAD_TO_S3=true');
  const Body = fs.readFileSync(fullPath);
  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body,
    ContentType: 'application/gzip'
  }));
  logger.info({ key }, 'Uploaded archive to S3');
}

