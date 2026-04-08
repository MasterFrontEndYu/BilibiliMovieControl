// entrypoints/options/pages/Home.tsx
import { createSignal, onMount, Switch, Match } from 'solid-js';
import { Save, CircleCheck, CircleAlert, Settings  } from 'lucide-solid';
import { browser } from 'wxt/browser';

export default function Home() {
    // 设置项状态
    const [frameThreshold, setFrameThreshold] = createSignal(85);
    const [saveStatus, setSaveStatus] = createSignal<'idle' | 'success'>('idle');

    // 初始化加载
    onMount(async () => {
        const res = await browser.storage.local.get({ frameThreshold: 85 });
        setFrameThreshold(res.frameThreshold as number);
    });

    // 保存逻辑
    const saveSettings = async () => {
        await browser.storage.local.set({ frameThreshold: frameThreshold() });
        const tabs = await browser.tabs.query({ url: '*://*.bilibili.com/*' });
        tabs.forEach(tab => {
            if (tab.id) {
                browser.tabs.sendMessage( tab.id, {
                    type: 'UPDATE_CONFIG',
                    frameThreshold: frameThreshold()
                }).catch(() => {
                    // 忽略没有 Content Script 的页面报错
                });
            }
        });
        setSaveStatus('success');
        // 2秒后恢复按钮状态
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    return (
        <div style={{ "max-width": "900px", margin: "0 auto" }}>
            <header style={{ "margin-bottom": "40px" }}>
                <div>
                    <h1 style={{ "font-size": "32px", margin: "0 0 12px 0", color: "#fb7299", "display": "flex", "align-items": "center", gap: "12px" }}>
                        <Settings size={36} /> 全局配置
                    </h1>
                    <p style={{ color: "#61666d", "font-size": "16px", "line-height": "1.6" }}>
                        调整插件的自动化运行参数，优化性能与准确度
                    </p>
                </div>
            </header>
            <div style={{
                background: '#fff',
                padding: '32px',
                'border-radius': '16px',
                'box-shadow': '0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #e3e5e7'
            }}>

                {/* 滑块区域 */}
                <div style={{ 'margin-bottom': '32px' }}>
                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '16px' }}>
                        <span style={{ 'font-weight': '600', 'font-size': '16px' }}>视频读帧起始进度</span>
                        <span style={{ color: '#fb7299', 'font-weight': 'bold', 'font-size': '20px' }}>{frameThreshold()}%</span>
                    </div>

                    <input
                        type="range"
                        min="50"
                        max="98"
                        step="1"
                        value={frameThreshold()}
                        onInput={(e) => setFrameThreshold(parseInt(e.currentTarget.value))}
                        style={{
                            width: '100%',
                            cursor: 'pointer',
                            "accent-color": '#fb7299',
                            height: '6px',
                            outline: 'none'
                        }}
                    />

                    <div style={{ display: 'flex', 'justify-content': 'space-between', 'font-size': '13px', color: '#9499a0', 'margin-top': '12px' }}>
                        <span>50% (较早开始扫描)</span>
                        <span>98% (极晚开始)</span>
                    </div>
                </div>

                {/* 提示卡片 */}
                <div style={{
                    padding: '16px',
                    background: '#f6f7f9',
                    'border-radius': '10px',
                    display: 'flex',
                    gap: '12px',
                    'margin-bottom': '32px',
                    border: '1px solid #eee'
                }}>
                    <CircleAlert size={20} color="#9499a0" style={{ 'flex-shrink': 0 }} />
                    <p style={{ margin: '0', 'font-size': '14px', color: '#61666d', 'line-height': '1.5' }}>
                        起始进度决定了插件何时开始在后台对视频进行“像素级分析”。
                        设置越高（如 90%）对 CPU 压力越小；如果合集视频在中间有超长后记（如 20 分钟正片后接 5 分钟黑屏），请适当调低此数值以确保能检测到。
                    </p>
                </div>

                {/* 保存按钮 */}
                <button
                    onClick={saveSettings}
                    disabled={saveStatus() === 'success'}
                    style={{
                        display: 'flex',
                        'align-items': 'center',
                        gap: '8px',
                        background: saveStatus() === 'success' ? '#4caf50' : '#fb7299',
                        color: '#fff',
                        border: 'none',
                        padding: '12px 28px',
                        'border-radius': '8px',
                        cursor: saveStatus() === 'success' ? 'default' : 'pointer',
                        'font-weight': 'bold',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        'box-shadow': '0 2px 4px rgba(251, 114, 153, 0.2)'
                    }}
                >
                    <Switch>
                        <Match when={saveStatus() === 'idle'}>
                            <Save size={18} />
                            <span>保存当前配置</span>
                        </Match>
                        <Match when={saveStatus() === 'success'}>
                            <CircleCheck size={18} />
                            <span>设置已生效</span>
                        </Match>
                    </Switch>
                </button>
            </div>

            {/* 底部额外说明 */}
            <div style={{ 'margin-top': '40px', color: '#9499a0', 'font-size': '13px' }}>
                <p>💡 此设置会即时保存到浏览器同步存储空间，并在下次视频加载时自动应用。</p>
            </div>
        </div>
    );
}