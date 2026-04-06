import { render } from 'solid-js/web';
import { createSignal, Show } from 'solid-js';

export default defineContentScript({
  matches: ['*://*.bilibili.com/video/*', '*://*.bilibili.com/bangumi/play/*'],
  cssInjectionMode: 'manual',

  async main(ctx) {
    // 状态定义：存储三个核心时间点（单位：秒）
    const [config, setConfig] = createSignal({
      skipStart: 0, // 跳过区间的起点
      skipEnd: 0,   // 跳过区间的终点（正文起点）
      jumpEnd: 0,   // 提前切集的时间点
      active: false
    });
    const [isCollectionPage, setIsCollectionPage] = createSignal(false);

    let lastUrl = location.href;
    let disposeUI: (() => void) | null = null;

    // --- 1. 统一配置处理函数 ---
    const updateConfig = (data: any) => {
      // 兼容两种格式：一种是直接从 Storage 取出的 H/M/S 对象，一种是 Message 传来的秒数
      const s = data.skipStart ?? (Number(data.sH || 0) * 3600 + Number(data.sM || 0) * 60 + Number(data.sS || 0));
      const m = data.skipEnd ?? (Number(data.mH || 0) * 3600 + Number(data.mM || 0) * 60 + Number(data.mS || 0));
      const e = data.jumpEnd ?? (Number(data.eH || 0) * 3600 + Number(data.eM || 0) * 60 + Number(data.eS || 0));

      setConfig({
        skipStart: s,
        skipEnd: m,
        jumpEnd: e,
        active: !!data.isActive
      });
    };

    // 初始加载存储的数据
    const res = await browser.storage.local.get(['sH', 'sM', 'sS', 'mH', 'mM', 'mS', 'eH', 'eM', 'eS', 'isActive']);
    updateConfig(res);

    // --- 2. UI 挂载逻辑 (显示在 B 站标题栏) ---
    const mountUI = () => {
      const existing = document.getElementById('bili-skip-wrapper-unique');
      if (existing) {
        disposeUI?.();
        existing.remove();
      }

      const anchor = document.getElementById('viewbox_report') || document.querySelector('.video-info-title');
      if (!anchor) return;

      const mountPoint = document.createElement('span');
      mountPoint.id = 'bili-skip-wrapper-unique';
      anchor.appendChild(mountPoint);

      const format = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

      disposeUI = render(() => (
        <Show when={config().active && isCollectionPage()}>
          <div style={{
            display: 'inline-flex',
            "align-items": 'center',
            gap: '6px',
            padding: '2px 8px',
            margin: '0 10px',
            background: '#fb7299',
            color: 'white',
            "border-radius": '4px',
            "font-size": '11px',
            "vertical-align": 'middle',
            "font-weight": 'normal'
          }}>
            <span>⏭ 跳过: {format(config().skipStart)}-{format(config().skipEnd)}</span>
            <span style={{ opacity: 0.5 }}>|</span>
            <span>🏁 切集: {format(config().jumpEnd)}</span>
          </div>
        </Show>
      ), mountPoint);
    };

    // --- 3. 核心监控逻辑 ---
    const monitor = () => {
      // 检测 URL 变化
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(mountUI, 1500);
      }

      // 自动挂载检测
      if (!document.getElementById('bili-skip-wrapper-unique')) {
        mountUI();
      }

      // 检查是否为合集/连播页面
      const isCol = !!(document.querySelector('.video-pod') || document.querySelector('.cur-list') || document.querySelector('.multi-page') || document.querySelector('.sections-content'));
      setIsCollectionPage(isCol);

      const video = (document.querySelector('video') || document.querySelector('bwp-video')) as HTMLVideoElement | null;
      if (!video || !config().active || !isCol) return;

      const cur = video.currentTime;

      // 【功能 A】跳过区间：如果当前时间在 [skipStart, skipEnd] 之间，直接飞到正文
      // 即使不设 skipStart，它默认为 0，也能实现“从头开始跳”
      if (config().skipEnd > 0 && cur >= config().skipStart && cur < config().skipEnd) {
        video.currentTime = config().skipEnd;
        console.log(`[连播助手] 已跳过区间: ${config().skipStart}s -> ${config().skipEnd}s`);
      }

      // 【功能 B】自动切集：如果设置了切集点且当前时间已到
      if (config().jumpEnd > 0 && cur >= config().jumpEnd) {
        const nextBtn = document.querySelector('.bpx-player-ctrl-next') as HTMLElement;
        if (nextBtn) {
          nextBtn.click();
          console.log(`[连播助手] 已触发切集，当前时间: ${cur}s`);
        }
      }
    };

    // 每秒检查一次状态，比监听 timeupdate 性能消耗更小且更稳定
    const timer = setInterval(monitor, 1000);

    // --- 4. 消息监听 ---
    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'UPDATE_CONFIG') {
        updateConfig(msg);
        mountUI();
      }
    });

    // 清理逻辑
    ctx.onInvalidated(() => {
      clearInterval(timer);
      disposeUI?.();
      document.getElementById('bili-skip-wrapper-unique')?.remove();
    });
  },
});