/**
 * 图片加载器 - 抽象图片加载功能
 * 支持文件上传、URL加载等方式
 */
class ImageLoader {
    constructor() {
        this.loadedImages = new Map(); // 存储已加载的图片数据
        this.loadingPromises = new Map(); // 避免重复加载
    }

    /**
     * 从文件加载图片
     * @param {File} file - 图片文件
     * @returns {Promise<ImageData>} 图片数据对象
     */
    async loadFromFile(file) {
        const fileId = this._generateFileId(file);
        
        // 检查是否已经在加载中
        if (this.loadingPromises.has(fileId)) {
            return this.loadingPromises.get(fileId);
        }

        // 检查是否已经加载过
        if (this.loadedImages.has(fileId)) {
            return this.loadedImages.get(fileId);
        }

        // 开始加载
        const loadPromise = this._loadFileInternal(file, fileId);
        this.loadingPromises.set(fileId, loadPromise);

        try {
            const imageData = await loadPromise;
            this.loadedImages.set(fileId, imageData);
            return imageData;
        } finally {
            this.loadingPromises.delete(fileId);
        }
    }

    /**
     * 从URL加载图片
     * @param {string} url - 图片URL
     * @returns {Promise<ImageData>} 图片数据对象
     */
    async loadFromUrl(url) {
        const urlId = `url_${url}`;
        
        if (this.loadingPromises.has(urlId)) {
            return this.loadingPromises.get(urlId);
        }

        if (this.loadedImages.has(urlId)) {
            return this.loadedImages.get(urlId);
        }

        const loadPromise = this._loadUrlInternal(url, urlId);
        this.loadingPromises.set(urlId, loadPromise);

        try {
            const imageData = await loadPromise;
            this.loadedImages.set(urlId, imageData);
            return imageData;
        } finally {
            this.loadingPromises.delete(urlId);
        }
    }

    /**
     * 批量加载文件
     * @param {FileList|File[]} files - 文件列表
     * @returns {Promise<ImageData[]>} 图片数据数组
     */
    async loadMultipleFiles(files) {
        const fileArray = Array.from(files);
        const loadPromises = fileArray.map(file => this.loadFromFile(file));
        
        try {
            return await Promise.all(loadPromises);
        } catch (error) {
            console.error('批量加载图片失败:', error);
            // 返回成功加载的图片
            const results = await Promise.allSettled(loadPromises);
            return results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value);
        }
    }

    /**
     * 获取已加载的图片
     * @param {string} id - 图片ID
     * @returns {ImageData|null} 图片数据
     */
    getLoadedImage(id) {
        return this.loadedImages.get(id) || null;
    }

    /**
     * 移除已加载的图片
     * @param {string} id - 图片ID
     */
    removeImage(id) {
        const imageData = this.loadedImages.get(id);
        if (imageData) {
            // 释放资源
            if (imageData.objectUrl) {
                URL.revokeObjectURL(imageData.objectUrl);
            }
            this.loadedImages.delete(id);
        }
    }

    /**
     * 清空所有已加载的图片
     */
    clear() {
        // 释放所有Object URL
        for (const imageData of this.loadedImages.values()) {
            if (imageData.objectUrl) {
                URL.revokeObjectURL(imageData.objectUrl);
            }
        }
        this.loadedImages.clear();
        this.loadingPromises.clear();
    }

    /**
     * 内部方法：加载文件
     */
    async _loadFileInternal(file, fileId) {
        // 验证文件类型
        if (!this._isValidImageFile(file)) {
            throw new Error(`不支持的文件类型: ${file.type}`);
        }

        // 验证文件大小 (50MB限制)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error(`文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大支持50MB`);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const img = new Image();
            
            reader.onload = (e) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    ctx.drawImage(img, 0, 0);

                    const imageData = {
                        id: fileId,
                        name: file.name,
                        file: file,
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        size: file.size,
                        type: file.type,
                        lastModified: file.lastModified,
                        dataUrl: e.target.result,
                        objectUrl: URL.createObjectURL(file),
                        canvas: canvas,
                        element: img,
                        // 编辑状态
                        cropData: {
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0
                        },
                        transformData: {
                            rotation: 0,
                            flipHorizontal: false,
                            flipVertical: false
                        },
                        metadata: {
                            uploadTime: Date.now(),
                            originalWidth: img.naturalWidth,
                            originalHeight: img.naturalHeight
                        }
                    };
                    
                    resolve(imageData);
                };
                
                img.onerror = () => {
                    reject(new Error('图片加载失败，可能文件已损坏'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * 内部方法：从URL加载图片
     */
    async _loadUrlInternal(url, urlId) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);

                const imageData = {
                    id: urlId,
                    name: this._getFilenameFromUrl(url),
                    url: url,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    type: 'image/unknown',
                    dataUrl: canvas.toDataURL(),
                    canvas: canvas,
                    element: img,
                    cropData: {
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0
                    },
                    transformData: {
                        rotation: 0,
                        flipHorizontal: false,
                        flipVertical: false
                    },
                    metadata: {
                        uploadTime: Date.now(),
                        originalWidth: img.naturalWidth,
                        originalHeight: img.naturalHeight
                    }
                };
                
                resolve(imageData);
            };
            
            img.onerror = () => {
                reject(new Error(`无法加载图片: ${url}`));
            };
            
            // 设置跨域支持
            img.crossOrigin = 'anonymous';
            img.src = url;
        });
    }

    /**
     * 生成文件唯一ID
     */
    _generateFileId(file) {
        return `file_${file.name}_${file.size}_${file.lastModified}`;
    }

    /**
     * 验证是否为有效的图片文件
     */
    _isValidImageFile(file) {
        const validTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/svg+xml'
        ];
        return validTypes.includes(file.type.toLowerCase());
    }

    /**
     * 从URL提取文件名
     */
    _getFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop() || 'image';
            return filename.includes('.') ? filename : `${filename}.jpg`;
        } catch {
            return 'image.jpg';
        }
    }

    /**
     * 创建缩略图
     * @param {ImageData} imageData - 图片数据
     * @param {number} maxSize - 最大尺寸
     * @returns {string} 缩略图DataURL
     */
    createThumbnail(imageData, maxSize = 100) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const { width, height } = imageData;
        const scale = Math.min(maxSize / width, maxSize / height);
        
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        ctx.drawImage(imageData.element, 0, 0, canvas.width, canvas.height);
        
        return canvas.toDataURL('image/jpeg', 0.8);
    }

    /**
     * 获取图片信息摘要
     * @param {ImageData} imageData - 图片数据
     * @returns {object} 图片信息
     */
    getImageInfo(imageData) {
        return {
            name: imageData.name,
            size: this._formatFileSize(imageData.size || 0),
            dimensions: `${imageData.width} × ${imageData.height}`,
            type: imageData.type,
            id: imageData.id
        };
    }

    /**
     * 格式化文件大小
     */
    _formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 导出单例实例
window.ImageLoader = ImageLoader;
window.imageLoader = new ImageLoader();