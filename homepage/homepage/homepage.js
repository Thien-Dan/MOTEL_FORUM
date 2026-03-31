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

// Mở/đóng panel thông báo 
function toggleNotification(event) {
    event.stopPropagation();
    const panel = document.getElementById("notificationPanel");
    panel.classList.toggle("show");
    // Guest không load API thông báo
}

// Click ra ngoài thì tự động đóng menu thông báo
window.onclick = function(event) {
    if (!event.target.closest('.action-icon')) {
        document.getElementById("notificationPanel")?.classList.remove('show');
    }
}

// Thời gian ago
function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
    return `${Math.floor(diff/86400)} ngày trước`;
}

// --- XỬ LÝ GET VÀ RENDER BÀI ĐĂNG DẠNG TIMELINE ---

document.addEventListener("DOMContentLoaded", () => {
    loadPosts();
});

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

function renderPosts(posts) {
    const feedContainer = document.getElementById("post-feed");
    if (!feedContainer) return;

    if (!posts || posts.length === 0) {
        feedContainer.innerHTML = '<div class="loading-post">Không tìm thấy bài viết nào phù hợp với tìm kiếm của bạn.</div>';
        return;
    }

    feedContainer.innerHTML = posts.map(post => {
        let mediaHtml = '';
        if (post.images && post.images.length > 0) {
             mediaHtml = `
             <div class="post-media">
                 <img src="${post.images[0].trim()}" alt="Post image" onerror="this.src='./pic/nen.png'">
             </div>`;
        }
        
        let badgeClass = post.post_type === 'find_roommate' ? 'find_roommate' : 'rent_out';
        let badgeText = post.post_type === 'find_roommate' ? 'Tìm người ở ghép' : 'Cho thuê phòng';

        let priceFormat = (post.price || post.budget) ? Number(post.price || post.budget).toLocaleString('vi-VN') + ' VNĐ' : 'Thỏa thuận';
        let areaText = post.area ? `${post.area} m²` : 'Không rõ';
        
        let locationText = post.address || post.preferred_location || '';
        if (post.district) locationText += `, ${post.district}`;
        if (post.city) locationText += `, ${post.city}`;
        if (!locationText) locationText = "Chưa rõ khu vực";

        // Yêu cầu đăng nhập ở trang guest
        const reqLogin = `onclick="alert('Vui lòng đăng nhập để thực hiện chức năng này!'); window.location.href='../../login_register/login/login.html';"`;

        return `
            <div class="post-card-modern">
                <!-- Header -->
                <div class="post-header" style="cursor:pointer;" ${reqLogin}>
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
                    <button class="action-btn" ${reqLogin}><i>👍</i> Thích</button>
                    <button class="action-btn" ${reqLogin}><i>💭</i> Bình luận</button>
                    <button class="action-btn" ${reqLogin}><i>✉️</i> Nhắn tin</button>
                </div>
            </div>
        `;
    }).join("");
}