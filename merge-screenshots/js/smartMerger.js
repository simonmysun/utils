/**
 * 智能合并器 - 负责图片的智能分析和自动合并建议
 */
class SmartMerger {
    constructor() {
        this.analysisCache = new Map(); // 缓存分析结果
        this.similarityThreshold = 0.8; // 相似度阈值
        this.edgeDetectionThreshold = 0.3; // 边缘检测阈值
    }

    /**
     * 分析图片序列，提供智能合并建议
     * @param {Array} images - 图片数组
     * @returns {Promise<object>} 分析结果和建议
     */
    async analyzeImages(images) {
        if (images.length < 2) {
            return {
                suggestions: [],
                headerRepeat: null,
                footerRepeat: null
            };
        }

        const analysis = {
            suggestions: [],
            headerRepeat: null,
            footerRepeat: null
        };

        try {
            // 分析重复的头部和底部内容
            analysis.headerRepeat = await this._detectRepeatingHeader(images);
            analysis.footerRepeat = await this._detectRepeatingFooter(images);

            // 生成合并建议
            analysis.suggestions = this._generateSuggestions(analysis);

        } catch (error) {
            console.error('智能分析失败:', error);
        }

        return analysis;
    }

    /**
     * 检测重复的头部内容
     * @param {Array} images - 图片数组
     * @returns {Promise<object|null>} 头部重复信息
     */
    async _detectRepeatingHeader(images) {
        if (images.length < 2) return null;

        try {
            const headerHeight = Math.min(100, Math.floor(images[0].height * 0.2)); // 分析前20%或100px
            const comparisons = [];

            // 比较相邻图片的头部区域
            for (let i = 0; i < images.length - 1; i++) {
                const similarity = await this._compareImageRegions(
                    images[i], 
                    images[i + 1],
                    0, 0, images[i].width, headerHeight, // 第一张图片的头部
                    0, 0, images[i + 1].width, headerHeight // 第二张图片的头部
                );
                
                comparisons.push({
                    pair: [i, i + 1],
                    similarity,
                    region: { x: 0, y: 0, width: images[i].width, height: headerHeight }
                });
            }

            // 寻找高相似度的头部区域
            const highSimilarityPairs = comparisons.filter(c => c.similarity > this.similarityThreshold);
            
            if (highSimilarityPairs.length > images.length * 0.5) {
                // 计算平均相似度和建议的裁剪高度
                const avgSimilarity = highSimilarityPairs.reduce((sum, c) => sum + c.similarity, 0) / highSimilarityPairs.length;
                
                return {
                    detected: true,
                    similarity: avgSimilarity,
                    suggestedCropHeight: headerHeight,
                    affectedImages: Array.from({length: images.length}, (_, i) => i).slice(1), // 除第一张外都需要裁剪头部
                    confidence: avgSimilarity
                };
            }
        } catch (error) {
            console.error('头部检测失败:', error);
        }

        return null;
    }

    /**
     * 检测重复的底部内容
     * @param {Array} images - 图片数组
     * @returns {Promise<object|null>} 底部重复信息
     */
    async _detectRepeatingFooter(images) {
        if (images.length < 2) return null;

        try {
            const footerHeight = Math.min(100, Math.floor(images[0].height * 0.2));
            const comparisons = [];

            for (let i = 0; i < images.length - 1; i++) {
                const img1 = images[i];
                const img2 = images[i + 1];
                
                const similarity = await this._compareImageRegions(
                    img1, img2,
                    0, img1.height - footerHeight, img1.width, footerHeight,
                    0, img2.height - footerHeight, img2.width, footerHeight
                );
                
                comparisons.push({
                    pair: [i, i + 1],
                    similarity,
                    region: { x: 0, y: img1.height - footerHeight, width: img1.width, height: footerHeight }
                });
            }

            const highSimilarityPairs = comparisons.filter(c => c.similarity > this.similarityThreshold);
            
            if (highSimilarityPairs.length > images.length * 0.5) {
                const avgSimilarity = highSimilarityPairs.reduce((sum, c) => sum + c.similarity, 0) / highSimilarityPairs.length;
                
                return {
                    detected: true,
                    similarity: avgSimilarity,
                    suggestedCropHeight: footerHeight,
                    affectedImages: Array.from({length: images.length}, (_, i) => i).slice(0, -1), // 除最后一张外都需要裁剪底部
                    confidence: avgSimilarity
                };
            }
        } catch (error) {
            console.error('底部检测失败:', error);
        }

        return null;
    }

