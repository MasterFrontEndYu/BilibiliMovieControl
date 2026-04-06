import { createSignal, onMount, For } from 'solid-js';

// 定义历史记录项的结构
interface HistoryItem {
  title: string;
  url: string;
  time: number;
  config: {
    sH: number; sM: number; sS: number;
    eH: number; eM: number; eS: number
  };
}

function App() {
  // 状态管理
  const [sH, setSH] = createSignal(0);
  const [sM, setSM] = createSignal(0);
  const [sS, setSS] = createSignal(0);
  const [eH, setEH] = createSignal(0);
  const [eM, setEM] = createSignal(0);
  const [eS, setES] = createSignal(0);
  const [history, setHistory] = createSignal<HistoryItem[]>([]);

  // 初始化：从存储中恢复数据
  onMount(async () => {
    try {
      const res = await browser.storage.local.get(['sH', 'sM', 'sS', 'eH', 'eM', 'eS', 'history']);

      // 恢复输入框数值
      setSH(Number(res.sH) || 0); setSM(Number(res.sM) || 0); setSS(Number(res.sS) || 0);
      setEH(Number(res.eH) || 0); setEM(Number(res.eM) || 0); setES(Number(res.eS) || 0);

      // 恢复历史记录列表
      if (Array.isArray(res.history)) {
        setHistory(res.history);
      }
    } catch (e) {
      console.error("加载存储失败", e);
    }
  });

  // 保存并应用
  const saveAndSend = async () => {
    // 获取当前活动的标签页（需要 manifest 中的 tabs 权限）
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    const currentConfig = { sH: sH(), sM: sM(), sS: sS(), eH: eH(), eM: eM(), eS: eS() };

    // 1. 保存当前配置到本地
    await browser.storage.local.set({ ...currentConfig, isActive: true });

    // 2. 处理历史记录 (逻辑：去重 -> 置顶 -> 截取前5)
    if (activeTab?.url && activeTab.url.includes("bilibili.com/video")) {
      const newItem: HistoryItem = {
        title: activeTab.title?.replace("_哔哩哔哩_bilibili", "") || "未知视频",
        url: activeTab.url,
        time: Date.now(),
        config: currentConfig
      };

      const filteredHistory = history().filter(h => h.url !== newItem.url);
      const newHistory = [newItem, ...filteredHistory].slice(0, 5);

      setHistory(newHistory);
      await browser.storage.local.set({ history: newHistory });
    }

    // 3. 通知 Content Script 更新
    await sendToContent({ ...currentConfig, isActive: true }, activeTab);

    // 4. 关闭弹窗
    window.close();
  };

  // 重置配置
  const resetConfig = async () => {
    const empty = { sH: 0, sM: 0, sS: 0, eH: 0, eM: 0, eS: 0, isActive: false };
    setSH(0); setSM(0); setSS(0); setEH(0); setEM(0); setES(0);
    await browser.storage.local.set(empty);

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    await sendToContent(empty, tabs[0]);
  };

  // 点击历史记录：回填数据
  const loadHistory = (item: HistoryItem) => {
    setSH(item.config.sH); setSM(item.config.sM); setSS(item.config.sS);
    setEH(item.config.eH); setEM(item.config.eM); setES(item.config.eS);
    // 如果想点击历史直接跳转，可以取消下面这行的注释：
    browser.tabs.update({ url: item.url });
  };

  // 消息发送封装
  const sendToContent = async (config: any, activeTab: any) => {
    if (activeTab?.id) {
      try {
        await browser.tabs.sendMessage(activeTab.id, {
          type: 'UPDATE_CONFIG',
          start: config.sH * 3600 + config.sM * 60 + config.sS,
          end: config.eH * 3600 + config.eM * 60 + config.eS,
          isActive: config.isActive
        });
      } catch (err) {
        console.warn("Content Script 尚未就绪，请刷新B站页面", err);
      }
    }
  };

  // --- 样式定义 ---
  const inputStyle = { width: '45px', padding: '4px', border: '1px solid #ddd', "border-radius": '4px', "text-align": 'center' as const };
  const historyItemStyle = {
    padding: '8px', "font-size": '11px', background: '#f6f7f8', cursor: 'pointer',
    "border-radius": '4px', overflow: 'hidden', "text-overflow": 'ellipsis',
    "white-space": 'nowrap', border: '1px solid #eee', color: '#61666d', "transition": 'all 0.2s'
  };

  return (
    <div style={{ width: '260px', padding: '15px', display: 'flex', "flex-direction": 'column', gap: '12px', "font-family": 'sans-serif' }}>
      <h3 style={{ margin: '0', "font-size": '16px', color: '#fb7299', "text-align": 'center' }}>B站连播助手</h3>

      <div>
        <div style={{ "font-size": '12px', "margin-bottom": '8px', color: '#9499a0' }}>时间点设置 (时:分:秒)</div>
        <div style={{ display: 'flex', "flex-direction": 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '5px', "align-items": 'center' }}>
            <span style={{ "font-size": '12px', width: '35px' }}>跳过:</span>
            <input type="number" value={sH()} onInput={e => setSH(+e.currentTarget.value)} style={inputStyle} min="0" />:
            <input type="number" value={sM()} onInput={e => setSM(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />:
            <input type="number" value={sS()} onInput={e => setSS(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />
          </div>
          <div style={{ display: 'flex', gap: '5px', "align-items": 'center' }}>
            <span style={{ "font-size": '12px', width: '35px' }}>切集:</span>
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

      {/* 历史记录部分 */}
      <div style={{ "margin-top": '5px', "border-top": '1px solid #e3e5e7', "padding-top": '12px' }}>
        <div style={{ "font-size": '12px', color: '#9499a0', "margin-bottom": '8px' }}>最近记录 (自动回填时间)</div>
        <div style={{ display: 'flex', "flex-direction": 'column', gap: '6px' }}>
          <For each={history()}>
            {(item) => (
              <div
                style={historyItemStyle}
                onClick={() => loadHistory(item)}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fb7299'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#eee'}
                title={item.title}
              >
                {item.title}
              </div>
            )}
          </For>
          {history().length === 0 && (
            <div style={{ "text-align": 'center', color: '#bdc0c5', "font-size": '11px', padding: '10px' }}>暂无记录</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;