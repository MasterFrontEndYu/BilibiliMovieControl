// hooks/useBiliConfig.ts
import { createSignal } from 'solid-js';
import { browser } from 'wxt/browser';
import type { HistoryItem } from '../assets/types';

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

    // --- 2. 页面状态信号 ---
    const [isPageReady, setIsPageReady] = createSignal(false);
    const [mode, setMode] = createSignal<'auto' | 'manual'>('auto');

    // --- 3. 列表信号 ---
    const [latestHistory, setLatestHistory] = createSignal<HistoryItem[]>([]);
    const [pinnedHistory, setPinnedHistory] = createSignal<HistoryItem[]>([]);

    const saveMode = async (newMode: 'auto' | 'manual') => {
        setMode(newMode);
        await browser.storage.local.set({ mode: newMode });
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
            await browser.tabs.sendMessage(tabs[0].id, { type: 'SET_MODE', mode: newMode });
        }
    };

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

    const applyConfig = async (type:string) => {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) return;

        if(type === "reset"){
            setSH(0); setSM(0); setSS(0);
            setMH(0); setMM(0); setMS(0);
            setEH(0); setEM(0); setES(0);
        }

        const configValues = { sH: sH(), sM: sM(), sS: sS(), mH: mH(), mM: mM(), mS: mS(), eH: eH(), eM: eM(), eS: eS() };
        await browser.storage.local.set(configValues);

        await browser.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_CONFIG', ...configValues });
    };

   
    const resetConfig = async () => {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) return;
        const zeroConfig = { sH: 0, sM: 0, sS: 0, mH: 0, mM: 0, mS: 0, eH: 0, eM: 0, eS: 0 };
        // 重置信号
        setSH(0); setSM(0); setSS(0);
        setMH(0); setMM(0); setMS(0);
        setEH(0); setEM(0); setES(0);
        // 同步到存储
        await browser.storage.local.set(zeroConfig);
        await browser.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_CONFIG', ...zeroConfig });
       
    };

    // 手动存档
    const handleArchive = async () => {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) return;

        const response = await browser.runtime.sendMessage({
            type: 'DO_ARCHIVE',
            data: {
                tab: { id: tabs[0].id, title: tabs[0].title, url: tabs[0].url },
                config: { sH: sH(), sM: sM(), sS: sS(), mH: mH(), mM: mM(), mS: mS(), eH: eH(), eM: eM(), eS: eS() }
            }
        });

        if (response?.pinnedHistory) {
            setPinnedHistory(response.pinnedHistory.slice(0, 3));
        }
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

    const openOptions = () => {
        browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
    };


    return {
        // 配置信号
        sH, setSH, sM, setSM, sS, setSS,
        mH, setMH, mM, setMM, mS, setMS,
        eH, setEH, eM, setEM, eS, setES,

        // 页面状态信号
        isPageReady, setIsPageReady,
        mode, setMode,

        // 列表信号
        latestHistory, setLatestHistory,
        pinnedHistory, setPinnedHistory,
        // 操作方法
        initFromStorage,
        saveMode,
        applyConfig,
        handleArchive,
        loadHistory,
        openOptions
    };
}