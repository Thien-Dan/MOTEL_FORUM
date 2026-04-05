document.addEventListener("DOMContentLoaded", () => {
    // 1. Lấy userId từ URL (ví dụ: profile.html?id=5)
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get('id');
    
    // 2. Lấy userId của chính mình từ localStorage (đã lưu khi đăng nhập)
    const myId = localStorage.getItem('user_id'); 
    
    // Xác định xem đang xem trang của ai
    const targetUserId = userIdFromUrl || myId;

    if (!targetUserId) {
        alert("Không xác định được người dùng!");
        window.location.href = "../login_register/login/login.html";
        return;
    }

    // Nếu ID đang xem trùng với ID của mình, hiện nút chỉnh sửa
    if (targetUserId === myId) {
        document.getElementById('edit-btn').style.display = 'block';
    }

    // Gọi API lấy dữ liệu (Sẽ làm ở Giai đoạn 3)
    console.log("Đang lấy dữ liệu cho User ID:", targetUserId);
    // fetchUserData(targetUserId);
});