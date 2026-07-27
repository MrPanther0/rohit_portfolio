import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export interface StoredFile {
  url: string;
  thumbnailUrl: string | null;
  storageKey: string;
  driver: 'local' | 'cloudinary';
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
}

export interface UploadInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder?: string;
}

interface StorageDriver {
  readonly name: 'local' | 'cloudinary';
  save(input: UploadInput): Promise<StoredFile>;
  remove(storageKey: string): Promise<void>;
}

const IMAGE_MIME = /^image\/(png|jpe?g|webp|avif|gif|svg\+xml)$/i;
const RASTER_MIME = /^image\/(png|jpe?g|webp|avif)$/i;

export function isImage(mimeType: string): boolean {
  return IMAGE_MIME.test(mimeType);
}

function safeName(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const base = path
    .basename(filename, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'file'}-${crypto.randomBytes(6).toString('hex')}${ext || ''}`;
}

/** 16px-wide WebP data URL used as an instant blur-up placeholder on the client. */
async function makeBlurDataUrl(buffer: Buffer): Promise<string | null> {
  try {
    const tiny = await sharp(buffer).resize(16, 16, { fit: 'inside' }).webp({ quality: 40 }).toBuffer();
    return `data:image/webp;base64,${tiny.toString('base64')}`;
  } catch {
    return null;
  }
}

class LocalDriver implements StorageDriver {
  readonly name = 'local' as const;
  private readonly root = path.resolve(process.cwd(), env.UPLOAD_DIR);

  private async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  async save({ buffer, filename, mimeType, folder = 'library' }: UploadInput): Promise<StoredFile> {
    const dir = path.join(this.root, folder);
    await this.ensureDir(dir);

    const name = safeName(filename);
    const key = path.posix.join(folder, name);
    let width: number | null = null;
    let height: number | null = null;
    let thumbnailUrl: string | null = null;
    let blurDataUrl: string | null = null;
    let output = buffer;

    if (RASTER_MIME.test(mimeType)) {
      const image = sharp(buffer, { failOn: 'none' }).rotate();
      const meta = await image.metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;

      // Re-encode oversized originals; keeps the library lean without losing fidelity.
      output = await image
        .resize({ width: 3200, height: 3200, fit: 'inside', withoutEnlargement: true })
        .toBuffer();

      const thumbName = `thumb-${name.replace(/\.[^.]+$/, '')}.webp`;
      await sharp(buffer)
        .rotate()
        .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(path.join(dir, thumbName));

      thumbnailUrl = `${env.API_URL}/static/${path.posix.join(folder, thumbName)}`;
      blurDataUrl = await makeBlurDataUrl(buffer);
    }

    await fs.writeFile(path.join(dir, name), output);

    return {
      url: `${env.API_URL}/static/${key}`,
      thumbnailUrl,
      storageKey: key,
      driver: 'local',
      width,
      height,
      blurDataUrl,
    };
  }

  async remove(storageKey: string): Promise<void> {
    const target = path.resolve(this.root, storageKey);
    if (!target.startsWith(this.root)) throw new Error('Refusing to delete outside the upload root');

    const dir = path.dirname(target);
    const base = path.basename(target);
    const thumb = path.join(dir, `thumb-${base.replace(/\.[^.]+$/, '')}.webp`);

    await Promise.allSettled([fs.unlink(target), fs.unlink(thumb)]);
  }
}

class CloudinaryDriver implements StorageDriver {
  readonly name = 'cloudinary' as const;

  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async save({ buffer, filename, mimeType, folder = 'library' }: UploadInput): Promise<StoredFile> {
    const resourceType = mimeType.startsWith('video/')
      ? 'video'
      : isImage(mimeType)
        ? 'image'
        : 'raw';

    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
          resource_type: resourceType,
          public_id: safeName(filename).replace(/\.[^.]+$/, ''),
          overwrite: false,
        },
        (error, res) => (error || !res ? reject(error ?? new Error('Upload failed')) : resolve(res as never)),
      );
      stream.end(buffer);
    });

    const publicId = String(result.public_id);
    const url = String(result.secure_url);

    return {
      url,
      thumbnailUrl:
        resourceType === 'image'
          ? cloudinary.url(publicId, { width: 640, crop: 'limit', fetch_format: 'auto', quality: 'auto' })
          : null,
      storageKey: `${resourceType}:${publicId}`,
      driver: 'cloudinary',
      width: typeof result.width === 'number' ? result.width : null,
      height: typeof result.height === 'number' ? result.height : null,
      blurDataUrl: RASTER_MIME.test(mimeType) ? await makeBlurDataUrl(buffer) : null,
    };
  }

  async remove(storageKey: string): Promise<void> {
    const [resourceType = 'image', ...rest] = storageKey.split(':');
    await cloudinary.uploader.destroy(rest.join(':'), { resource_type: resourceType });
  }
}

export const storage: StorageDriver =
  env.STORAGE_DRIVER === 'cloudinary' ? new CloudinaryDriver() : new LocalDriver();

logger.info({ driver: storage.name }, 'storage driver initialised');
