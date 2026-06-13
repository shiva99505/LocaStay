/**
 * POST /api/upload — upload a file (multipart/form-data: file + bucket)
 * Stores files locally under ./uploads/<bucket>/<userId>/
 * Returns { url, path }
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../lib/types';

const router = Router();

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

const BUCKET_RULES: Record<string, { maxBytes: number; types: string[] }> = {
  'property-images': { maxBytes: 5  * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
  'avatars':         { maxBytes: 2  * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
  'documents':       { maxBytes: 10 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'application/pdf'] },
  'agreements':      { maxBytes: 10 * 1024 * 1024, types: ['application/pdf'] },
};

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    // Actual destination is set after bucket is known; fall back to temp
    cb(null, UPLOAD_ROOT);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const file   = req.file;
  const bucket = req.body.bucket as string;

  if (!file) { res.status(400).json({ error: 'No file provided' }); return; }
  if (!bucket || !BUCKET_RULES[bucket]) {
    res.status(400).json({ error: `bucket must be one of: ${Object.keys(BUCKET_RULES).join(', ')}` });
    return;
  }

  const rules = BUCKET_RULES[bucket];
  if (file.size > rules.maxBytes) {
    fs.unlinkSync(file.path);
    res.status(413).json({ error: `File too large. Max ${rules.maxBytes / 1024 / 1024} MB` });
    return;
  }
  if (!rules.types.includes(file.mimetype)) {
    fs.unlinkSync(file.path);
    res.status(415).json({ error: `File type "${file.mimetype}" not allowed` });
    return;
  }

  // Move file to correct bucket/user directory
  const destDir = path.join(UPLOAD_ROOT, bucket, user.id);
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, path.basename(file.path));
  fs.renameSync(file.path, destPath);

  const relativePath = `${bucket}/${user.id}/${path.basename(destPath)}`;
  const baseUrl      = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
  const url          = `${baseUrl}/uploads/${relativePath}`;

  res.json({ url, path: relativePath });
});

export default router;
