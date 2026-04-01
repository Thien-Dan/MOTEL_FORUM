// ============================
// CHAT.JS — Logic frontend chat
// 4D_Trọ.vn
// ============================

const API_BASE = 'http://127.0.0.1:3000/api';
const POLL_INTERVAL = 5000; // 5 giây polling

// State
let currentUserId = null;
let currentConversationId = null;
let conversations = [];
let pollTimer = null;
let selectedFile = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
    currentUserId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');

    if (!currentUserId) {
        alert('Vui lòng đăng nhập trước!');
        window.location.href = '../../login_register/login/login.html';
        return;
    }

    // Hiển thị username trên navbar
    document.getElementById('displayUsername').textContent = username || 'User';

    // Load conversations
    loadConversations();

    // Load unread badge
    loadUnreadBadge();

    // Enter key để gửi tin nhắn
    document.getElementById('chatInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Kiểm tra nếu có conversationId trên URL (mở từ bài đăng)
    const params = new URLSearchParams(window.location.search);
    const convId = params.get('conversation_id');
    if (convId) {
        // Đợi load xong conversations rồi mở conversation
        setTimeout(() => openConversation(Number(convId)), 500);
    }
});

// ── LOAD CONVERSATIONS ──
async function loadConversations() {
    const list = document.getElementById('conversationList');

    try {
        const res = await fetch(`${API_BASE}/chat?user_id=${currentUserId}`);
        const data = await res.json();
        conversations = data.conversations || [];

        if (conversations.length === 0) {
            list.innerHTML = `
                <div class="no-conversations">
                    <div class="empty-chat-icon">💬</div>
                    <p>Chưa có cuộc trò chuyện nào</p>
                    <p style="font-size:12px; margin-top:8px;">Nhắn tin cho chủ bài đăng để bắt đầu</p>
                </div>
            `;
            return;
        }

        list.innerHTML = conversations.map(conv => {
            const other = conv.other_participant || {};
            const isUnread = conv.unread_count > 0;
            const isActive = conv.id === currentConversationId;

            let lastMsg = conv.last_message || '';
            if (conv.last_message_type === 'image') lastMsg = '📷 Hình ảnh';
            if (conv.last_message_type === 'file') lastMsg = '📎 Tập tin';
            if (!conv.last_message && conv.last_message_type !== 'image' && conv.last_message_type !== 'file') {
                lastMsg = 'Chưa có tin nhắn';
            }

            const timeStr = conv.last_message_at ? timeAgo(conv.last_message_at) : '';

            return `
                <div class="conversation-item ${isUnread ? 'unread' : ''} ${isActive ? 'active' : ''}"
                     onclick="openConversation(${conv.id})"
                     id="conv-${conv.id}">
                    <img class="conv-avatar" src="${other.avatar || 'https://via.placeholder.com/50'}" 
                         onerror="this.src='https://via.placeholder.com/50'" alt="">
                    <div class="conv-info">
                        <div class="conv-info-top">
                            <span class="conv-name">${escapeHtml(other.fullname || 'Người dùng')}</span>
                            <span class="conv-time">${timeStr}</span>
                        </div>
                        <div class="conv-last-msg">${escapeHtml(lastMsg)}</div>
                        ${conv.post_title ? `<span class="conv-post-tag" title="${escapeHtml(conv.post_title)}">📌 ${escapeHtml(truncate(conv.post_title, 30))}</span>` : ''}
                    </div>
                    ${isUnread ? `<span class="conv-unread-badge">${conv.unread_count}</span>` : ''}
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Lỗi load conversations:', err);
        list.innerHTML = `
            <div class="no-conversations">
                <p>Không thể tải cuộc trò chuyện</p>
                <p style="font-size:12px; margin-top:8px; color:#dc3545;">Kiểm tra kết nối server</p>
            </div>
        `;
    }
}

// ── LOAD UNREAD BADGE ──
async function loadUnreadBadge() {
    try {
        const res = await fetch(`${API_BASE}/chat/unread-count?user_id=${currentUserId}`);
        const data = await res.json();
        const badge = document.getElementById('msg-badge');
        const count = data.unread_count || 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    } catch (err) {
        console.error('Lỗi load unread badge:', err);
    }
}

// ── OPEN CONVERSATION ──
async function openConversation(conversationId) {
    currentConversationId = conversationId;

    // Tìm conversation trong list
    const conv = conversations.find(c => c.id === conversationId);

    // Highlight conversation active
    document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`conv-${conversationId}`);
    if (activeEl) {
        activeEl.classList.add('active');
        activeEl.classList.remove('unread');
    }

    // Hiện chat panel, ẩn empty state
    document.getElementById('chatEmptyState').style.display = 'none';
    document.getElementById('chatHeader').style.display = 'flex';
    document.getElementById('messagesArea').style.display = 'block';
    document.getElementById('chatInputBar').style.display = 'flex';

    // Mobile: ẩn sidebar, hiện panel
    document.getElementById('chatSidebar').classList.add('hidden');
    document.getElementById('chatPanel').classList.add('active');

    // Set header info
    if (conv && conv.other_participant) {
        document.getElementById('chatContactName').textContent = conv.other_participant.fullname || 'Người dùng';
        document.getElementById('chatAvatar').src = conv.other_participant.avatar || 'https://via.placeholder.com/40';
        document.getElementById('chatAvatar').onerror = function() { this.src = 'https://via.placeholder.com/40'; };
        
        if (conv.post_title) {
            document.getElementById('chatPostLink').textContent = '📌 ' + conv.post_title;
        } else {
            document.getElementById('chatPostLink').textContent = '';
        }
    }

    // Load messages
    await loadMessages(conversationId);

    // Đánh dấu đã đọc
    markAsRead(conversationId);

    // Bắt đầu polling
    startPolling();

    // Focus input
    document.getElementById('chatInput').focus();
}

// ── LOAD MESSAGES ──
async function loadMessages(conversationId) {
    const messagesList = document.getElementById('messagesList');

    try {
        const res = await fetch(`${API_BASE}/chat/${conversationId}/messages?user_id=${currentUserId}`);
        const data = await res.json();
        const messages = data.messages || [];

        if (messages.length === 0) {
            messagesList.innerHTML = `
                <div style="text-align:center; padding:40px; color:#999; font-size:14px;">
                    Chưa có tin nhắn. Hãy gửi lời chào! 👋
                </div>
            `;
            return;
        }

        let html = '';
        let lastDate = '';

        for (const msg of messages) {
            // Date separator
            const msgDate = formatDate(msg.created_at);
            if (msgDate !== lastDate) {
                html += `<div class="date-separator"><span>${msgDate}</span></div>`;
                lastDate = msgDate;
            }

            const isSent = Number(msg.sender_id) === Number(currentUserId);
            const timeStr = formatTime(msg.created_at);

            html += `<div class="message-row ${isSent ? 'sent' : 'received'}">`;
            html += `<div class="message-bubble">`;

            // Ảnh đính kèm
            if (msg.attachments && msg.attachments.length > 0) {
                for (const att of msg.attachments) {
                    if (att.mime_type && att.mime_type.startsWith('image/')) {
                        const imgUrl = att.url || att.file_path;
                        html += `<img class="msg-image" src="${imgUrl}" alt="${escapeHtml(att.file_name || 'Ảnh')}" onclick="openLightbox('${imgUrl}')" onerror="this.style.display='none'">`;
                    }
                }
            }

            // Nội dung text
            if (msg.content) {
                html += `<div>${escapeHtml(msg.content)}</div>`;
            }

            html += `<span class="msg-time">${timeStr}</span>`;
            html += `</div></div>`;
        }

        messagesList.innerHTML = html;

        // Scroll xuống cuối
        scrollToBottom();

    } catch (err) {
        console.error('Lỗi load messages:', err);
        messagesList.innerHTML = `
            <div style="text-align:center; padding:40px; color:#dc3545; font-size:14px;">
                Không thể tải tin nhắn
            </div>
        `;
    }
}

// ── SEND MESSAGE ──
async function sendMessage() {
    if (!currentConversationId) return;

    const input = document.getElementById('chatInput');
    const content = input.value.trim();

    // Phải có text hoặc file
    if (!content && !selectedFile) return;

    const formData = new FormData();
    formData.append('sender_id', currentUserId);

    if (content) {
        formData.append('content', content);
    }

    if (selectedFile) {
        formData.append('attachment', selectedFile);
    }

    // Disable nút gửi để tránh double-click
    const btnSend = document.getElementById('btnSend');
    btnSend.disabled = true;
    btnSend.style.opacity = '0.5';

    try {
        const res = await fetch(`${API_BASE}/chat/${currentConversationId}/messages`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Lỗi gửi tin nhắn');
        }

        const data = await res.json();

        // Xóa input
        input.value = '';
        removeAttachment();

        // Append message mới vào UI (không cần reload toàn bộ)
        appendMessage(data.message);

        // Scroll xuống
        scrollToBottom();

        // Cập nhật conversation list
        loadConversations();

    } catch (err) {
        console.error('Lỗi gửi tin nhắn:', err);
        alert('Gửi tin nhắn thất bại: ' + err.message);
    } finally {
        btnSend.disabled = false;
        btnSend.style.opacity = '1';
    }
}

// ── APPEND MESSAGE ──
function appendMessage(msg) {
    const messagesList = document.getElementById('messagesList');

    // Xóa placeholder "chưa có tin nhắn" nếu có
    const placeholder = messagesList.querySelector('div[style*="text-align:center"]');
    if (placeholder) placeholder.remove();

    const isSent = Number(msg.sender_id) === Number(currentUserId);
    const timeStr = formatTime(msg.created_at);

    let html = `<div class="message-row ${isSent ? 'sent' : 'received'}">`;
    html += `<div class="message-bubble">`;

    if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
            if (att.mime_type && att.mime_type.startsWith('image/')) {
                const imgUrl = att.url || att.file_path;
                html += `<img class="msg-image" src="${imgUrl}" alt="${escapeHtml(att.file_name || 'Ảnh')}" onclick="openLightbox('${imgUrl}')">`;
            }
        }
    }

    if (msg.content) {
        html += `<div>${escapeHtml(msg.content)}</div>`;
    }

    html += `<span class="msg-time">${timeStr}</span>`;
    html += `</div></div>`;

    messagesList.insertAdjacentHTML('beforeend', html);
}

// ── MARK AS READ ──
async function markAsRead(conversationId) {
    try {
        await fetch(`${API_BASE}/chat/${conversationId}/read`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUserId })
        });

        // Cập nhật badge
        loadUnreadBadge();
    } catch (err) {
        console.error('Lỗi đánh dấu đã đọc:', err);
    }
}

// ── FILE HANDLING ──
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Kiểm tra dung lượng (10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('Ảnh không được vượt quá 10MB');
        event.target.value = '';
        return;
    }

    selectedFile = file;

    // Hiển thị preview
    const preview = document.getElementById('attachmentPreview');
    const previewImg = document.getElementById('previewImg');

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeAttachment() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('attachmentPreview').style.display = 'none';
    document.getElementById('previewImg').src = '';
}

// ── POLLING ──
function startPolling() {
    stopPolling();
    pollTimer = setInterval(async () => {
        if (currentConversationId) {
            await loadMessages(currentConversationId);
            await loadConversations();
            await loadUnreadBadge();
        }
    }, POLL_INTERVAL);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// ── LIGHTBOX ──
function openLightbox(imageUrl) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.onclick = () => overlay.remove();
    overlay.innerHTML = `<img src="${imageUrl}" alt="Ảnh phóng to">`;
    document.body.appendChild(overlay);
}

// ── MOBILE: BACK TO SIDEBAR ──
function backToSidebar() {
    currentConversationId = null;
    stopPolling();

    document.getElementById('chatSidebar').classList.remove('hidden');
    document.getElementById('chatPanel').classList.remove('active');

    document.getElementById('chatEmptyState').style.display = 'flex';
    document.getElementById('chatHeader').style.display = 'none';
    document.getElementById('messagesArea').style.display = 'none';
    document.getElementById('chatInputBar').style.display = 'none';

    loadConversations();
}

// ── NAVBAR FUNCTIONS ──
function toggleUserMenu(event) {
    event.stopPropagation();
    document.getElementById('userDropdown').classList.toggle('show');
}

function logout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    window.location.href = '../../login_register/login/login.html';
}

window.onclick = function(event) {
    if (!event.target.closest('.user-profile')) {
        document.getElementById('userDropdown')?.classList.remove('show');
    }
};

// ── UTILS ──
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
}

function scrollToBottom() {
    const area = document.getElementById('messagesArea');
    if (area) {
        setTimeout(() => { area.scrollTop = area.scrollHeight; }, 50);
    }
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 0) return 'vừa xong';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return formatDateShort(dateStr);
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Hôm nay';
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