    /**
     * 比较两个图片区域的相似度
     * @param {object} img1 - 第一张图片
     * @param {object} img2 - 第二张图片
     * @param {number} x1, y1, w1, h1 - 第一张图片的区域
     * @param {number} x2, y2, w2, h2 - 第二张图片的区域
     * @returns {Promise<number>} 相似度 (0-1)
     */
    async _compareImageRegions(img1, img2, x1, y1, w1, h1, x2, y2, w2, h2) {
        try {
            // 创建临时canvas来提取区域
            const canvas1 = document.createElement('canvas');
            const canvas2 = document.createElement('canvas');
            const ctx1 = canvas1.getContext('2d');
            const ctx2 = canvas2.getContext('2d');

            // 统一尺寸用于比较
            const compareWidth = Math.min(w1, w2);
            const compareHeight = Math.min(h1, h2);

            canvas1.width = canvas2.width = compareWidth;
            canvas1.height = canvas2.height = compareHeight;

            // 绘制要比较的区域
            ctx1.drawImage(img1.element, x1, y1, w1, h1, 0, 0, compareWidth, compareHeight);
            ctx2.drawImage(img2.element, x2, y2, w2, h2, 0, 0, compareWidth, compareHeight);

            // 获取像素数据
            const imageData1 = ctx1.getImageData(0, 0, compareWidth, compareHeight);
            const imageData2 = ctx2.getImageData(0, 0, compareWidth, compareHeight);

            // 计算相似度 (简化的结构相似性)
            return this._calculateImageSimilarity(imageData1, imageData2);
        } catch (error) {
            console.error('图片区域比较失败:', error);
            return 0;
        }
    }

    /**
     * 计算图片相似度
     * @param {ImageData} imageData1 - 第一张图片数据
     * @param {ImageData} imageData2 - 第二张图片数据
     * @returns {number} 相似度 (0-1)
     */
    _calculateImageSimilarity(imageData1, imageData2) {
        const data1 = imageData1.data;
        const data2 = imageData2.data;
        
        if (data1.length !== data2.length) {
            return 0;
        }

        let totalDiff = 0;
        const pixelCount = data1.length / 4;

        // 计算灰度差异
        for (let i = 0; i < data1.length; i += 4) {
            const gray1 = (data1[i] + data1[i + 1] + data1[i + 2]) / 3;
            const gray2 = (data2[i] + data2[i + 1] + data2[i + 2]) / 3;
            totalDiff += Math.abs(gray1 - gray2);
        }

        const avgDiff = totalDiff / pixelCount;
        const similarity = Math.max(0, 1 - (avgDiff / 255));
        
        return similarity;
    }

    /**
     * 生成智能合并建议
     * @param {object} analysis - 分析结果
     * @returns {Array} 建议列表
     */
    _generateSuggestions(analysis) {
        const suggestions = [];

        if (analysis.headerRepeat && analysis.headerRepeat.detected) {
            suggestions.push({
                type: 'header_removal',
                title: '检测到重复的头部内容',
                description: `建议移除${analysis.headerRepeat.affectedImages.length}张图片的头部${analysis.headerRepeat.suggestedCropHeight}像素`,
                confidence: analysis.headerRepeat.confidence,
                action: {
                    type: 'crop',
                    targets: analysis.headerRepeat.affectedImages,
                    cropData: { top: analysis.headerRepeat.suggestedCropHeight }
                }
            });
        }

        if (analysis.footerRepeat && analysis.footerRepeat.detected) {
            suggestions.push({
                type: 'footer_removal',
                title: '检测到重复的底部内容',
                description: `建议移除${analysis.footerRepeat.affectedImages.length}张图片的底部${analysis.footerRepeat.suggestedCropHeight}像素`,
                confidence: analysis.footerRepeat.confidence,
                action: {
                    type: 'crop',
                    targets: analysis.footerRepeat.affectedImages,
                    cropData: { bottom: analysis.footerRepeat.suggestedCropHeight }
                }
            });
        }

        return suggestions;
    }

    /**
     * 应用智能建议
     * @param {Array} suggestions - 建议列表
     * @param {ImageProcessor} processor - 图片处理器实例
     * @returns {Promise<object>} 应用结果
     */
    async applySuggestions(suggestions, processor) {
        const results = {
            applied: [],
            failed: [],
            summary: {}
        };

        try {
            for (const suggestion of suggestions) {
                try {
                    await this._applySingleSuggestion(suggestion, processor);
                    results.applied.push(suggestion);
                } catch (error) {
                    console.error(`应用建议失败:`, error);
                    results.failed.push({
                        suggestion,
                        error: error.message
                    });
                }
            }

            results.summary = {
                total: suggestions.length,
                applied: results.applied.length,
                failed: results.failed.length
            };

        } catch (error) {
            console.error('批量应用建议失败:', error);
        }

        return results;
    }

    /**
     * 应用单个建议
     * @param {object} suggestion - 建议
     * @param {ImageProcessor} processor - 图片处理器实例
     */
    async _applySingleSuggestion(suggestion, processor) {
        const { action } = suggestion;

        switch (action.type) {
            case 'crop':
                for (const imageIndex of action.targets) {
                    const currentCrop = processor.images[imageIndex]?.cropData || { top: 0, bottom: 0, left: 0, right: 0 };
                    const newCrop = { ...currentCrop, ...action.cropData };
                    processor.updateImageCrop(imageIndex, newCrop);
                }
                break;

            default:
                throw new Error(`未知的建议类型: ${action.type}`);
        }
    }

    /**
     * 清除分析缓存
     */
    clearCache() {
        this.analysisCache.clear();
    }

    /**
     * 设置相似度阈值
     * @param {number} threshold - 阈值 (0-1)
     */
    setSimilarityThreshold(threshold) {
        if (threshold >= 0 && threshold <= 1) {
            this.similarityThreshold = threshold;
        }
    }
}

// 导出类和单例实例
window.SmartMerger = SmartMerger;
window.smartMerger = new SmartMerger();