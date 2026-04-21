import { createSignal, For } from "solid-js";
import { TimeInput } from "@/components/TimeInput";
import { Trash2, Clock, Plus } from "lucide-solid";
import type { TimeRange, TimeRangeManagerProps } from "@/assets/types"; // 从统一类型文件导入

// TODO 保存到浏览器数据库，并通知页面更新（目前仅在内存中管理，刷新后会丢失）

export const TimeRangeManager = (props: TimeRangeManagerProps) => {
    // 当前正在编辑的时间状态（仅用于新增时段，不直接修改外部列表）
    const defaultTime = () => ({ h: 0, m: 0, s: 0 });
    const [currentStart, setCurrentStart] = createSignal(defaultTime());
    const [currentEnd, setCurrentEnd] = createSignal(defaultTime());

    // 辅助函数：格式化显示
    const formatTime = (t: { h: number; m: number; s: number }) =>
        [t.h, t.m, t.s].map((v) => String(v).padStart(2, "0")).join(":");

    // 添加到列表（调用 onUpdate）
    const handleConfirm = () => {
        const newRange: TimeRange = {
            id: crypto.randomUUID(),
            start: { ...currentStart() },
            end: { ...currentEnd() },
        };
        props.onUpdate([...props.ranges, newRange]);
        handleResetInput(); // 添加完重置输入框
    };

    // 删除时间段
    const handleRemove = (id: string) => {
        props.onUpdate(props.ranges.filter((r) => r.id !== id));
    };

    // 点击列表项：回填数据到编辑框（方便快速修改）
    const handleSelect = (range: TimeRange) => {
        setCurrentStart({ ...range.start });
        setCurrentEnd({ ...range.end });
    };

    // 重置编辑框
    const handleResetInput = () => {
        setCurrentStart(defaultTime());
        setCurrentEnd(defaultTime());
    };

    return (
        <div
            style={{
                position: "absolute",
                width: "100%",
                left: 0,
                top: 0,
                padding: "8px",
                background: "#fff",
                "border-radius": "8px",
                display: "flex",
                "flex-direction": "column",
                "box-sizing": "border-box",
            }}
        >
            {/* 1. 顶部列表 */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    "flex-direction": "column",
                    padding: "8px",
                    background: "#f6f7f9",
                }}
            >
                <div
                    style={{
                        "font-size": "12px",
                        color: "#9499a0",
                        "margin-bottom": "4px",
                        "font-weight": "bold",
                    }}
                >
                    已保存的时段 ({props.ranges.length})
                </div>
                <div
                    style={{
                        "overflow-y": "auto",
                        height: "140px",
                    }}
                >
                    <For
                        each={props.ranges}
                        fallback={
                            <div
                                style={{
                                    margin: "auto",
                                    color: "#ccc",
                                    "font-size": "12px",
                                }}
                            >
                                暂无跳过时段
                            </div>
                        }
                    >
                        {(range) => (
                            <div
                                onClick={() => handleSelect(range)}
                                style={{
                                    display: "flex",
                                    "justify-content": "space-between",
                                    "align-items": "center",
                                    padding: "4px 10px",
                                    background: "#fff",
                                    border: "1px solid #e3e5e7",
                                    "border-radius": "4px",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.borderColor =
                                        "#fb7299")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.borderColor =
                                        "#e3e5e7")
                                }
                            >
                                <span
                                    style={{
                                        "font-size": "13px",
                                        color: "#61666d",
                                        "font-family": "monospace",
                                    }}
                                >
                                    {formatTime(range.start)} -{" "}
                                    {formatTime(range.end)}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(range.id);
                                    }}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#9499a0",
                                        cursor: "pointer",
                                        padding: "4px",
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </For>
                </div>
            </div>

            {/* 2. 中间编辑区 */}
            <div
                style={{
                    padding: "12px",
                    "margin-top": "6px",
                    background: "#fffafb",
                    display: "flex",
                    "flex-direction": "column",
                    gap: "10px",
                }}
            >
                <div
                    style={{
                        "font-size": "12px",
                        color: "#fb7299",
                        "font-weight": "bold",
                        display: "flex",
                        "align-items": "center",
                        gap: "4px",
                    }}
                >
                    <Clock size={14} /> 设定新时段
                </div>

                <TimeInput
                    label="从"
                    hour={currentStart().h}
                    minute={currentStart().m}
                    second={currentStart().s}
                    onHourChange={(v) =>
                        setCurrentStart({ ...currentStart(), h: v })
                    }
                    onMinuteChange={(v) =>
                        setCurrentStart({ ...currentStart(), m: v })
                    }
                    onSecondChange={(v) =>
                        setCurrentStart({ ...currentStart(), s: v })
                    }
                />

                <TimeInput
                    label="至"
                    hour={currentEnd().h}
                    minute={currentEnd().m}
                    second={currentEnd().s}
                    onHourChange={(v) =>
                        setCurrentEnd({ ...currentEnd(), h: v })
                    }
                    onMinuteChange={(v) =>
                        setCurrentEnd({ ...currentEnd(), m: v })
                    }
                    onSecondChange={(v) =>
                        setCurrentEnd({ ...currentEnd(), s: v })
                    }
                />
            </div>

            {/* 3. 底部操作栏 */}
            <div
                style={{
                    display: "flex",
                    gap: "8px",
                    "margin-top": "auto",
                    "padding-top": "10px",
                    "border-top": "1px solid #f1f2f3",
                }}
            >
                <StyledButton
                    variant="primary"
                    loadingText="保存中..."
                    onClick={handleConfirm}
                >
                    保存
                </StyledButton>

                <StyledButton
                    variant="reset"
                    loadingText="重置中..."
                    onClick={handleResetInput}
                >
                    重置
                </StyledButton>
                <StyledButton variant="reset" onClick={() => props.onClose()}>
                    取消
                </StyledButton>
            </div>
        </div>
    );
};
