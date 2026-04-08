// entrypoints/options/router.ts
import { lazy } from 'solid-js';

export const routes = [
    {
        path: "/",
        component: lazy(() => import('./pages/Index.tsx'!)),
    },
    {
        path: "/history",
        component: lazy(() => import('./pages/History.tsx'!)),
    },
    {
        path: "/about",
        component: lazy(() => import('./pages/About.tsx'!)),
    },
];