import multer from 'multer';
import { env } from '../config/env.js';
import { BadRequestError } from '../lib/errors.js';

const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'application/pdf',
  'application/json', // Lottie
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new BadRequestError(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});
