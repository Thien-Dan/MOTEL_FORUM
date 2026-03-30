const express = require('express');
const router = express.Router();
const db = require('../index'); 

// GET /api/notifications?user_id=5
// Lấy 20 thông báo mới nhất của user
router.get('/', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'Thiếu user_id' });
    }

    try {
        const [rows] = await db.query(`
            SELECT 
                n.id,
                n.type,
                n.message,
                n.is_read,
                n.created_at,
                n.post_id,
                u.fullname   AS sender_name,
                u.avatar     AS sender_avatar
            FROM Notifications n
            LEFT JOIN Users u ON u.id = n.sender_id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT 20
        `, [user_id]);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// PATCH /api/notifications/read-all?user_id=5
// Đánh dấu tất cả đã đọc
router.patch('/read-all', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'Thiếu user_id' });
    }

    try {
        await db.query(`
            UPDATE Notifications SET is_read = TRUE
            WHERE user_id = ? AND is_read = FALSE
        `, [user_id]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// GET /api/notifications/unread-count?user_id=5
// Đếm số thông báo chưa đọc (dùng cho badge khi load trang)
router.get('/unread-count', async (req, res) => {
    const { user_id } = req.query;

    if (!user_id) {
        return res.status(400).json({ error: 'Thiếu user_id' });
    }

    try {
        const [[{ count }]] = await db.query(`
            SELECT COUNT(*) AS count
            FROM Notifications
            WHERE user_id = ? AND is_read = FALSE
        `, [user_id]);

        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// PATCH /api/notifications/:id/read
// Đánh dấu 1 thông báo đã đọc khi user click vào
router.patch('/:id/read', async (req, res) => {
    const { id } = req.params;

    try {
        await db.query(`
            UPDATE Notifications SET is_read = TRUE WHERE id = ?
        `, [id]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

module.exports = router;


