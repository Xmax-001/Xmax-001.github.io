class PhotoBooth {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.stripCanvas = document.getElementById('stripCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.stripCtx = this.stripCanvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.photoStripBtn = document.getElementById('photoStripBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.timerBtn = document.getElementById('timerBtn');
        this.effectBtn = document.getElementById('effectBtn');
        this.statusMessage = document.getElementById('statusMessage');
        this.photoGallery = document.getElementById('photoGallery');
        this.cameraContainer = document.getElementById('cameraContainer');
        
        this.stream = null;
        this.capturedPhoto = null;
        this.photos = [];
        this.currentFilter = 'none';
        this.timerEnabled = false;
        this.effectsEnabled = false;
        this.isStripMode = false;
        this.stripPhotos = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupFilters();
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.photoStripBtn.addEventListener('click', () => this.capturePhotoStrip());
        this.retakeBtn.addEventListener('click', () => this.retakePhoto());
        this.downloadBtn.addEventListener('click', () => this.downloadPhoto());
        this.timerBtn.addEventListener('click', () => this.toggleTimer());
        this.effectBtn.addEventListener('click', () => this.toggleEffects());
    }
    
    setupFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.applyFilter();
            });
        });
    }
    
    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            
            this.video.srcObject = this.stream;
            this.video.style.display = 'block';
            
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.stripCanvas.width = this.video.videoWidth;
                this.stripCanvas.height = this.video.videoHeight * 4; // 4 photos in a strip
                this.applyFilter();
            });
            
            this.startBtn.disabled = true;
            this.captureBtn.disabled = false;
            this.photoStripBtn.disabled = false;
            this.showStatus('เริ่มกล้องสำเร็จ! 📸', 'success');
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showStatus('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาต', 'error');
        }
    }
    
    applyFilter() {
        if (!this.video.srcObject) return;
        
        this.video.className = '';
        this.video.style.transform = 'scaleX(-1)';
        
        const existingOverlay = this.cameraContainer.querySelector('.softkorean-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        if (this.currentFilter === 'softkorean') {
            this.video.classList.add('filter-softkorean');
            const overlay = document.createElement('div');
            overlay.className = 'softkorean-overlay';
            this.cameraContainer.appendChild(overlay);
        } else if (this.currentFilter !== 'none') {
            this.video.classList.add(`filter-${this.currentFilter}`);
        }
    }
    
    async capturePhoto() {
        if (!this.video.srcObject) return;
        
        if (this.timerEnabled) {
            await this.startTimer();
        }
        
        this.ctx.save();
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.video, -this.canvas.width, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
        if (this.currentFilter !== 'none') {
            this.applyCanvasFilter(this.canvas, this.ctx);
        }
        
        this.canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            this.capturedPhoto = {
                url: url,
                blob: blob,
                timestamp: new Date().toLocaleString('th-TH'),
                type: 'single'
            };
            
            this.showCapturedPhoto();
            this.addToGallery();
            this.showStatus('ถ่ายรูปสำเร็จ! 🎉', 'success');
        }, 'image/jpeg', 0.9);
    }
    
    async capturePhotoStrip() {
        if (!this.video.srcObject) return;
        
        this.isStripMode = true;
        this.stripPhotos = [];
        
        const progressDiv = document.createElement('div');
        progressDiv.className = 'strip-progress';
        this.cameraContainer.appendChild(progressDiv);
        
        this.captureBtn.disabled = true;
        this.photoStripBtn.disabled = true;
        
        for (let i = 0; i < 4; i++) {
            progressDiv.textContent = `📸 ถ่ายรูปที่ ${i + 1}/4`;
            
            if (this.timerEnabled) {
                await this.startTimer();
            }
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.video.videoWidth;
            tempCanvas.height = this.video.videoHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.save();
            tempCtx.scale(-1, 1);
            tempCtx.drawImage(this.video, -tempCanvas.width, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.restore();
            
            if (this.currentFilter !== 'none') {
                this.applyCanvasFilter(tempCanvas, tempCtx);
            }
            
            this.stripPhotos.push(tempCanvas);
            
            if (i < 3) {
                await this.sleep(1000);
            }
        }
        
        this.createPhotoStrip();
        progressDiv.remove();
        
        this.captureBtn.disabled = false;
        this.photoStripBtn.disabled = false;
        this.isStripMode = false;
        
        this.showStatus('ถ่ายรูปแบบ Strip สำเร็จ! 🎉', 'success');
    }
    
    createPhotoStrip() {
        const stripHeight = this.video.videoHeight;
        const stripWidth = this.video.videoWidth;
        
        this.stripCtx.clearRect(0, 0, stripWidth, stripHeight * 4);
        
        for (let i = 0; i < this.stripPhotos.length; i++) {
            this.stripCtx.drawImage(
                this.stripPhotos[i],
                0, i * stripHeight,
                stripWidth, stripHeight
            );
        }
        
        this.stripCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            this.capturedPhoto = {
                url: url,
                blob: blob,
                timestamp: new Date().toLocaleString('th-TH'),
                type: 'strip'
            };
            
            this.showCapturedPhoto();
            this.addToGallery();
        }, 'image/jpeg', 0.9);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    applyCanvasFilter(canvas, ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        switch (this.currentFilter) {
            case 'sepia':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
                }
                break;
            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    data[i] = gray;
                    data[i + 1] = gray;
                    data[i + 2] = gray;
                }
                break;
            case 'blur':
                this.applyBlurFilter(canvas, ctx, imageData);
                return;
            case 'brightness':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.5);
                    data[i + 1] = Math.min(255, data[i + 1] * 1.5);
                    data[i + 2] = Math.min(255, data[i + 2] * 1.5);
                }
                break;
            case 'contrast':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.5 + 128));
                    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.5 + 128));
                    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.5 + 128));
                }
                break;
            case 'saturate':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const gray = r * 0.299 + g * 0.587 + b * 0.114;
                    data[i] = Math.min(255, gray + (r - gray) * 1.5);
                    data[i + 1] = Math.min(255, gray + (g - gray) * 1.5);
                    data[i + 2] = Math.min(255, gray + (b - gray) * 1.5);
                }
                break;
            case 'vintage':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    data[i] = Math.min(255, r * 0.9 + g * 0.5 + b * 0.1);
                    data[i + 1] = Math.min(255, r * 0.3 + g * 0.8 + b * 0.1);
                    data[i + 2] = Math.min(255, r * 0.2 + g * 0.3 + b * 0.5);
                }
                break;
            case 'softkorean':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Soft, warm tone
                    data[i] = Math.min(255, r + 20);
                    data[i + 1] = Math.min(255, g + 10);
                    data[i + 2] = Math.min(255, b - 5);
                }
                break;
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    applyBlurFilter(canvas, ctx, imageData) {
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const blurRadius = 2;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                    for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const index = (ny * width + nx) * 4;
                            r += data[index];
                            g += data[index + 1];
                            b += data[index + 2];
                            count++;
                        }
                    }
                }
                
                const index = (y * width + x) * 4;
                data[index] = r / count;
                data[index + 1] = g / count;
                data[index + 2] = b / count;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    async startTimer() {
        const timerDiv = document.createElement('div');
        timerDiv.className = 'timer-countdown';
        this.cameraContainer.appendChild(timerDiv);
        
        for (let i = 3; i > 0; i--) {
            timerDiv.textContent = i;
            await this.sleep(1000);
        }
        
        timerDiv.textContent = '📸';
        await this.sleep(300);
        timerDiv.remove();
    }
    
    showCapturedPhoto() {
        const capturedImg = document.getElementById('capturedImage');
        capturedImg.src = this.capturedPhoto.url;
        capturedImg.style.display = 'block';
        
        this.video.style.display = 'none';
        this.retakeBtn.disabled = false;
        this.downloadBtn.disabled = false;
        this.captureBtn.disabled = true;
        this.photoStripBtn.disabled = true;
    }
    
    retakePhoto() {
        this.video.style.display = 'block';
        document.getElementById('capturedImage').style.display = 'none';
        
        this.captureBtn.disabled = false;
        this.photoStripBtn.disabled = false;
        this.retakeBtn.disabled = true;
        this.downloadBtn.disabled = true;
        
        if (this.capturedPhoto) {
            URL.revokeObjectURL(this.capturedPhoto.url);
            this.capturedPhoto = null;
        }
    }
    
    downloadPhoto() {
        if (!this.capturedPhoto) return;
        
        const link = document.createElement('a');
        link.download = `photo_${Date.now()}.jpg`;
        link.href = this.capturedPhoto.url;
        link.click();
        
        this.showStatus('ดาวน์โหลดสำเร็จ! 💾', 'success');
    }
    
    addToGallery() {
        this.photos.push(this.capturedPhoto);
        
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
        const img = document.createElement('img');
        img.src = this.capturedPhoto.url;
        img.alt = 'Photo';
        
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = this.capturedPhoto.timestamp;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.onclick = () => this.deletePhoto(galleryItem, this.capturedPhoto);
        
        galleryItem.appendChild(img);
        galleryItem.appendChild(timestamp);
        galleryItem.appendChild(deleteBtn);
        
        this.photoGallery.appendChild(galleryItem);
    }
    
    deletePhoto(galleryItem, photo) {
        const index = this.photos.indexOf(photo);
        if (index > -1) {
            this.photos.splice(index, 1);
            URL.revokeObjectURL(photo.url);
            galleryItem.remove();
            this.showStatus('ลบรูปสำเร็จ! 🗑️', 'success');
        }
    }
    
    toggleTimer() {
        this.timerEnabled = !this.timerEnabled;
        this.timerBtn.classList.toggle('active', this.timerEnabled);
        this.showStatus(this.timerEnabled ? 'เปิดตั้งเวลา ⏰' : 'ปิดตั้งเวลา', 'info');
    }
    
    toggleEffects() {
        this.effectsEnabled = !this.effectsEnabled;
        this.effectBtn.classList.toggle('active', this.effectsEnabled);
        
        const filtersContainer = document.getElementById('filtersContainer');
        filtersContainer.style.display = this.effectsEnabled ? 'block' : 'none';
        
        this.showStatus(this.effectsEnabled ? 'เปิดเอฟเฟกต์ ✨' : 'ปิดเอฟเฟกต์', 'info');
    }
    
    showStatus(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        this.statusMessage.style.display = 'block';
        
        setTimeout(() => {
            this.statusMessage.style.display = 'none';
        }, 3000);
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.video.style.display = 'none';
        this.startBtn.disabled = false;
        this.captureBtn.disabled = true;
        this.photoStripBtn.disabled = true;
    }
    
    clearGallery() {
        this.photos.forEach(photo => {
            URL.revokeObjectURL(photo.url);
        });
        this.photos = [];
        this.photoGallery.innerHTML = '';
        this.showStatus('เคลียร์แกลเลอรี่สำเร็จ! 🧹', 'success');
    }
    
    downloadAllPhotos() {
        if (this.photos.length === 0) {
            this.showStatus('ไม่มีรูปให้ดาวน์โหลด', 'error');
            return;
        }
        
        this.photos.forEach((photo, index) => {
            const link = document.createElement('a');
            link.download = `photo_${index + 1}_${Date.now()}.jpg`;
            link.href = photo.url;
            link.click();
        });
        
        this.showStatus(`ดาวน์โหลดรูปทั้งหมด ${this.photos.length} รูป! 📦`, 'success');
    }
}

// Initialize PhotoBooth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PhotoBooth();
});
