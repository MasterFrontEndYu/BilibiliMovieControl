import { createSignal, onMount, For } from "solid-js";
import { browser } from 'wxt/browser'
interface VideoConfig {
  sH: number; sM: number; sS: number;
  mH: number; mM: number; mS: number;
  eH: number; eM: number; eS: number;
}

interface HistoryItem {
  title: string;
  url: string;
  time: number;
  config: VideoConfig;
}

function App() {
  const [sH, setSH] = createSignal(0);
  const [sM, setSM] = createSignal(0);
  const [sS, setSS] = createSignal(0);
  const [mH, setMH] = createSignal(0);
  const [mM, setMM] = createSignal(0);
  const [mS, setMS] = createSignal(0);
  const [eH, setEH] = createSignal(0);
  const [eM, setEM] = createSignal(0);
  const [eS, setES] = createSignal(0);

  const [latestHistory, setLatestHistory] = createSignal<HistoryItem[]>([]);
  const [pinnedHistory, setPinnedHistory] = createSignal<HistoryItem[]>([]);
  const [isPageReady, setIsPageReady] = createSignal(false);

  // 核心检测：必须存在 .video-pod 类名
  const getBiliCollection = async (tabId: number) => {
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: () => {
          const isPod = !!document.querySelector('.video-pod');
          if (!isPod) return "";
          const titleEl = document.querySelector(".video-title")?.textContent?.trim() || "未知合集";

          if (titleEl!== "未知合集") {

            return titleEl.replace(/(\[|【)?(电视剧|美剧)(\]|】)?/g, "");
          }
          return titleEl
        },
      });
      return results[0]?.result;
    } catch (e) { return ""; }
  };

  const formatTitle = (col: string, full: string) =>
    `${col.slice(0, 10)}-${full.replace("_哔哩哔哩_bilibili", "").slice(0, 8)}`;

  onMount(async () => {
    const res = await browser.storage.local.get([
      "sH", "sM", "sS", "mH", "mM", "mS", "eH", "eM", "eS", "latestHistory", "pinnedHistory"
    ]);

    // --- 修复 TS 报错点：明确转换类型 ---
    setSH(Number(res.sH) || 0); setSM(Number(res.sM) || 0); setSS(Number(res.sS) || 0);
    setMH(Number(res.mH) || 0); setMM(Number(res.mM) || 0); setMS(Number(res.mS) || 0);
    setEH(Number(res.eH) || 0); setEM(Number(res.eM) || 0); setES(Number(res.eS) || 0);

    if (res.latestHistory) setLatestHistory(res.latestHistory as HistoryItem[]);
    if (res.pinnedHistory) setPinnedHistory(res.pinnedHistory as HistoryItem[]);

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (activeTab?.id && activeTab.url?.includes("bilibili.com/video")) {
      const colTitle = await getBiliCollection(activeTab.id);
      if (colTitle) {
        setIsPageReady(true);
        const newItem: HistoryItem = {
          title: formatTitle(colTitle, activeTab.title || ""),
          url: activeTab.url || "",
          time: Date.now(),
          config: {
            sH: Number(sH() || 0), sM: Number(sM() || 0), sS: Number(sS() || 0),
            mH: Number(mH() || 0), mM: Number(mM() || 0), mS: Number(mS() || 0),
            eH: Number(eH() || 0), eM: Number(eM() || 0), eS: Number(eS() || 0)
          }
        };
        const newLatest = [newItem, ...latestHistory().filter(h => h.url !== newItem.url)].slice(0, 2);
        setLatestHistory(newLatest);
        await browser.storage.local.set({ latestHistory: newLatest });
      }
    }
  });

  const saveAndSend = async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    const currentConfig = {
      sH: Number(sH() || 0), sM: Number(sM() || 0), sS: Number(sS() || 0),
      mH: Number(mH() || 0), mM: Number(mM() || 0), mS: Number(mS() || 0),
      eH: Number(eH() || 0), eM: Number(eM() || 0), eS: Number(eS() || 0)
    };

    await browser.storage.local.set({ ...currentConfig, isActive: true });

    if (activeTab?.id) {
      const colTitle = await getBiliCollection(activeTab.id);
      if (colTitle) {
        const newItem: HistoryItem = {
          title: formatTitle(colTitle, activeTab.title || ""),
          url: activeTab.url || "",
          time: Date.now(),
          config: currentConfig
        };
        const newPinned = [newItem, ...pinnedHistory().filter(h => h.url !== newItem.url)].slice(0, 5);
        setPinnedHistory(newPinned);
        await browser.storage.local.set({ pinnedHistory: newPinned });
      }

      await browser.tabs.sendMessage(activeTab.id, {
        type: "UPDATE_CONFIG",
        skipStart: currentConfig.sH * 3600 + currentConfig.sM * 60 + currentConfig.sS,
        skipEnd: currentConfig.mH * 3600 + currentConfig.mM * 60 + currentConfig.mS,
        jumpEnd: currentConfig.eH * 3600 + currentConfig.eM * 60 + currentConfig.eS,
        isActive: true
      });
    }
    window.close();
  };

  const resetConfig = async () => {
    setSH(0); setSM(0); setSS(0); setMH(0); setMM(0); setMS(0); setEH(0); setEM(0); setES(0);
    await browser.storage.local.set({ sH: 0, sM: 0, sS: 0, mH: 0, mM: 0, mS: 0, eH: 0, eM: 0, eS: 0, isActive: false });

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, { type: "UPDATE_CONFIG", skipStart: 0, skipEnd: 0, jumpEnd: 0, isActive: false });
    }
  };

  const loadHistory = async (item: HistoryItem) => {
    // 保存配置到storage
    await browser.storage.local.set({
      sH: item.config.sH, sM: item.config.sM, sS: item.config.sS,
      mH: item.config.mH, mM: item.config.mM, mS: item.config.mS,
      eH: item.config.eH, eM: item.config.eM, eS: item.config.eS,
      isActive: true
    });
    // 更新UI信号（可选，为了让popup显示新配置）
    setSH(item.config.sH); setSM(item.config.sM); setSS(item.config.sS);
    setMH(item.config.mH); setMM(item.config.mM); setMS(item.config.mS);
    setEH(item.config.eH); setEM(item.config.eM); setES(item.config.eS);
    // 跳转到该URL
    await browser.tabs.update({ url: item.url });
  };

  const inputStyle = { width: "45px", padding: "4px", border: "1px solid #ddd", "border-radius": "4px", "text-align": "center" as const };
  const labelStyle = { "font-size": "11px", color: "#9499a0", "margin-bottom": "4px", display: "block" };
  const historyItemStyle = { padding: "6px 8px", "font-size": "11px", background: "#f6f7f8", cursor: "pointer", "border-radius": "4px", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap", border: "1px solid #eee", color: "#61666d" };

  return (
    <div style={{ width: "280px", padding: "15px", display: "flex", "flex-direction": "column", gap: "12px", "font-family": "sans-serif", background: "#fff" }}>
      <h3 style={{ margin: "0", "font-size": "16px", color: "#fb7299", "text-align": "center" }}>
        B站连播助手
        <span style={{ "font-size": "10px", "margin-left": "6px", padding: "2px 4px", background: isPageReady() ? "#4caf50" : "#9e9e9e", color: "white", "border-radius": "3px", "vertical-align": "middle" }}>
          {isPageReady() ? "已就绪" : "待命中"}
        </span>
      </h3>

      <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
        <div>
          <span style={labelStyle}>跳过区间 (先导+OP)</span>
          <div style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
            <div style={{ display: "flex", gap: "4px", "align-items": "center" }}>
              <span style={{ "font-size": "10px", width: "15px" }}>从</span>
              <input type="number" value={sH()} onInput={e => setSH(+e.currentTarget.value)} style={inputStyle} min="0" />:
              <input type="number" value={sM()} onInput={e => setSM(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />:
              <input type="number" value={sS()} onInput={e => setSS(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />
            </div>
            <div style={{ display: "flex", gap: "4px", "align-items": "center" }}>
              <span style={{ "font-size": "10px", width: "15px" }}>至</span>
              <input type="number" value={mH()} onInput={e => setMH(+e.currentTarget.value)} style={inputStyle} min="0" />:
              <input type="number" value={mM()} onInput={e => setMM(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />:
              <input type="number" value={mS()} onInput={e => setMS(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />
            </div>
          </div>
        </div>
        <div>
          <span style={labelStyle}>结尾切集点</span>
          <div style={{ display: "flex", gap: "4px", "align-items": "center" }}>
            <span style={{ "font-size": "10px", width: "15px" }}>时</span>
            <input type="number" value={eH()} onInput={e => setEH(+e.currentTarget.value)} style={inputStyle} min="0" />:
            <input type="number" value={eM()} onInput={e => setEM(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />:
            <input type="number" value={eS()} onInput={e => setES(+e.currentTarget.value)} style={inputStyle} min="0" max="59" />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={saveAndSend} style={{ flex: 1.5, background: "#fb7299", color: "white", border: "none", padding: "8px", "border-radius": "6px", cursor: "pointer", "font-weight": "bold", "font-size": "12px" }}>
          应用并存档
        </button>
        <button onClick={resetConfig} style={{ flex: 1, background: "#e3e5e7", color: "#61666d", border: "none", padding: "8px", "border-radius": "6px", cursor: "pointer", "font-size": "12px" }}>
          重置
        </button>
      </div>

      <div style={{ "margin-top": "4px", "border-top": "1px solid #e3e5e7", "padding-top": "10px" }}>
        <div style={labelStyle}>最近播放 (合集)</div>
        <For each={latestHistory()}>{item => (
          <div style={{ ...historyItemStyle, "margin-bottom": "4px" }} onClick={() => loadHistory(item)}>🕒 {item.title}</div>
        )}</For>
        <div style={{ ...labelStyle, "margin-top": "8px" }}>手动存档</div>
        <For each={pinnedHistory()}>{item => (
          <div style={{ ...historyItemStyle, background: "#fff0f3", border: "1px solid #ffdce2", "margin-bottom": "4px" }} onClick={() => loadHistory(item)}>📌 {item.title}</div>
        )}</For>
      </div>
    </div>
  );
}

export default App;