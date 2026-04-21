import { render } from "solid-js/web";
import { createSignal, Show } from "solid-js";
import { browser } from "wxt/browser";
import {
    initFrameAnalyzer,
    getMainVideo,
    checkEndingByFrame,
    resetFrameAnalyzer,
    updateAnalyzerConfig,
    destroyFrameAnalyzer,
} from "../utils/frameAnalyzer";
import { TimeRange, TimePoint } from "@/assets/types";

// TODO 1. 将ui 移至components，content只负责逻辑和状态管理

export default defineContentScript({
    matches: ["*://*.bilibili.com/video/*"],
    cssInjectionMode: "manual",

    async main(ctx) {
        // --- 1. 响应式状态 ---
        const [opRanges, setOpRanges] = createSignal<TimeRange[]>([]);
        const [frameConfig, setFrameConfig] = createSignal<TimePoint>({
            h: 0,
            m: 0,
            s: 0,
        });
        const [jumpConfig, setJumpConfig] = createSignal<TimePoint>({
            h: 0,
            m: 0,
            s: 0,
        });

        const [isCollectionPage, setIsCollectionPage] = createSignal(false);
        const [mode, setMode] = createSignal<"frame" | "manual">("frame");
        const [isAnalyzing, setIsAnalyzing] = createSignal(false);

        let lastUrl = location.href;
        let lastJumpTime = 0;
        let disposeUI: (() => void) | null = null;

        // --- 2. 核心辅助函数 ---

        // 转换 TimePoint 为秒数
        const toSeconds = (t: TimePoint) =>
            (t.h || 0) * 3600 + (t.m || 0) * 60 + (t.s || 0);

        // 更新配置逻辑 (清理了 threshold 相关的复杂转换)
        const updateConfig = (data: any) => {
            if (data.opRanges) setOpRanges(data.opRanges);
            if (data.frameConfig) setFrameConfig(data.frameConfig);
            if (data.jumpConfig) setJumpConfig(data.jumpConfig);
            if (data.mode) setMode(data.mode);

            // 如果有算法敏感度设置，依然可以通过 updateAnalyzerConfig 传给分析器
            // 但不再包含时间/百分比逻辑
            if (data.analyzerSettings) {
                updateAnalyzerConfig(data.analyzerSettings);
            }
        };

        // UI 挂载
        const mountUI = () => {
            if (!isCollectionPage()) return;
            const anchor =
                document.getElementById("viewbox_report") ||
                document.querySelector(".video-info-title") ||
                document.querySelector(".cl-info-title");

            if (!anchor || document.getElementById("bili-skip-wrapper-unique"))
                return;

            const mountPoint = document.createElement("span");
            mountPoint.id = "bili-skip-wrapper-unique";
            anchor.appendChild(mountPoint);

            const format = (t: TimePoint) => {
                const pad = (n: number) => n.toString().padStart(2, "0");
                return `${t.h}:${pad(t.m)}:${pad(t.s)}`;
            };

            disposeUI = render(
                () => (
                    <Show when={isCollectionPage()}>
                        <div
                            style={{
                                display: "inline-flex",
                                "align-items": "center",
                                gap: "8px",
                                padding: "2px 12px",
                                background: "#fb7299",
                                color: "white",
                                "border-radius": "8px",
                                "font-size": "12px",
                                "vertical-align": "middle",
                                "box-shadow": "0 2px 6px rgba(251,114,153,0.3)",
                                "font-family": "sans-serif",
                            }}
                        >
                            <span title="跳过段数">
                                ⏭ {opRanges().length}段
                            </span>
                            <span style={{ opacity: 0.5 }}>|</span>
                            <span>
                                {mode() === "manual"
                                    ? `🏁 切集点: ${format(jumpConfig())}`
                                    : `🔍 分析起点: ${format(frameConfig())}`}
                            </span>
                            <Show when={isAnalyzing()}>
                                <span
                                    style={{
                                        "margin-left": "4px",
                                        animation: "blink 1s infinite",
                                        color: "#fff",
                                    }}
                                >
                                    ●
                                </span>
                            </Show>
                        </div>
                    </Show>
                ),
                mountPoint,
            );
        };

        const executeJump = () => {
            const now = Date.now();
            if (now - lastJumpTime < 3000) return;
            const nextBtn = document.querySelector(
                ".bpx-player-ctrl-next",
            ) as HTMLElement;
            if (nextBtn) {
                lastJumpTime = now;
                nextBtn.click();
                resetFrameAnalyzer();
            }
        };

        const runControlLogic = () => {
            const video = getMainVideo();
            if (!video || video.readyState < 2) return;

            const cur = video.currentTime;

            // 1. 处理多段跳过 (opRanges)
            for (const range of opRanges()) {
                const start = toSeconds(range.start);
                const end = toSeconds(range.end);
                if (end > start && cur >= start && cur < end) {
                    video.currentTime = end;
                    return;
                }
            }

            // 2. 处理自动/手动切集逻辑
            if (mode() === "manual") {
                const jumpTime = toSeconds(jumpConfig());
                if (jumpTime > 0 && cur >= jumpTime) executeJump();
            } else {
                // 自动模式：到达精准时间点开启分析
                const analyzeStartTime = toSeconds(frameConfig());
                if (analyzeStartTime > 0 && cur >= analyzeStartTime) {
                    if (!isAnalyzing()) setIsAnalyzing(true);

                    // 执行帧分析逻辑 (接口已简化，只传 video 和状态)
                    if (checkEndingByFrame(video, !video.paused)) {
                        executeJump();
                        setIsAnalyzing(false);
                    }
                } else {
                    if (isAnalyzing()) setIsAnalyzing(false);
                }
            }
        };

        // --- 3. 初始化 ---
        const stored = await browser.storage.local.get([
            "opRanges",
            "frameConfig",
            "jumpConfig",
            "mode",
        ]);
        updateConfig(stored);

        // 初始启动分析器
        initFrameAnalyzer();

        // 监听消息更新
        const handleMessage = (msg: any, sender: any, sendResponse: any) => {
            if (msg.type === "UPDATE_CONFIG") {
                updateConfig(msg.data);
            }
            if (msg.type === "SET_MODE") setMode(msg.mode);
            if (msg.type === "QUERY_READY_STATUS") {
                sendResponse({ isCollection: isCollectionPage() });
            }
            mountUI();
        };
        browser.runtime.onMessage.addListener(handleMessage);

        // --- 4. 主循环 ---
        const mainTimer = setInterval(() => {
            const isCol = !!(
                document.querySelector(".video-pod") ||
                document.querySelector(".multi-page") ||
                document.querySelector(".cur-list")
            );

            if (isCol !== isCollectionPage()) {
                setIsCollectionPage(isCol);
                browser.runtime
                    .sendMessage({
                        type: "SYNC_PAGE_READY",
                        isCollection: isCol,
                    })
                    .catch(() => {});
            }

            if (isCol) {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    lastJumpTime = 0;
                    resetFrameAnalyzer();
                    setTimeout(mountUI, 1000);
                }
                mountUI();
                runControlLogic();
            } else {
                const ui = document.getElementById("bili-skip-wrapper-unique");
                if (ui) ui.remove();
            }
        }, 1000);

        ctx.onInvalidated(() => {
            clearInterval(mainTimer);
            browser.runtime.onMessage.removeListener(handleMessage);
            disposeUI?.();
            document.getElementById("bili-skip-wrapper-unique")?.remove();
            destroyFrameAnalyzer();
        });
    },
});
