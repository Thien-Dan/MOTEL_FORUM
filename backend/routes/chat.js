const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../index');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'messages');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const uniquePart = Math.round(Math.random() * 1e9);
        const extension = path.extname(file.originalname) || '';
        cb(null, `${timestamp}-${uniquePart}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    }
});

const buildFileUrl = (filePath, req) => {
    if (!filePath) return null;
    const normalized = filePath.replace(/\\/g, '/');
    return `${req.protocol}://${req.get('host')}/${normalized}`;
};

const parseOtherParticipant = (row) => {
    if (!row) return null;
    const parts = row.split('|');
    return {
        id: Number(parts[0]) || null,
        fullname: parts[1] || null,
        avatar: parts[2] || null,
    };
};

router.get('/', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
        return res.status(400).json({ error: 'Thiếu user_id' });
    }

    try {
        const [rows] = await db.query(`
            SELECT
                c.id,
                c.post_id,
                p.title AS post_title,
                (SELECT content FROM Messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL AND (m.expires_at IS NULL OR m.expires_at > NOW()) ORDER BY m.created_at DESC LIMIT 1) AS last_message,
                (SELECT message_type FROM Messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL AND (m.expires_at IS NULL OR m.expires_at > NOW()) ORDER BY m.created_at DESC LIMIT 1) AS last_message_type,
                (SELECT created_at FROM Messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL AND (m.expires_at IS NULL OR m.expires_at > NOW()) ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
                (SELECT COUNT(*) FROM Messages m WHERE m.conversation_id = c.id AND m.is_read = FALSE AND m.sender_id != ?) AS unread_count,
                (SELECT CONCAT(u.id, '|', u.fullname, '|', IFNULL(u.avatar, ''))
                 FROM ConversationParticipants cp2
                 JOIN Users u ON cp2.user_id = u.id
                 WHERE cp2.conversation_id = c.id AND cp2.user_id != ?
                 LIMIT 1) AS other_participant
            FROM Conversations c
            JOIN ConversationParticipants cp ON cp.conversation_id = c.id
            LEFT JOIN Posts p ON p.id = c.post_id
            WHERE cp.user_id = ?
            ORDER BY last_message_at DESC, c.created_at DESC
        `, [user_id, user_id, user_id]);

        const conversations = rows.map(row => ({
            id: row.id,
            post_id: row.post_id,
            post_title: row.post_title,
            last_message: row.last_message || null,
            last_message_type: row.last_message_type || 'text',
            last_message_at: row.last_message_at || null,
            unread_count: Number(row.unread_count) || 0,
            other_participant: parseOtherParticipant(row.other_participant),
        }));

        res.json({ conversations });
    } catch (err) {
        console.error('Lỗi lấy conversation list:', err);
        res.status(500).json({ error: 'Lỗi server chat' });
    }
});

router.post('/', async (req, res) => {
    const { user_id, other_user_id, post_id } = req.body;
    if (!user_id || !other_user_id) {
        return res.status(400).json({ error: 'Thiếu user_id hoặc other_user_id' });
    }

    if (Number(user_id) === Number(other_user_id)) {
        return res.status(400).json({ error: 'Không thể tạo conversation với chính mình' });
    }

    try {
        const [existing] = await db.query(`
            SELECT c.id
            FROM Conversations c
            JOIN ConversationParticipants cp ON cp.conversation_id = c.id
            WHERE ((? IS NULL AND c.post_id IS NULL) OR c.post_id = ?)
              AND cp.user_id IN (?, ?)
            GROUP BY c.id
            HAVING COUNT(DISTINCT cp.user_id) = 2
               AND (SELECT COUNT(*) FROM ConversationParticipants cp2 WHERE cp2.conversation_id = c.id) = 2
            LIMIT 1
        `, [post_id || null, post_id || null, user_id, other_user_id]);

        if (existing.length > 0) {
            return res.json({ conversation_id: existing[0].id, reused: true });
        }

        const [result] = await db.query(`INSERT INTO Conversations (post_id) VALUES (?)`, [post_id || null]);
        const conversationId = result.insertId;

        await db.query(`INSERT INTO ConversationParticipants (conversation_id, user_id) VALUES (?, ?), (?, ?)`, [conversationId, user_id, conversationId, other_user_id]);

        res.status(201).json({ conversation_id: conversationId, reused: false });
    } catch (err) {
        console.error('Lỗi tạo conversation:', err);
        res.status(500).json({ error: 'Lỗi server chat' });
    }
});

router.get('/unread-count', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) {
        return res.status(400).json({ error: 'Thiếu user_id' });
    }

    try {
        const [[result]] = await db.query(`
            SELECT COUNT(*) AS count
            FROM Messages m
            JOIN ConversationParticipants cp ON cp.conversation_id = m.conversation_id
            WHERE cp.user_id = ?
              AND m.sender_id != ?
              AND m.is_read = FALSE
              AND m.deleted_at IS NULL
              AND (m.expires_at IS NULL OR m.expires_at > NOW())
        `, [user_id, user_id]);

        res.json({ unread_count: Number(result.count) || 0 });
    } catch (err) {
        console.error('Lỗi lấy unread count:', err);
        res.status(500).json({ error: 'Lỗi server chat' });
    }
});

