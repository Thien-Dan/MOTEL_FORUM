const express = require('express');
const mysql = require('mysql2/promise'); // Bắt buộc dùng promise cho async/await
const bcrypt = require('bcrypt');
const cors = require('cors');

// Khởi tạo app Express
const app = express();
const port = 3000;

// Middleware (rất quan trọng để frontend gọi được API)
app.use(cors());
app.use(express.json());

// Cấu hình kết nối MySQL (Bạn gom cấu hình vào 1 biến này nhé)
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // Mật khẩu của bạn
    database: 'phongtro'
};

// --- API ĐĂNG NHẬP ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ tài khoản và mật khẩu!" });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT id, username, password_hash FROM Users WHERE username = ?',
            [username]
        );
        await connection.end();

        if (rows.length === 0) {
            return res.status(401).json({ error: "Tài khoản không tồn tại!" });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: "Sai mật khẩu!" });
        }

        res.status(200).json({ 
            message: "Đăng nhập thành công!",
            userId: user.id,
            username: user.username
        });

    } catch (error) {
        console.error("Lỗi server (Login):", error);
        res.status(500).json({ error: "Lỗi hệ thống từ server." });
    }
});

// --- API QUÊN / ĐỔI MẬT KHẨU ---
app.post('/api/forgot-password', async (req, res) => {
    const { username, phone, new_password } = req.body;

    if (!username || !phone || !new_password) {
        return res.status(400).json({ error: "Vui lòng cung cấp đủ thông tin!" });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT id FROM Users WHERE username = ? AND phone = ?',
            [username, phone]
        );

        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: "Tài khoản hoặc số điện thoại xác minh không chính xác!" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(new_password, saltRounds);

        await connection.execute(
            'UPDATE Users SET password_hash = ? WHERE username = ? AND phone = ?',
            [hashedPassword, username, phone]
        );
        await connection.end();

        res.status(200).json({ message: "Đổi mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới." });

    } catch (error) {
        console.error("Lỗi server (Forgot Password):", error);
        res.status(500).json({ error: "Lỗi hệ thống từ server." });
    }
});

// --- API ĐĂNG KÝ TÀI KHOẢN ---
app.post('/api/register', async (req, res) => {
    const { fullname, username, birthday, phone, password } = req.body;

    if (!fullname || !username || !birthday || !phone || !password) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin!" });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [existingUsers] = await connection.execute(
            'SELECT id FROM Users WHERE username = ?',
            [username]
        );

        if (existingUsers.length > 0) {
            await connection.end();
            return res.status(409).json({ error: "Tên đăng nhập này đã có người sử dụng!" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [result] = await connection.execute(
            'INSERT INTO Users (fullname, username, birthday, phone, password_hash) VALUES (?, ?, ?, ?, ?)',
            [fullname, username, birthday, phone, hashedPassword]
        );

        const newUserId = result.insertId;

        await connection.execute(
            'INSERT INTO User_Preferences (user_id) VALUES (?)',
            [newUserId]
        );
        await connection.end();

        res.status(201).json({ message: "Đăng ký tài khoản thành công!" });

    } catch (error) {
        console.error("Lỗi server (Register):", error);
        res.status(500).json({ error: "Lỗi hệ thống từ server." });
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server Node.js đang chạy tại http://127.0.0.1:${port}`);
});