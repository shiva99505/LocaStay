/**
 * Secure image / document upload helpers.
 * Every upload is validated for MIME type and size before hitting Supabase Storage.
 * Files are stored under `<userId>/<uuid>.<ext>` so the RLS folder-based policy works.
 */
import { createClient } from './client';

// ─── Config ───────────────────────────────────────────────────────────────────

const BUCKETS = {
  propertyImages: 'property-images',
  avatars:        'avatars',
  documents:      'documents',
  agreements:     'agreements',
} as const;

type BucketKey = keyof typeof BUCKETS;

const ALLOWED_IMAGE_TYPES  = ['image/jpeg', 'image/png', 'image/webp'] as const;
const ALLOWED_DOC_TYPES    = ['image/jpeg', 'image/png', 'application/pdf'] as const;

const MAX_IMAGE_SIZE  = 5 * 1024 * 1024;   // 5 MB
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;   // 2 MB
const MAX_DOC_SIZE    = 10 * 1024 * 1024;  // 10 MB

// ─── Validation ───────────────────────────────────────────────────────────────

interface ValidationRule {
  maxBytes:     number;
  allowedTypes: readonly string[];
}

const BUCKET_RULES: Record<BucketKey, ValidationRule> = {
  propertyImages: { maxBytes: MAX_IMAGE_SIZE,  allowedTypes: ALLOWED_IMAGE_TYPES },
  avatars:        { maxBytes: MAX_AVATAR_SIZE, allowedTypes: ALLOWED_IMAGE_TYPES },
  documents:      { maxBytes: MAX_DOC_SIZE,    allowedTypes: ALLOWED_DOC_TYPES  },
  agreements:     { maxBytes: MAX_DOC_SIZE,    allowedTypes: ['application/pdf'] },
};

function validateFile(file: File, bucket: BucketKey): void {
  const { maxBytes, allowedTypes } = BUCKET_RULES[bucket];

  if (file.size > maxBytes) {
    throw new Error(
      `File too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.`,
    );
  }

  if (!allowedTypes.includes(file.type as never)) {
    throw new Error(
      `File type "${file.type}" is not allowed. Accepted: ${allowedTypes.join(', ')}.`,
    );
  }
}

// ─── Upload helpers ───────────────────────────────────────────────────────────

function randomId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function fileExtension(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext ? `.${ext}` : '';
}

export interface UploadResult {
  path: string;        // storage path (relative)
  publicUrl: string;   // CDN URL (for public buckets)
}

/**
 * Generic upload — validates then stores.
 * Path pattern: `<userId>/<uuid><ext>`
 */
async function upload(
  file: File,
  bucketKey: BucketKey,
  userId: string,
): Promise<UploadResult> {
  validateFile(file, bucketKey);

  const supabase   = createClient();
  const bucketName = BUCKETS[bucketKey];
  const path       = `${userId}/${randomId()}${fileExtension(file)}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      cacheControl: '3600',
      upsert:       false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(data.path);

  return {
    path:      data.path,
    publicUrl: urlData.publicUrl,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Upload a single property photo. */
export async function uploadPropertyImage(
  file: File,
  userId: string,
): Promise<UploadResult> {
  return upload(file, 'propertyImages', userId);
}

/** Upload multiple property photos (sequential — respects RLS). */
export async function uploadPropertyImages(
  files: File[],
  userId: string,
  onProgress?: (completed: number, total: number) => void,
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  for (let i = 0; i < files.length; i++) {
    results.push(await upload(files[i]!, 'propertyImages', userId));
    onProgress?.(i + 1, files.length);
  }
  return results;
}

/** Replace a user's avatar. Deletes the old file first. */
export async function uploadAvatar(
  file: File,
  userId: string,
  oldPath?: string,
): Promise<UploadResult> {
  const supabase = createClient();

  if (oldPath) {
    await supabase.storage.from(BUCKETS.avatars).remove([oldPath]);
  }

  return upload(file, 'avatars', userId);
}

/** Upload a document (private bucket). Returns the storage path only (no public URL). */
export async function uploadDocument(
  file: File,
  userId: string,
): Promise<string> {
  const supabase   = createClient();
  const bucketName = BUCKETS.documents;
  const path       = `${userId}/${randomId()}${fileExtension(file)}`;

  validateFile(file, 'documents');

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, file, { cacheControl: '300', upsert: false });

  if (error) throw new Error(`uploadDocument: ${error.message}`);
  return data.path;
}

/** Generate a short-lived signed URL for a private document. */
export async function getDocumentSignedUrl(
  path: string,
  expiresInSeconds = 60 * 30,  // 30 minutes
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKETS.documents)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw new Error(`getDocumentSignedUrl: ${error.message}`);
  return data.signedUrl;
}

/** Delete files from storage (landlord cleaning up old images). */
export async function deleteStorageFiles(
  bucket: BucketKey,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKETS[bucket])
    .remove(paths);

  if (error) throw new Error(`deleteStorageFiles: ${error.message}`);
}
