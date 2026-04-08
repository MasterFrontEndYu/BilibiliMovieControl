// entrypoints/options/main.tsx
import { render } from 'solid-js/web';
import { Router } from '@solidjs/router';
import { routes } from './router';
import Layout from './App';

const root = document.getElementById('root');

if (root) {
    render(
        () => (
            // base 必须匹配你打包后的 html 文件名
            <Router base="/options.html" root={Layout}>
                {routes}
            </Router>
        ),
        root
    );
}