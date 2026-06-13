/**
 * POST /api/upload
 * Validates + uploads a file to Supabase Storage.
 * Returns: { url, path }
 *
 * Form fields:
 *   file    — the File blob
 *   bucket  — 'property-images' | 'avatars' | 'documents'
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@/lib/auth';

const ALLOWED_BUCKETS = ['property-images', 'avatars', 'documents'] as const;
type Bucket = typeof ALLOWED_BUCKETS[number];

const BUCKET_RULES: Record<Bucket, { maxBytes: number; types: string[] }> = {
  'property-images': { maxBytes: 5  * 1024 * 1024, types: ['image/jpeg','image/png','image/webp'] },
  'avatars':         { maxBytes: 2  * 1024 * 1024, types: ['image/jpeg','image/png','image/webp'] },
  'documents':       { maxBytes: 10 * 1024 * 1024, types: ['image/jpeg','image/png','application/pdf'] },
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file   = formData.get('file');
  const bucket = formData.get('bucket') as string | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!bucket || !ALLOWED_BUCKETS.includes(bucket as Bucket)) {
    return NextResponse.json({ error: `bucket must be one of: ${ALLOWED_BUCKETS.join(', ')}` }, { status: 400 });
  }

  const rules = BUCKET_RULES[bucket as Bucket];

  if (file.size > rules.maxBytes) {
    return NextResponse.json({
      error: `File too large. Max ${Math.round(rules.maxBytes / 1024 / 1024)} MB.`,
    }, { status: 413 });
  }

  if (!rules.types.includes(file.type)) {
    return NextResponse.json({
      error: `File type "${file.type}" not allowed. Accepted: ${rules.types.join(', ')}`,
    }, { status: 415 });
  }

  const ext  = file.name.split('.').pop()?.toLowerCase() ?? '';
  const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }

  const isPublic = bucket !== 'documents';

  if (isPublic) {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return NextResponse.json({ url: urlData.publicUrl, path: data.path });
  }

  return NextResponse.json({ url: null, path: data.path });
}
