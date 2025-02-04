const noButton = document.getElementById('noButton');
const yesButton = document.getElementById('yesButton');
const catImage = document.getElementById('catImage');
const container = document.getElementById('container');

// เมื่อสัมผัสหน้าจอใกล้ปุ่ม "No" ให้ขยับปุ่ม "No" หนี
noButton.addEventListener('touchstart', () => {
    const containerRect = container.getBoundingClientRect();
    const buttonRect = noButton.getBoundingClientRect();

    const maxX = containerRect.width - buttonRect.width - 20;
    const maxY = containerRect.height - buttonRect.height - 20;

    let newX = Math.random() * maxX;
    let newY = Math.random() * maxY;

    // จำกัดไม่ให้ปุ่มออกนอก container
    newX = Math.max(10, Math.min(newX, maxX));
    newY = Math.max(10, Math.min(newY, maxY));

    noButton.style.left = `${newX}px`;
    noButton.style.top = `${newY}px`;
});

// เมื่อกด "Yes" ให้เปลี่ยนรูปเป็นภาพ GIF ดีใจ
yesButton.addEventListener('click', () => {
    catImage.src = "https://i.imgur.com/ybBv7ll.gif"; // ใส่ภาพ GIF ดีใจ
});
