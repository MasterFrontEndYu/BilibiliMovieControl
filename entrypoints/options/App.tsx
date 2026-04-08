import { ParentProps } from 'solid-js';
import { A } from '@solidjs/router';
import { Settings, History } from 'lucide-solid';

export default function Layout(props: ParentProps) {
    return (
        <div style={{ display: 'flex', 'min-height': '100vh', background: '#f6f7f9' }}>
            {/* 侧边栏 */}
            <nav style={{
                width: '240px', background: '#fff', 'border-right': '1px solid #e3e5e7',
                padding: '20px', display: 'flex', 'flex-direction': 'column', gap: '10px'
            }}>
                <h2 style={{ color: '#fb7299', 'font-size': '18px', 'margin-bottom': '20px' }}>连播助手设置</h2>

                {/* 使用 A 组件进行声明式导航 */}
                <A href="/" end activeClass="active-link" style={navStyle}>
                    <Settings size={18} /> 全局配置
                </A>
                <A href="/history" activeClass="active-link" style={navStyle}>
                    <History size={18} /> 存档管理
                </A>
                <A href="/about" activeClass="active-link" style={navStyle}>
                    <History size={18} /> 插件说明
                </A>
            </nav>

            {/* 页面内容主体 */}
            <main style={{ flex: 1, padding: '40px' }}>
                {props.children}
            </main>

            <style>{`
        .active-link { background: #ffeef3 !important; color: #fb7299 !important; font-weight: bold; }
      `}</style>
        </div>
    );
}

const navStyle = {
    display: 'flex', 'align-items': 'center', gap: '10px', padding: '12px',
    'text-decoration': 'none', color: '#61666d', 'border-radius': '8px'
};