import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  MONGO_URI: z.string().min(1),
  BACKUP_CRON: z.string().default('30 1 * * *'),
  BACKUP_PATH: z.string().default('/app/backups'),
  RETENTION_DAYS: z.coerce.number().int().positive().default(7),
  INCLUDE_ADMIN_DB: z.coerce.boolean().default(false),
  INCLUDE_CONFIG_DB: z.coerce.boolean().default(false),
  INCLUDE_LOCAL_DB: z.coerce.boolean().default(false),

  UPLOAD_TO_S3: z.coerce.boolean().default(false),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().optional()
});

export type Env = z.infer<typeof EnvSchema>;
export const env: Env = EnvSchema.parse(process.env);