router.get('/:conversationId/messages', async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    const { user_id } = req.query;

    if (!conversationId || !user_id) {
        return res.status(400).json({ error: 'Thiếu conversationId hoặc user_id' });
    }

    try {
        const [participants] = await db.query(`
            SELECT user_id FROM ConversationParticipants
            WHERE conversation_id = ? AND user_id = ?
        `, [conversationId, user_id]);

        if (participants.length === 0) {
            return res.status(403).json({ error: 'Không có quyền xem conversation này' });
        }

        const [rows] = await db.query(`
            SELECT
                m.id AS message_id,
                m.conversation_id,
                m.sender_id,
                m.content,
                m.message_type,
                m.is_read,
                m.created_at,
                m.expires_at,
                a.id AS attachment_id,
                a.file_path,
                a.file_name,
                a.mime_type,
                a.file_size
            FROM Messages m
            LEFT JOIN MessageAttachments a ON a.message_id = m.id AND a.deleted_at IS NULL AND (a.expires_at IS NULL OR a.expires_at > NOW())
            WHERE m.conversation_id = ?
              AND m.deleted_at IS NULL
              AND (m.expires_at IS NULL OR m.expires_at > NOW())
            ORDER BY m.created_at ASC
        `, [conversationId]);

        const messages = [];
        const map = new Map();

        for (const row of rows) {
            if (!map.has(row.message_id)) {
                const message = {
                    id: row.message_id,
                    conversation_id: row.conversation_id,
                    sender_id: row.sender_id,
                    content: row.content,
                    message_type: row.message_type,
                    is_read: Boolean(row.is_read),
                    created_at: row.created_at,
                    expires_at: row.expires_at,
                    attachments: []
                };
                map.set(row.message_id, message);
                messages.push(message);
            }

            if (row.attachment_id) {
                map.get(row.message_id).attachments.push({
                    id: row.attachment_id,
                    file_path: row.file_path,
                    file_name: row.file_name,
                    mime_type: row.mime_type,
                    file_size: row.file_size,
                    url: buildFileUrl(row.file_path, req)
                });
            }
        }

        res.json({ messages });
    } catch (err) {
        console.error('Lỗi lấy messages:', err);
        res.status(500).json({ error: 'Lỗi server chat' });
    }
});

router.post('/:conversationId/messages', upload.single('attachment'), async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    const { sender_id, content, expires_at } = req.body;

    if (!conversationId || !sender_id) {
        return res.status(400).json({ error: 'Thiếu conversationId hoặc sender_id' });
    }

    if (!content && !req.file) {
        return res.status(400).json({ error: 'Thiếu nội dung hoặc tập tin đính kèm' });
    }

    try {
        const [conversationRows] = await db.query(`
            SELECT post_id FROM Conversations WHERE id = ?
        `, [conversationId]);
        if (conversationRows.length === 0) {
            return res.status(404).json({ error: 'Conversation không tồn tại' });
        }

        const [participantRows] = await db.query(`
            SELECT user_id FROM ConversationParticipants
            WHERE conversation_id = ? AND user_id = ?
        `, [conversationId, sender_id]);

        if (participantRows.length === 0) {
            return res.status(403).json({ error: 'Không có quyền gửi tin nhắn trong conversation này' });
        }

        const messageType = req.file
            ? req.file.mimetype.startsWith('image/') ? 'image' : 'file'
            : 'text';

        const expiresAtValue = expires_at ? new Date(expires_at) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const expiresAt = isNaN(expiresAtValue.getTime()) ? null : expiresAtValue;

        const [insertResult] = await db.query(`
            INSERT INTO Messages (conversation_id, sender_id, content, message_type, is_read, expires_at)
            VALUES (?, ?, ?, ?, FALSE, ?)
        `, [conversationId, sender_id, content || null, messageType, expiresAt]);

        const messageId = insertResult.insertId;
        let attachment = null;

        if (req.file) {
            const relativePath = path.join('uploads', 'messages', req.file.filename).replace(/\\/g, '/');
            const [attachmentResult] = await db.query(`
                INSERT INTO MessageAttachments (message_id, file_path, file_name, mime_type, file_size, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [messageId, relativePath, req.file.originalname, req.file.mimetype, req.file.size, expiresAt]);

            attachment = {
                id: attachmentResult.insertId,
                file_path: relativePath,
                file_name: req.file.originalname,
                mime_type: req.file.mimetype,
                file_size: req.file.size,
                url: buildFileUrl(relativePath, req)
            };
        }

        const [participantList] = await db.query(`
            SELECT user_id FROM ConversationParticipants
            WHERE conversation_id = ? AND user_id != ?
        `, [conversationId, sender_id]);

        if (participantList.length > 0) {
            const notificationMessage = content ? content : (messageType === 'image' ? 'Đã gửi một hình ảnh' : 'Đã gửi một file');
            const postId = conversationRows[0].post_id || null;
            for (const participant of participantList) {
                await db.query(`
                    INSERT INTO Notifications (user_id, sender_id, post_id, type, message, is_read)
                    VALUES (?, ?, ?, 'message', ?, FALSE)
                `, [participant.user_id, sender_id, postId, notificationMessage]);
            }
        }

        const messageResponse = {
            id: messageId,
            conversation_id: conversationId,
            sender_id: Number(sender_id),
            content: content || null,
            message_type: messageType,
            is_read: false,
            created_at: new Date().toISOString(),
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            attachments: attachment ? [attachment] : []
        };

        res.status(201).json({ message: messageResponse });
    } catch (err) {
        console.error('Lỗi gửi message:', err);
        res.status(500).json({ error: 'Lỗi server chat' });
    }
});

router.patch('/:conversationId/read', async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    const { user_id } = req.body;

    if (!conversationId || !user_id) {
        return res.status(400).json({ error: 'Thiếu conversationId hoặc user_id' });
    }

    try {
        await db.query(`
            UPDATE Messages
            SET is_read = TRUE
            WHERE conversation_id = ?
              AND sender_id != ?
              AND is_read = FALSE
        `, [conversationId, user_id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Lỗi đánh dấu tin nhắn đã đọc:', err);
        res.status(500).json({ error: 'Lỗi server chat' });
    }
});

module.exports = router;
