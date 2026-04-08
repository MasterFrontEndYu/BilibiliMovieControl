// utils/frameAnalyzer.ts

let frameCanvas: HTMLCanvasElement;
let frameCtx: CanvasRenderingContext2D | null;
let previousImageData: Uint8ClampedArray | null = null;
let blackFrameCount = 0;
let staticFrameCount = 0;

// 关键优化：固定采样尺寸，无论原片是 4K 还是 1080P，我们只分析 100x100
const SAMPLE_W = 200;
const SAMPLE_H = 200;

export function initFrameAnalyzer() {
    if (frameCanvas) return;
    frameCanvas = document.createElement('canvas');
    frameCanvas.width = SAMPLE_W;
    frameCanvas.height = SAMPLE_H;
    // willReadFrequently 优化 getImageData 性能
    frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
    resetFrameAnalyzer();
}

export function getMainVideo(): HTMLVideoElement | null {
    return document.querySelector('.bpx-player-video video') ||
        document.querySelector('#bilibili-player video') ||
        document.querySelector('video');
}

/**
 * 检测黑屏：计算 100x100 采样区的平均亮度
 */
export function isBlackScreen(video: HTMLVideoElement, threshold = 30): boolean {
    if (!frameCtx || video.readyState < 2) return false;

    // 将视频压缩绘制到 100x100 区域
    frameCtx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
    const data = frameCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;

    let totalLuminance = 0;
    // 步进采样：每 4 个像素采样一次 (i += 16) 进一步节省 CPU
    for (let i = 0; i < data.length; i += 16) {
        totalLuminance += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    }

    const avgLuminance = totalLuminance / (data.length / 16);
    return avgLuminance < threshold;
}

/**
 * 检测静态帧：对比前后两帧 100x100 采样区的差异
 */
export function isStaticFrame(video: HTMLVideoElement, diffThreshold = 0.05): boolean {
    if (!frameCtx || video.readyState < 2) return false;

    frameCtx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
    const currentData = frameCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;

    if (!previousImageData) {
        previousImageData = new Uint8ClampedArray(currentData);
        return false;
    }

    let diffPixels = 0;
    // 每 4 个像素对比一次
    for (let i = 0; i < currentData.length; i += 16) {
        // 只要 R 通道差异超过 15 就视为像素变动
        if (Math.abs(currentData[i] - previousImageData[i]) > 15) {
            diffPixels++;
        }
    }

    previousImageData.set(currentData);
    const diffRatio = diffPixels / (SAMPLE_W * SAMPLE_H / 4);
    return diffRatio < diffThreshold;
}

/**
 * 综合判定
 */
export function checkEndingByFrame(video: HTMLVideoElement, isPlaying: boolean,
    customThreshold: number = 85): boolean {
    // 基础守卫：只有视频接近末尾（最后 10%）且正在播放且数据就绪时才分析
    const thresholdRatio = customThreshold / 100;
    const isNearEnd = video.currentTime / video.duration > thresholdRatio;
    if (!isPlaying || !isNearEnd || video.readyState < 3) {
        resetFrameAnalyzer();
        return false;
    }

    const black = isBlackScreen(video);
    const stat = isStaticFrame(video);

    // 判定阈值（基于 1s 执行一次的 monitor）
    const BLACK_NEED = 3;    // 持续 3 秒黑屏
    const STATIC_NEED = 8;   // 持续 8 秒画面不动（针对静止的演职员表）

    if (black) {
        blackFrameCount++;
        staticFrameCount = 0; // 黑屏优先级高
    } else {
        blackFrameCount = 0;
        if (stat) {
            staticFrameCount++;
        } else {
            staticFrameCount = 0;
        }
    }

    if (blackFrameCount >= BLACK_NEED || staticFrameCount >= STATIC_NEED) {
        console.log(`[BiliSkip] 触发自动切集: 黑屏(${blackFrameCount}) 静态(${staticFrameCount})`);
        resetFrameAnalyzer();
        return true;
    }
    return false;
}

export function resetFrameAnalyzer() {
    blackFrameCount = 0;
    staticFrameCount = 0;
    previousImageData = null;
}