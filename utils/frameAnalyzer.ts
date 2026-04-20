// utils/frameAnalyzer.ts

/**
 * 帧分析器配置 - 纯净版
 * 删除了业务层的时间/百分比判定，专注于图像算法
 */
interface AnalyzerConfig {
    sampleWidth: number; // 采样宽度
    sampleHeight: number; // 采样高度
    blackLuminanceThreshold: number; // 黑屏亮度阈值 (0-255)
    staticPixelDiffThreshold: number; // 像素差异阈值 (0-255)
    staticDiffRatioThreshold: number; // 静态帧比例阈值 (0-1)
    blackFrameRequired: number; // 触发所需的连续黑屏帧数
    staticFrameRequired: number; // 触发所需的连续静态帧数
}

const DEFAULT_CONFIG: AnalyzerConfig = {
    sampleWidth: 200,
    sampleHeight: 200,
    blackLuminanceThreshold: 30,
    staticPixelDiffThreshold: 15,
    staticDiffRatioThreshold: 0.05,
    blackFrameRequired: 3, // 约 3 秒
    staticFrameRequired: 8, // 约 8 秒
};

// 内部全局状态
let frameCanvas: HTMLCanvasElement | null = null;
let frameCtx: CanvasRenderingContext2D | null = null;
let previousBuffer: Uint8ClampedArray | null = null;
let currentBuffer: Uint8ClampedArray | null = null;

let blackFrameCount = 0;
let staticFrameCount = 0;

let currentConfig: AnalyzerConfig = { ...DEFAULT_CONFIG };

/**
 * 初始化分析器
 */
export function initFrameAnalyzer(config?: Partial<AnalyzerConfig>): void {
    if (config) {
        currentConfig = { ...DEFAULT_CONFIG, ...config };
    }

    if (frameCanvas) return;

    frameCanvas = document.createElement("canvas");
    frameCanvas.width = currentConfig.sampleWidth;
    frameCanvas.height = currentConfig.sampleHeight;
    frameCtx = frameCanvas.getContext("2d", { willReadFrequently: true });

    const bufferSize =
        currentConfig.sampleWidth * currentConfig.sampleHeight * 4;
    previousBuffer = new Uint8ClampedArray(bufferSize);
    currentBuffer = new Uint8ClampedArray(bufferSize);

    resetFrameAnalyzer();
}

/**
 * 获取 B 站视频元素
 */
export function getMainVideo(): HTMLVideoElement | null {
    return (
        document.querySelector<HTMLVideoElement>(".bpx-player-video video") ||
        document.querySelector<HTMLVideoElement>("#bilibili-player video") ||
        document.querySelector<HTMLVideoElement>("video")
    );
}

/**
 * 画中画检测 (PiP 下抓取的帧通常是黑的，需要避开)
 */
function isPictureInPictureActive(): boolean {
    return !!document.pictureInPictureElement;
}

/**
 * 图像分析：黑屏检测
 */
export function isBlackScreen(video: HTMLVideoElement): boolean {
    if (!frameCtx || video.readyState < 2) return false;

    frameCtx.drawImage(
        video,
        0,
        0,
        currentConfig.sampleWidth,
        currentConfig.sampleHeight,
    );
    const imageData = frameCtx.getImageData(
        0,
        0,
        currentConfig.sampleWidth,
        currentConfig.sampleHeight,
    );
    const data = imageData.data;

    let totalLuminance = 0;
    const pixelStep = 16;
    let sampledPixels = 0;

    for (let i = 0; i < data.length; i += pixelStep) {
        totalLuminance +=
            0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        sampledPixels++;
    }

    return (
        sampledPixels > 0 &&
        totalLuminance / sampledPixels < currentConfig.blackLuminanceThreshold
    );
}

/**
 * 图像分析：静态帧检测 (对比前后两帧)
 */
export function isStaticFrame(video: HTMLVideoElement): boolean {
    if (!frameCtx || video.readyState < 2 || !previousBuffer || !currentBuffer)
        return false;

    frameCtx.drawImage(
        video,
        0,
        0,
        currentConfig.sampleWidth,
        currentConfig.sampleHeight,
    );
    const newData = frameCtx.getImageData(
        0,
        0,
        currentConfig.sampleWidth,
        currentConfig.sampleHeight,
    ).data;

    // 初始帧处理
    if (
        blackFrameCount === 0 &&
        staticFrameCount === 0 &&
        previousBuffer[0] === 0
    ) {
        previousBuffer.set(newData);
        return false;
    }

    currentBuffer.set(newData);
    let diffPixels = 0;
    const pixelStep = 16;
    const totalSampledPixels =
        (currentConfig.sampleWidth * currentConfig.sampleHeight) / 4;

    for (let i = 0; i < currentBuffer.length; i += pixelStep) {
        if (
            Math.abs(currentBuffer[i] - previousBuffer[i]) >
            currentConfig.staticPixelDiffThreshold
        ) {
            diffPixels++;
        }
    }

    previousBuffer.set(currentBuffer);
    return (
        diffPixels / totalSampledPixels < currentConfig.staticDiffRatioThreshold
    );
}

/**
 * 核心判定函数：受控于 Content Script 的时间逻辑
 * @param video 视频元素
 * @param isPlaying 播放状态
 */
export function checkEndingByFrame(
    video: HTMLVideoElement,
    isPlaying: boolean,
): boolean {
    // 1. 基础守卫
    if (!video || video.paused || !isPlaying) return false;
    if (isPictureInPictureActive() || video.readyState < 2) {
        resetFrameAnalyzer();
        return false;
    }

    // 2. 执行图像判定 (不再检查百分比，此处默认已到达分析区域)
    const black = isBlackScreen(video);
    const stat = isStaticFrame(video);

    // 3. 计数器逻辑
    blackFrameCount = black ? blackFrameCount + 1 : 0;
    staticFrameCount = stat ? staticFrameCount + 1 : 0;

    // 4. 触发结果返回
    if (
        blackFrameCount >= currentConfig.blackFrameRequired ||
        staticFrameCount >= currentConfig.staticFrameRequired
    ) {
        console.log(
            `[BiliControl] 帧分析通过: 黑屏(${blackFrameCount}) | 静态(${staticFrameCount})`,
        );
        resetFrameAnalyzer();
        return true;
    }

    return false;
}

/**
 * 重置状态
 */
export function resetFrameAnalyzer(): void {
    blackFrameCount = 0;
    staticFrameCount = 0;
    previousBuffer?.fill(0);
    currentBuffer?.fill(0);
}

/**
 * 运行时动态更新算法敏感度
 */
export function updateAnalyzerConfig(config: Partial<AnalyzerConfig>): void {
    currentConfig = { ...currentConfig, ...config };
}

/**
 * 释放内存
 */
export function destroyFrameAnalyzer(): void {
    frameCanvas = null;
    frameCtx = null;
    previousBuffer = null;
    currentBuffer = null;
    resetFrameAnalyzer();
}
