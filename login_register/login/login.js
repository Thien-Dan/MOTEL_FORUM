document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Không reload trang

    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    console.log("Đang kiểm tra đăng nhập cho:", user);

    let data = {
        username: user,
        password: pass
    };

    try {
        // Đổi port từ 5000 (Python) sang 3000 (Node.js)
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
            // Sau này bạn có thể thêm logic lưu token và chuyển trang ở đây:
            // localStorage.setItem('user_id', result.userId);
            // window.location.href = '/home.html';
        } else {
            // Lấy thông báo lỗi từ backend
            alert(result.error); 
        }

    } catch(err) {
        console.error(err);
        alert("Không thể kết nối server Node.js. Hãy kiểm tra xem server đã bật chưa.");
    }
});