import { render } from 'solid-js/web';
import { createSignal, Show } from 'solid-js';
import { browser } from 'wxt/browser';
import {
  initFrameAnalyzer,
  getMainVideo,
  checkEndingByFrame,
  resetFrameAnalyzer
} from '../utils/frameAnalyzer';

export default defineContentScript({
  matches: ['*://*.bilibili.com/video/*', '*://*.bilibili.com/bangumi/play/*'],
  cssInjectionMode: 'manual',

  async main(ctx) {
    // --- 1. 初始化分析器 ---
    initFrameAnalyzer();

    const [config, setConfig] = createSignal({ skipStart: 0, skipEnd: 0, jumpEnd: 0 });
    const [isCollectionPage, setIsCollectionPage] = createSignal(false);
    const [mode, setMode] = createSignal<'auto' | 'manual'>('auto');
    const [isAnalyzing, setIsAnalyzing] = createSignal(false);

    // 用于控制帧分析起始点的信号
    const [threshold, setThreshold] = createSignal(85);

    // --- 2. 配置更新函数 (保持原逻辑) ---
    const updateConfig = (data: any) => {
      const getSeconds = (h: any, m: any, s: any) =>
        Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);

      const s = data.skipStart !== undefined ? Number(data.skipStart) : getSeconds(data.sH, data.sM, data.sS);
      const m = data.skipEnd !== undefined ? Number(data.skipEnd) : getSeconds(data.mH, data.mM, data.mS);
      const e = data.jumpEnd !== undefined ? Number(data.jumpEnd) : getSeconds(data.eH, data.eM, data.eS);

      setConfig({ skipStart: s, skipEnd: m, jumpEnd: e });

      // 如果数据里包含新的阈值，同步更新
      if (data.frameThreshold !== undefined) setThreshold(data.frameThreshold);
    };

    // --- 3. 初始加载数据 ---
    const stored = await browser.storage.local.get([
      'sH', 'sM', 'sS', 'mH', 'mM', 'mS', 'eH', 'eM', 'eS',
      'mode', 'frameThreshold'
    ]);

    setMode(stored.mode === 'manual' ? 'manual' : 'auto');
    updateConfig(stored);

    let lastUrl = location.href;
    let disposeUI: (() => void) | null = null;

    // --- 4. UI 挂载逻辑 (保持原样) ---
    const mountUI = () => {
      const existing = document.getElementById('bili-skip-wrapper-unique');
      if (existing) { disposeUI?.(); existing.remove(); }

      const anchor = document.getElementById('viewbox_report') || document.querySelector('.video-info-title');
      if (!anchor) return;

      const mountPoint = document.createElement('span');
      mountPoint.id = 'bili-skip-wrapper-unique';
      anchor.appendChild(mountPoint);

      const format = (s: number) => {
        const hours = Math.floor(s / 3600);
        const minutes = Math.floor((s % 3600) / 60);
        const seconds = s % 60;
        return hours > 0
          ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          : `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

      disposeUI = render(() => (
        <Show when={isCollectionPage()}>
          <div style={{
            display: 'inline-flex', "align-items": 'center', gap: '12px',
            padding: '2px 8px', background: '#fb7299', color: 'white',
            "border-radius": '4px', "font-size": '11px', "vertical-align": 'middle',
            "margin-left": '10px'
          }}>
            <span>⏭ 跳过: {format(config().skipStart)}-{format(config().skipEnd)}</span>
            <span style={{ opacity: 0.8 }}>|</span>
            <span>🏁 切集: {mode() === 'manual' ? format(config().jumpEnd) : `自动 ( ${threshold()}% ) ${isAnalyzing() ? ' - 分析中...' : '- 待分析'}`}</span>
          </div>
        </Show>
      ), mountPoint);
    };

    // --- 5. 核心监控逻辑 (集成阈值判断) ---
    let lastJumpTime = 0;
    let lastIsCol = false;

    const monitor = () => {
      // 页面跳转检测
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(mountUI, 1500);
      }
      if (!document.getElementById('bili-skip-wrapper-unique')) mountUI();

      // 合集检测
      const isCol = !!document.querySelector('.video-pod') || !!document.querySelector('.multi-page');
      if (isCol !== lastIsCol) {
        lastIsCol = isCol;
        setIsCollectionPage(isCol);
        mountUI();
      }

      const video = getMainVideo();
      if (!video || !isCol) {
        setIsAnalyzing(false);
        return;
      };

      const cur = video.currentTime;
      const isPlaying = !video.paused;


      // A. 跳过区间逻辑
      if (config().skipEnd > 0 && cur >= config().skipStart && cur < config().skipEnd) {
        video.currentTime = config().skipEnd;
      }

      // 防止连续跳转频率限制
      const now = Date.now();
      if (now - lastJumpTime <= 5000) return;

      let shouldJump = false;

      // B. 跳转逻辑判断
      if (mode() === 'manual') {
        if (config().jumpEnd > 0 && cur >= config().jumpEnd) {
          shouldJump = true;
        }
      } else {
        // 自动模式：计算进度百分比
        const progress = (cur / video.duration) * 100;
        // 只有当前进度超过了 Options 页面设置的 threshold，才执行帧分析
        if (progress >= threshold()) {
          setIsAnalyzing(true);
          if (checkEndingByFrame(video, isPlaying, threshold())) {
            shouldJump = true;
            setIsAnalyzing(false);
            console.log(`[BiliSkip] 进度 ${progress.toFixed(1)}% 检测到片尾`);
          }
        }
      }

      // 执行跳转动作
      if (shouldJump) {
        const nextBtn = document.querySelector('.bpx-player-ctrl-next') as HTMLElement;
        if (nextBtn) {
          lastJumpTime = now;
          nextBtn.click();
          resetFrameAnalyzer();
        }
      }
    };

    // --- 6. 启动计时器与消息监听 ---
    const timer = setInterval(monitor, 1000);

    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'UPDATE_CONFIG') {
        updateConfig(msg);
        mountUI();
      }
      if (msg.type === 'SET_MODE') {
        setMode(msg.mode);
        mountUI();
      }
    });

    // --- 7. 销毁逻辑 ---
    ctx.onInvalidated(() => {
      clearInterval(timer);
      disposeUI?.();
      document.getElementById('bili-skip-wrapper-unique')?.remove();
    });
  },
});