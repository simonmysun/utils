/**
 * 图片处理器 - 负责图片的编辑、变换和合并
 */
class ImageProcessor {
    constructor() {
        this.images = []; // 图片序列
        this.direction = 'vertical'; // 拼接方向
        this.currentImageIndex = -1; // 当前选中的图片索引
    }

    /**
     * 添加图片到序列
     * @param {ImageData} imageData - 图片数据
     * @returns {number} 图片在序列中的索引
     */
    addImage(imageData) {
        this.images.push({
            ...imageData,
            index: this.images.length
        });
        return this.images.length - 1;
    }

    /**
     * 批量添加图片
     * @param {ImageData[]} imageDataArray - 图片数据数组
     * @returns {number[]} 图片索引数组
     */
    addImages(imageDataArray) {
        return imageDataArray.map(imageData => this.addImage(imageData));
    }

    /**
     * 移除图片
     * @param {number} index - 图片索引
     */
    removeImage(index) {
        if (index >= 0 && index < this.images.length) {
            this.images.splice(index, 1);
            // 重新设置索引
            this.images.forEach((img, i) => {
                img.index = i;
            });
            // 调整当前选中索引
            if (this.currentImageIndex >= index) {
                this.currentImageIndex = Math.max(-1, this.currentImageIndex - 1);
            }
        }
    }

    /**
     * 调整图片顺序
     * @param {number} fromIndex - 原索引
     * @param {number} toIndex - 目标索引
     */
    reorderImage(fromIndex, toIndex) {
        if (fromIndex >= 0 && fromIndex < this.images.length &&
            toIndex >= 0 && toIndex < this.images.length &&
            fromIndex !== toIndex) {
            
            const [movedImage] = this.images.splice(fromIndex, 1);
            this.images.splice(toIndex, 0, movedImage);
            
            // 重新设置索引
            this.images.forEach((img, i) => {
                img.index = i;
            });

            // 更新当前选中索引
            if (this.currentImageIndex === fromIndex) {
                this.currentImageIndex = toIndex;
            } else if (fromIndex < this.currentImageIndex && toIndex >= this.currentImageIndex) {
                this.currentImageIndex--;
            } else if (fromIndex > this.currentImageIndex && toIndex <= this.currentImageIndex) {
                this.currentImageIndex++;
            }
        }
    }

    /**
     * 设置拼接方向
     * @param {string} direction - 'vertical' 或 'horizontal'
     */
    setDirection(direction) {
        if (['vertical', 'horizontal'].includes(direction)) {
            this.direction = direction;
        }
    }

    /**
     * 选择图片
     * @param {number} index - 图片索引
     */
    selectImage(index) {
        if (index >= 0 && index < this.images.length) {
            this.currentImageIndex = index;
        } else {
            this.currentImageIndex = -1;
        }
    }

    /**
     * 获取当前选中的图片
     * @returns {object|null} 图片数据
     */
    getCurrentImage() {
        if (this.currentImageIndex >= 0 && this.currentImageIndex < this.images.length) {
            return this.images[this.currentImageIndex];
        }
        return null;
    }

    /**
     * 更新图片裁剪数据
     * @param {number} index - 图片索引
     * @param {object} cropData - 裁剪数据 {top, bottom, left, right}
     */
    updateImageCrop(index, cropData) {
        if (index >= 0 && index < this.images.length) {
            this.images[index].cropData = { ...cropData };
        }
    }

    /**
     * 更新图片变换数据
     * @param {number} index - 图片索引
     * @param {object} transformData - 变换数据 {rotation, flipHorizontal, flipVertical}
     */
    updateImageTransform(index, transformData) {
        if (index >= 0 && index < this.images.length) {
            this.images[index].transformData = { ...transformData };
        }
    }

    /**
     * 旋转图片
     * @param {number} index - 图片索引
     * @param {number} degrees - 旋转角度 (90的倍数)
     */
    rotateImage(index, degrees) {
        if (index >= 0 && index < this.images.length) {
            const image = this.images[index];
            image.transformData.rotation = (image.transformData.rotation + degrees) % 360;
            if (image.transformData.rotation < 0) {
                image.transformData.rotation += 360;
            }
        }
    }

