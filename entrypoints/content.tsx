import { render } from 'solid-js/web';
import { createSignal, Show } from 'solid-js';
import { browser } from 'wxt/browser';
// 导入帧分析模块
import {
  initFrameAnalyzer,
  getMainVideo,
  checkEndingByFrame,
  resetFrameAnalyzer
} from '../utils/frameAnalyzer';  // 根据实际路径调整

export default defineContentScript({
  matches: ['*://*.bilibili.com/video/*', '*://*.bilibili.com/bangumi/play/*'],
  cssInjectionMode: 'manual',

  async main(ctx) {
    // 初始化帧分析器
    initFrameAnalyzer();

    const [config, setConfig] = createSignal({ skipStart: 0, skipEnd: 0, jumpEnd: 0, active: false });
    const [isCollectionPage, setIsCollectionPage] = createSignal(false);

    const [mode, setMode] = createSignal<'auto' | 'manual'>('auto');

    // 加载保存的模式
    const storedMode = await browser.storage.local.get('mode');
    if (storedMode.mode === 'manual') setMode('manual');
    else setMode('auto');

    let lastUrl = location.href;
    let disposeUI: (() => void) | null = null;

    const updateConfig = (data: any) => {
      const getSeconds = (h: any, m: any, s: any) =>
        Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);

      const s = data.skipStart !== undefined ? Number(data.skipStart) : getSeconds(data.sH, data.sM, data.sS);
      const m = data.skipEnd !== undefined ? Number(data.skipEnd) : getSeconds(data.mH, data.mM, data.mS);
      const e = data.jumpEnd !== undefined ? Number(data.jumpEnd) : getSeconds(data.eH, data.eM, data.eS);

      setConfig({
        skipStart: s,
        skipEnd: m,
        jumpEnd: e,
        active: !!data.isActive
      });
    };

    const res = await browser.storage.local.get(['sH', 'sM', 'sS', 'mH', 'mM', 'mS', 'eH', 'eM', 'eS', 'isActive']);
    updateConfig(res);

    const mountUI = () => {
      // ... 与之前完全相同，保持不变 ...
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
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

      disposeUI = render(() => (
        <Show when={config().active && isCollectionPage()}>
          <div style={{ display: 'inline-flex', "align-items": 'center', gap: '12px', padding: '2px 8px', background: '#fb7299', color: 'white', "border-radius": '4px', "font-size": '11px', "vertical-align": 'middle' }}>
            <span>⏭ 跳过: {format(config().skipStart)}-{format(config().skipEnd)}</span>
            <span style={{ opacity: 0.8 }}>|</span>
            <span>🏁 切集:  {mode() === 'manual' ? format(config().jumpEnd) : '自动切集'} </span>
          </div>
        </Show>
      ), mountPoint);
    };

    let lastJumpTime = 0;
    let lastIsCol = false;

    const monitor = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(mountUI, 1500);
      }
      if (!document.getElementById('bili-skip-wrapper-unique')) mountUI();

      const isCol = !!document.querySelector('.video-pod');
      if (isCol !== lastIsCol) {
        lastIsCol = isCol;
        setIsCollectionPage(isCol);
        mountUI();
      }

      const video = getMainVideo();
      if (!video || !config().active || !isCol) return;

      // 获取播放状态：false 表示正在播放，true 表示暂停
      const isPlaying = !video.paused;

      const cur = video.currentTime;

      // 跳过区间逻辑（不受播放状态影响）
      if (config().skipEnd > 0 && cur >= config().skipStart && cur < config().skipEnd) {
        video.currentTime = config().skipEnd;
      }

      const now = Date.now();
      if (now - lastJumpTime <= 5000) return;

      let shouldJump = false;

      if (mode() === 'manual') {
        if (config().jumpEnd > 0 && cur >= config().jumpEnd) {
          shouldJump = true;
        }
      } else {
        // 自动模式：传入 isPlaying 参数
        if (checkEndingByFrame(video, isPlaying)) {
          shouldJump = true;
          console.log('[BiliSkip] 自动模式检测到片尾');
        }
      }

      if (shouldJump) {
        const nextBtn = document.querySelector('.bpx-player-ctrl-next') as HTMLElement;
        if (nextBtn) {
          lastJumpTime = now;
          nextBtn.click();
          resetFrameAnalyzer();  // 可选，已在 checkEndingByFrame 内重置
        }
      }
    };

    const timer = setInterval(monitor, 1000);
    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'UPDATE_CONFIG') { updateConfig(msg); mountUI(); }
      if (msg.type === 'SET_MODE') { setMode(msg.mode); }
    });

    ctx.onInvalidated(() => {
      clearInterval(timer);
      disposeUI?.();
      document.getElementById('bili-skip-wrapper-unique')?.remove();
    });
  },
});