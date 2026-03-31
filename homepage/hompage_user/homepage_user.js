const images = document.querySelectorAll(".coder");

let positions = [
    { x: 0,   rotateX: 0,  z: 4 , opacity:1},
    { x: 40,  rotateX: 10, z: 3 , opacity: 0.8},
    { x: 80,  rotateX: 20, z: 2 , opacity:0.8},
    { x: 120, rotateX: 30, z: 1 , opacity:0.8}
];

function applyPositions() {
    images.forEach((img, i) => {
        const p = positions[i];
        img.style.transform = `
            translateX(${p.x}px)
            rotateX(${p.rotateX}deg)
        `;
        img.style.zIndex = p.z;
        img.style.opacity=p.opacity;
    });
}

applyPositions();

setInterval(() => {
    positions.unshift(positions.pop());
    applyPositions();
}, 3000);

// Hàm đóng/mở menu tài khoản
function toggleUserMenu(event) {
    // Ngăn chặn sự kiện click lan ra ngoài
    event.stopPropagation(); 
    const dropdown = document.getElementById("userDropdown");
    dropdown.classList.toggle("show");
}

// Hàm xử lý đăng xuất
function logout() {
    // Xóa thông tin đăng nhập (nếu dùng localStorage)
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    
    // Chuyển hướng về trang chủ lúc chưa đăng nhập
    window.location.href = "homepage.html"; 
}

// Click ra ngoài thì tự động đóng menu
window.onclick = function(event) {
    // Đóng dropdown user
    if (!event.target.closest('.user-profile')) {
        document.getElementById("userDropdown")?.classList.remove('show');
    }
    // Đóng panel thông báo
    if (!event.target.closest('.action-icon')) {
        document.getElementById("notificationPanel")?.classList.remove('show');
    }
}

// Mở/đóng panel thông báo 
function toggleNotification(event) {
    event.stopPropagation();
    const panel = document.getElementById("notificationPanel");
    panel.classList.toggle("show");
    
    if (panel.classList.contains("show")) {
        loadNotifications(); // gọi API khi mở
    }
}

// Gọi API lấy danh sách thông báo
async function loadNotifications() {
    const userId = localStorage.getItem("userId");
    const list = document.getElementById("notif-list");

    try {
        const res = await fetch(`/api/notifications?user_id=${userId}`);
        const data = await res.json();

        if (data.length === 0) {
            list.innerHTML = `<div class="notif-empty">Không có thông báo nào</div>`;
            return;
        }

        list.innerHTML = data.map(n => `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" 
                 onclick="handleNotifClick(${n.id}, ${n.post_id})">
                <img class="notif-avatar" 
                     src="${n.sender_avatar || 'https://via.placeholder.com/38'}" />
                <div>
                    <div class="notif-text">${n.message}</div>
                    <div class="notif-time">${timeAgo(n.created_at)}</div>
                </div>
            </div>
        `).join('');

        // Cập nhật badge
        const unread = data.filter(n => !n.is_read).length;
        document.getElementById("notif-badge").textContent = unread || '0';

    } catch (err) {
        list.innerHTML = `<div class="notif-empty">Lỗi tải thông báo</div>`;
    }
}

// Click vào thông báo → đánh dấu đọc + chuyển trang
async function handleNotifClick(notifId, postId) {
    await fetch(`/api/notifications/${notifId}/read`, { method: 'PATCH' });
    if (postId) window.location.href = `post_detail.html?id=${postId}`;
}

// Đánh dấu tất cả đã đọc
async function markAllRead() {
    const userId = localStorage.getItem("userId");
    await fetch(`/api/notifications/read-all?user_id=${userId}`, { method: 'PATCH' });
    loadNotifications();
}

// Format thời gian kiểu "2 phút trước"
function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
    return `${Math.floor(diff/86400)} ngày trước`;
}

// --- XỬ LÝ GET VÀ RENDER BÀI ĐĂNG DẠNG TIMELINE ---

// Chạy khi vừa load trang
document.addEventListener("DOMContentLoaded", () => {
    loadPosts();
});

