// entrypoints/options/pages/About.tsx
import {
    Monitor,
    Cpu,
    FastForward,
    Bookmark,
    History,
    AlertCircle,
    PlayCircle
} from 'lucide-solid';

export default function AboutPage() {
    return (
        <div style={{ "max-width": "900px", margin: "0 auto" }}>
            {/* 头部标题 */}
            <header style={{ "margin-bottom": "40px" }}>
                <h1 style={{ "font-size": "32px", margin: "0 0 12px 0", color: "#fb7299", "display": "flex", "align-items": "center", gap: "12px" }}>
                    <PlayCircle size={36} /> BilibiliMovieControl
                </h1>
                <p style={{ color: "#61666d", "font-size": "16px", "line-height": "1.6" }}>
                    专为 Bilibili 合集视频打造的连播助手。通过智能检测与个性化存档，让你的观看体验更丝滑。
                </p>
            </header>

            {/* 核心提示：适用范围 */}
            <div style={{
                background: "#fff1f4", border: "1px solid #ffb3c1", padding: "20px",
                "border-radius": "12px", "margin-bottom": "30px", display: "flex", gap: "15px", "align-items": "center"
            }}>
                <AlertCircle color="#fb7299" size={24} style={{ "flex-shrink": 0 }} />
                <div>
                    <strong style={{ color: "#fb7299", "font-size": "16px" }}>适用范围说明</strong>
                    <p style={{ margin: "4px 0 0 0", color: "#61666d", "font-size": "14px" }}>
                        本插件仅针对 B 站用户上传的<strong>“合集”</strong>（显示选集列表的视频）生效。对普通单个视频或非合集页面无效。
                    </p>
                </div>
            </div>

            {/* 功能卡片列表 */}
            <div style={{ display: "grid", "grid-template-columns": "repeat(2, 1x)", gap: "20px" }}>

                {/* 1. 模式选择 */}
                <section style={cardStyle}>
                    <div style={iconBoxStyle}><Monitor color="#fb7299" /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={cardTitleStyle}>模式选择</h3>
                        <p style={cardTextStyle}>
                            <strong>自动模式：</strong> 采用像素级帧分析技术，实时检测视频末尾是否出现黑屏或静止画面。符合条件即自动跳转。
                        </p>
                        <div style={tagBoxStyle}>
                            <span style={tagStyle}><Cpu size={12} /> 性能优化：仅在视频最后 15% 阶段开启分析</span>
                        </div>
                        <p style={{ ...cardTextStyle, "margin-top": "10px" }}>
                            <strong>手动模式：</strong> 提供精确到秒的时间输入框，到达预设时间点准时切集。
                        </p>
                    </div>
                </section>

                {/* 2. 跳过功能 */}
                <section style={cardStyle}>
                    <div style={iconBoxStyle}><FastForward color="#fb7299" /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={cardTitleStyle}>OP / 先导跳过</h3>
                        <p style={cardTextStyle}>
                            针对片头较长的视频，可手动设置“跳过区间”。当播放进度进入该区间时，插件将自动跨越到设定的结束时间点。
                        </p>
                    </div>
                </section>

                {/* 3. 最近播放 */}
                <section style={cardStyle}>
                    <div style={iconBoxStyle}><History color="#fb7299" /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={cardTitleStyle}>最近播放</h3>
                        <p style={cardTextStyle}>
                            后台自动记录最近播放的两条合集视频。当你再次打开相同视频时，插件会自动同步之前的跳转配置。
                        </p>
                    </div>
                </section>

                {/* 4. 手动存档 */}
                <section style={cardStyle}>
                    <div style={iconBoxStyle}><Bookmark color="#fb7299" /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={cardTitleStyle}>手动存档</h3>
                        <p style={cardTextStyle}>
                            支持最多 3 条长期手动存档。点击“存档”按钮将当前合集标题、URL 及所有跳过参数永久封存。再次点击列表中的记录可一键还原所有设置。
                        </p>
                    </div>
                </section>

            </div>

            <footer style={{ "text-align": "center", "margin-top": "50px", color: "#9499a0", "font-size": "13px" }}>
                <p>© 2026 BilibiliMovieControl. 仅供学习与交流使用。</p>
            </footer>
        </div>
    );
}

// --- 样式定义 (复用 History 页面的卡片逻辑) ---
const cardStyle = {
    background: "#fff",
    padding: "24px",
    "border-radius": "16px",
    display: "flex",
    gap: "20px",
    border: "1px solid #e3e5e7",
    "box-shadow": "0 2px 10px rgba(0,0,0,0.03)"
};

const iconBoxStyle = {
    width: "48px",
    height: "48px",
    background: "#ffeef3",
    "border-radius": "12px",
    display: "flex",
    "align-items": "center",
    "justify-content": "center",
    "flex-shrink": 0
};

const cardTitleStyle = {
    margin: "0 0 10px 0",
    "font-size": "18px",
    color: "#18191c"
};

const cardTextStyle = {
    margin: "0",
    "font-size": "14px",
    color: "#61666d",
    "line-height": "1.6"
};

const tagBoxStyle = {
    "margin-top": "8px",
    display: "flex"
};

const tagStyle = {
    background: "#f6f7f9",
    color: "#9499a0",
    padding: "4px 8px",
    "border-radius": "4px",
    "font-size": "12px",
    display: "flex",
    "align-items": "center",
    gap: "4px"
};