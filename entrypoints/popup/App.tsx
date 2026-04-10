// entrypoints/popup/App.tsx
import { createSignal, onMount, Show, For } from 'solid-js';
import { useBiliConfig } from '@/hooks/useBiliConfig';
import { TimeInput } from '@/components/TimeInput';
import { HistoryList } from '@/components/HistoryList';
import { browser } from 'wxt/browser';
import { Settings } from 'lucide-solid';

export default function App() {
  const {
    sH, setSH, sM, setSM, sS, setSS,
    mH, setMH, mM, setMM, mS, setMS,
    eH, setEH, eM, setEM, eS, setES,
    latestHistory, setLatestHistory,
    pinnedHistory, setPinnedHistory,
    initFromStorage,
    resetConfig,
    loadHistory,
  } = useBiliConfig();

  const [isPageReady, setIsPageReady] = createSignal(false);
  const [mode, setMode] = createSignal<'auto' | 'manual'>('auto');

  onMount(async () => {
    await initFromStorage();
    const res = await browser.storage.local.get('mode');
    setMode(res.mode === 'manual' ? 'manual' : 'auto');

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.url?.includes('bilibili.com/video')) {
      setIsPageReady(true);
    }

    // 监听后台的自动更新广播
    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'REFRESH_HISTORY') setLatestHistory(msg.data);
    });
  });

  const saveMode = async (newMode: 'auto' | 'manual') => {
    setMode(newMode);
    await browser.storage.local.set({ mode: newMode });
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, { type: 'SET_MODE', mode: newMode });
    }
  };

  const handleApply = async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) return;

    const configValues = { sH: sH(), sM: sM(), sS: sS(), mH: mH(), mM: mM(), mS: mS(), eH: eH(), eM: eM(), eS: eS() };
    await browser.storage.local.set(configValues);

    const config = {
      skipStart: sH() * 3600 + sM() * 60 + sS(),
      skipEnd: mH() * 3600 + mM() * 60 + mS(),
      jumpEnd: eH() * 3600 + eM() * 60 + eS()
    };

    await browser.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_CONFIG', ...config });
    await browser.tabs.sendMessage(tabs[0].id, { type: 'SET_MODE', mode: mode() });
  };

  const handleArchive = async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) return;

    // 呼叫后台执行存档计算
    const response = await browser.runtime.sendMessage({
      type: 'DO_ARCHIVE',
      data: {
        tab: { id: tabs[0].id, title: tabs[0].title, url: tabs[0].url },
        config: { sH: sH(), sM: sM(), sS: sS(), mH: mH(), mM: mM(), mS: mS(), eH: eH(), eM: eM(), eS: eS() }
      }
    });

    if (response?.pinnedHistory) {
      setPinnedHistory(response.pinnedHistory);
    }
  };

  const openOptions = () => {
    browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
  };

  return (
    <div style={{ width: '280px', padding: '15px', display: 'flex', 'flex-direction': 'column', gap: '12px', background: '#fff' }}>
      <h3 style={{ display: 'flex', "align-items": 'center', "justify-content": 'center', margin: '0', 'font-size': '16px', color: '#fb7299' }}>
        B站连播助手
        <span style={{ 'font-size': '10px', 'margin-left': '6px', padding: '2px 4px', background: isPageReady() ? '#4caf50' : '#9e9e9e', color: 'white', 'border-radius': '3px' }}>
          {isPageReady() ? '已就绪' : '待命中'}
        </span>
        <button
          onClick={openOptions}
          style={{
            'font-size': '12px',
            'margin-left': '6px',
            padding: '3px 6px',
            background: '#f6f7f9', // 稍微浅一点的底色，更精致
            color: '#61666d', // 保持 B 站次要文字颜色
            border: '1px solid #e3e5e7', // 添加淡淡的边框线
            'border-radius': '4px', // 加一点圆角
            cursor: 'pointer',
            display: 'inline-flex', // 使用 flex 对齐图标和文字
            'align-items': 'center',
            gap: '3px', // 图标和文字的间距
            transition: 'all 0.2s' // 添加过渡动画
          }}
          // 添加 hover 效果
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#ffeef3';
            e.currentTarget.style.color = '#fb7299';
            e.currentTarget.style.borderColor = '#ffb3c1';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#f6f7f9';
            e.currentTarget.style.color = '#61666d';
            e.currentTarget.style.borderColor = '#e3e5e7';
          }}
        >
          <Settings size={14} /> {/* 设置图标，大小要合适 */}
          设置
        </button>
      </h3>

      <div style={{ display: 'flex', gap: '12px', 'justify-content': 'center' }}>
        <For each={['auto', 'manual'] as const}>
          {(m) => (
            <label style={{ display: 'flex', 'align-items': 'center', gap: '4px', 'font-size': '12px', cursor: 'pointer' }}>
              <input type="radio" name="mode" checked={mode() === m} onChange={() => saveMode(m)} />
              {m === 'auto' ? '自动检测' : '手动切集'}
            </label>
          )}
        </For>
      </div>

      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '10px' }}>
        <TimeInput label="从" hour={sH()} minute={sM()} second={sS()} onHourChange={setSH} onMinuteChange={setSM} onSecondChange={setSS} />
        <TimeInput label="至" hour={mH()} minute={mM()} second={mS()} onHourChange={setMH} onMinuteChange={setMM} onSecondChange={setMS} />
        <Show when={mode() === 'manual'}>
          <TimeInput label="切" hour={eH()} minute={eM()} second={eS()} onHourChange={setEH} onMinuteChange={setEM} onSecondChange={setES} />
        </Show>
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={handleApply} style={{ flex: 1, background: '#fb7299', color: 'white', border: 'none', padding: '8px 4px', 'border-radius': '6px', cursor: 'pointer', 'font-weight': 'bold' }}>应用</button>
        <button onClick={resetConfig} style={{ flex: 1, background: '#e3e5e7', color: '#61666d', border: 'none', padding: '8px 4px', 'border-radius': '6px', cursor: 'pointer' }}>重置</button>
        <button onClick={handleArchive} style={{ flex: 1, background: '#00aeec', color: 'white', border: 'none', padding: '8px 4px', 'border-radius': '6px', cursor: 'pointer', 'font-weight': 'bold' }}>存档</button>
      </div>

      <HistoryList latest={latestHistory()} pinned={pinnedHistory()} onLoadHistory={loadHistory} />
    </div>
  );
}