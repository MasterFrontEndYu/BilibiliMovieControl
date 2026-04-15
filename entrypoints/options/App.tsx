import { ParentProps } from 'solid-js';
import { A } from '@solidjs/router';
import { Settings, History, Info, HandGrab } from 'lucide-solid';
import { OptionsFooter } from '@/components/OptionsFooter';

import { getSoftName } from '@/utils/bili';

export default function Layout(props: ParentProps) {
    return (
        // 1. 约束父容器高度为屏幕高度，并隐藏超出部分的溢出
        <div style={{
            display: 'flex',
            height: '100vh',        // 固定整体高度
            overflow: 'hidden',     // 防止整体出现滚动条
            background: '#f6f7f9'
        }}>
            {/* 侧边栏 */}
            <nav style={{
                width: '240px',
                height: '100%',     // 占满父容器高度
                background: '#fff',
                'border-right': '1px solid #e3e5e7',
                padding: '20px',
                display: 'flex',
                'flex-direction': 'column',
                gap: '10px',
                'flex-shrink': 0    // 防止被右侧挤压
            }}>
                <div>
                    <h2 style={{ color: '#fb7299', 'font-size': '18px', 'margin-bottom': '20px' }}>{getSoftName()}设置</h2>

                    <A href="/" end activeClass="active-link" style={navStyle}>
                        <Settings size={18} /> 全局配置
                    </A>
                    <A href="/history" activeClass="active-link" style={navStyle}>
                        <History size={18} /> 自动存档
                    </A>
                    <A href="/manual" activeClass="active-link" style={navStyle}>
                        <HandGrab size={18} /> 手动存档
                    </A>
                    <A href="/about" activeClass="active-link" style={navStyle}>
                        <Info size={18} /> 插件说明
                    </A>
                </div>
               
            </nav>

            {/* 2. 页面内容主体：允许独立滚动 */}
            <main style={{
                flex: 1,
                padding: '40px',
                'overflow-y': 'auto', // 关键：只有内容区产生纵向滚动条
                height: '100%'
            }}>
                {props.children}
                <OptionsFooter />
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