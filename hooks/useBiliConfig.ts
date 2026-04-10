// hooks/useBiliConfig.ts
import { createSignal } from 'solid-js';
import { browser } from 'wxt/browser';
import type { VideoConfig, HistoryItem } from '../assets/types';

export function useBiliConfig() {
    // --- 1. 基础配置信号 (UI 绑定用) ---
    const [sH, setSH] = createSignal(0);
    const [sM, setSM] = createSignal(0);
    const [sS, setSS] = createSignal(0);

    const [mH, setMH] = createSignal(0);
    const [mM, setMM] = createSignal(0);
    const [mS, setMS] = createSignal(0);

    const [eH, setEH] = createSignal(0);
    const [eM, setEM] = createSignal(0);
    const [eS, setES] = createSignal(0);

    // --- 2. 列表信号 ---
    const [latestHistory, setLatestHistory] = createSignal<HistoryItem[]>([]);
    const [pinnedHistory, setPinnedHistory] = createSignal<HistoryItem[]>([]);


    const initFromStorage = async () => {
        const res = await browser.storage.local.get([
            'sH', 'sM', 'sS', 'mH', 'mM', 'mS', 'eH', 'eM', 'eS',
            'latestHistory', 'pinnedHistory',
        ]);

        // 填充时间输入框
        setSH(Number(res.sH) || 0); setSM(Number(res.sM) || 0); setSS(Number(res.sS) || 0);
        setMH(Number(res.mH) || 0); setMM(Number(res.mM) || 0); setMS(Number(res.mS) || 0);
        setEH(Number(res.eH) || 0); setEM(Number(res.eM) || 0); setES(Number(res.eS) || 0);

        // 填充历史记录列表
        if (Array.isArray(res.latestHistory)) setLatestHistory(res.latestHistory.slice(0, 2) as HistoryItem[]);
        if (Array.isArray(res.pinnedHistory)) setPinnedHistory(res.pinnedHistory.slice(0, 3) as HistoryItem[]);
    };

    const resetConfig = async () => {
        const zeroConfig = { sH: 0, sM: 0, sS: 0, mH: 0, mM: 0, mS: 0, eH: 0, eM: 0, eS: 0 };
        // 重置信号
        setSH(0); setSM(0); setSS(0);
        setMH(0); setMM(0); setMS(0);
        setEH(0); setEM(0); setES(0);
        // 同步到存储
        await browser.storage.local.set({ ...zeroConfig});
    };

    const loadHistory = async (item: HistoryItem) => {
        const cfg = item.config;
        // 1. 同步到 Storage
        await browser.storage.local.set({
            sH: cfg.sH, sM: cfg.sM, sS: cfg.sS,
            mH: cfg.mH, mM: cfg.mM, mS: cfg.mS,
            eH: cfg.eH, eM: cfg.eM, eS: cfg.eS,
        });
        // 2. 更新 UI 信号
        setSH(cfg.sH); setSM(cfg.sM); setSS(cfg.sS);
        setMH(cfg.mH); setMM(cfg.mM); setMS(cfg.mS);
        setEH(cfg.eH); setEM(cfg.eM); setES(cfg.eS);
        // 3. 执行跳转
        await browser.tabs.update({ url: item.url });
    };

    return {
        // 配置信号
        sH, setSH, sM, setSM, sS, setSS,
        mH, setMH, mM, setMM, mS, setMS,
        eH, setEH, eM, setEM, eS, setES,
        // 列表信号
        latestHistory, setLatestHistory,
        pinnedHistory, setPinnedHistory,
        // 操作方法
        initFromStorage,
        resetConfig,
        loadHistory,
    };
}