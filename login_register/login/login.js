document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault(); // Không reload trang

    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const submitBtn = this.querySelector('.auth-btn');

    // Hiệu ứng Loading
    submitBtn.classList.add('btn-loading');

    console.log("Đang kiểm tra đăng nhập cho:", user);

    let data = {
        username: user,
        password: pass
    };

    try {
        let res = await fetch("http://127.0.0.1:3000/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        let result = await res.json();

        // Kiểm tra HTTP status code (200-299 là thành công)
        if (res.ok) {
            alert(result.message || "Đăng nhập thành công!");
            localStorage.setItem('user_id', result.userId);
            localStorage.setItem('user_role', result.role);
            
            // Xử lý điều hướng luồng phân quyền dựa vào `role`
            if (result.role === 'admin') {
                window.location.href = '../../admin/dashboard.html'; // Tới trang Admin
            } else {
                window.location.href = '../../homepage/index.html'; // Tới trang User
            }
        } else {
            alert(result.error || "Tên đăng nhập hoặc mật khẩu sai!");
        }

    } catch (err) {
        console.error(err);
        alert("Không thể kết nối server Node.js. Hãy kiểm tra xem server đã bật chưa.");
    } finally {
        submitBtn.classList.remove('btn-loading');
    }
});