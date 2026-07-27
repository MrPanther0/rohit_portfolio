import 'dotenv/config';
import { z } from 'zod';

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? fallback : v === 'true' || v === '1'));

const int = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? fallback : Number(v)))
    .pipe(z.number().int().positive());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: int(4000),
  API_URL: z.string().url().default('http://localhost:4000'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: int(30),
  JWT_REFRESH_REMEMBER_TTL_DAYS: int(90),

  STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: int(50),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('portfolio'),

  REDIS_URL: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  TRUST_PROXY: z.string().optional().default('1'),
  RATE_LIMIT_WINDOW_MS: int(15 * 60 * 1000),
  RATE_LIMIT_MAX: int(300),

  ADMIN_EMAIL: z.string().email().default('admin@studio.dev'),
  ADMIN_PASSWORD: z.string().min(8).default('ChangeMe!2024'),
  ADMIN_NAME: z.string().default('Studio Admin'),

  ENABLE_ANALYTICS: bool(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n✖ Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

if (env.STORAGE_DRIVER === 'cloudinary') {
  const missing = (['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const).filter(
    (key) => !env[key],
  );
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(`\n✖ STORAGE_DRIVER=cloudinary but missing: ${missing.join(', ')}\n`);
    process.exit(1);
  }
}
