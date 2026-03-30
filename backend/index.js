const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'phongtro'
};

// --- API ĐĂNG NHẬP ---
app.post('/api/login', async (req, res) => {
    // Frontend của bạn gửi 'username', ta sẽ map nó với cột 'login_name' trong CSDL
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ tài khoản và mật khẩu!" });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT id, login_name, password, role FROM Users WHERE login_name = ?',
            [username]
        );
        await connection.end();

        if (rows.length === 0) {
            return res.status(401).json({ error: "Tài khoản không tồn tại!" });
        }

        const user = rows[0];
        // So sánh mật khẩu băm
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Sai mật khẩu!" });
        }

        // Trả về role để frontend điều hướng (Admin / User)
        res.status(200).json({ 
            message: "Đăng nhập thành công!",
            userId: user.id,
            username: user.login_name,
            role: user.role
        });

    } catch (error) {
        console.error("Lỗi server (Login):", error);
        res.status(500).json({ error: "Lỗi hệ thống từ server." });
    }
});

// --- API QUÊN / ĐỔI MẬT KHẨU ---
app.post('/api/forgot-password', async (req, res) => {
    // Lấy thêm email theo đúng CSDL chuẩn mới
    const { username, email, phone, new_password } = req.body;

    if (!username || !email || !phone || !new_password) {
        return res.status(400).json({ error: "Vui lòng cung cấp đủ thông tin xác thực!" });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT id FROM Users WHERE login_name = ? AND email = ? AND phone = ?',
            [username, email, phone]
        );

        if (rows.length === 0) {
            await connection.end();
            return res.status(404).json({ error: "Thông tin xác minh không chính xác!" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(new_password, saltRounds);

        // Update vào cột password
        await connection.execute(
            'UPDATE Users SET password = ? WHERE login_name = ? AND email = ? AND phone = ?',
            [hashedPassword, username, email, phone]
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
    // Lấy đủ trường từ frontend
    const { fullname, username, email, CCCD, birthday, phone, password } = req.body;

    if (!fullname || !username || !email || !CCCD || !birthday || !phone || !password) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin!" });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Kiểm tra xem tên đăng nhập HOẶC email đã tồn tại chưa
        const [existingUsers] = await connection.execute(
            'SELECT id FROM Users WHERE login_name = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            await connection.end();
            return res.status(409).json({ error: "Tên đăng nhập hoặc Email này đã có người sử dụng!" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Lưu bản ghi chuẩn
        await connection.execute(
            'INSERT INTO Users (fullname, login_name, email, password, phone, CCCD, birthday) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [fullname, username, email, hashedPassword, phone, CCCD, birthday]
        );
        
        // (Đã loại bỏ INSERT INTO User_Preferences dư thừa của base cũ)
        
        await connection.end();

        res.status(201).json({ message: "Đăng ký tài khoản thành công!" });

    } catch (error) {
        console.error("Lỗi server (Register):", error);
        res.status(500).json({ error: "Lỗi hệ thống từ server." });
    }
});

app.listen(port, () => {
    console.log(`Server Node.js đang chạy tại http://127.0.0.1:${port}`);
});

const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);
