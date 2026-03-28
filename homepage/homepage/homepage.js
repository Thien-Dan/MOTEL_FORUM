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