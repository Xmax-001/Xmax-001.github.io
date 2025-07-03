// Global variables
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let currentStream = null;
let capturedPhotos = [];
let currentFilter = 'none';
let timerEnabled = false;
let timerSeconds = 3;
let isCapturing = false;

// DOM elements
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const retakeBtn = document.getElementById('retakeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusMessage = document.getElementById('statusMessage');
const photoGallery = document.getElementById('photoGallery');
const cameraContainer = document.getElementById('cameraContainer');
const qrSection = document.getElementById('qrSection');
const timerBtn = document.getElementById('timerBtn');
const effectBtn = document.getElementById('effectBtn');

// Initialize filter buttons
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        applyFilter();
    });
});

// Filter functions
function applyFilter() {
    let filterValue = '';
    switch(currentFilter) {
        case 'sepia':
            filterValue = 'sepia(100%)';
            break;
        case 'grayscale':
            filterValue = 'grayscale(100%)';
            break;
        case 'blur':
            filterValue = 'blur(2px)';
            break;
        case 'brightness':
            filterValue = 'brightness(150%)';
            break;
        case 'contrast':
            filterValue = 'contrast(200%)';
            break;
        case 'saturate':
            filterValue = 'saturate(200%)';
            break;
        case 'hue':
            filterValue = 'hue-rotate(90deg) saturate(150%)';
            break;
        case 'vintage':
            filterValue = 'sepia(50%) contrast(120%) brightness(110%)';
            break;
        case 'neon':
            filterValue = 'contrast(150%) brightness(120%) saturate(200%) hue-rotate(270deg)';
            break;
        case 'softkorean':
            filterValue = 'brightness(1.15) contrast(0.85) saturate(1.2) blur(1.5px)';
            break;
        default:
            filterValue = 'none';
    }

    video.style.filter = filterValue;

    // ✅ เรียก overlay ทุกครั้งเมื่อเปลี่ยนฟิลเตอร์
    applyOverlay();
}

// Utility functions
function showStatus(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.style.display = 'block';
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}
function applyOverlay() {
    const existing = document.getElementById('soft-overlay');
    if (existing) existing.remove();

    if (currentFilter === 'softkorean') {
        const overlay = document.createElement('div');
        overlay.id = 'soft-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, rgba(255,255,255,0.15), transparent 70%);
            pointer-events: none;
            z-index: 10;
        `;
        document.querySelector('.camera-container')?.appendChild(overlay);
    }
}

// Camera functions
async function startCamera() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        video.srcObject = currentStream;
        
        video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        });
        
        startBtn.style.display = 'none';
        captureBtn.disabled = false;
        applyFilter();
        showStatus('กล้องพร้อมใช้งานแล้ว!');
    } catch (err) {
        console.error('Error accessing camera:', err);
        showStatus('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้อง', 'error');
    }
}

function capturePhoto() {
    if (isCapturing) return;
    
    if (timerEnabled) {
        startCountdown();
    } else {
        takePicture();
    }
}

function startCountdown() {
    isCapturing = true;
    let countdown = timerSeconds;
    
    const countdownDiv = document.createElement('div');
    countdownDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 120px;
        font-weight: bold;
        color: #ff69b4;
        text-shadow: 0 0 20px rgba(255, 105, 180, 0.8);
        z-index: 10;
        animation: pulse 1s ease-in-out;
    `;
    cameraContainer.appendChild(countdownDiv);
    
    const countdownInterval = setInterval(() => {
        countdownDiv.textContent = countdown;
        countdownDiv.style.animation = 'none';
        setTimeout(() => countdownDiv.style.animation = 'pulse 1s ease-in-out', 10);
        
        countdown--;
        if (countdown < 0) {
            clearInterval(countdownInterval);
            countdownDiv.remove();
            takePicture();
        }
    }, 1000);
}

function takePicture() {
    // Flash effect
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(45deg, #ffb6c1, #ffc0cb);
        z-index: 9999;
        opacity: 0.9;
        pointer-events: none;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);
    
    // Apply filter to canvas
    ctx.filter = video.style.filter || 'none';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.9);
    capturedPhotos.push({
        data: photoData,
        timestamp: new Date(),
        filter: currentFilter
    });
    
    // Show captured photo
    const img = document.createElement('img');
    img.src = photoData;
    img.className = 'captured-photo';
    
    // Replace video with captured image temporarily
    video.style.display = 'none';
    cameraContainer.appendChild(img);
    
    // Show control buttons
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-block';
    downloadBtn.style.display = 'inline-block';
    
    // Update gallery
    updatePhotoGallery();
    showStatus('ถ่ายรูปสำเร็จ! 📸 รูปสวยมาก! ✨');
    
    // Show QR section
    qrSection.style.display = 'block';
    
    isCapturing = false;
}

