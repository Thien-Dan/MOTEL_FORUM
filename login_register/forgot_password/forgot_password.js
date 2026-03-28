document.getElementById('resetPwdForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementsByName('username')[0].value.trim();
    const phone = document.getElementsByName('phone')[0].value.trim();
    const newPass = document.getElementById('new_password').value;
    const confirmPass = document.getElementById('confirm_password').value;

    if (!username || !phone || !newPass || !confirmPass) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }
    
    if (newPass !== confirmPass) {
        alert("Mật khẩu không khớp!");
        return;
    }

    const data = {
        username: username,
        phone: phone,
        new_password: newPass
    };

    try {
        // Cập nhật URL gọi đến Node.js
        let res = await fetch('http://127.0.0.1:3000/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        let result = await res.json();

        // Node.js sẽ trả về mã 200-299 nếu thành công, nên ta chỉ cần check res.ok
        if (res.ok) { 
            alert(result.message || "Đổi mật khẩu thành công");
            window.location.href = "../login/login.html";
        } else {
            // Hiển thị lỗi từ backend (vd: Sai số điện thoại)
            alert(result.error || "Có lỗi xảy ra");
        }
    } catch (err) {
        console.error('Error:', err);
        // Cập nhật lại câu thông báo
        alert("Không thể kết nối đến máy chủ. Hãy đảm bảo server Node.js đang chạy!");
    }
});