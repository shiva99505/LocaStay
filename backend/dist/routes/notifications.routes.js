"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * GET  /api/notifications       — list notifications (with unread count)
 * POST /api/notifications/read  — mark one or all as read
 */
const express_1 = require("express");
const db_1 = require("../lib/db");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/notifications
router.get('/', auth_middleware_1.authenticate, async (req, res) => {
    const { user } = req;
    const data = await db_1.prisma.notification.findMany({
        where: { userId: user.id },
        select: { id: true, title: true, message: true, type: true, isRead: true, link: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    const unreadCount = data.filter((n) => !n.isRead).length;
    res.json({ data, unread_count: unreadCount });
});
// POST /api/notifications/read
router.post('/read', auth_middleware_1.authenticate, async (req, res) => {
    const { user } = req;
    const { id } = req.body;
    if (id) {
        await db_1.prisma.notification.updateMany({
            where: { id, userId: user.id },
            data: { isRead: true },
        });
    }
    else {
        await db_1.prisma.notification.updateMany({
            where: { userId: user.id, isRead: false },
            data: { isRead: true },
        });
    }
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map