// Hàm gọi API lấy danh sách bài đăng
async function loadPosts(queryParams = "") {
    const feedContainer = document.getElementById("post-feed");
    if (!feedContainer) return;
    
    feedContainer.innerHTML = '<div class="loading-post">Đang tải bảng tin...</div>';

    try {
        const url = queryParams ? `/api/posts?${queryParams}` : `/api/posts`;
        const res = await fetch(url);
        const posts = await res.json();
        
        renderPosts(posts);
    } catch (err) {
        feedContainer.innerHTML = '<div class="loading-post" style="color:red;">Lỗi tải bài viết. Vui lòng thử lại sau.</div>';
        console.error("Lỗi lấy bài viết:", err);
    }
}

// Xử lý nút tìm kiếm
function searchAction() {
    const postType = document.getElementById("postTypeFilter")?.value;
    const priceFilter = document.getElementById("priceFilter")?.value;
    const searchInput = document.getElementById("searchInput")?.value;

    const params = new URLSearchParams();
    if (postType) params.append("post_type", postType);
    if (priceFilter) params.append("priceFilter", priceFilter);
    if (searchInput) params.append("searchInput", searchInput);

    loadPosts(params.toString());
}

// Render UI dòng thời gian dạng Facebook / Instagram
function renderPosts(posts) {
    const feedContainer = document.getElementById("post-feed");
    if (!feedContainer) return;

    if (!posts || posts.length === 0) {
        feedContainer.innerHTML = '<div class="loading-post">Không tìm thấy bài viết nào phù hợp với tìm kiếm của bạn.</div>';
        return;
    }

    feedContainer.innerHTML = posts.map(post => {
        // Cấu trúc MediaHtml
        let mediaHtml = '';
        if (post.images && post.images.length > 0) {
             mediaHtml = `
             <div class="post-media">
                 <img src="${post.images[0].trim()}" alt="Post image" onerror="this.src='./pic/nen.png'">
             </div>`;
        }
        
        // Badge và format giá
        let badgeClass = post.post_type === 'find_roommate' ? 'find_roommate' : 'rent_out';
        let badgeText = post.post_type === 'find_roommate' ? 'Tìm người ở ghép' : 'Cho thuê phòng';

        let priceFormat = (post.price || post.budget) ? Number(post.price || post.budget).toLocaleString('vi-VN') + ' VNĐ' : 'Thỏa thuận';
        let areaText = post.area ? `${post.area} m²` : 'Không rõ';
        
        let locationText = post.address || post.preferred_location || '';
        if (post.district) locationText += `, ${post.district}`;
        if (post.city) locationText += `, ${post.city}`;
        if (!locationText) locationText = "Chưa rõ khu vực";

        return `
            <div class="post-card-modern">
                <!-- Header -->
                <div class="post-header">
                    <img src="${post.author_avatar}" class="post-author-avatar" onerror="this.src='https://via.placeholder.com/40'">
                    <div class="post-author-info">
                        <span class="post-author-name">${post.fullname || 'Người dùng ẩn danh'}</span>
                        <span class="post-time">${timeAgo(post.created_at)} 🗓️</span>
                    </div>
                </div>

                <!-- Body Text -->
                <div class="post-body">
                    <span class="post-badge ${badgeClass}">${badgeText}</span>
                    <h4 class="post-title">${post.title || 'Không có tiêu đề'}</h4>
                    <p class="post-content">${post.content || ''}</p>

                    <!-- Details Box (Nổi bật) -->
                    <div class="post-details-box">
                        <p><strong>Mức giá:</strong> <span class="highlight-price">${priceFormat}</span></p>
                        ${post.post_type === 'room_for_rent' ? `<p><strong>Diện tích:</strong> ${areaText}</p>` : ''}
                        <p><strong>Khu vực:</strong> ${locationText}</p>
                    </div>
                </div>

                <!-- Media -->
                ${mediaHtml}

                <!-- Actions -->
                <div class="post-actions">
                    <button class="action-btn"><i>👍</i> Thích</button>
                    <button class="action-btn"><i>💭</i> Bình luận</button>
                    <!-- Nút nhắn tin được yêu cầu trên UI mới nhất -->
                    <button class="action-btn" onclick="window.location.href='chat.html?target_user=${post.user_id}'"><i>✉️</i> Nhắn tin</button>
                </div>
            </div>
        `;
    }).join("");
}