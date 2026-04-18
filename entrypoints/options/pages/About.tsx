import {
    Monitor,
    Cpu,
    FastForward,
    Bookmark,
    History,
    CircleAlert,
    CirclePlay,
    Settings2
} from 'lucide-solid';
import { getSoftName } from '@/utils/bili';


export default function AboutPage() {
    return (
        <div style={{ "max-width": "900px", margin: "0 auto", padding: "20px 0" }}>
            {/* 头部标题 */}
            <header style={{ "margin-bottom": "40px" }}>
                <h1 style={{ "font-size": "32px", margin: "0 0 12px 0", color: "#fb7299", "display": "flex", "align-items": "center", gap: "12px" }}>
                    <CirclePlay size={36} />{getSoftName()}
                </h1>
                <p style={{ color: "#61666d", "font-size": "16px", "line-height": "1.6" }}>
                    专为 Bilibili 合集视频打造的连播助手。通过像素级帧分析与灵活的存档机制，让你的追剧体验真正实现“无人值守”。
                </p>
            </header>

            {/* 核心提示：适用范围 */}
            <div style={{
                background: "#fff1f4", border: "1px solid #ffb3c1", padding: "20px",
                "border-radius": "12px", "margin-bottom": "30px", display: "flex", gap: "15px", "align-items": "center"
            }}>
                <CircleAlert color="#fb7299" size={24} style={{ "flex-shrink": 0 }} />
                <div>
                    <strong style={{ color: "#fb7299", "font-size": "16px" }}>适用范围说明</strong>
                    <p style={{ margin: "4px 0 0 0", color: "#61666d", "font-size": "14px" }}>
                        本插件仅针对 B 站用户上传的<strong>“合集”</strong>（即播放器右侧显示选集列表的视频）生效。对电影、番剧正片或普通单视频无效。
                    </p>
                </div>
            </div>

            {/* 功能卡片列表 - 修改为网格布局 */}
            <div style={{
                display: "grid",
                "grid-template-columns": "repeat(2, 1fr)",
                gap: "20px"
            }}>

                {/* 1. 模式选择 */}
                <section style={cardStyle}>
                    <div style={iconBoxStyle}><Monitor color="#fb7299" /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={cardTitleStyle}>模式选择</h3>
                        <p style={cardTextStyle}>
                            <strong>自动模式：</strong> 采用后台像素级分析，检测视频末尾黑屏即跳。无需手动干预，默认在最后 15% 阶段开启。
                        </p>
                        <p style={{ ...cardTextStyle, "margin-top": "10px" }}>
                            <strong>手动模式：</strong> 自定义切集时间点，精准控制每一秒。
                        </p>
                    </div>
                </section>

                {/* 2. 跳过功能 */}
                <section style={cardStyle}>
                    <div style={iconBoxStyle}><FastForward color="#fb7299" /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={cardTitleStyle}>OP / 先导跳过</h3>
                        <p style={cardTextStyle}>
                            针对片头较长的合集，可设置跳过区间。一旦进入预设范围，插件将瞬间跨越到正片起始位置。
                        </p>
                    </div>
                </section>

                {/* 3. 自动存档 (最近播放) */}
                <section style={cardStyle}>
                    <div style={iconBoxStyle}><History color="#fb7299" /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={cardTitleStyle}>自动存档</h3>
                        <p style={cardTextStyle}>
                            系统自动记录最近 20 条合集配置。Popup 界面优先展示最近 2 条，再次访问时自动恢复 OP 跳过与切集参数。
                        </p>
                    </div>
                </section>

                {/* 4. 手动存档 */}
                <section style={cardStyle}>
                    <div style={iconBoxStyle}><Bookmark color="#fb7299" /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={cardTitleStyle}>手动存档</h3>
                        <p style={cardTextStyle}>
                            支持最多 20 条长期手动配置，可一键锁定你最喜爱的合集参数。点击存档即可快速同步时间点。
                        </p>
                    </div>
                </section>

                {/* 5. 性能与调节 (跨两列显示或普通显示) */}
                <section style={{ ...cardStyle, "grid-column": "span 2" }}>
                    <div style={iconBoxStyle}><Settings2 color="#fb7299" /></div>
                    <div style={{ flex: 1 }}>
                        <h3 style={cardTitleStyle}>进阶设置</h3>
                        <div style={{ display: "flex", gap: "40px" }}>
                            <div style={{ flex: 1 }}>
                                <p style={cardTextStyle}>
                                    <strong>读帧起始进度：</strong> 可调节分析起始点。设置 90% 以上可显著降低 CPU 占用；针对有超长后记的合集，建议调低数值。
                                </p>
                            </div>
                            <div style={tagBoxStyle}>
                                <span style={tagStyle}><Cpu size={12} /> 动态 CPU 优化技术已启用</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

// --- 样式定义 ---
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
    color: "#18191c",
    "font-weight": "600"
};

const cardTextStyle = {
    margin: "0",
    "font-size": "14px",
    color: "#61666d",
    "line-height": "1.6"
};

const tagBoxStyle = {
    display: "flex",
    "align-items": "center"
};

const tagStyle = {
    background: "#f6f7f9",
    color: "#9499a0",
    padding: "6px 12px",
    "border-radius": "6px",
    "font-size": "12px",
    display: "flex",
    "align-items": "center",
    gap: "6px",
    border: "1px solid #e3e5e7"
};