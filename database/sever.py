from flask import Flask, request, jsonify
import sqlite3
import bcrypt
from flask_cors import CORS
from werkzeug.security import generate_password_hash
app = Flask(__name__)
CORS(app)


# =========================
# Kết nối database
# =========================

def get_db():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn


# =========================
# Tạo bảng nếu chưa có
# =========================

def create_table():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            birthday TEXT NOT NULL,
            phone TEXT NOT NULL,
            password_hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS Posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            address TEXT NOT NULL,
            price REAL, 
            gender_requirement TEXT, 
            status TEXT DEFAULT 'active', 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES Users(id)
        );
        CREATE TABLE IF NOT EXISTS User_Preferences (
            user_id INTEGER PRIMARY KEY,
            has_pet BOOLEAN DEFAULT 0,
            is_smoking BOOLEAN DEFAULT 0,
            cleanliness_level INTEGER,
            sleep_schedule TEXT, 
            FOREIGN KEY (user_id) REFERENCES Users(id)
        );
        CREATE TABLE IF NOT EXISTS Messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_read BOOLEAN DEFAULT 0,
            FOREIGN KEY (sender_id) REFERENCES Users(id),
            FOREIGN KEY (receiver_id) REFERENCES Users(id)
        );
        CREATE TABLE IF NOT EXISTS Post_Images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            image_url TEXT NOT NULL,
            FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS Admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        );
    ''')

    conn.commit()
    conn.close()


create_table()


# =========================
# REGISTER
# =========================

@app.route("/register", methods=["POST"])
def register():

    data = request.json

    fullname = data["fullname"]
    username = data["username"]
    birthday = data["birthday"]
    phone = data["phone"]
    password = data["password"]

    conn = get_db()
    cursor = conn.cursor()

    # kiểm tra username đã tồn tại
    cursor.execute("SELECT * FROM Users WHERE username = ?", (username,))
    user = cursor.fetchone()

    if user:
        return jsonify({"error": "Username đã tồn tại"})

    # hash password
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    cursor.execute("""
        INSERT INTO Users (fullname, username, birthday, phone, password_hash)
        VALUES (?, ?, ?, ?, ?)
    """, (fullname, username, birthday, phone, hashed))

    conn.commit()
    conn.close()

    return jsonify({"message": "Đăng ký thành công"})


# =========================
# LOGIN
# =========================
from werkzeug.security import check_password_hash
@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Không nhận được dữ liệu JSON"}), 400

        username = data.get("username")
        password = data.get("password")

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Users WHERE username = ?", (username,))
        user = cursor.fetchone()
        conn.close()

        if user:
            # Dùng check_password_hash nếu lúc đăng ký dùng generate_password_hash
            if check_password_hash(user["password_hash"], password):
                return jsonify({"message": "Đăng nhập thành công"})
        
        return jsonify({"error": "Sai username hoặc password"}), 401
    except Exception as e:
        print(f"Lỗi server: {e}")
        return jsonify({"error": "Lỗi hệ thống"}), 500


@app.route('/forgot_password', methods=['POST'])
def forgot_password():
    # Lấy dữ liệu dạng JSON
    data = request.json
    
    username = data['username']
    phone = data['phone']
    new_password = data['new_password']

    conn = get_db()
    user = conn.execute('SELECT id FROM Users WHERE username = ? AND phone = ?', 
                        (username, phone)).fetchone()

    if user:
        new_hashed_password = generate_password_hash(new_password)
        conn.execute('UPDATE Users SET password_hash = ? WHERE id = ?', 
                     (new_hashed_password, user['id']))
        conn.commit()
        conn.close()
        # TRẢ VỀ JSON (để JS nhận được)
        return jsonify({"status": "success", "message": "Cập nhật mật khẩu thành công!"})
    else:
        conn.close()
        return jsonify({"status": "error", "message": "Thông tin xác minh không chính xác!"}), 400


# =========================
# RUN SERVER
# =========================

if __name__ == "__main__":
    app.run(debug=True, port=5000)