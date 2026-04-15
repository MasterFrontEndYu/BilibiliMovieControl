import { getSoftVersion } from "@/utils/bili";



export const OptionsFooter = () => {
    return (
        <footer style={{
            display: 'flex',
            'align-items': 'center',    // 水平居中
            'justify-content': 'center',
            "flex-wrap": 'wrap',              // 允许换行
            width: '100%',
            'font-size': '12px',
            color: '#888',
        }}>
            <p style={{
                padding:"10px 0 0",
                height:"auto"
            }}>版本：{getSoftVersion()}</p>
            <div style={{
                display: 'flex',
                'align-items': 'center',    // 水平居中
                'justify-content': 'center',
                width: '100%',
                'font-size': '12px',
                color: '#888',
                gap: '4px'                  // 控制行间距
            }}>

                <p style={{ margin: 0 }}>© 2026</p>
                <a
                    href="https://github.com/sanguogege/BilibiliMovieControl"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#fb7299', 'text-decoration': 'none' }}
                >
                    BilibiliMovieControl
                </a>
                <p style={{ margin: 0 }}>仅供学习与交流使用。</p>
            </div>
        </footer>
    )
}