    /**
     * 翻转图片
     * @param {number} index - 图片索引
     * @param {string} type - 'horizontal' 或 'vertical'
     */
    flipImage(index, type) {
        if (index >= 0 && index < this.images.length) {
            const image = this.images[index];
            if (type === 'horizontal') {
                image.transformData.flipHorizontal = !image.transformData.flipHorizontal;
            } else if (type === 'vertical') {
                image.transformData.flipVertical = !image.transformData.flipVertical;
            }
        }
    }

    /**
     * 应用变换到canvas
     * @param {HTMLCanvasElement} canvas - 目标canvas
     * @param {object} imageData - 图片数据
     * @param {object} cropData - 裁剪数据
     * @param {object} transformData - 变换数据
     */
    applyTransformToCanvas(canvas, imageData, cropData, transformData) {
        const ctx = canvas.getContext('2d');
        const img = imageData.element;
        
        // 计算裁剪后的尺寸
        const cropWidth = img.naturalWidth - cropData.left - cropData.right;
        const cropHeight = img.naturalHeight - cropData.top - cropData.bottom;
        
        // 根据旋转调整canvas尺寸
        const isRotated90or270 = transformData.rotation === 90 || transformData.rotation === 270;
        const finalWidth = isRotated90or270 ? cropHeight : cropWidth;
        const finalHeight = isRotated90or270 ? cropWidth : cropHeight;
        
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        
        // 保存上下文状态
        ctx.save();
        
        // 移动到canvas中心
        ctx.translate(finalWidth / 2, finalHeight / 2);
        
        // 应用旋转
        ctx.rotate((transformData.rotation * Math.PI) / 180);
        
        // 应用翻转
        const scaleX = transformData.flipHorizontal ? -1 : 1;
        const scaleY = transformData.flipVertical ? -1 : 1;
        ctx.scale(scaleX, scaleY);
        
        // 绘制图片 (裁剪)
        const drawWidth = isRotated90or270 ? cropHeight : cropWidth;
        const drawHeight = isRotated90or270 ? cropWidth : cropHeight;
        
        ctx.drawImage(
            img,
            cropData.left, cropData.top, cropWidth, cropHeight,
            -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
        );
        
        // 恢复上下文状态
        ctx.restore();
    }

