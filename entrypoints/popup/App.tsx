// entrypoints/popup/App.tsx
import { onMount, Show, For, createSignal, Switch } from "solid-js";
import { useBiliConfig } from "@/hooks/useBiliConfig";
import { TimeInput } from "@/components/TimeInput";
import { HistoryList } from "@/components/HistoryList";
import { TimeRangeManager } from "@/components/TimeRangeItem";
import { browser } from "wxt/browser";
import { Settings, Clock } from "lucide-solid";

// TODO 1. 统一按钮样式，添加 hover 效果，写成一个组件
// TODO 2. 添加组件操作反馈（如应用配置时按钮变色并显示“保存中...”）
// TODO 3. 去除设置页的不必要页面。
// TODO 4. 优化存档功能的用户体验（如添加确认提示、存档成功反馈等）
// isApplying,isArchiving，hover 同样也是不必要的，iscollectpage 和 isreday。

import { getSoftName } from "@/utils/bili";

export default function App() {
    const {
        opRanges,
        setOpRanges,
        frameConfig,
        setFrameConfig,
        jumpConfig,
        setJumpConfig,
        mode,
        setMode,
        isPageReady,
        setIsPageReady,
        latestHistory,
        setLatestHistory,
        pinnedHistory,

        // 方法
        initFromStorage,
        saveMode,
        applyConfig,
        handleArchive,
        loadHistory,
        openOptions,
    } = useBiliConfig();

    const [showTimeManager, setShowTimeManager] = createSignal(false);
    const [isApplying, setIsApplying] = createSignal(false);
    const [isArchiving, setIsArchiving] = createSignal(false);

    const onApply = async (type: "setting" | "reset") => {
        setIsApplying(true);
        await applyConfig(type);
        setTimeout(() => setIsApplying(false), 800);
    };

    // 封装存档逻辑
    const onArchive = async () => {
        setIsArchiving(true);
        await handleArchive();
        setTimeout(() => setIsArchiving(false), 800);
    };

    // 通用 Hover 处理函数
    const handleMouseEnter = (e: MouseEvent, color: string) => {
        (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)";
        (
            e.currentTarget as HTMLButtonElement
        ).style.boxShadow = `0 2px 8px ${color}66`;
    };
    const handleMouseLeave = (e: MouseEvent) => {
        (e.currentTarget as HTMLButtonElement).style.filter = "none";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
    };

    onMount(async () => {
        await initFromStorage();
        const res = await browser.storage.local.get("mode");
        setMode(res.mode === "manual" ? "manual" : "auto");

        const tabs = await browser.tabs.query({
            active: true,
            currentWindow: true,
        });
        const activeTab = tabs[0];
        if (activeTab?.id && activeTab.url?.includes("bilibili.com/video")) {
            try {
                const resp = await browser.tabs.sendMessage(activeTab.id, {
                    type: "QUERY_READY_STATUS",
                });
                if (resp) setIsPageReady(resp.isCollection);
            } catch (e) {
                setIsPageReady(false);
            }
        }

        // 监听后台的自动更新广播
        browser.runtime.onMessage.addListener((msg) => {
            if (msg.type === "SYNC_PAGE_READY") {
                setIsPageReady(msg.isCollection);
            }
            if (msg.type === "REFRESH_HISTORY") setLatestHistory(msg.data);
        });
    });

    return (
        <div
            style={{
                position: "relative",
                width: "280px",
                padding: "15px",
                display: "flex",
                "flex-direction": "column",
                gap: "12px",
                background: "#fff",
            }}
        >
            <h3
                style={{
                    display: "flex",
                    "align-items": "center",
                    "justify-content": "center",
                    margin: "0",
                    "font-size": "16px",
                    color: "#fb7299",
                }}
            >
                {getSoftName()}
                <span
                    style={{
                        "font-size": "10px",
                        "margin-left": "6px",
                        padding: "2px 4px",
                        background: isPageReady() ? "#4caf50" : "#9e9e9e",
                        color: "white",
                        "border-radius": "3px",
                    }}
                >
                    {isPageReady() ? "已就绪" : "待命中"}
                </span>
                <button
                    onClick={openOptions}
                    style={{
                        "font-size": "12px",
                        "margin-left": "6px",
                        padding: "3px 6px",
                        background: "#f6f7f9", // 稍微浅一点的底色，更精致
                        color: "#61666d", // 保持 B 站次要文字颜色
                        border: "1px solid #e3e5e7", // 添加淡淡的边框线
                        "border-radius": "4px", // 加一点圆角
                        cursor: "pointer",
                        display: "inline-flex", // 使用 flex 对齐图标和文字
                        "align-items": "center",
                        gap: "3px", // 图标和文字的间距
                        transition: "all 0.2s", // 添加过渡动画
                    }}
                    // 添加 hover 效果
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = "#ffeef3";
                        e.currentTarget.style.color = "#fb7299";
                        e.currentTarget.style.borderColor = "#ffb3c1";
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = "#f6f7f9";
                        e.currentTarget.style.color = "#61666d";
                        e.currentTarget.style.borderColor = "#e3e5e7";
                    }}
                >
                    <Settings size={14} /> {/* 设置图标，大小要合适 */}
                    设置
                </button>
            </h3>

            <div
                style={{
                    display: "flex",
                    gap: "12px",
                    "justify-content": "center",
                }}
            >
                <For each={["auto", "manual"] as const}>
                    {(m) => (
                        <label
                            style={{
                                display: "flex",
                                "align-items": "center",
                                gap: "4px",
                                "font-size": "12px",
                                cursor: "pointer",
                            }}
                        >
                            <input
                                type="radio"
                                name="mode"
                                checked={mode() === m}
                                onChange={() => saveMode(m)}
                            />
                            {m === "auto" ? "自动检测" : "手动切集"}
                        </label>
                    )}
                </For>
            </div>

            <button
                onClick={() => setShowTimeManager(true)}
                style={{
                    display: "flex",
                    "align-items": "center",
                    "justify-content": "center",
                    gap: "6px",
                    padding: "8px",
                    background: "#fff",
                    color: "#fb7299",
                    border: "1px solid #fb7299",
                    "border-radius": "6px",
                    cursor: "pointer",
                    "font-size": "13px",
                    "font-weight": "bold",
                    transition: "all 0.2s",
                }}
                onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#fff0f3")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#fff")
                }
            >
                <Clock size={16} /> 管理多个跳过时间段
            </button>

            <Show when={showTimeManager()}>
                <TimeRangeManager onClose={() => setShowTimeManager(false)} />
            </Show>

            <div
                style={{
                    display: "flex",
                    "flex-direction": "column",
                    gap: "10px",
                }}
            >
                <Switch>
                    <Match when={mode() === "auto"}>
                        <TimeInput
                            label="帧"
                            hour={frameConfig().h}
                            minute={frameConfig().m}
                            second={frameConfig().s}
                            onHourChange={setFrameConfig}
                            onMinuteChange={setFrameConfig}
                            onSecondChange={setFrameConfig}
                        />
                    </Match>
                    <Match when={mode() === "manual"}>
                        <TimeInput
                            label="切"
                            hour={jumpConfig().h}
                            minute={jumpConfig().m}
                            second={jumpConfig().s}
                            onHourChange={setJumpConfig}
                            onMinuteChange={setJumpConfig}
                            onSecondChange={setJumpConfig}
                        />
                    </Match>
                </Switch>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
                <button
                    onClick={() => onApply("setting")}
                    disabled={isApplying()}
                    onMouseEnter={(e) => handleMouseEnter(e, "#fb7299")}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        flex: 1.2,
                        background: "#fb7299",
                        color: "white",
                        border: "none",
                        padding: "8px 4px",
                        "border-radius": "6px",
                        cursor: isApplying() ? "default" : "pointer",
                        "font-weight": "bold",
                        transition: "all 0.2s",
                        opacity: isApplying() ? 0.8 : 1,
                    }}
                >
                    {isApplying() ? "保存中..." : "应用"}
                </button>

                {/* 重置按钮 */}
                <button
                    onClick={() => onApply("reset")}
                    onMouseEnter={(e) => handleMouseEnter(e, "#e3e5e7")}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        flex: 1,
                        background: "#e3e5e7",
                        color: "#61666d",
                        border: "none",
                        padding: "8px 4px",
                        "border-radius": "6px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                    }}
                >
                    重置
                </button>

                {/* 存档按钮 */}
                <button
                    onClick={onArchive}
                    disabled={isArchiving()}
                    onMouseEnter={(e) => handleMouseEnter(e, "#00aeec")}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        flex: 1.2,
                        background: "#00aeec",
                        color: "white",
                        border: "none",
                        padding: "8px 4px",
                        "border-radius": "6px",
                        cursor: isArchiving() ? "default" : "pointer",
                        "font-weight": "bold",
                        transition: "all 0.2s",
                        opacity: isArchiving() ? 0.8 : 1,
                    }}
                >
                    {isArchiving() ? "存档中..." : "存档"}
                </button>
            </div>

            <HistoryList
                latest={latestHistory()}
                pinned={pinnedHistory()}
                onLoadHistory={loadHistory}
            />
        </div>
    );
}
