import { render } from 'solid-js/web';
import { createSignal, Show } from 'solid-js';
import { browser } from 'wxt/browser';
import {
  initFrameAnalyzer,
  getMainVideo,
  checkEndingByFrame,
  resetFrameAnalyzer,
  updateAnalyzerConfig,
  destroyFrameAnalyzer,
} from '../utils/frameAnalyzer';

export default defineContentScript({
  matches: ['*://*.bilibili.com/video/*'],
  cssInjectionMode: 'manual',

  async main(ctx) {
    // --- 1. 响应式状态与信号 ---
    const [config, setConfig] = createSignal({ skipStart: 0, skipEnd: 0, jumpEnd: 0 });
    const [isCollectionPage, setIsCollectionPage] = createSignal(false);
    const [mode, setMode] = createSignal<'auto' | 'manual'>('auto');
    const [isAnalyzing, setIsAnalyzing] = createSignal(false);
    const [threshold, setThreshold] = createSignal(85);

    let lastUrl = location.href;
    let lastJumpTime = 0;
    let disposeUI: (() => void) | null = null;

    // --- 2. 逻辑函数封装 ---

    // 配置更新与解析
    const updateConfig = (data: any) => {
      const getSeconds = (h: any, m: any, s: any) =>
        Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);

      const s = data.skipStart ?? getSeconds(data.sH, data.sM, data.sS);
      const m = data.skipEnd ?? getSeconds(data.mH, data.mM, data.mS);
      const e = data.jumpEnd ?? getSeconds(data.eH, data.eM, data.eS);

      setConfig({ skipStart: s, skipEnd: m, jumpEnd: e });

      if (data.frameThreshold !== undefined) {
        setThreshold(data.frameThreshold);
        // 同步阈值到帧分析器
        updateAnalyzerConfig({
          endingPercentThreshold: data.frameThreshold,
          // 为了保持旧版行为（只看进度百分比），禁用剩余时间限制
          minRemainingSeconds: 999999,
        });
      }
    };

    // UI 挂载逻辑 (防抖并确保只存在一个实例)
    const mountUI = () => {
      const anchor = document.getElementById('viewbox_report') ||
        document.querySelector('.video-info-title') ||
        document.querySelector('.cl-info-title');
      if (!anchor) return;

      // 如果 UI 已存在则跳过，避免重复挂载导致的闪烁
      if (document.getElementById('bili-skip-wrapper-unique')) return;

      const mountPoint = document.createElement('span');
      mountPoint.id = 'bili-skip-wrapper-unique';
      anchor.appendChild(mountPoint);

      const format = (s: number) => {
        const min = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
      };

      disposeUI = render(() => (
        <Show when={isCollectionPage()}>
          <div style={{
            display: 'inline-flex', "align-items": 'center', gap: '10px',
            padding: '2px 10px', background: '#fb7299', color: 'white',
            "border-radius": '6px', "font-size": '12px', "margin-left": '12px',
            "vertical-align": 'middle', "font-family": 'sans-serif', "line-height": '1.4'
          }}>
            <span>⏭ {format(config().skipStart)}-{format(config().skipEnd)}</span>
            <span style={{ opacity: 0.5 }}>|</span>
            <span>🏁 {mode() === 'manual' ? `切集: ${format(config().jumpEnd)}` : `自动(${threshold()}%) ${isAnalyzing() ? '分析中...' : '待机'}`}</span>
          </div>
        </Show>
      ), mountPoint);
    };

    // 跳转执行器
    const executeJump = () => {
      const now = Date.now();
      // 3秒内禁止重复点击，防止 B 站连跳两集
      if (now - lastJumpTime < 3000) return;

      const nextBtn = document.querySelector('.bpx-player-ctrl-next') as HTMLElement;
      if (nextBtn) {
        lastJumpTime = now;
        nextBtn.click();
        resetFrameAnalyzer();
      }
    };

    // 每秒执行的核心控制逻辑
    const runControlLogic = () => {
      const video = getMainVideo();
      // 检查视频是否有效且已准备就绪 (readyState >= 2 表示元数据已加载)
      if (!video || video.readyState < 2) {
        if (isAnalyzing()) setIsAnalyzing(false);
        return;
      }

      // 实时检测是否为合集/多 P 页面
      const isCol = !!(document.querySelector('.video-pod') ||
        document.querySelector('.multi-page') ||
        document.querySelector('.cur-list'));
      if (isCol !== isCollectionPage()) setIsCollectionPage(isCol);
      if (!isCol) return;

      const cur = video.currentTime;
      const { skipStart, skipEnd, jumpEnd } = config();

      // A. 跳过片头
      if (skipEnd > 0 && cur >= skipStart && cur < skipEnd) {
        video.currentTime = skipEnd;
        return;
      }

      // B. 跳过片尾逻辑
      if (mode() === 'manual') {
        if (jumpEnd > 0 && cur >= jumpEnd) executeJump();
      } else {
        const progress = (cur / video.duration) * 100;
        // 只有在接近末尾时才启动昂贵的 Canvas 帧分析
        if (progress >= threshold()) {
          setIsAnalyzing(true);
          // 传入 customEndingPercent 以保持与 UI 显示的一致性
          if (checkEndingByFrame(video, !video.paused, threshold())) {
            executeJump();
            setIsAnalyzing(false);
          }
        } else if (isAnalyzing()) {
          setIsAnalyzing(false);
        }
      }
    };

    // 消息监听器：接收来自 Options 页面的配置实时更新
    const handleMessage = (msg: any) => {
      if (msg.type === 'UPDATE_CONFIG') updateConfig(msg);
      if (msg.type === 'SET_MODE') setMode(msg.mode);
      mountUI();
    };

    // --- 3. 初始化与主循环 ---

    // 初始加载存储的数据
    const stored = await browser.storage.local.get([
      'sH', 'sM', 'sS', 'mH', 'mM', 'mS', 'eH', 'eM', 'eS',
      'mode', 'frameThreshold'
    ]);

    const initialThreshold = (stored.frameThreshold as number) ?? 85;
    setMode(stored.mode === 'manual' ? 'manual' : 'auto');
    setThreshold(initialThreshold);

    // 初始化帧分析器，同步初始阈值，并禁用剩余时间限制以保持旧版行为
    initFrameAnalyzer({
      endingPercentThreshold: initialThreshold,
      minRemainingSeconds: 999999,
    });

    // 补全 updateConfig 中未包含的初始配置（因为 updateConfig 会处理 frameThreshold 同步）
    // 但 updateConfig 中也会调用 setThreshold，所以这里直接调用一次 updateConfig 即可
    updateConfig(stored);

    // 设置主定时器：处理 URL 变化、UI 补全和视频逻辑
    const mainTimer = setInterval(() => {
      // 处理单页应用跳转
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        lastJumpTime = 0; // 重置跳转限制
        resetFrameAnalyzer();
        setTimeout(mountUI, 1000); // 延迟挂载以等待 DOM 渲染
      }

      // 如果 UI 被 B 站脚本移除，则重新挂载
      mountUI();

      // 执行视频跳转逻辑
      runControlLogic();
    }, 1000);

    browser.runtime.onMessage.addListener(handleMessage);

    // --- 4. 销毁逻辑 (防止内存泄漏) ---
    ctx.onInvalidated(() => {
      clearInterval(mainTimer);
      browser.runtime.onMessage.removeListener(handleMessage);
      disposeUI?.();
      document.getElementById('bili-skip-wrapper-unique')?.remove();
      destroyFrameAnalyzer(); // 释放 Canvas 及双缓冲区内存
    });
  },
});