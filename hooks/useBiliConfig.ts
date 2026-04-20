import { createSignal } from 'solid-js';
import { browser } from 'wxt/browser';
import { TimePoint, TimeRange, HistoryItem } from '@/assets/types';

export const useBiliConfig = () => {
    // --- 1. 跳过列表 (用于 TimeRangeManager 弹窗) ---
    const [opRanges, setOpRanges] = createSignal<TimeRange[]>([]);

    // --- 2. 帧分析配置 (用于自动模式：label="帧") ---
    const [frameConfig, setFrameConfig] = createSignal<TimePoint>({ h: 0, m: 0, s: 0 });

    // --- 3. 手动切集配置 (用于手动模式：label="切") ---
    const [jumpConfig, setJumpConfig] = createSignal<TimePoint>({ h: 0, m: 0, s: 0 });

    // --- 4. 基础状态 ---
    const [mode, setMode] = createSignal<'frame' | 'manual'>('frame');
    const [isPageReady, setIsPageReady] = createSignal(false);
    const [latestHistory, setLatestHistory] = createSignal<HistoryItem[]>([]);
    const [pinnedHistory, setPinnedHistory] = createSignal<HistoryItem[]>([]);

    /**
     * 初始化：从本地存储加载所有数据
     */
    const initFromStorage = async () => {
        const res = await browser.storage.local.get([
            'opRanges',
            'frameConfig',
            'jumpConfig',
            'mode',
            'latestHistory',
            'pinnedHistory'
        ]);

        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (activeTab?.id && activeTab.url?.includes('bilibili.com/video')) {
            try {
                const resp = await browser.tabs.sendMessage(activeTab.id, { type: 'QUERY_READY_STATUS' });
                if (resp) setIsPageReady(resp.isCollection);
            } catch (e) {
                setIsPageReady(false);
            }
        }

        if (res.opRanges) setOpRanges(res.opRanges as TimeRange[]);
        if (res.frameConfig) setFrameConfig(res.frameConfig as TimePoint);
        if (res.jumpConfig) setJumpConfig(res.jumpConfig as TimePoint);
        if (res.mode) setMode(res.mode as 'frame' | 'manual');

        if (Array.isArray(res.latestHistory)) setLatestHistory(res.latestHistory.slice(0, 2) as HistoryItem[]);
        if (Array.isArray(res.pinnedHistory)) setPinnedHistory(res.pinnedHistory.slice(0, 3) as HistoryItem[]);

    };

    /**
     * 保存模式切换
     */
    const saveMode = async (newMode: 'frame' | 'manual') => {
        setMode(newMode);
        await browser.storage.local.set({ mode: newMode });
    };

    /**
     * 应用配置：将当前所有状态写入 Storage 并广播给 Content Script
     */
    const applyConfig = async (type: 'setting' | 'reset') => {
        if (type === 'reset') {
            const zero = { h: 0, m: 0, s: 0 };
            if (mode() === 'frame') {
                setFrameConfig(zero);
            } else {
                setJumpConfig(zero);
            }
        }

        const configData = {
            opRanges: opRanges(),
            frameConfig: frameConfig(),
            jumpConfig: jumpConfig(),
            mode: mode()
        };

        // 1. 持久化
        await browser.storage.local.set(configData);

        // 2. 实时同步给当前 B站标签页
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (activeTab?.id && activeTab.url?.includes('bilibili.com/video')) {
            try {
                await browser.tabs.sendMessage(activeTab.id, {
                    type: 'UPDATE_VIDEO_CONFIG',
                    data: configData
                });
            } catch (e) {
                console.warn('Content Script 未就绪，配置仅保存至本地。');
            }
        }
    };

    /**
     * 存档逻辑：将当前配置存入历史记录
     */
    const handleArchive = async () => {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        const currentData
            : HistoryItem = {
            id: activeTab?.id || Date.now(), 
            title: activeTab.title || '未知标题',
            url: activeTab.url || '',
            time: Date.now(),
            mode: mode(),
            opRanges: opRanges(),
            frameConfig: frameConfig(),
            jumpConfig: jumpConfig(),
        };

        const res = await browser.storage.local.get('pinnedHistory');
        const history = (res.pinnedHistory as HistoryItem[]) || [];
        const newHistory = [currentData, ...history].slice(0, 50); // 最多保留50条记录

        await browser.storage.local.set({ pinnedHistory: newHistory });
        setPinnedHistory(newHistory.slice(0, 3));
    };

    /**
     * 加载历史记录到当前页面
     */
    const loadHistory = async (item: HistoryItem) => {
        if (item.opRanges) setOpRanges(item.opRanges);
        if (item.frameConfig) setFrameConfig(item.frameConfig);
        if (item.jumpConfig) setJumpConfig(item.jumpConfig);
        if (item.mode) setMode(item.mode);
        await browser.tabs.update({ url: item.url });
    };

    /**
     * 打开配置页
     */
    const openOptions = () => {
        browser.tabs.create({ url: browser.runtime.getURL('/options.html') });
    };

    return {
        opRanges, setOpRanges,
        frameConfig, setFrameConfig,
        jumpConfig, setJumpConfig,
        mode, setMode,
        isPageReady, setIsPageReady,
        latestHistory, setLatestHistory,
        pinnedHistory,

        // 方法
        initFromStorage,
        saveMode,
        applyConfig,
        handleArchive,
        loadHistory,
        openOptions
    };
};