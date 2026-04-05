import { render } from 'solid-js/web';
import { createSignal, Show } from 'solid-js';

export default defineContentScript({
  matches: ['*://*.bilibili.com/video/*', '*://*.bilibili.com/bangumi/play/*'],
  cssInjectionMode: 'manual',

  async main(ctx) {
    const [config, setConfig] = createSignal({ start: 0, end: 0, active: false });
    const [isCollectionPage, setIsCollectionPage] = createSignal(false);

    let lastUrl = location.href;
    let hasJumped = false;
    let disposeUI: (() => void) | null = null; // 存储 Solid 的销毁函数

    // --- 1. 配置处理逻辑 ---
    const updateConfig = (data: any) => {
      // 兼容两种数据格式（Storage 直接读取 or Message 传递）
      const s = data.start ?? (Number(data.sH || 0) * 3600 + Number(data.sM || 0) * 60 + Number(data.sS || 0));
      const e = data.end ?? (Number(data.eH || 0) * 3600 + Number(data.eM || 0) * 60 + Number(data.eS || 0));
      setConfig({ start: s, end: e, active: !!data.isActive });
    };

    // 初始加载
    const initialRes = await browser.storage.local.get(['sH', 'sM', 'sS', 'eH', 'eM', 'eS', 'isActive']);
    updateConfig(initialRes);

    // --- 2. 挂载/卸载逻辑 ---
    const mountUI = () => {
      // 第一步：清理已存在的同名标签，防止重复
      const existing = document.getElementById('bili-skip-wrapper-unique');
      if (existing) {
        disposeUI?.(); // 销毁 Solid 响应式追踪
        existing.remove(); // 从 DOM 删除
      }

      const anchor = document.getElementById('viewbox_report');
      if (!anchor) return;

      // 第二步：创建新的挂载容器
      const mountPoint = document.createElement('span');
      mountPoint.id = 'bili-skip-wrapper-unique';
      anchor.appendChild(mountPoint);

      // 第三步：渲染并保存销毁函数
      disposeUI = render(() => (
        <Show when={config().active && isCollectionPage()}>
          <div style={{
            display: 'inline-flex',
            "align-items": 'center',
            gap: '8px',
            padding: '2px 8px',
            background: '#fb7299',
            color: 'white',
            "border-radius": '4px',
            "font-size": '12px',
            "vertical-align": 'middle'
          }}>
            <span>▶ 起点: {Math.floor(config().start / 60)}:{(config().start % 60).toString().padStart(2, '0')}</span>
            <span>⏭ 终点: {Math.floor(config().end / 60)}:{(config().end % 60).toString().padStart(2, '0')}</span>
          </div>
        </Show>
      ), mountPoint);
    };

    // --- 3. 监控循环 ---
    const monitor = () => {
      // URL 变化检测
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        hasJumped = false;
        setTimeout(mountUI, 1500); // 延迟挂载确保 B 站标题栏已渲染
      }

      // 动态检查：如果标签被 B 站刷掉了，重新挂载
      if (!document.getElementById('bili-skip-wrapper-unique')) {
        mountUI();
      }

      const isCol = !!(document.querySelector('.video-pod') || document.querySelector('.cur-list') || document.querySelector('.multi-page'));
      setIsCollectionPage(isCol);

      const video = (document.querySelector('video') || document.querySelector('bwp-video')) as HTMLVideoElement | null;
      if (!video || !config().active || !isCol) return;

      // 自动跳转
      if (!hasJumped && config().start > 0 && video.currentTime < config().start - 1) {
        video.currentTime = config().start;
        hasJumped = true;
      }

      // 自动切集
      if (config().end > 0 && video.currentTime >= config().end) {
        const nextBtn = document.querySelector('.bpx-player-ctrl-next') as HTMLElement;
        if (nextBtn) {
          nextBtn.click();
          hasJumped = false;
        }
      }
    };

    const timer = setInterval(monitor, 1000);

    // --- 4. 消息监听 ---
    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'UPDATE_CONFIG') {
        updateConfig(msg);
        hasJumped = false;
        mountUI(); // 配置更新后强制刷新一次 UI
      }
    });

    ctx.onInvalidated(() => {
      clearInterval(timer);
      disposeUI?.();
      document.getElementById('bili-skip-wrapper-unique')?.remove();
    });
  },
});