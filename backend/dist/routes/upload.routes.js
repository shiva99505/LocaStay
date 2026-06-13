"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * POST /api/upload — upload a file (multipart/form-data: file + bucket)
 * Stores files locally under ./uploads/<bucket>/<userId>/
 * Returns { url, path }
 */
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path_1.default.join(process.cwd(), 'uploads');
const BUCKET_RULES = {
    'property-images': { maxBytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
    'avatars': { maxBytes: 2 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
    'documents': { maxBytes: 10 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'application/pdf'] },
    'agreements': { maxBytes: 10 * 1024 * 1024, types: ['application/pdf'] },
};
const storage = multer_1.default.diskStorage({
    destination(_req, _file, cb) {
        // Actual destination is set after bucket is known; fall back to temp
        cb(null, UPLOAD_ROOT);
    },
    filename(_req, file, cb) {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
router.post('/', auth_middleware_1.authenticate, upload.single('file'), async (req, res) => {
    const { user } = req;
    const file = req.file;
    const bucket = req.body.bucket;
    if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
    }
    if (!bucket || !BUCKET_RULES[bucket]) {
        res.status(400).json({ error: `bucket must be one of: ${Object.keys(BUCKET_RULES).join(', ')}` });
        return;
    }
    const rules = BUCKET_RULES[bucket];
    if (file.size > rules.maxBytes) {
        fs_1.default.unlinkSync(file.path);
        res.status(413).json({ error: `File too large. Max ${rules.maxBytes / 1024 / 1024} MB` });
        return;
    }
    if (!rules.types.includes(file.mimetype)) {
        fs_1.default.unlinkSync(file.path);
        res.status(415).json({ error: `File type "${file.mimetype}" not allowed` });
        return;
    }
    // Move file to correct bucket/user directory
    const destDir = path_1.default.join(UPLOAD_ROOT, bucket, user.id);
    fs_1.default.mkdirSync(destDir, { recursive: true });
    const destPath = path_1.default.join(destDir, path_1.default.basename(file.path));
    fs_1.default.renameSync(file.path, destPath);
    const relativePath = `${bucket}/${user.id}/${path_1.default.basename(destPath)}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
    const url = `${baseUrl}/uploads/${relativePath}`;
    res.json({ url, path: relativePath });
});
exports.default = router;
//# sourceMappingURL=upload.routes.js.map