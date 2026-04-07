import { createSignal, onMount, Show, For } from 'solid-js';
import { useBiliConfig } from '@/hooks/useBiliConfig';
import { TimeInput } from '@/components/TimeInput';
import { HistoryList } from '@/components/HistoryList';
import { getBiliCollection, formatTitle } from '@/utils/bili';
import { browser } from 'wxt/browser';

export default function App() {
  const {
    sH, setSH, sM, setSM, sS, setSS,
    mH, setMH, mM, setMM, mS, setMS,
    eH, setEH, eM, setEM, eS, setES,
    latestHistory, setLatestHistory,
    pinnedHistory, setPinnedHistory, // 确保 hook 导出了 setters
    initFromStorage,
    resetConfig,
    loadHistory,
    // 注意：这里不再直接使用 applyAndArchive，而是拆分逻辑
  } = useBiliConfig();

  const [isPageReady, setIsPageReady] = createSignal(false);
  const [mode, setMode] = createSignal<'auto' | 'manual'>('auto');

  const loadMode = async () => {
    const res = await browser.storage.local.get('mode');
    const savedMode = res.mode;
    if (savedMode === 'manual' || savedMode === 'auto') {
      setMode(savedMode);
    } else {
      setMode('auto');
    }
  };

  const saveMode = async (newMode: 'auto' | 'manual') => {
    setMode(newMode);
    await browser.storage.local.set({ mode: newMode });
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, { type: 'SET_MODE', mode: newMode });
    }
  };

  onMount(async () => {
    await initFromStorage();
    await loadMode();
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (activeTab?.id && activeTab.url?.includes('bilibili.com/video')) {
      const colTitle = await getBiliCollection(activeTab.id);
      if (colTitle) {
        setIsPageReady(true);
        // 自动记录最近播放
        const newItem = {
          title: formatTitle(colTitle, activeTab.title || ''),
          url: activeTab.url || '',
          time: Date.now(),
          config: {
            sH: sH(), sM: sM(), sS: sS(),
            mH: mH(), mM: mM(), mS: mS(),
            eH: eH(), eM: eM(), eS: eS(),
          },
        };
        const newLatest = [newItem, ...latestHistory().filter(h => h.url !== newItem.url)].slice(0, 2);

        setLatestHistory(newLatest);

        await browser.storage.local.set({ latestHistory: newLatest });
      }
    }
  });

  // --- 逻辑 A：仅应用配置到当前视频 ---
  const handleApply = async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab?.id) return;

    const config = {
      skipStart: sH() * 3600 + sM() * 60 + sS(),
      skipEnd: mH() * 3600 + mM() * 60 + mS(),
      jumpEnd: eH() * 3600 + eM() * 60 + eS()
    };

    // 保存当前数值到 storage（但不进历史列表）
    await browser.storage.local.set({
      sH: sH(), sM: sM(), sS: sS(),
      mH: mH(), mM: mM(), mS: mS(),
      eH: eH(), eM: eM(), eS: eS()
    });

    await browser.tabs.sendMessage(activeTab.id, { type: 'UPDATE_CONFIG', ...config });
    await browser.tabs.sendMessage(activeTab.id, { type: 'SET_MODE', mode: mode() });

  };

  // --- 逻辑 B：仅保存到存档/历史列表 ---
  const handleArchive = async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab?.id) return;

    const colTitle = await getBiliCollection(activeTab.id);
    if (!colTitle) return;

    const newItem = {
      title: formatTitle(colTitle, activeTab.title || ''),
      url: activeTab.url || '',
      time: Date.now(),
      config: {
        sH: sH(), sM: sM(), sS: sS(),
        mH: mH(), mM: mM(), mS: mS(),
        eH: eH(), eM: eM(), eS: eS(),
      },
    };

    // 更新手动存档 (Pinned)
    const newPinned = [newItem, ...pinnedHistory().filter(h => h.url !== newItem.url)].slice(0, 3);
    
    setPinnedHistory(newPinned);

    await browser.storage.local.set({
      pinnedHistory: newPinned
    });
  };

  return (
    <div style={{ width: '280px', padding: '15px', display: 'flex', 'flex-direction': 'column', gap: '12px', 'font-family': 'sans-serif', background: '#fff' }}>
      <h3 style={{ margin: '0', 'font-size': '16px', color: '#fb7299', 'text-align': 'center' }}>
        B站连播助手
        <span style={{ 'font-size': '10px', 'margin-left': '6px', padding: '2px 4px', background: isPageReady() ? '#4caf50' : '#9e9e9e', color: 'white', 'border-radius': '3px', 'vertical-align': 'middle' }}>
          {isPageReady() ? '已就绪' : '待命中'}
        </span>
      </h3>

      <div style={{ display: 'flex', gap: '12px', 'justify-content': 'center', 'margin-bottom': '4px' }}>
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
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
          <span>跳过区间 (先导+OP)</span>
          <TimeInput
            label="从"
            hour={sH()} minute={sM()} second={sS()}
            onHourChange={setSH}
            onMinuteChange={setSM}
            onSecondChange={setSS}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
          <TimeInput
            label="至"
            hour={mH()} minute={mM()} second={mS()}
            onHourChange={setMH}
            onMinuteChange={setMM}
            onSecondChange={setMS}
          />
        </div>

        {/* 手动模式才显示结尾切集点 */}
        <Show when={mode() === 'manual'}>
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <span>结尾切集点</span>
            <TimeInput
              label="切"
              hour={eH()} minute={eM()} second={eS()}
              onHourChange={setEH}
              onMinuteChange={setEM}
              onSecondChange={setES}
            />
          </div>
        </Show>
      </div>

      {/* 按钮区域：应用 - 重置 - 存档 */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={handleApply} style={{ flex: 1, background: '#fb7299', color: 'white', border: 'none', padding: '8px 4px', 'border-radius': '6px', cursor: 'pointer', 'font-weight': 'bold', 'font-size': '12px' }}>
          应用
        </button>
        <button onClick={resetConfig} style={{ flex: 1, background: '#e3e5e7', color: '#61666d', border: 'none', padding: '8px 4px', 'border-radius': '6px', cursor: 'pointer', 'font-size': '12px' }}>
          重置
        </button>
        <button onClick={handleArchive} style={{ flex: 1, background: '#00aeec', color: 'white', border: 'none', padding: '8px 4px', 'border-radius': '6px', cursor: 'pointer', 'font-weight': 'bold', 'font-size': '12px' }}>
          存档
        </button>
      </div>

      <HistoryList latest={latestHistory()} pinned={pinnedHistory()} onLoadHistory={loadHistory} />
    </div>
  );
}