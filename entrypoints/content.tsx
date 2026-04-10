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

    // --- 2. 核心辅助函数 ---

    // 配置解析 (秒数转换)
    const updateConfig = (data: any) => {
      const getSeconds = (h: any, m: any, s: any) =>
        Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);

      const s = getSeconds(data.sH, data.sM, data.sS);
      const m = getSeconds(data.mH, data.mM, data.mS);
      const e = getSeconds(data.eH, data.eM, data.eS);

      setConfig({ skipStart: s, skipEnd: m, jumpEnd: e });

      if (data.frameThreshold !== undefined) {
        setThreshold(data.frameThreshold);
        updateAnalyzerConfig({
          endingPercentThreshold: data.frameThreshold,
          minRemainingSeconds: 999999, // 禁用剩余时间限制
        });
      }
    };

    // UI 挂载
    const mountUI = () => {
      // 只有是合集页才挂载
      if (!isCollectionPage()) return;

      const anchor = document.getElementById('viewbox_report') ||
        document.querySelector('.video-info-title') ||
        document.querySelector('.cl-info-title');

      if (!anchor || document.getElementById('bili-skip-wrapper-unique')) return;

      const mountPoint = document.createElement('span');
      mountPoint.id = 'bili-skip-wrapper-unique';
      anchor.appendChild(mountPoint);

      const format = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${h}:${pad(m)}:${pad(sec)}`;
      };

      disposeUI = render(() => (
        <Show when={isCollectionPage()}>
          <div style={{
            display: 'inline-flex', "align-items": 'center', gap: '10px',
            padding: '2px 10px', background: '#fb7299', color: 'white',
            "border-radius": '6px', "font-size": '12px', "margin-left": '12px',
            "vertical-align": 'middle', "font-family": 'sans-serif'
          }}>
            <span>⏭ {format(config().skipStart)}-{format(config().skipEnd)}</span>
            <span style={{ opacity: 0.5 }}>|</span>
            <span>🏁 {mode() === 'manual' ? `切集: ${format(config().jumpEnd)}` : `自动(${threshold()}%) ${isAnalyzing() ? '分析中...' : '待机'}`}</span>
          </div>
        </Show>
      ), mountPoint);
    };

    // 跳转执行
    const executeJump = () => {
      const now = Date.now();
      if (now - lastJumpTime < 3000) return;

      const nextBtn = document.querySelector('.bpx-player-ctrl-next') as HTMLElement;
      if (nextBtn) {
        lastJumpTime = now;
        nextBtn.click();
        resetFrameAnalyzer();
      }
    };

    // 控制逻辑
    const runControlLogic = () => {
      const video = getMainVideo();
      if (!video || video.readyState < 2) {
        if (isAnalyzing()) setIsAnalyzing(false);
        return;
      }

      const cur = video.currentTime;
      const { skipStart, skipEnd, jumpEnd } = config();

      // A. 跳过片头
      if (skipEnd > 0 && cur >= skipStart && cur < skipEnd) {
        video.currentTime = skipEnd;
        return;
      }

      // B. 跳过片尾
      if (mode() === 'manual') {
        if (jumpEnd > 0 && cur >= jumpEnd) executeJump();
      } else {
        const progress = (cur / video.duration) * 100;
        if (progress >= threshold()) {
          setIsAnalyzing(true);
          if (checkEndingByFrame(video, !video.paused, threshold())) {
            executeJump();
            setIsAnalyzing(false);
          }
        } else if (isAnalyzing()) {
          setIsAnalyzing(false);
        }
      }
    };

    // --- 3. 初始化与主监听 ---

    // 初始加载
    const stored = await browser.storage.local.get([
      'sH', 'sM', 'sS', 'mH', 'mM', 'mS', 'eH', 'eM', 'eS',
      'mode', 'frameThreshold'
    ]);
    const initialThreshold = (stored.frameThreshold as number) ?? 85;
    setMode(stored.mode === 'manual' ? 'manual' : 'auto');
    updateConfig(stored);
    initFrameAnalyzer({ endingPercentThreshold: initialThreshold, minRemainingSeconds: 999999 });

    // 消息监听 (来自 Popup/Options)
    const handleMessage = (msg: any, sender: any, sendResponse: any) => {
      if (msg.type === 'UPDATE_CONFIG' || msg.type === 'CONFIG_UPDATED') updateConfig(msg.data || msg);
      if (msg.type === 'SET_MODE') setMode(msg.mode);
      if (msg.type === 'QUERY_READY_STATUS') {
        sendResponse({ isCollection: isCollectionPage() });
      }
      mountUI();
    };
    browser.runtime.onMessage.addListener(handleMessage);

    // --- 4. 主循环 (带哨兵检测) ---
    const mainTimer = setInterval(() => {
      // [哨兵检测]：不在合集页直接跳过后续所有逻辑
      const isCol = !!(document.querySelector('.video-pod') ||
        document.querySelector('.multi-page') ||
        document.querySelector('.cur-list'));

      if (isCol !== isCollectionPage()) 
        {
          setIsCollectionPage(isCol)
        browser.runtime.sendMessage({ type: 'SYNC_PAGE_READY', isCollection: isCol }).catch(() => { });
        };

      if (!isCol) {
        // 如果从合集跳到了非合集，清理 UI
        const ui = document.getElementById('bili-skip-wrapper-unique');
        if (ui) ui.remove();
        return;
      }

      // 处理单页地址变换
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        lastJumpTime = 0;
        resetFrameAnalyzer();
        setTimeout(mountUI, 1000);
      }

      mountUI();
      runControlLogic();
    }, 1000);

    // --- 5. 销毁逻辑 ---
    ctx.onInvalidated(() => {
      clearInterval(mainTimer);
      browser.runtime.onMessage.removeListener(handleMessage);
      disposeUI?.();
      document.getElementById('bili-skip-wrapper-unique')?.remove();
      destroyFrameAnalyzer();
    });
  },
});