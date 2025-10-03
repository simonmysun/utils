/**
 * 主应用入口 - 初始化所有模块并启动应用
 */
class App {
    constructor() {
        this.initialized = false;
        this.version = '1.0.0';
    }

    /**
     * 初始化应用
     */
    async init() {
        if (this.initialized) {
            console.warn('应用已经初始化');
            return;
        }

        try {
            console.log(`截图合并工具 v${this.version} 正在启动...`);

            // 检查浏览器兼容性
            this.checkBrowserSupport();

            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // 初始化各个模块
            await this.initializeModules();

            // 设置全局错误处理
            this.setupErrorHandling();

            // 设置应用状态监听
            this.setupStateHandling();

            this.initialized = true;
            console.log('应用初始化完成');

            // 发送初始化完成事件
            this.dispatchEvent('app:initialized');

        } catch (error) {
            console.error('应用初始化失败:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * 检查浏览器兼容性
     */
    checkBrowserSupport() {
        const requiredFeatures = [
            'Promise',
            'fetch',
            'FileReader',
            'URL',
            'Canvas'
        ];

        const missingFeatures = requiredFeatures.filter(feature => {
            switch (feature) {
                case 'Promise':
                    return typeof Promise === 'undefined';
                case 'fetch':
                    return typeof fetch === 'undefined';
                case 'FileReader':
                    return typeof FileReader === 'undefined';
                case 'URL':
                    return typeof URL === 'undefined';
                case 'Canvas':
                    return !document.createElement('canvas').getContext;
                default:
                    return false;
            }
        });

        if (missingFeatures.length > 0) {
            throw new Error(`浏览器不支持以下功能: ${missingFeatures.join(', ')}`);
        }

        // 检查关键API
        if (!window.HTMLCanvasElement || !window.CanvasRenderingContext2D) {
            throw new Error('浏览器不支持Canvas API');
        }

        if (!window.File || !window.FileList || !window.Blob) {
            throw new Error('浏览器不支持File API');
        }
    }

    /**
     * 初始化各个模块
     */
    async initializeModules() {
        console.log('初始化核心模块...');

        // 检查模块是否已加载
        const requiredModules = [
            'ImageLoader',
            'ImageProcessor', 
            'SmartMerger',
            'UIController'
        ];

        for (const moduleName of requiredModules) {
            if (typeof window[moduleName] === 'undefined') {
                throw new Error(`模块 ${moduleName} 未加载`);
            }
        }

        // 初始化UI控制器
        console.log('初始化UI控制器...');
        uiController.init();

        // 设置模块间的通信
        this.setupModuleCommunication();

        console.log('所有模块初始化完成');
    }

    /**
     * 设置模块间通信
     */
    setupModuleCommunication() {
        // 图片处理器状态变化监听
        const originalSelectImage = imageProcessor.selectImage.bind(imageProcessor);
        imageProcessor.selectImage = (index) => {
            originalSelectImage(index);
            this.dispatchEvent('image:selected', { index });
        };

        const originalAddImage = imageProcessor.addImage.bind(imageProcessor);
        imageProcessor.addImage = (imageData) => {
            const result = originalAddImage(imageData);
            this.dispatchEvent('image:added', { imageData, index: result });
            return result;
        };

        const originalRemoveImage = imageProcessor.removeImage.bind(imageProcessor);
        imageProcessor.removeImage = (index) => {
            originalRemoveImage(index);
            this.dispatchEvent('image:removed', { index });
        };

        // 监听自定义事件
        this.addEventListener('image:selected', (e) => {
            console.log('图片已选择:', e.detail.index);
        });

        this.addEventListener('image:added', (e) => {
            console.log('图片已添加:', e.detail.imageData.name);
        });

        this.addEventListener('image:removed', (e) => {
            console.log('图片已删除:', e.detail.index);
        });
    }

    /**
     * 设置错误处理
     */
    setupErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            this.handleError(event.error, '脚本执行错误');
        });

        // Promise错误处理
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise错误:', event.reason);
            this.handleError(event.reason, 'Promise执行错误');
            event.preventDefault();
        });

        // Canvas错误处理
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(...args) {
            try {
                return originalGetContext.apply(this, args);
            } catch (error) {
                console.error('Canvas上下文获取失败:', error);
                app.handleError(error, 'Canvas操作错误');
                return null;
            }
        };
    }

    /**
     * 设置应用状态处理
     */
    setupStateHandling() {
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('页面隐藏');
                this.dispatchEvent('app:hidden');
            } else {
                console.log('页面显示');
                this.dispatchEvent('app:visible');
            }
        });

        // 页面卸载前清理
        window.addEventListener('beforeunload', (event) => {
            this.cleanup();
        });

        // 在线状态变化
        window.addEventListener('online', () => {
            console.log('网络连接恢复');
            this.dispatchEvent('app:online');
        });

        window.addEventListener('offline', () => {
            console.log('网络连接断开');
            this.dispatchEvent('app:offline');
        });
    }

    /**
     * 处理错误
     */
    handleError(error, context = '未知错误') {
        const errorInfo = {
            message: error.message || error.toString(),
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // 记录错误信息
        console.error('应用错误:', errorInfo);

        // 发送错误事件
        this.dispatchEvent('app:error', errorInfo);

        // 用户友好的错误提示
        if (uiController && typeof uiController.showError === 'function') {
            let userMessage = '操作失败，请重试';
            
            if (error.message) {
                if (error.message.includes('网络') || error.message.includes('fetch')) {
                    userMessage = '网络连接错误，请检查网络设置';
                } else if (error.message.includes('内存') || error.message.includes('memory')) {
                    userMessage = '内存不足，请关闭其他标签页重试';
                } else if (error.message.includes('文件') || error.message.includes('file')) {
                    userMessage = '文件处理失败，请检查文件格式';
                }
            }
            
            uiController.showError(userMessage);
        }
    }

    /**
     * 处理初始化错误
     */
    handleInitializationError(error) {
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 2rem;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: #f8f9fa;
                color: #333;
            ">
                <h1 style="color: #e74c3c; margin-bottom: 1rem;">应用启动失败</h1>
                <p style="margin-bottom: 1rem; max-width: 500px;">${error.message}</p>
                <p style="font-size: 0.875rem; color: #6c757d; margin-bottom: 2rem;">
                    请尝试刷新页面或使用现代浏览器（Chrome、Firefox、Safari、Edge）
                </p>
                <button onclick="window.location.reload()" style="
                    padding: 0.75rem 1.5rem;
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    font-size: 1rem;
                ">
                    刷新页面
                </button>
            </div>
        `;
    }

    /**
     * 添加事件监听器
     */
    addEventListener(eventType, handler) {
        document.addEventListener(eventType, handler);
    }

    /**
     * 触发自定义事件
     */
    dispatchEvent(eventType, detail = null) {
        const event = new CustomEvent(eventType, { detail });
        document.dispatchEvent(event);
    }

    /**
     * 获取应用信息
     */
    getInfo() {
        return {
            version: this.version,
            initialized: this.initialized,
            imageCount: imageProcessor ? imageProcessor.getImageCount() : 0,
            direction: imageProcessor ? imageProcessor.direction : 'vertical',
            browserInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            },
            performance: this.getPerformanceInfo()
        };
    }

    /**
     * 获取性能信息
     */
    getPerformanceInfo() {
        if (!window.performance) return null;

        return {
            memory: window.performance.memory ? {
                used: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                total: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
                limit: Math.round(window.performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
            } : null,
            timing: window.performance.timing ? {
                loadTime: window.performance.timing.loadEventEnd - window.performance.timing.navigationStart + 'ms',
                domReady: window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart + 'ms'
            } : null
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        console.log('清理应用资源...');

        try {
            // 清理图片加载器
            if (imageLoader) {
                imageLoader.clear();
            }

            // 清理图片处理器
            if (imageProcessor) {
                imageProcessor.clear();
            }

            // 清理智能合并器
            if (smartMerger) {
                smartMerger.clearCache();
            }

            // 清理UI控制器
            if (uiController && typeof uiController.destroy === 'function') {
                uiController.destroy();
            }

            console.log('资源清理完成');
        } catch (error) {
            console.error('资源清理失败:', error);
        }
    }

    /**
     * 重启应用
     */
    async restart() {
        console.log('重启应用...');
        this.cleanup();
        this.initialized = false;
        await this.init();
    }
}

// 创建并启动应用
const app = new App();

// 自动启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// 导出到全局
window.app = app;