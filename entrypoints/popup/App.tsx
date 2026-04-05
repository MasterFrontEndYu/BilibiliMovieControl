import { createSignal, onMount } from 'solid-js';

function App() {
  const [sH, setSH] = createSignal(0);
  const [sM, setSM] = createSignal(0);
  const [sS, setSS] = createSignal(0);
  const [eH, setEH] = createSignal(0);
  const [eM, setEM] = createSignal(0);
  const [eS, setES] = createSignal(0);

  // --- 1. 使用 browser.storage 并支持异步 ---
  onMount(async () => {
    const res = await browser.storage.local.get(['sH', 'sM', 'sS', 'eH', 'eM', 'eS']);
    setSH(Number(res.sH) || 0); setSM(Number(res.sM) || 0); setSS(Number(res.sS) || 0);
    setEH(Number(res.eH) || 0); setEM(Number(res.eM) || 0); setES(Number(res.eS) || 0);
  });

  const saveAndSend = async () => {
    const config = {
      sH: sH(), sM: sM(), sS: sS(),
      eH: eH(), eM: eM(), eS: eS(),
      isActive: true
    };
    // 保存到本地存储
    await browser.storage.local.set(config);
    // 发送给 Content Script
    await sendToContent(config);
    // 自动关闭弹窗
    window.close();
  };

  const resetConfig = async () => {
    const empty = { sH: 0, sM: 0, sS: 0, eH: 0, eM: 0, eS: 0, isActive: false };
    setSH(0); setSM(0); setSS(0); setEH(0); setEM(0); setES(0);
    await browser.storage.local.set(empty);
    await sendToContent(empty);
  };

  // --- 2. 优化消息发送逻辑 ---
  const sendToContent = async (config: any) => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (activeTab?.id) {
      // WXT 环境下 sendMessage 也是异步的
      try {
        await browser.tabs.sendMessage(activeTab.id, {
          type: 'UPDATE_CONFIG',
          start: config.sH * 3600 + config.sM * 60 + config.sS,
          end: config.eH * 3600 + config.eM * 60 + config.eS,
          isActive: config.isActive
        });
      } catch (err) {
        console.log("尚未在当前页面检测到插件脚本（可能需要刷新页面）", err);
      }
    }
  };

  const inputStyle = {
    width: '45px',
    padding: '4px',
    border: '1px solid #ddd',
    "border-radius": '4px',
    "text-align": 'center' as const
  };

  return (
    <div style={{ width: '250px', padding: '15px', display: 'flex', "flex-direction": 'column', gap: '12px', "font-family": 'sans-serif' }}>
      <h3 style={{ margin: '0', "font-size": '16px', color: '#fb7299', "text-align": 'center' }}>B站连播助手</h3>

      <div>
        <div style={{ "font-size": '12px', "margin-bottom": '6px', color: '#666' }}>起始点 (跳过片头)</div>
        <div style={{ display: 'flex', gap: '4px', "align-items": 'center', "justify-content": 'center' }}>
          <input type="number" value={sH()} onInput={e => setSH(+e.currentTarget.value)} style={inputStyle} min="0" /> :
          <input type="number" value={sM()} onInput={e => setSM(+e.currentTarget.value)} style={inputStyle} min="0" max="59" /> :
          <input type="number" value={sS()} onInput={e => setSS(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />
        </div>
      </div>

      <div>
        <div style={{ "font-size": '12px', "margin-bottom": '6px', color: '#666' }}>结束点 (自动切集)</div>
        <div style={{ display: 'flex', gap: '4px', "align-items": 'center', "justify-content": 'center' }}>
          <input type="number" value={eH()} onInput={e => setEH(+e.currentTarget.value)} style={inputStyle} min="0" /> :
          <input type="number" value={eM()} onInput={e => setEM(+e.currentTarget.value)} style={inputStyle} min="0" max="59" /> :
          <input type="number" value={eS()} onInput={e => setES(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', "margin-top": '5px' }}>
        <button onClick={saveAndSend} style={{ flex: 1.5, background: '#fb7299', color: 'white', border: 'none', padding: '10px', "border-radius": '6px', cursor: 'pointer', "font-weight": 'bold' }}>
          保存并应用
        </button>
        <button onClick={resetConfig} style={{ flex: 1, background: '#f4f4f4', color: '#666', border: 'none', padding: '10px', "border-radius": '6px', cursor: 'pointer' }}>
          重置
        </button>
      </div>
    </div>
  );
}

export default App;