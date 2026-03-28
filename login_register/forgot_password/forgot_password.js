document.getElementById('resetPwdForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const newPass = document.getElementById('new_password').value;
    const confirmPass = document.getElementById('confirm_password').value;
    
    const submitBtn = this.querySelector('.auth-btn');

    if (!username || !email || !phone || !newPass || !confirmPass) {
        alert("Vui lòng nhập đầy đủ thông tin xác thực!");
        return;
    }

    if (newPass !== confirmPass) {
        alert("Mật khẩu xác nhận không khớp!");
        return;
    }

    if (newPass.length < 6) {
        alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
        return;
    }

    const data = {
        username: username,
        email: email,
        phone: phone,
        new_password: newPass
    };

    submitBtn.classList.add('btn-loading');

    try {
        let res = await fetch('http://127.0.0.1:3000/api/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        let result = await res.json();

        if (res.ok) {
            alert(result.message || "Đổi mật khẩu thành công!");
            window.location.href = "../login/login.html";
        } else {
            alert(result.error || "Có lỗi xảy ra (Sai tài khoản, email hoặc SDT).");
        }
    } catch (err) {
        console.error('Error:', err);
        alert("Không thể kết nối đến máy chủ Node.js. Vui lòng kiểm tra lại dịch vụ backend.");
    } finally {
        submitBtn.classList.remove('btn-loading');
    }
});