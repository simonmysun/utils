/**
 * UI控制器 - 负责用户界面交互和状态管理
 */
class UIController {
    constructor() {
        this.elements = {};
        this.state = {
            currentTab: 'crop',
            selectedImageIndex: -1,
            isPreviewMode: false,
            isMobile: window.innerWidth <= 768
        };
        this.eventListeners = [];
    }

    /**
     * 初始化UI控制器
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateUI();
        this.checkMobileMode();
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements = {
            // 上传相关
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            
            // 图片列表
            imageList: document.getElementById('imageList'),
            
            // 序列预览
            sequenceContainer: document.getElementById('sequenceContainer'),
            
            // 编辑工具
            editTools: document.getElementById('editTools'),
            tabButtons: document.querySelectorAll('.tab-btn'),
            toolPanels: document.querySelectorAll('.tool-panel'),
            
            // 裁剪工具
            cropPreviewImage: document.getElementById('cropPreviewImage'),
            cropTop: document.getElementById('cropTop'),
            cropBottom: document.getElementById('cropBottom'),
            cropLeft: document.getElementById('cropLeft'),
            cropRight: document.getElementById('cropRight'),
            
            // 变换工具
            rotateLeft: document.getElementById('rotateLeft'),
            rotateRight: document.getElementById('rotateRight'),
            flipHorizontal: document.getElementById('flipHorizontal'),
            flipVertical: document.getElementById('flipVertical'),
            
            // 智能合并
            enableSmartMerge: document.getElementById('enableSmartMerge'),
            autoRemoveHeader: document.getElementById('autoRemoveHeader'),
            autoRemoveFooter: document.getElementById('autoRemoveFooter'),
            applySmartMerge: document.getElementById('applySmartMerge'),
            
            // 预览和导出
            previewBtn: document.getElementById('previewBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            finalPreview: document.getElementById('finalPreview'),
            previewCanvas: document.getElementById('previewCanvas'),
            
            // 方向控制
            directionControls: document.querySelectorAll('input[name="direction"]'),
            
            // 移动端
            mobileUpload: document.getElementById('mobileUpload'),
            mobileEdit: document.getElementById('mobileEdit'),
            mobilePreview: document.getElementById('mobilePreview'),
            mobileDownload: document.getElementById('mobileDownload'),
            
            // 加载指示器
            loadingOverlay: document.getElementById('loadingOverlay')
        };
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 上传事件
        this.addEventListeners([
            [this.elements.uploadArea, 'click', () => this.elements.fileInput.click()],
            [this.elements.fileInput, 'change', (e) => this.handleFileUpload(e)],
            [this.elements.mobileUpload, 'click', () => this.elements.fileInput.click()]
        ]);

        // 方向控制
        this.elements.directionControls.forEach(radio => {
            this.addEventListener(radio, 'change', (e) => {
                imageProcessor.setDirection(e.target.value);
                this.updateSequenceDisplay();
            });
        });

        // 标签页切换
        this.elements.tabButtons.forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 裁剪控制
        this.addEventListeners([
            [this.elements.cropTop, 'input', () => this.updateCropPreview()],
            [this.elements.cropBottom, 'input', () => this.updateCropPreview()],
            [this.elements.cropLeft, 'input', () => this.updateCropPreview()],
            [this.elements.cropRight, 'input', () => this.updateCropPreview()]
        ]);

        // 变换控制
        this.addEventListeners([
            [this.elements.rotateLeft, 'click', () => this.rotateCurrentImage(-90)],
            [this.elements.rotateRight, 'click', () => this.rotateCurrentImage(90)],
            [this.elements.flipHorizontal, 'click', () => this.flipCurrentImage('horizontal')],
            [this.elements.flipVertical, 'click', () => this.flipCurrentImage('vertical')]
        ]);

        // 智能合并
        this.addEventListener(this.elements.applySmartMerge, 'click', () => {
            this.handleSmartMerge();
        });

        // 预览和导出
        this.addEventListeners([
            [this.elements.previewBtn, 'click', () => this.showPreview()],
            [this.elements.downloadBtn, 'click', () => this.downloadImage()],
            [this.elements.mobilePreview, 'click', () => this.showPreview()],
            [this.elements.mobileDownload, 'click', () => this.downloadImage()]
        ]);

        // 窗口大小变化
        this.addEventListener(window, 'resize', () => {
            this.checkMobileMode();
        });
    }

    /**
     * 添加事件监听器并跟踪
     */
    addEventListeners(eventArray) {
        eventArray.forEach(([element, event, handler]) => {
            this.addEventListener(element, event, handler);
        });
    }

