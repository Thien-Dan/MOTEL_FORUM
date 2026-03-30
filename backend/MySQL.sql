CREATE DATABASE IF NOT EXISTS PHONGTRO;
USE PHONGTRO;

-- USER
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    login_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    CCCD VARCHAR(20) NOT NULL,
    birthday DATE,
    avatar TEXT,
    role ENUM('user', 'admin') DEFAULT 'user',
    is_banned BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- user image
CREATE TABLE UserImages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,   -- mỗi user chỉ có 1 ảnh
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
-- POSTS
CREATE TABLE Posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    post_type ENUM('find_roommate', 'room_for_rent') NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES Users(id)
);
-- THONG TIN THEM CUA PHONG TRO 
CREATE TABLE RoomDetails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    price DECIMAL(10,2),
    area FLOAT,
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE
);
-- THONG TIN THEM KHI TIM NGUOI GHEP
CREATE TABLE RoommateDetails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    budget DECIMAL(10,2),
    preferred_location TEXT,
    gender_preference ENUM('male', 'female', 'any'),
    description TEXT,

    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE
);
-- ANH CUA POST 
CREATE TABLE Images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    image_url TEXT,

    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE
);
-- COMMENT 
CREATE TABLE Comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    user_id INT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- NOTIFICATION
CREATE TABLE Notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    sender_id INT,
    post_id INT,
    type ENUM(
        'comment',
        'post_approved',
        'post_rejected',
        'message',
        'system'
    ),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES Users(id),
    FOREIGN KEY (sender_id) REFERENCES Users(id),
    FOREIGN KEY (post_id) REFERENCES Posts(id) ON DELETE SET NULL
);

-- CHAT
-- CONSERVATION 
CREATE TABLE Conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (post_id) REFERENCES Posts(id)
);
-- NGUOI THAM GIA
CREATE TABLE ConversationParticipants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT,
    user_id INT,

    FOREIGN KEY (conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

-- TIN NHAN
CREATE TABLE Messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT,
    sender_id INT,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES Conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES Users(id)
);

-- REPORT
CREATE TABLE Reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    user_id INT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (post_id) REFERENCES Posts(id),
    FOREIGN KEY (user_id) REFERENCES Users(id)
);

ALTER TABLE Notifications ADD INDEX idx_user_created (user_id, created_at DESC);
ALTER TABLE Notifications ADD INDEX idx_user_unread  (user_id, is_read);