class PhotoBooth {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.timerBtn = document.getElementById('timerBtn');
        this.effectBtn = document.getElementById('effectBtn');
        this.flipBtn = document.getElementById('flipBtn');
        this.statusMessage = document.getElementById('statusMessage');
        this.photoGallery = document.getElementById('photoGallery');
        this.cameraContainer = document.getElementById('cameraContainer');
        
        this.stream = null;
        this.capturedPhoto = null;
        this.photos = [];
        this.currentFilter = 'none';
        this.timerEnabled = false;
        this.effectsEnabled = false;
        this.facingMode = 'user'; // 'user' for front camera, 'environment' for back camera
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupFilters();
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.retakeBtn.addEventListener('click', () => this.retakePhoto());
        this.downloadBtn.addEventListener('click', () => this.downloadPhoto());
        this.timerBtn.addEventListener('click', () => this.toggleTimer());
        this.effectBtn.addEventListener('click', () => this.toggleEffects());
        this.flipBtn.addEventListener('click', () => this.flipCamera());
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
                    facingMode: this.facingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            
            this.video.srcObject = this.stream;
            this.video.style.display = 'block';
            
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.applyFilter();
            });
            
            this.startBtn.disabled = true;
            this.captureBtn.disabled = false;
            this.flipBtn.disabled = false;
            this.showStatus('เริ่มกล้องสำเร็จ! 📸', 'success');
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showStatus('ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาต', 'error');
        }
    }
    
    async flipCamera() {
        if (!this.stream) {
            this.showStatus('กรุณาเปิดกล้องก่อน', 'error');
            return;
        }
        
        try {
            // Stop current stream
            this.stream.getTracks().forEach(track => track.stop());
            
            // Toggle facing mode
            this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
            
            // Start new stream with new facing mode
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: this.facingMode,
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            
            this.video.srcObject = this.stream;
            
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.applyFilter();
            });
            
            const cameraType = this.facingMode === 'user' ? 'กล้องหน้า' : 'กล้องหลัง';
            this.showStatus(`เปลี่ยนเป็น${cameraType}แล้ว 🔄`, 'success');
            
        } catch (error) {
            console.error('Error flipping camera:', error);
            this.showStatus('ไม่สามารถเปลี่ยนกล้องได้', 'error');
            
            // Revert to original facing mode
            this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        }
    }
    
    applyFilter() {
        if (!this.video.srcObject) return;
        
        // Remove existing filter classes
        this.video.className = '';
        
        // Remove softkorean overlay if exists
        const existingOverlay = this.cameraContainer.querySelector('.softkorean-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        if (this.currentFilter === 'softkorean') {
            this.video.classList.add('filter-softkorean');
            // Add softkorean overlay
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
        
        // Draw video frame to canvas with filter
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Apply filter to canvas if needed
        if (this.currentFilter !== 'none') {
            this.applyCanvasFilter();
        }
        
        // Convert to blob and create image
        this.canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            this.capturedPhoto = {
                url: url,
                blob: blob,
                timestamp: new Date().toLocaleString('th-TH')
            };
            
            this.showCapturedPhoto();
            this.addToGallery();
            this.showStatus('ถ่ายรูปสำเร็จ! 🎉', 'success');
        }, 'image/jpeg', 0.9);
    }
    
    applyCanvasFilter() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
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
            case 'brightness':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.5);
                    data[i + 1] = Math.min(255, data[i + 1] * 1.5);
                    data[i + 2] = Math.min(255, data[i + 2] * 1.5);
                }
                break;
            case 'softkorean':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.1);
                    data[i + 1] = Math.min(255, data[i + 1] * 1.05);
                    data[i + 2] = Math.min(255, data[i + 2] * 1.1);
                }
                break;
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    async startTimer() {
        return new Promise((resolve) => {
            let count = 3;
            const timerOverlay = document.createElement('div');
            timerOverlay.className = 'timer-overlay';
            timerOverlay.textContent = count;
            this.cameraContainer.appendChild(timerOverlay);
            
            const interval = setInterval(() => {
                count--;
                if (count > 0) {
                    timerOverlay.textContent = count;
                } else {
                    timerOverlay.textContent = '📸';
                    setTimeout(() => {
                        timerOverlay.remove();
                        resolve();
                    }, 500);
                    clearInterval(interval);
                }
            }, 1000);
        });
    }
    
    showCapturedPhoto() {
        const img = document.createElement('img');
        img.src = this.capturedPhoto.url;
        img.className = 'captured-photo';
        
        this.video.style.display = 'none';
        this.cameraContainer.appendChild(img);
        
        this.captureBtn.style.display = 'none';
        this.retakeBtn.style.display = 'inline-block';
        this.downloadBtn.style.display = 'inline-block';
        this.flipBtn.disabled = true;
    }
    
    retakePhoto() {
        const capturedImg = this.cameraContainer.querySelector('.captured-photo');
        if (capturedImg) {
            capturedImg.remove();
        }
        
        this.video.style.display = 'block';
        this.captureBtn.style.display = 'inline-block';
        this.retakeBtn.style.display = 'none';
        this.downloadBtn.style.display = 'none';
        this.flipBtn.disabled = false;
        
        if (this.capturedPhoto) {
            URL.revokeObjectURL(this.capturedPhoto.url);
            this.capturedPhoto = null;
        }
    }
    
    downloadPhoto() {
        if (!this.capturedPhoto) return;
        
        const link = document.createElement('a');
        link.href = this.capturedPhoto.url;
        link.download = `photo-booth-${Date.now()}.jpg`;
        link.click();
        
        this.showStatus('ดาวน์โหลดสำเร็จ! 💾', 'success');
    }
    
    addToGallery() {
        if (!this.capturedPhoto) return;
        
        this.photos.push(this.capturedPhoto);
        
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        
        const img = document.createElement('img');
        img.src = this.capturedPhoto.url;
        img.alt = `Photo ${this.photos.length}`;
        
        galleryItem.appendChild(img);
        galleryItem.addEventListener('click', () => {
            window.open(this.capturedPhoto.url, '_blank');
        });