    /**
     * 添加单个事件监听器
     */
    addEventListener(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
            this.eventListeners.push({ element, event, handler });
        }
    }

    /**
     * 检查移动端模式
     */
    checkMobileMode() {
        const wasMobile = this.state.isMobile;
        this.state.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.state.isMobile) {
            this.updateUI();
        }
    }

    /**
     * 处理文件上传
     */
    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        this.showLoading('正在加载图片...');

        try {
            const imageDataArray = await imageLoader.loadMultipleFiles(files);
            imageProcessor.addImages(imageDataArray);
            
            this.updateImageList();
            this.updateSequenceDisplay();
            this.updateUI();
            
            // 清空文件输入
            event.target.value = '';
            
            this.showMessage(`成功加载 ${imageDataArray.length} 张图片`);
        } catch (error) {
            console.error('文件上传失败:', error);
            this.showError('图片加载失败: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 更新图片列表显示
     */
    updateImageList() {
        const container = this.elements.imageList;
        const images = imageProcessor.images;

        if (images.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>暂无图片</p></div>';
            return;
        }

        container.innerHTML = images.map((image, index) => `
            <div class="image-item ${index === imageProcessor.currentImageIndex ? 'selected' : ''}" 
                 data-index="${index}">
                <img class="image-thumbnail" src="${imageLoader.createThumbnail(image, 50)}" alt="${image.name}">
                <div class="image-info">
                    <div class="image-name">${image.name}</div>
                    <div class="image-size">${imageLoader.getImageInfo(image).size} • ${imageLoader.getImageInfo(image).dimensions}</div>
                </div>
                <div class="image-actions">
                    <div class="move-buttons">
                        <button class="btn btn-small btn-move" onclick="uiController.moveImageUp(${index})" 
                                title="上移" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button class="btn btn-small btn-move" onclick="uiController.moveImageDown(${index})" 
                                title="下移" ${index === images.length - 1 ? 'disabled' : ''}>↓</button>
                    </div>
                    <button class="btn btn-small btn-danger" onclick="uiController.removeImage(${index})" title="删除">×</button>
                </div>
            </div>
        `).join('');

        // 添加图片项点击事件
        container.querySelectorAll('.image-item').forEach(item => {
            this.addEventListener(item, 'click', (e) => {
                if (!e.target.closest('.image-actions')) {
                    const index = parseInt(item.dataset.index);
                    this.selectImage(index);
                }
            });
        });

        // TODO: 添加拖拽排序功能
    }

    /**
     * 更新序列显示
     */
    updateSequenceDisplay() {
        const container = this.elements.sequenceContainer;
        const images = imageProcessor.images;
        const direction = imageProcessor.direction;

        if (images.length === 0) {
            container.innerHTML = '<div class="empty-sequence"><p>请先上传图片</p></div>';
            return;
        }

        container.className = `sequence-container sequence-${direction}`;
        
        container.innerHTML = images.map((image, index) => {
            const preview = imageProcessor.generatePreview(index);
            const previewUrl = preview ? preview.toDataURL() : image.dataUrl;
            
            return `
                <img class="sequence-image ${index === imageProcessor.currentImageIndex ? 'selected' : ''}" 
                     src="${previewUrl}" 
                     alt="${image.name}"
                     data-index="${index}">
            `;
        }).join('');

        // 添加序列图片点击事件
        container.querySelectorAll('.sequence-image').forEach(img => {
            this.addEventListener(img, 'click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.selectImage(index);
            });
        });
    }

    /**
     * 选择图片
     */
    selectImage(index) {
        imageProcessor.selectImage(index);
        this.state.selectedImageIndex = index;
        
        this.updateImageList();
        this.updateSequenceDisplay();
        this.updateEditTools();
        this.showEditTools();
    }

    /**
     * 移除图片
     */
    removeImage(index) {
        if (confirm('确定要删除这张图片吗？')) {
            const image = imageProcessor.images[index];
            if (image) {
                imageLoader.removeImage(image.id);
            }
            
            imageProcessor.removeImage(index);
            this.updateImageList();
            this.updateSequenceDisplay();
            this.updateUI();
        }
    }

    /**
     * 上移图片
     */
    moveImageUp(index) {
        if (index > 0) {
            imageProcessor.reorderImage(index, index - 1);
            this.updateImageList();
            this.updateSequenceDisplay();
        }
    }

    /**
     * 下移图片
     */
    moveImageDown(index) {
        if (index < imageProcessor.images.length - 1) {
            imageProcessor.reorderImage(index, index + 1);
            this.updateImageList();
            this.updateSequenceDisplay();
        }
    }

    /**
     * 切换标签页
     */
    switchTab(tabName) {
        this.state.currentTab = tabName;
        
        // 更新标签按钮状态
        this.elements.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // 更新面板显示
        this.elements.toolPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}Tool`);
        });

        this.updateEditTools();
    }

    /**
     * 显示编辑工具
     */
    showEditTools() {
        this.elements.editTools.style.display = imageProcessor.hasImages() ? 'block' : 'none';
    }

    /**
     * 更新编辑工具
     */
    updateEditTools() {
        const currentImage = imageProcessor.getCurrentImage();
        if (!currentImage) return;

        // 更新裁剪工具
        if (this.state.currentTab === 'crop') {
            this.elements.cropPreviewImage.src = currentImage.dataUrl;
            this.elements.cropTop.value = currentImage.cropData.top;
            this.elements.cropBottom.value = currentImage.cropData.bottom;
            this.elements.cropLeft.value = currentImage.cropData.left;
            this.elements.cropRight.value = currentImage.cropData.right;
        }
    }

    /**
     * 更新裁剪预览
     */
    updateCropPreview() {
        const currentImage = imageProcessor.getCurrentImage();
        if (!currentImage) return;

        const cropData = {
            top: parseInt(this.elements.cropTop.value) || 0,
            bottom: parseInt(this.elements.cropBottom.value) || 0,
            left: parseInt(this.elements.cropLeft.value) || 0,
            right: parseInt(this.elements.cropRight.value) || 0
        };

        imageProcessor.updateImageCrop(imageProcessor.currentImageIndex, cropData);
        this.updateSequenceDisplay();
    }

    /**
     * 旋转当前图片
     */
    rotateCurrentImage(degrees) {
        if (imageProcessor.currentImageIndex >= 0) {
            imageProcessor.rotateImage(imageProcessor.currentImageIndex, degrees);
            this.updateSequenceDisplay();
        }
    }

    /**
     * 翻转当前图片
     */
    flipCurrentImage(type) {
        if (imageProcessor.currentImageIndex >= 0) {
            imageProcessor.flipImage(imageProcessor.currentImageIndex, type);
            this.updateSequenceDisplay();
        }
    }

    /**
     * 处理智能合并
     */
    async handleSmartMerge() {
        if (!imageProcessor.hasImages()) {
            this.showError('请先上传图片');
            return;
        }

        this.showLoading('正在分析图片...');

        try {
            const analysis = await smartMerger.analyzeImages(imageProcessor.images);
            
            if (analysis.suggestions.length === 0) {
                this.showMessage('未检测到明显的重复内容');
                return;
            }

            // 显示建议确认对话框
            const accepted = await this.showSuggestionsDialog(analysis.suggestions);
            
            if (accepted) {
                const results = await smartMerger.applySuggestions(analysis.suggestions, imageProcessor);
                
                this.updateSequenceDisplay();
                this.updateEditTools();
                
                this.showMessage(`应用了 ${results.applied.length} 个建议`);
            }
        } catch (error) {
            console.error('智能合并失败:', error);
            this.showError('智能分析失败: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 显示建议确认对话框
     */
    async showSuggestionsDialog(suggestions) {
        // 简化版本，实际项目中可以实现更复杂的对话框
        const message = suggestions.map(s => `• ${s.title}: ${s.description}`).join('\n');
        return confirm(`检测到以下优化建议:\n\n${message}\n\n是否应用这些建议？`);
    }

    /**
     * 显示预览
     */
    showPreview() {
        if (!imageProcessor.hasImages()) {
            this.showError('请先上传图片');
            return;
        }

        this.showLoading('正在生成预览...');

        try {
            const previewCanvas = imageProcessor.getMergePreview();
            if (previewCanvas) {
                this.elements.previewCanvas.width = previewCanvas.width;
                this.elements.previewCanvas.height = previewCanvas.height;
                
                const ctx = this.elements.previewCanvas.getContext('2d');
                ctx.drawImage(previewCanvas, 0, 0);
                
                this.elements.finalPreview.style.display = 'block';
                this.state.isPreviewMode = true;
                
                // 滚动到预览区域
                this.elements.finalPreview.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('预览生成失败:', error);
            this.showError('预览生成失败: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 下载图片
     */
    async downloadImage() {
        if (!imageProcessor.hasImages()) {
            this.showError('请先上传图片');
            return;
        }

        this.showLoading('正在生成图片...');

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `merged-screenshots-${timestamp}.png`;
            
            await imageProcessor.downloadMergedImage(filename);
            this.showMessage('图片下载成功');
        } catch (error) {
            console.error('下载失败:', error);
            this.showError('下载失败: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 更新UI状态
     */
    updateUI() {
        const hasImages = imageProcessor.hasImages();
        
        // 更新按钮状态
        this.elements.previewBtn.disabled = !hasImages;
        this.elements.downloadBtn.disabled = !hasImages;
        this.elements.applySmartMerge.disabled = !hasImages;
        
        if (this.elements.mobilePreview) this.elements.mobilePreview.disabled = !hasImages;
        if (this.elements.mobileDownload) this.elements.mobileDownload.disabled = !hasImages;
        
        // 显示/隐藏编辑工具
        this.showEditTools();
        
        // 如果没有图片，隐藏预览
        if (!hasImages) {
            this.elements.finalPreview.style.display = 'none';
            this.state.isPreviewMode = false;
        }
    }

    /**
     * 显示加载指示器
     */
    showLoading(message = '处理中...') {
        const overlay = this.elements.loadingOverlay;
        const text = overlay.querySelector('p');
        if (text) text.textContent = message;
        overlay.style.display = 'flex';
    }

    /**
     * 隐藏加载指示器
     */
    hideLoading() {
        this.elements.loadingOverlay.style.display = 'none';
    }

    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        // 简化版本，实际项目中可以实现 toast 组件
        console.log(`[${type.toUpperCase()}] ${message}`);
        if (type === 'info') {
            // 可以在这里添加成功提示的UI
        }
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        this.showMessage(message, 'error');
        alert(`错误: ${message}`); // 简化版本
    }

    /**
     * 销毁控制器
     */
    destroy() {
        // 移除所有事件监听器
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }
}

// 导出类和单例实例
window.UIController = UIController;
window.uiController = new UIController();