function retakePhoto() {
    // Remove captured image
    const capturedImg = cameraContainer.querySelector('.captured-photo');
    if (capturedImg) {
        capturedImg.remove();
    }
    
    // Show video again
    video.style.display = 'block';
    
    // Reset buttons
    captureBtn.style.display = 'inline-block';
    retakeBtn.style.display = 'none';
    downloadBtn.style.display = 'none';
    
    // Hide QR section
    qrSection.style.display = 'none';
}

function downloadPhoto() {
    if (capturedPhotos.length > 0) {
        const latestPhoto = capturedPhotos[capturedPhotos.length - 1];
        const link = document.createElement('a');
        link.download = `photo-booth-${Date.now()}.jpg`;
        link.href = latestPhoto.data;
        link.click();
        showStatus('รูปถูกดาวน์โหลดแล้ว! 💾');
    }
}

function updatePhotoGallery() {
    photoGallery.innerHTML = '';
    capturedPhotos.forEach((photo, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
        const img = document.createElement('img');
        img.src = photo.data;
        img.alt = `Photo ${index + 1}`;
        
        galleryItem.appendChild(img);
        galleryItem.addEventListener('click', () => {
            // Download clicked photo
            const link = document.createElement('a');
            link.download = `photo-${index + 1}-${Date.now()}.jpg`;
            link.href = photo.data;
            link.click();
        });
        
        photoGallery.appendChild(galleryItem);
    });
}

// Timer toggle
timerBtn.addEventListener('click', () => {
    timerEnabled = !timerEnabled;
    timerBtn.textContent = timerEnabled ? `⏰ Timer: ${timerSeconds}s` : '⏰ Timer: OFF';
    timerBtn.style.background = timerEnabled ? 
        'linear-gradient(45deg, #ff69b4, #da70d6)' : 
        'linear-gradient(45deg, #ffc0cb, #ffb6c1)';
    timerBtn.style.color = timerEnabled ? 'white' : '#d63384';
});

// Effect button
effectBtn.addEventListener('click', () => {
    const effects = ['💖', '💕', '💗', '🌸', '🌺', '🦄', '🎀', '✨'];
    const randomEffect = effects[Math.floor(Math.random() * effects.length)];
    
    // Create floating effect
    for(let i = 0; i < 15; i++) {
        const effect = document.createElement('div');
        effect.textContent = randomEffect;
        effect.style.cssText = `
            position: fixed;
            font-size: 30px;
            pointer-events: none;
            z-index: 1000;
            left: ${Math.random() * window.innerWidth}px;
            top: ${Math.random() * window.innerHeight}px;
            animation: float 3s ease-out forwards;
        `;
        document.body.appendChild(effect);
        setTimeout(() => effect.remove(), 3000);
    }
});

// Add dynamic CSS for floating animation
const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-200px) scale(0.5); opacity: 0; }
    }
    @keyframes pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.2); }
    }
`;
document.head.appendChild(style);

// Event listeners
startBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', capturePhoto);
retakeBtn.addEventListener('click', retakePhoto);
downloadBtn.addEventListener('click', downloadPhoto);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !captureBtn.disabled) {
        e.preventDefault();
        capturePhoto();
    }
});
