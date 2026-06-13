"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTenant = exports.requireLandlord = exports.requireAdmin = void 0;
exports.authenticate = authenticate;
exports.requireRole = requireRole;
const jwt_1 = require("../lib/jwt");
const db_1 = require("../lib/db");
async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
    }
    let payload;
    try {
        payload = (0, jwt_1.verifyToken)(header.slice(7));
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
    }
    const user = await db_1.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true, isSuspended: true },
    });
    if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
    }
    if (user.isSuspended) {
        res.status(403).json({ error: 'Account suspended. Contact support.' });
        return;
    }
    req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuspended: user.isSuspended,
    };
    next();
}
function requireRole(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
            return;
        }
        next();
    };
}
exports.requireAdmin = requireRole('ADMIN');
exports.requireLandlord = requireRole('LANDLORD', 'ADMIN');
exports.requireTenant = requireRole('TENANT', 'ADMIN');
//# sourceMappingURL=auth.middleware.js.map