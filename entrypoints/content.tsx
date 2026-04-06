import { render } from 'solid-js/web';
import { createSignal, Show } from 'solid-js';
import { browser } from 'wxt/browser'

export default defineContentScript({
  matches: ['*://*.bilibili.com/video/*', '*://*.bilibili.com/bangumi/play/*'],
  cssInjectionMode: 'manual',

  async main(ctx) {
    const [config, setConfig] = createSignal({ skipStart: 0, skipEnd: 0, jumpEnd: 0, active: false });
    const [isCollectionPage, setIsCollectionPage] = createSignal(false);

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

    // 初始化
    const res = await browser.storage.local.get(['sH', 'sM', 'sS', 'mH', 'mM', 'mS', 'eH', 'eM', 'eS', 'isActive']);

    updateConfig(res);

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
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

      disposeUI = render(() => (
        <Show when={config().active && isCollectionPage()}>
          <div style={{ display: 'inline-flex', "align-items": 'center', gap: '12px', padding: '2px 8px', background: '#fb7299', color: 'white', "border-radius": '4px', "font-size": '11px', "vertical-align": 'middle' }}>
            <span>⏭ 跳过: {format(config().skipStart)}-{format(config().skipEnd)}</span>
            <span style={{ opacity: 0.5 }}>|</span>
            <span>🏁 切集: {format(config().jumpEnd)}</span>
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

      // --- 核心判定：只认 video-pod ---
      const isCol = !!document.querySelector('.video-pod');
      if (isCol !== lastIsCol) {
        lastIsCol = isCol;
        setIsCollectionPage(isCol);
        mountUI(); // 只在合集状态变化时重建 UI
      }

      const video = (document.querySelector('video') || document.querySelector('bwp-video')) as HTMLVideoElement | null;
      if (!video || !config().active || !isCol) return;

      const cur = video.currentTime;
      // 跳过逻辑
      if (config().skipEnd > 0 && cur >= config().skipStart && cur < config().skipEnd) {
        video.currentTime = config().skipEnd;
      }

      const now = Date.now();
      if (config().jumpEnd > 0 && cur >= config().jumpEnd && (now - lastJumpTime > 5000)) {
        const nextBtn = document.querySelector('.bpx-player-ctrl-next') as HTMLElement;
        if (nextBtn) {
          lastJumpTime = now; // 5秒内不重复点击
          nextBtn.click();
        }
      }
    };

    const timer = setInterval(monitor, 1000);
    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'UPDATE_CONFIG') { updateConfig(msg); mountUI(); }
    });

    ctx.onInvalidated(() => {
      clearInterval(timer);
      disposeUI?.();
      document.getElementById('bili-skip-wrapper-unique')?.remove();
    });
  },
});