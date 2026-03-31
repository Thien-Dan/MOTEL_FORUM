const express = require('express');
const router = express.Router();
const pool = require('../index'); 

// Lấy danh sách bài đăng (có hỗ trợ filter và sắp xếp mới nhất)
router.get('/', async (req, res) => {
    try {
        const { post_type, priceFilter, searchInput } = req.query;
        let query = `
            SELECT 
                p.id, p.title, p.content, p.post_type, p.status, p.created_at,
                u.fullname, u.avatar,
                ui.image_url as user_avatar,
                rd.price, rd.area, rd.address, rd.city, rd.district,
                rmd.budget, rmd.preferred_location, rmd.gender_preference,
                (SELECT GROUP_CONCAT(image_url) FROM Images WHERE post_id = p.id) as images
            FROM Posts p
            JOIN Users u ON p.user_id = u.id
            LEFT JOIN UserImages ui ON u.id = ui.user_id
            LEFT JOIN RoomDetails rd ON p.id = rd.post_id
            LEFT JOIN RoommateDetails rmd ON p.id = rmd.post_id
            WHERE p.status = 'approved'
        `;
        const queryParams = [];

        // Xử lý filter post_type
        if (post_type) {
            // Map từ frontend filter qua DB enum
            let dbPostType = '';
            if (post_type === 'rent_out' || post_type === 'find_room') {
                dbPostType = 'room_for_rent';
            } else if (post_type === 'find_roommate') {
                dbPostType = 'find_roommate';
            }
            if (dbPostType) {
                query += ` AND p.post_type = ?`;
                queryParams.push(dbPostType);
            }
        }

        // Xử lý filter khoảng giá (priceFilter) dựa trên bảng RoomDetails (price)
        if (priceFilter) {
            if (priceFilter === '<2m') {
                query += ` AND rd.price < 2000000`;
            } else if (priceFilter === '2m-4m') {
                query += ` AND rd.price >= 2000000 AND rd.price <= 4000000`;
            } else if (priceFilter === '>4m') {
                query += ` AND rd.price > 4000000`;
            }
        }

        // Xử lý tìm kiếm nhập liệu khu vực (address)
        if (searchInput) {
            query += ` AND (rd.address LIKE ? OR rd.city LIKE ? OR rd.district LIKE ? OR rmd.preferred_location LIKE ?)`;
            const searchPattern = `%${searchInput}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Luôn sắp xếp bài đăng theo thời gian mới nhất (timeline chuẩn Mạng xã hội)
        query += ` ORDER BY p.created_at DESC`;

        const [rows] = await pool.execute(query, queryParams);
        
        // Chuẩn hóa structure ảnh trả về
        const formattedPosts = rows.map(post => {
            return {
                ...post,
                images: post.images ? post.images.split(',') : [],
                // avatar ưu tiên UserImages trước, sau đó column avatar, không có thì mock
                author_avatar: post.user_avatar || post.avatar || 'https://via.placeholder.com/40'
            };
        });

        res.status(200).json(formattedPosts);

    } catch (error) {
        console.error("Lỗi server (Get Posts):", error);
        res.status(500).json({ error: "Lỗi hệ thống từ server." });
    }
});

module.exports = router;
