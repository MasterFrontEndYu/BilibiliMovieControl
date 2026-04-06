import { createSignal, onMount, For } from "solid-js";

// 定义配置结构，方便复用
interface VideoConfig {
  sH: number;
  sM: number;
  sS: number;
  mH: number;
  mM: number;
  mS: number;
  eH: number;
  eM: number;
  eS: number;
}

interface HistoryItem {
  title: string;
  url: string;
  time: number;
  config: VideoConfig;
}

function App() {
  // 1. 状态管理
  const [sH, setSH] = createSignal(0);
  const [sM, setSM] = createSignal(0);
  const [sS, setSS] = createSignal(0);
  const [mH, setMH] = createSignal(0);
  const [mM, setMM] = createSignal(0);
  const [mS, setMS] = createSignal(0);
  const [eH, setEH] = createSignal(0);
  const [eM, setEM] = createSignal(0);
  const [eS, setES] = createSignal(0);

  // 两种历史记录
  const [latestHistory, setLatestHistory] = createSignal<HistoryItem[]>([]); // 播放即存，限2个
  const [pinnedHistory, setPinnedHistory] = createSignal<HistoryItem[]>([]); // 手动保存，限5个

  // 从当前标签页抓取合集标题
  const getCollectionTitle = async (tabId: number) => {
    try {
      const results = await browser.scripting.executeScript({
        target: { tabId },
        func: () => {
          const collectionTitle = document.querySelector(
            ".video-title",
          ) || { textContent: "未知合集" }; // 兜底

          return collectionTitle.textContent?.trim();
        },
      });
      return results[0].result;
    } catch (e) {
      return "未知视频";
    }
  };

  // 2. 辅助工具：处理标题
  const formatTitle = (collectionTitle: string, fullTitle: string) => {
    return `${collectionTitle.slice(0, 10)}-${fullTitle.replace("_哔哩哔哩_bilibili", "") }`;
  };

  // 3. 从存储恢复
  onMount(async () => {
    try {
      const res = await browser.storage.local.get([
        "sH",
        "sM",
        "sS",
        "mH",
        "mM",
        "mS",
        "eH",
        "eM",
        "eS",
        "latestHistory",
        "pinnedHistory",
      ]);

      // 恢复输入框状态
      setSH(Number(res.sH) || 0);
      setSM(Number(res.sM) || 0);
      setSS(Number(res.sS) || 0);
      setMH(Number(res.mH) || 0);
      setMM(Number(res.mM) || 0);
      setMS(Number(res.mS) || 0);
      setEH(Number(res.eH) || 0);
      setEM(Number(res.eM) || 0);
      setES(Number(res.eS) || 0);

      if (Array.isArray(res.latestHistory))
        setLatestHistory(res.latestHistory);
      if (Array.isArray(res.pinnedHistory))
        setPinnedHistory(res.pinnedHistory);

      // --- 自动记录逻辑 ---
      // 页面打开时，如果是在视频页，自动存入“最新记录”
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];
      if (activeTab?.url?.includes("bilibili.com/video")) {
        const currentConfig = {
          sH: sH(),
          sM: sM(),
          sS: sS(),
          mH: mH(),
          mM: mM(),
          mS: mS(),
          eH: eH(),
          eM: eM(),
          eS: eS(),
        };
        const collectionTitle = await getCollectionTitle(activeTab.id!);
        const newItem: HistoryItem = {
          title: formatTitle(collectionTitle || "", activeTab.title || ""),
          url: activeTab.url,
          time: Date.now(), 
          config: currentConfig,
        };
        // 过滤重复并保留最新2个
        const newLatest = [
          newItem,
          ...latestHistory().filter((h) => h.url !== newItem.url),
        ].slice(0, 2);
        setLatestHistory(newLatest);
        await browser.storage.local.set({ latestHistory: newLatest });
      }
    } catch (e) {
      console.error("加载存储失败", e);
    }
  });

  // 4. 手动应用并保存记录
  const saveAndSend = async () => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const activeTab = tabs[0];

    const currentConfig = {
      sH: sH(),
      sM: sM(),
      sS: sS(),
      mH: mH(),
      mM: mM(),
      mS: mS(),
      eH: eH(),
      eM: eM(),
      eS: eS(),
    };

    // 保存当前全局配置
    await browser.storage.local.set({ ...currentConfig, isActive: true });

    // 手动记录：存入 pinnedHistory
    if (activeTab?.url?.includes("bilibili.com/video")) {
      const collectionTitle = await getCollectionTitle(activeTab.id!);
      const newItem: HistoryItem = {
        title: formatTitle(collectionTitle || "", activeTab.title || ""),
        url: activeTab.url,
        time: Date.now(),
        config: currentConfig,
      };
      // 过滤重复并保留最新5个
      const newPinned = [
        newItem,
        ...pinnedHistory().filter((h) => h.url !== newItem.url),
      ].slice(0, 5);
      setPinnedHistory(newPinned);
      await browser.storage.local.set({ pinnedHistory: newPinned });
    }

    await sendToContent({ ...currentConfig, isActive: true }, activeTab);
    window.close();
  };

  const resetConfig = async () => {
    const empty = {
      sH: 0,
      sM: 0,
      sS: 0,
      mH: 0,
      mM: 0,
      mS: 0,
      eH: 0,
      eM: 0,
      eS: 0,
      isActive: false,
    };
    setSH(0);
    setSM(0);
    setSS(0);
    setMH(0);
    setMM(0);
    setMS(0);
    setEH(0);
    setEM(0);
    setES(0);
    await browser.storage.local.set(empty);
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    await sendToContent(empty, tabs[0]);
  };

  const loadHistory = (item: HistoryItem) => {
    setSH(item.config.sH);
    setSM(item.config.sM);
    setSS(item.config.sS);
    setMH(item.config.mH);
    setMM(item.config.mM);
    setMS(item.config.mS);
    setEH(item.config.eH);
    setEM(item.config.eM);
    setES(item.config.eS);
    browser.tabs.update({ url: item.url });
  };

  const sendToContent = async (config: any, activeTab: any) => {
    if (activeTab?.id) {
      try {
        await browser.tabs.sendMessage(activeTab.id, {
          type: "UPDATE_CONFIG",
          skipStart: config.sH * 3600 + config.sM * 60 + config.sS,
          skipEnd: config.mH * 3600 + config.mM * 60 + config.mS,
          jumpEnd: config.eH * 3600 + config.eM * 60 + config.eS,
          isActive: config.isActive,
        });
      } catch (err) {
        console.warn("发送失败", err);
      }
    }
  };

  // 样式
  const inputStyle = {
    width: "45px",
    padding: "4px",
    border: "1px solid #ddd",
    "border-radius": "4px",
    "text-align": "center" as const,
  };
  const historyItemStyle = {
    padding: "6px 8px",
    "font-size": "11px",
    background: "#f6f7f8",
    cursor: "pointer",
    "border-radius": "4px",
    overflow: "hidden",
    "text-overflow": "ellipsis",
    "white-space": "nowrap",
    border: "1px solid #eee",
    color: "#61666d",
    transition: "all 0.2s",
  };
  const labelStyle = {
    "font-size": "11px",
    color: "#9499a0",
    "margin-bottom": "4px",
    display: "block",
  };

  return (
    <div
      style={{
        width: "280px",
        padding: "15px",
        display: "flex",
        "flex-direction": "column",
        gap: "12px",
        "font-family": "sans-serif",
        background: "#fff",
      }}
    >
      <h3
        style={{
          margin: "0",
          "font-size": "16px",
          color: "#fb7299",
          "text-align": "center",
        }}
      >
        B站连播助手
      </h3>

      {/* 配置区域... (保持不变) */}
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "10px",
        }}
      >
        <div>
          <span style={labelStyle}>跳过区间 (先导+OP)</span>
          <div
            style={{
              display: "flex",
              "flex-direction": "column",
              gap: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "4px",
                "align-items": "center",
              }}
            >
              <span
                style={{ "font-size": "10px", width: "20px" }}
              >
                从
              </span>
              <input
                type="number"
                value={sH()}
                onInput={(e) => setSH(+e.currentTarget.value)}
                style={inputStyle}
                min="0"
              />
              :
              <input
                type="number"
                value={sM()}
                onInput={(e) => setSM(+e.currentTarget.value)}
                style={inputStyle}
                min="0"
                max="59"
              />
              :
              <input
                type="number"
                value={sS()}
                onInput={(e) => setSS(+e.currentTarget.value)}
                style={inputStyle}
                min="0"
                max="59"
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "4px",
                "align-items": "center",
              }}
            >
              <span
                style={{ "font-size": "10px", width: "20px" }}
              >
                至
              </span>
              <input
                type="number"
                value={mH()}
                onInput={(e) => setMH(+e.currentTarget.value)}
                style={inputStyle}
                min="0"
              />
              :
              <input
                type="number"
                value={mM()}
                onInput={(e) => setMM(+e.currentTarget.value)}
                style={inputStyle}
                min="0"
                max="59"
              />
              :
              <input
                type="number"
                value={mS()}
                onInput={(e) => setMS(+e.currentTarget.value)}
                style={inputStyle}
                min="0"
                max="59"
              />
            </div>
          </div>
        </div>
        <div>
          <span style={labelStyle}>结尾切集点</span>
          <div
            style={{
              display: "flex",
              gap: "4px",
              "align-items": "center",
            }}
          >
            <span style={{ "font-size": "10px", width: "20px" }}>
              时
            </span>
            <input
              type="number"
              value={eH()}
              onInput={(e) => setEH(+e.currentTarget.value)}
              style={inputStyle}
              min="0"
            />
            :
            <input
              type="number"
              value={eM()}
              onInput={(e) => setEM(+e.currentTarget.value)}
              style={inputStyle}
              min="0"
              max="59"
            />
            :
            <input
              type="number"
              value={eS()}
              onInput={(e) => setES(+e.currentTarget.value)}
              style={inputStyle}
              min="0"
              max="59"
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={saveAndSend}
          style={{
            flex: 1.5,
            background: "#fb7299",
            color: "white",
            border: "none",
            padding: "8px",
            "border-radius": "6px",
            cursor: "pointer",
            "font-weight": "bold",
            "font-size": "12px",
          }}
        >
          应用并存档
        </button>
        <button
          onClick={resetConfig}
          style={{
            flex: 1,
            background: "#e3e5e7",
            color: "#61666d",
            border: "none",
            padding: "8px",
            "border-radius": "6px",
            cursor: "pointer",
            "font-size": "12px",
          }}
        >
          重置
        </button>
      </div>

      {/* 历史记录区域 */}
      <div
        style={{
          "margin-top": "4px",
          "border-top": "1px solid #e3e5e7",
          "padding-top": "10px",
          display: "flex",
          "flex-direction": "column",
          gap: "10px",
        }}
      >
        {/* 最新播放 (自动) */}
        <div>
          <div style={labelStyle}>最近播放 (自动记录2条)</div>
          <div
            style={{
              display: "flex",
              "flex-direction": "column",
              gap: "4px",
            }}
          >
            <For each={latestHistory()}>
              {(item) => (
                <div
                  style={historyItemStyle}
                  onClick={() => loadHistory(item)}
                  title={item.title}
                >
                  🕒 {item.title}
                </div>
              )}
            </For>
          </div>
        </div>

        {/* 手动存档 */}
        <div>
          <div style={labelStyle}>手动存档 (上限5条)</div>
          <div
            style={{
              display: "flex",
              "flex-direction": "column",
              gap: "4px",
            }}
          >
            <For each={pinnedHistory()}>
              {(item) => (
                <div
                  style={{
                    ...historyItemStyle,
                    background: "#fff0f3",
                    border: "1px solid #ffdce2",
                  }}
                  onClick={() => loadHistory(item)}
                  title={item.title}
                >
                  📌 {item.title}
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
