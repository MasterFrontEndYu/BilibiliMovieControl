// entrypoints/popup/App.tsx
import { onMount, Show, For, createSignal, Switch } from "solid-js";
import { useBiliConfig } from "@/hooks/useBiliConfig";
import { TimeInput } from "@/components/TimeInput";
import { HistoryList } from "@/components/HistoryList";
import { TimeRangeManager } from "@/components/TimeRangeItem";
import { browser } from "wxt/browser";
import { Settings, Clock } from "lucide-solid";

import { getSoftName } from "@/utils/bili";
import StyledButton from "@/components/StyledButton";

// TODO 全局配置修改为，可以添加多个网页地址，让插件生效。目前只针对B站。


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

    onMount(async () => {
        await initFromStorage();

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
                        margin: "0 6px",
                        padding: "2px 4px",
                        background: isPageReady() ? "#4caf50" : "#9e9e9e",
                        color: "white",
                        "border-radius": "3px",
                    }}
                >
                    {isPageReady() ? "已就绪" : "待命中"}
                </span>
                <StyledButton
                    variant="ghost"
                    size="small"
                    onClick={openOptions}
                    icon={<Settings size={14} />}
                >
                    设置
                </StyledButton>
            </h3>

            <div
                style={{
                    display: "flex",
                    gap: "12px",
                    "justify-content": "center",
                }}
            >
                <For each={["frame", "manual"] as const}>
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
                            {m === "frame" ? "帧分析" : "手动切集"}
                        </label>
                    )}
                </For>
            </div>

            <StyledButton
                variant="secondary"
                loadingText="保存中..."
                onClick={[setShowTimeManager, true]}
                fullWidth
                icon={<Clock size={14} />}
            >
                管理多个跳过时间段
            </StyledButton>

            <Show when={showTimeManager()}>
                <TimeRangeManager
                    ranges={opRanges()}
                    onUpdate={setOpRanges}
                    onClose={() => setShowTimeManager(false)}
                />
            </Show>

            <div
                style={{
                    display: "flex",
                    "flex-direction": "column",
                    gap: "10px",
                }}
            >
                <Switch>
                    <Match when={mode() === "frame"}>
                        <TimeInput
                            label="帧"
                            hour={frameConfig().h}
                            minute={frameConfig().m}
                            second={frameConfig().s}
                            // 必须通过展开运算符更新特定字段
                            onHourChange={(val) =>
                                setFrameConfig({ ...frameConfig(), h: val })
                            }
                            onMinuteChange={(val) =>
                                setFrameConfig({ ...frameConfig(), m: val })
                            }
                            onSecondChange={(val) =>
                                setFrameConfig({ ...frameConfig(), s: val })
                            }
                        />
                    </Match>
                    <Match when={mode() === "manual"}>
                        <TimeInput
                            label="切"
                            hour={jumpConfig().h}
                            minute={jumpConfig().m}
                            second={jumpConfig().s}
                            onHourChange={(val) =>
                                setJumpConfig({ ...jumpConfig(), h: val })
                            }
                            onMinuteChange={(val) =>
                                setJumpConfig({ ...jumpConfig(), m: val })
                            }
                            onSecondChange={(val) =>
                                setJumpConfig({ ...jumpConfig(), s: val })
                            }
                        />
                    </Match>
                </Switch>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
                <StyledButton
                    variant="primary"
                    loadingText="保存中..."
                    onClick={[applyConfig, "setting"]}
                    icon={<Settings size={14} />}
                >
                    应用
                </StyledButton>

                <StyledButton
                    variant="reset"
                    loadingText="重置中..."
                    onClick={[applyConfig, "reset"]}
                    icon={<Settings size={14} />}
                >
                    重置
                </StyledButton>

                <StyledButton
                    variant="secondary"
                    loadingText="存档中..."
                    onClick={handleArchive}
                    icon={<Settings size={14} />}
                >
                    存档
                </StyledButton>
            </div>

            <HistoryList
                latest={latestHistory()}
                pinned={pinnedHistory()}
                onLoadHistory={loadHistory}
            />
        </div>
    );
}
