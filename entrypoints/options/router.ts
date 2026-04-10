// entrypoints/options/router.ts
import { lazy } from 'solid-js';

export const routes:any = [
    {
        path: "/",
        component: lazy(() => import('./pages/Index.tsx'!)),
    },
    {
        path: "/history",
        component: lazy(() => import('./pages/History.tsx'!)),
    },
    ,
    {
        path: "/manual",
        component: lazy(() => import('./pages/Manual.tsx'!)),
    },
    {
        path: "/about",
        component: lazy(() => import('./pages/About.tsx'!)),
    },
];