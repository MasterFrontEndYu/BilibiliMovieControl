// utils/frameAnalyzer.ts

/**
 * 帧分析器配置
 */
interface AnalyzerConfig {
    // 采样区域尺寸（固定压缩至此分辨率分析）
    sampleWidth: number;
    sampleHeight: number;
    // 黑屏判定：平均亮度阈值 (0-255)
    blackLuminanceThreshold: number;
    // 静态帧判定：像素差异阈值 (0-255)
    staticPixelDiffThreshold: number;
    // 静态帧比例阈值 (0-1)，低于此比例视为静态
    staticDiffRatioThreshold: number;
    // 连续判定次数（假设每秒检测一次，则次数即为秒数）
    blackFrameRequired: number;
    staticFrameRequired: number;
    // 片尾触发区域：视频剩余时间小于此值（秒）才进行判定
    minRemainingSeconds: number;
    // 触发区域百分比（倒数百分之几内），与剩余时间同时满足才判定
    endingPercentThreshold: number;
}

const DEFAULT_CONFIG: AnalyzerConfig = {
    sampleWidth: 200,
    sampleHeight: 200,
    blackLuminanceThreshold: 30,
    staticPixelDiffThreshold: 15,
    staticDiffRatioThreshold: 0.05,
    blackFrameRequired: 3,
    staticFrameRequired: 8,
    minRemainingSeconds: 60,
    endingPercentThreshold: 10, // 最后 10%
};

// 全局状态
let frameCanvas: HTMLCanvasElement | null = null;
let frameCtx: CanvasRenderingContext2D | null = null;

// 双缓冲区，避免频繁创建 Uint8ClampedArray
let previousBuffer: Uint8ClampedArray | null = null;
let currentBuffer: Uint8ClampedArray | null = null;

let blackFrameCount = 0;
let staticFrameCount = 0;

// 当前使用的配置（可外部修改）
let currentConfig: AnalyzerConfig = { ...DEFAULT_CONFIG };

/**
 * 初始化分析器，创建离屏 Canvas 及双缓冲区
 */
export function initFrameAnalyzer(config?: Partial<AnalyzerConfig>): void {
    if (config) {
        currentConfig = { ...DEFAULT_CONFIG, ...config };
    }

    if (frameCanvas) return;

    frameCanvas = document.createElement('canvas');
    frameCanvas.width = currentConfig.sampleWidth;
    frameCanvas.height = currentConfig.sampleHeight;
    frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });

    // 初始化双缓冲区
    const bufferSize = currentConfig.sampleWidth * currentConfig.sampleHeight * 4;
    previousBuffer = new Uint8ClampedArray(bufferSize);
    currentBuffer = new Uint8ClampedArray(bufferSize);

    resetFrameAnalyzer();
}

/**
 * 获取主视频元素（B 站兼容）
 */
export function getMainVideo(): HTMLVideoElement | null {
    return (
        document.querySelector<HTMLVideoElement>('.bpx-player-video video') ||
        document.querySelector<HTMLVideoElement>('#bilibili-player video') ||
        document.querySelector<HTMLVideoElement>('video')
    );
}

/**
 * 检测画中画状态（某些浏览器在 PiP 时 drawImage 可能黑屏）
 */
function isPictureInPictureActive(): boolean {
    return !!document.pictureInPictureElement;
}

/**
 * 黑屏检测：计算采样区域平均亮度
 */
export function isBlackScreen(video: HTMLVideoElement): boolean {
    if (!frameCtx || video.readyState < 2) return false;

    // 绘制压缩后的视频帧
    frameCtx.drawImage(
        video,
        0,
        0,
        currentConfig.sampleWidth,
        currentConfig.sampleHeight
    );
    const imageData = frameCtx.getImageData(
        0,
        0,
        currentConfig.sampleWidth,
        currentConfig.sampleHeight
    );
    const data = imageData.data;

    let totalLuminance = 0;
    const pixelStep = 16; // 每 4 像素采样一次（RGBA 四通道 * 4 = 16）
    let sampledPixels = 0;

    for (let i = 0; i < data.length; i += pixelStep) {
        totalLuminance +=
            0.2126 * data[i] + // R
            0.7152 * data[i + 1] + // G
            0.0722 * data[i + 2]; // B
        sampledPixels++;
    }

    if (sampledPixels === 0) return false;
    const avgLuminance = totalLuminance / sampledPixels;
    return avgLuminance < currentConfig.blackLuminanceThreshold;
}

/**
 * 静态帧检测：对比前后两帧差异比例
 * 使用双缓冲区交换，避免新建数组
 */
