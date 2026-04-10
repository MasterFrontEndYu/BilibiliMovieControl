// entrypoints/options/pages/History.tsx
import { createSignal, onMount, For, Show } from 'solid-js';
import { Trash2, ExternalLink, History as HistoryIcon, Info } from 'lucide-solid';
import { browser } from 'wxt/browser';

// 定义和 Background/Popup 一致的接口
import type { HistoryItem } from '@/assets/types';

export default function HistoryPage() {
    const [pinnedHistory, setPinnedHistory] = createSignal<HistoryItem[]>([]);

    // 初始化加载
    onMount(async () => {
        const res = await browser.storage.local.get({ pinnedHistory: [] });
        setPinnedHistory(res.pinnedHistory as HistoryItem[]);
    });

    // 删除单条
    const deleteItem = async (url: string) => {
        const updated = pinnedHistory().filter(item => item.url !== url);
        setPinnedHistory(updated);
        await browser.storage.local.set({ pinnedHistory: updated });
    };

    // 清空所有
    const clearAll = async () => {
        if (confirm('确定要清空所有手动历史记录吗？')) {
            setPinnedHistory([]);
            await browser.storage.local.set({ pinnedHistory: [] });
        }
    };

    return (
        <div style={{ "max-width": "900px", margin: "0 auto" }}>
            <header style={{ display: "flex", "justify-content": "space-between", "align-items": "center", "margin-bottom": "40px" }}>
                <div>
                    <h1 style={{ "font-size": "32px", margin: "0 0 12px 0", color: "#fb7299", "display": "flex", "align-items": "center", gap: "12px" }}>
                        <HistoryIcon size={36} /> 手动存档管理
                    </h1>
                    <p style={{ color: "#61666d", "font-size": "16px", "line-height": "1.6" }}>
                        系统会手动记录符合连播条件的视频配置，方便下次直接使用。
                    </p>
                </div>
                <Show when={pinnedHistory().length > 0}>
                    <button
                        onClick={clearAll}
                        style={{ padding: "8px 16px", background: "#fff", border: "1px solid #ff4d4f", color: "#ff4d4f", "border-radius": "6px", cursor: "pointer" }}
                    >
                        清空记录
                    </button>
                </Show>
            </header>

            {/* 列表容器 */}
            <div style={{ display: "flex", "flex-direction": "column", gap: "15px" }}>
                <For each={pinnedHistory()}>
                    {(item) => (
                        <div style={{
                            background: "#fff", padding: "20px", "border-radius": "12px",
                            display: "flex", "justify-content": "space-between", "align-items": "center",
                            "box-shadow": "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #e3e5e7"
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ "font-weight": "bold", "font-size": "16px", "margin-bottom": "8px", color: "#18191c" }}>
                                    {item.title}
                                </div>
                                <div style={{ display: "flex", gap: "20px", "font-size": "13px", color: "#61666d" }}>
                                    <span>⏱️ 跳过: {item.config.sM}分{item.config.sS}秒 - {item.config.mM}分{item.config.mS}秒</span>
                                    <span>📅 记录于: {new Date(item.time).toLocaleString()}</span>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "12px", "margin-left": "20px" }}>
                                <a
                                    href={item.url} target="_blank"
                                    style={{
                                        display: "flex", "align-items": "center", gap: "6px", padding: "8px 16px",
                                        background: "#fb7299", color: "#fff", "text-decoration": "none",
                                        "border-radius": "6px", "font-size": "14px", "font-weight": "500"
                                    }}
                                >
                                    <ExternalLink size={16} /> 回看
                                </a>
                                <button
                                    onClick={() => deleteItem(item.url)}
                                    style={{
                                        padding: "8px", background: "#f6f7f9", border: "none",
                                        "border-radius": "6px", cursor: "pointer", color: "#9499a0"
                                    }}
                                    title="删除此条记录"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </For>

                {/* 空状态 */}
                <Show when={pinnedHistory().length === 0}>
                    <div style={{
                        "text-align": "center", padding: "80px 0", background: "#fff",
                        "border-radius": "16px", border: "1px dashed #e3e5e7"
                    }}>
                        <div style={{ "font-size": "40px", "margin-bottom": "16px" }}>📄</div>
                        <p style={{ color: "#9499a0", margin: "0" }}>暂无手动记录，快去观看合集视频吧</p>
                    </div>
                </Show>
            </div>

            {/* 底部提示 */}
            <footer style={{ "margin-top": "30px", padding: "15px", background: "#eef3f7", "border-radius": "8px", display: "flex", gap: "10px" }}>
                <Info size={18} color="#00aeec" style={{ "flex-shrink": 0 }} />
                <p style={{ margin: "0", "font-size": "12px", color: "#61666d", "line-height": "1.5" }}>
                    <b>关于手动存档：</b> 
                    用户可以在视频播放过程中点击插件图标，选择“手动存档”来保存当前的跳过配置和视频信息，以便下次直接使用。
                    Options 页面会保留最近的 50 条记录。
                    但popup页面指挥显示最新的 2 条记录
                </p>
            </footer>
        </div>
    );
}