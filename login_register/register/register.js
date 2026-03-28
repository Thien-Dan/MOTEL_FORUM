document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const fullname = document.getElementById('fullname').value;
    const username = document.getElementById('username').value;
    const dobValue = document.getElementById('dob').value;
    const dob = new Date(dobValue);
    const phone = document.getElementById('phone').value;
    const pass = document.getElementById('password').value;
    const confirmPass = document.getElementById('confirmPassword').value;

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

    // 2. Kiểm tra số điện thoại
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
        alert("Lỗi: Số điện thoại phải bao gồm đúng 10 chữ số!");
        return;
    }

    // 3. Kiểm tra mật khẩu
    if (pass !== confirmPass) {
        alert("Lỗi: Mật khẩu nhập lại không khớp!");
        return;
    }

    let data = {
        fullname: fullname,
        username: username,
        birthday: dobValue,
        phone: phone,
        password: pass
    };

    try {
        // Cập nhật port 3000 và route /api/register
        let res = await fetch("http://127.0.0.1:3000/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        let result = await res.json();

        // Kiểm tra status từ server
        if(res.ok){
            alert(result.message || "Đăng ký thành công!");
            window.location.href = "../login/login.html";
        } else {
            alert(result.error);
        }

    } catch(err) {
        console.error(err);
        alert("Không thể kết nối server Node.js.");
    }
});