export function isStaticFrame(video: HTMLVideoElement): boolean {
    if (!frameCtx || video.readyState < 2) return false;
    if (!previousBuffer || !currentBuffer) return false;

    frameCtx.drawImage(
        video,
        0,
        0,
        currentConfig.sampleWidth,
        currentConfig.sampleHeight
    );
    const imageData = frameCtx.getImageData(
        0,
        0,
        currentConfig.sampleWidth,
        currentConfig.sampleHeight
    );
    const newData = imageData.data;

    // 首次调用，初始化 previousBuffer 并返回 false
    if (blackFrameCount === 0 && staticFrameCount === 0 && previousBuffer[0] === 0) {
        // 简单的未初始化判断：如果缓冲区全零且计数器为零，视为初始状态
        previousBuffer.set(newData);
        return false;
    }

    // 将新数据存入 currentBuffer 以便后续交换
    currentBuffer.set(newData);

    let diffPixels = 0;
    const pixelStep = 16; // 每 4 像素对比一次
    const totalSampledPixels = (currentConfig.sampleWidth * currentConfig.sampleHeight) / 4;

    for (let i = 0; i < currentBuffer.length; i += pixelStep) {
        if (Math.abs(currentBuffer[i] - previousBuffer[i]) > currentConfig.staticPixelDiffThreshold) {
            diffPixels++;
        }
    }

    // 交换缓冲区：previous 指向当前帧，供下一次对比
    const temp = previousBuffer;
    previousBuffer = currentBuffer;
    currentBuffer = temp;

    const diffRatio = diffPixels / totalSampledPixels;
    return diffRatio < currentConfig.staticDiffRatioThreshold;
}

/**
 * 综合判定是否应触发自动切集
 * @param video 视频元素
 * @param isPlaying 外部传入的播放状态（建议使用 video 自身的 paused 属性二次确认）
 * @param customEndingPercent 自定义末尾百分比阈值（覆盖配置）
 */
export function checkEndingByFrame(
    video: HTMLVideoElement,
    isPlaying: boolean,
    customEndingPercent?: number
): boolean {
    // 基本守卫
    if (!video || video.paused) return false;
    if (!isPlaying) return false;

    // 画中画时暂停分析，避免绘制黑帧导致误判
    if (isPictureInPictureActive()) return false;

    // 时长无效（直播、未加载元数据）
    if (!isFinite(video.duration) || video.duration <= 0) return false;

    const endingPercent = customEndingPercent ?? currentConfig.endingPercentThreshold;
    const thresholdRatio = endingPercent / 100;
    const isNearEndByPercent = video.currentTime / video.duration > thresholdRatio;

    const remainingTime = video.duration - video.currentTime;
    const isNearEndByTime = remainingTime < currentConfig.minRemainingSeconds;

    // 同时满足百分比与剩余时间条件才进行分析，减少正片内误判
    if (!isNearEndByPercent || !isNearEndByTime) {
        resetFrameAnalyzer();
        return false;
    }

    // 视频数据未就绪：readyState < 2 时重置，避免脏数据
    if (video.readyState < 2) {
        resetFrameAnalyzer();
        return false;
    }

    const black = isBlackScreen(video);
    const stat = isStaticFrame(video);

    // 独立累计（不再互相清零）
    if (black) {
        blackFrameCount++;
    } else {
        blackFrameCount = 0;
    }

    if (stat) {
        staticFrameCount++;
    } else {
        staticFrameCount = 0;
    }

    // 任一条件满足即触发
    if (blackFrameCount >= currentConfig.blackFrameRequired || staticFrameCount >= currentConfig.staticFrameRequired) {
        console.log(
            `[BiliSkip] 触发自动切集: 黑屏(${blackFrameCount}/${currentConfig.blackFrameRequired}) 静态(${staticFrameCount}/${currentConfig.staticFrameRequired})`
        );
        resetFrameAnalyzer();
        return true;
    }

    return false;
}

/**
 * 重置所有计数器与历史帧数据
 */
export function resetFrameAnalyzer(): void {
    blackFrameCount = 0;
    staticFrameCount = 0;

    if (previousBuffer) {
        // 将缓冲区清零，避免残留数据干扰首次判定
        previousBuffer.fill(0);
    }
    if (currentBuffer) {
        currentBuffer.fill(0);
    }
}

/**
 * 更新配置（运行时调整）
 */
export function updateAnalyzerConfig(config: Partial<AnalyzerConfig>): void {
    currentConfig = { ...currentConfig, ...config };

    // 若采样尺寸变化，需重建 Canvas 与缓冲区
    if (
        config.sampleWidth !== undefined &&
        config.sampleHeight !== undefined &&
        (config.sampleWidth !== currentConfig.sampleWidth || config.sampleHeight !== currentConfig.sampleHeight)
    ) {
        if (frameCanvas) {
            frameCanvas.width = currentConfig.sampleWidth;
            frameCanvas.height = currentConfig.sampleHeight;
        }
        const bufferSize = currentConfig.sampleWidth * currentConfig.sampleHeight * 4;
        previousBuffer = new Uint8ClampedArray(bufferSize);
        currentBuffer = new Uint8ClampedArray(bufferSize);
        resetFrameAnalyzer();
    }
}

/**
 * 销毁分析器，释放资源
 */
export function destroyFrameAnalyzer(): void {
    frameCanvas = null;
    frameCtx = null;
    previousBuffer = null;
    currentBuffer = null;
    resetFrameAnalyzer();
}