    /**
     * 生成预览图片
     * @param {number} index - 图片索引
     * @param {number} maxWidth - 最大宽度
     * @param {number} maxHeight - 最大高度
     * @returns {HTMLCanvasElement} 预览canvas
     */
    generatePreview(index, maxWidth = 200, maxHeight = 150) {
        if (index < 0 || index >= this.images.length) {
            return null;
        }

        const image = this.images[index];
        const tempCanvas = document.createElement('canvas');
        
        // 应用变换
        this.applyTransformToCanvas(
            tempCanvas, 
            image, 
            image.cropData, 
            image.transformData
        );
        
        // 创建缩放后的预览canvas
        const previewCanvas = document.createElement('canvas');
        const ctx = previewCanvas.getContext('2d');
        
        const scale = Math.min(maxWidth / tempCanvas.width, maxHeight / tempCanvas.height);
        previewCanvas.width = tempCanvas.width * scale;
        previewCanvas.height = tempCanvas.height * scale;
        
        ctx.drawImage(tempCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
        
        return previewCanvas;
    }

    /**
     * 合并所有图片
     * @returns {HTMLCanvasElement} 合并后的canvas
     */
    mergeImages() {
        if (this.images.length === 0) {
            return null;
        }

        // 生成所有图片的处理后canvas
        const processedCanvases = this.images.map(image => {
            const canvas = document.createElement('canvas');
            this.applyTransformToCanvas(canvas, image, image.cropData, image.transformData);
            return canvas;
        });

        // 计算最终尺寸
        let totalWidth = 0;
        let totalHeight = 0;
        let maxWidth = 0;
        let maxHeight = 0;

        processedCanvases.forEach(canvas => {
            if (this.direction === 'horizontal') {
                totalWidth += canvas.width;
                maxHeight = Math.max(maxHeight, canvas.height);
            } else {
                totalHeight += canvas.height;
                maxWidth = Math.max(maxWidth, canvas.width);
            }
        });

        const finalWidth = this.direction === 'horizontal' ? totalWidth : maxWidth;
        const finalHeight = this.direction === 'vertical' ? totalHeight : maxHeight;

        // 创建最终canvas
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = finalWidth;
        finalCanvas.height = finalHeight;
        const ctx = finalCanvas.getContext('2d');

        // 设置白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalWidth, finalHeight);

        // 绘制所有图片
        let currentX = 0;
        let currentY = 0;

        processedCanvases.forEach(canvas => {
            if (this.direction === 'horizontal') {
                // 垂直居中对齐
                const y = (maxHeight - canvas.height) / 2;
                ctx.drawImage(canvas, currentX, y);
                currentX += canvas.width;
            } else {
                // 水平居中对齐
                const x = (maxWidth - canvas.width) / 2;
                ctx.drawImage(canvas, x, currentY);
                currentY += canvas.height;
            }
        });

        return finalCanvas;
    }

    /**
     * 获取合并预览 (缩放版本)
     * @param {number} maxWidth - 最大宽度
     * @param {number} maxHeight - 最大高度
     * @returns {HTMLCanvasElement} 预览canvas
     */
    getMergePreview(maxWidth = 800, maxHeight = 600) {
        const mergedCanvas = this.mergeImages();
        if (!mergedCanvas) {
            return null;
        }

        const scale = Math.min(
            maxWidth / mergedCanvas.width,
            maxHeight / mergedCanvas.height,
            1 // 不放大
        );

        if (scale >= 1) {
            return mergedCanvas;
        }

        const previewCanvas = document.createElement('canvas');
        const ctx = previewCanvas.getContext('2d');
        
        previewCanvas.width = mergedCanvas.width * scale;
        previewCanvas.height = mergedCanvas.height * scale;
        
        ctx.drawImage(mergedCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
        
        return previewCanvas;
    }

    /**
     * 导出为图片文件
     * @param {string} format - 图片格式 ('png', 'jpeg', 'webp')
     * @param {number} quality - 图片质量 (0-1)
     * @returns {Promise<Blob>} 图片Blob
     */
    async exportImage(format = 'png', quality = 0.9) {
        const canvas = this.mergeImages();
        if (!canvas) {
            throw new Error('没有图片可以导出');
        }

        return new Promise((resolve) => {
            canvas.toBlob(resolve, `image/${format}`, quality);
        });
    }

    /**
     * 下载合并后的图片
     * @param {string} filename - 文件名
     * @param {string} format - 图片格式
     * @param {number} quality - 图片质量
     */
    async downloadMergedImage(filename = 'merged-image.png', format = 'png', quality = 0.9) {
        try {
            const blob = await this.exportImage(format, quality);
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理URL
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (error) {
            console.error('下载失败:', error);
            throw error;
        }
    }

    /**
     * 获取图片序列信息
     * @returns {Array} 图片信息数组
     */
    getImagesInfo() {
        return this.images.map((image, index) => ({
            index,
            name: image.name,
            width: image.width,
            height: image.height,
            cropData: { ...image.cropData },
            transformData: { ...image.transformData },
            processedSize: this._getProcessedSize(image)
        }));
    }

    /**
     * 获取处理后的图片尺寸
     */
    _getProcessedSize(image) {
        const { cropData, transformData } = image;
        const width = image.width - cropData.left - cropData.right;
        const height = image.height - cropData.top - cropData.bottom;
        
        // 考虑旋转
        const isRotated90or270 = transformData.rotation === 90 || transformData.rotation === 270;
        return {
            width: isRotated90or270 ? height : width,
            height: isRotated90or270 ? width : height
        };
    }

    /**
     * 清空所有图片
     */
    clear() {
        this.images = [];
        this.currentImageIndex = -1;
    }

    /**
     * 获取图片数量
     */
    getImageCount() {
        return this.images.length;
    }

    /**
     * 检查是否有图片
     */
    hasImages() {
        return this.images.length > 0;
    }
}

// 导出类和单例实例
window.ImageProcessor = ImageProcessor;
window.imageProcessor = new ImageProcessor();