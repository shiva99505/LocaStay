"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * LocaStay Backend — Express.js REST API
 * Runs on PORT (default 4000). Frontend calls http://localhost:4000/api/*
 */
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const properties_routes_1 = __importDefault(require("./routes/properties.routes"));
const bookings_routes_1 = __importDefault(require("./routes/bookings.routes"));
const reviews_routes_1 = __importDefault(require("./routes/reviews.routes"));
const payments_routes_1 = __importDefault(require("./routes/payments.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const landlord_routes_1 = __importDefault(require("./routes/landlord.routes"));
const tenant_routes_1 = __importDefault(require("./routes/tenant.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT ?? 4000);
// ── Security ──────────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',').map(s => s.trim());
app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin))
            return cb(null, true);
        cb(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
}));
// Rate limits
app.use((0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 20 }));
// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express_1.default.json({ limit: '2mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// ── Static — serve uploaded files ─────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR ?? path_1.default.join(process.cwd(), 'uploads');
app.use('/uploads', express_1.default.static(uploadDir));
// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', auth_routes_1.default);
app.use('/api/properties', properties_routes_1.default);
app.use('/api/bookings', bookings_routes_1.default);
app.use('/api/reviews', reviews_routes_1.default);
app.use('/api/payments', payments_routes_1.default);
app.use('/api/notifications', notifications_routes_1.default);
app.use('/api/landlord', landlord_routes_1.default);
app.use('/api/tenant', tenant_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
// ── Error handling ────────────────────────────────────────────────────────────
app.use(error_middleware_1.notFound);
app.use(error_middleware_1.errorHandler);
// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
    console.log(`\n🚀 LocaStay API running at http://localhost:${PORT}`);
    console.log(`   DB          : ${process.env.DATABASE_URL}`);
    console.log(`   Environment : ${process.env.NODE_ENV ?? 'development'}`);
    console.log(`   CORS origins: ${allowedOrigins.join(', ')}\n`);
});
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use. Run: lsof -ti:${PORT} | xargs kill -9\n`);
        process.exit(1);
    }
    throw err;
});
exports.default = app;
//# sourceMappingURL=server.js.map