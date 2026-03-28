document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const cccd = document.getElementById('cccd').value.trim();
    const dobValue = document.getElementById('dob').value;
    const dob = new Date(dobValue);
    const phone = document.getElementById('phone').value.trim();
    const pass = document.getElementById('password').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    
    const submitBtn = this.querySelector('.auth-btn');

    // Basic Validation
    if(!fullname || !username || !email || !cccd || !dobValue || !phone || !pass || !confirmPass) {
        alert("Vui lòng điền đầy đủ các thông tin bắt buộc.");
        return;
    }

    // 1. Kiểm tra đủ 18 tuổi
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    if (age < 18) {
        alert("Lỗi: Bạn phải đủ 18 tuổi để tham gia hệ thống!");
        return;
    }

    // 2. Kiểm tra số điện thoại (Việt Nam)
    const phoneRegex = /(0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
        alert("Lỗi: Số điện thoại không hợp lệ!");
        return;
    }

    // 3. Kiểm tra CCCD (12 số)
    const cccdRegex = /^[0-9]{12}$/;
    if (!cccdRegex.test(cccd)) {
        alert("Lỗi: CCCD phải bao gồm đúng 12 chữ số!");
        return;
    }

    // 4. Kiểm tra Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Lỗi: Định dạng Email không hợp lệ!");
        return;
    }

    // 5. Kiểm tra mật khẩu
    if (pass !== confirmPass) {
        alert("Lỗi: Mật khẩu nhập lại không khớp!");
        return;
    }
    if (pass.length < 6) {
        alert("Lỗi: Mật khẩu phải có ít nhất 6 ký tự!");
        return;
    }

    // Add loading effect
    submitBtn.classList.add('btn-loading');

    let data = {
        fullname: fullname,
        username: username,
        email: email,
        CCCD: cccd,
        birthday: dobValue,
        phone: phone,
        password: pass
    };

    try {
        let res = await fetch("http://127.0.0.1:3000/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        let result = await res.json();

        // Kiểm tra status từ server
        if (res.ok) {
            alert(result.message || "Đăng ký thành công!");
            window.location.href = "../login/login.html";
        } else {
            alert(result.error || "Có lỗi từ máy chủ!");
        }

    } catch (err) {
        console.error(err);
        alert("Không thể kết nối server Node.js. Vui lòng kiểm tra lại dịch vụ backend.");
    } finally {
        submitBtn.classList.remove('btn-loading');
    }
});