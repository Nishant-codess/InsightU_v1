import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Ensure local uploads directory exists (dev only)
if (!IS_PRODUCTION) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export interface StorageResult {
  fileUrl: string;
  filename: string;
}

/**
 * Store a file buffer. Uses local disk in dev, S3 in production.
 */
export async function storeFile(
  buffer: Buffer,
  originalname: string,
  mimetype: string
): Promise<StorageResult> {
  const timestamp = Date.now();
  const safeName = originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${timestamp}_${safeName}`;

  if (IS_PRODUCTION) {
    return storeFileS3(buffer, filename, mimetype);
  }
  return storeFileLocal(buffer, filename);
}

async function storeFileLocal(buffer: Buffer, filename: string): Promise<StorageResult> {
  const filePath = path.join(UPLOADS_DIR, filename);
  await fs.promises.writeFile(filePath, buffer);
  const fileUrl = `/uploads/${filename}`;
  return { fileUrl, filename };
}

async function storeFileS3(buffer: Buffer, filename: string, mimetype: string): Promise<StorageResult> {
  // Dynamically require AWS SDK v3 — only available in production environment
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3') as any;

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION ?? 'us-east-1';

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is not set');
  }

  const client = new S3Client({ region });
  const key = `notes/${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { fileUrl, filename };
}

/**
 * Resolve a public URL for a stored filename.
 * In dev, returns a local path. In production, returns the S3 URL.
 */
export function getFileUrl(filename: string): string {
  if (IS_PRODUCTION) {
    const bucket = process.env.AWS_S3_BUCKET ?? '';
    const region = process.env.AWS_REGION ?? 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/notes/${filename}`;
  }
  return `/uploads/${filename}`;
}

/**
 * Delete a stored file by its URL.
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  if (IS_PRODUCTION) {
    await deleteFileS3(fileUrl);
  } else {
    await deleteFileLocal(fileUrl);
  }
}

async function deleteFileLocal(fileUrl: string): Promise<void> {
  // fileUrl is like /uploads/filename
  const filename = path.basename(fileUrl);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }
}

async function deleteFileS3(fileUrl: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3') as any;

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION ?? 'us-east-1';

  if (!bucket) {
    throw new Error('AWS_S3_BUCKET environment variable is not set');
  }

  // Extract key from URL: https://bucket.s3.region.amazonaws.com/key
  const url = new URL(fileUrl);
  const key = url.pathname.replace(/^\//, '');

  const client = new S3Client({ region });
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
