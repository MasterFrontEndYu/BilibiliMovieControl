import { createSignal, onMount, For } from 'solid-js';

// 定义历史记录项的结构
interface HistoryItem {
  title: string;
  url: string;
  time: number;
  config: {
    sH: number; sM: number; sS: number; // 跳过开始
    mH: number; mM: number; mS: number; // 跳过结束（正文开始）
    eH: number; eM: number; eS: number  // 提前切集
  };
}

function App() {
  // 状态管理
  const [sH, setSH] = createSignal(0);
  const [sM, setSM] = createSignal(0);
  const [sS, setSS] = createSignal(0);
  const [mH, setMH] = createSignal(0);
  const [mM, setMM] = createSignal(0);
  const [mS, setMS] = createSignal(0);
  const [eH, setEH] = createSignal(0);
  const [eM, setEM] = createSignal(0);
  const [eS, setES] = createSignal(0);
  const [history, setHistory] = createSignal<HistoryItem[]>([]);

  // 从存储恢复
  onMount(async () => {
    try {
      const res = await browser.storage.local.get(['sH', 'sM', 'sS', 'mH', 'mM', 'mS', 'eH', 'eM', 'eS', 'history']);
      setSH(Number(res.sH) || 0); setSM(Number(res.sM) || 0); setSS(Number(res.sS) || 0);
      setMH(Number(res.mH) || 0); setMM(Number(res.mM) || 0); setMS(Number(res.mS) || 0);
      setEH(Number(res.eH) || 0); setEM(Number(res.eM) || 0); setES(Number(res.eS) || 0);
      if (Array.isArray(res.history)) setHistory(res.history);
    } catch (e) { console.error("加载存储失败", e); }
  });

  const saveAndSend = async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    const currentConfig = {
      sH: sH(), sM: sM(), sS: sS(),
      mH: mH(), mM: mM(), mS: mS(),
      eH: eH(), eM: eM(), eS: eS()
    };

    await browser.storage.local.set({ ...currentConfig, isActive: true });

    if (activeTab?.url?.includes("bilibili.com/video")) {
      const newItem: HistoryItem = {
        title: activeTab.title?.replace("_哔哩哔哩_bilibili", "") || "未知视频",
        url: activeTab.url,
        time: Date.now(),
        config: currentConfig
      };
      const newHistory = [newItem, ...history().filter(h => h.url !== newItem.url)].slice(0, 5);
      setHistory(newHistory);
      await browser.storage.local.set({ history: newHistory });
    }

    await sendToContent({ ...currentConfig, isActive: true }, activeTab);
    window.close();
  };

  const resetConfig = async () => {
    const empty = { sH: 0, sM: 0, sS: 0, mH: 0, mM: 0, mS: 0, eH: 0, eM: 0, eS: 0, isActive: false };
    setSH(0); setSM(0); setSS(0); setMH(0); setMM(0); setMS(0); setEH(0); setEM(0); setES(0);
    await browser.storage.local.set(empty);
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    await sendToContent(empty, tabs[0]);
  };

  const loadHistory = (item: HistoryItem) => {
    setSH(item.config.sH); setSM(item.config.sM); setSS(item.config.sS);
    setMH(item.config.mH); setMM(item.config.mM); setMS(item.config.mS);
    setEH(item.config.eH); setEM(item.config.eM); setES(item.config.eS);
    browser.tabs.update({ url: item.url });
  };

  const sendToContent = async (config: any, activeTab: any) => {
    if (activeTab?.id) {
      try {
        await browser.tabs.sendMessage(activeTab.id, {
          type: 'UPDATE_CONFIG',
          skipStart: config.sH * 3600 + config.sM * 60 + config.sS,
          skipEnd: config.mH * 3600 + config.mM * 60 + config.mS,
          jumpEnd: config.eH * 3600 + config.eM * 60 + config.eS,
          isActive: config.isActive
        });
      } catch (err) { console.warn("发送失败", err); }
    }
  };

  // 样式保持不变...
  const inputStyle = { width: '45px', padding: '4px', border: '1px solid #ddd', "border-radius": '4px', "text-align": 'center' as const };
  const historyItemStyle = { padding: '8px', "font-size": '11px', background: '#f6f7f8', cursor: 'pointer', "border-radius": '4px', overflow: 'hidden', "text-overflow": 'ellipsis', "white-space": 'nowrap', border: '1px solid #eee', color: '#61666d', "transition": 'all 0.2s' };

  return (
    <div style={{ width: '280px', padding: '15px', display: 'flex', "flex-direction": 'column', gap: '12px', "font-family": 'sans-serif' }}>
      <h3 style={{ margin: '0', "font-size": '16px', color: '#fb7299', "text-align": 'center' }}>B站连播助手</h3>

      <div style={{ display: 'flex', "flex-direction": 'column', gap: '12px' }}>
        <div>
          <div style={{ "font-size": '12px', color: '#9499a0', "margin-bottom": '6px' }}>跳过区间 (通常是先导+OP)</div>
          <div style={{ display: 'flex', "flex-direction": 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '5px', "align-items": 'center' }}>
              <span style={{ "font-size": '11px', width: '35px', color: '#61666d' }}>从:</span>
              <input type="number" value={sH()} onInput={e => setSH(+e.currentTarget.value)} style={inputStyle} min="0" />:
              <input type="number" value={sM()} onInput={e => setSM(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />:
              <input type="number" value={sS()} onInput={e => setSS(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />
            </div>
            <div style={{ display: 'flex', gap: '5px', "align-items": 'center' }}>
              <span style={{ "font-size": '11px', width: '35px', color: '#61666d' }}>至:</span>
              <input type="number" value={mH()} onInput={e => setMH(+e.currentTarget.value)} style={inputStyle} min="0" />:
              <input type="number" value={mM()} onInput={e => setMM(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />:
              <input type="number" value={mS()} onInput={e => setMS(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />
            </div>
          </div>
        </div>

        <div>
          <div style={{ "font-size": '12px', color: '#9499a0', "margin-bottom": '6px' }}>结尾切集</div>
          <div style={{ display: 'flex', gap: '5px', "align-items": 'center' }}>
            <span style={{ "font-size": '11px', width: '35px', color: '#61666d' }}>时间:</span>
            <input type="number" value={eH()} onInput={e => setEH(+e.currentTarget.value)} style={inputStyle} min="0" />:
            <input type="number" value={eM()} onInput={e => setEM(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />:
            <input type="number" value={eS()} onInput={e => setES(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={saveAndSend} style={{ flex: 1.5, background: '#fb7299', color: 'white', border: 'none', padding: '10px', "border-radius": '6px', cursor: 'pointer', "font-weight": 'bold' }}>应用并保存</button>
        <button onClick={resetConfig} style={{ flex: 1, background: '#e3e5e7', color: '#61666d', border: 'none', padding: '10px', "border-radius": '6px', cursor: 'pointer' }}>重置</button>
      </div>

      <div style={{ "margin-top": '5px', "border-top": '1px solid #e3e5e7', "padding-top": '12px' }}>
        <div style={{ "font-size": '12px', color: '#9499a0', "margin-bottom": '8px' }}>最近记录</div>
        <div style={{ display: 'flex', "flex-direction": 'column', gap: '6px' }}>
          <For each={history()}>
            {(item) => (
              <div style={historyItemStyle} onClick={() => loadHistory(item)} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fb7299'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#eee'} title={item.title}>
                {item.title}
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

export default App;
