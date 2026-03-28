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
    if (!event.target.closest('.user-profile')) {
        const dropdowns = document.getElementsByClassName("dropdown-menu");
        for (let i = 0; i < dropdowns.length; i++) {
            let openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}