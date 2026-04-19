import { browser } from 'wxt/browser';
import { getBiliCollection } from '@/utils/bili';
import { HistoryItem, TimePoint, TimeRange } from '../assets/types';

const DEBOUNCE_TIME = 2000;
const MAX_HISTORY_LENGTH = 20;
const processedLogs = new Map<string, number>();

/**
 * URL 清洗逻辑
 */
function cleanBiliUrl(url: string): string {
  try {
    const u = new URL(url);
    const p = u.searchParams.get('p');
    const baseUrl = `${u.origin}${u.pathname}`;
    return (p && p !== '1') ? `${baseUrl}?p=${p}` : baseUrl;
  } catch (e) {
    return url;
  }
}

export default defineBackground(() => {

  /**
   * 核心：处理手动存档 (Pinned)
   */
  const handleArchiveLogic = async (tab: any, config: any) => {
    const rawUrl = tab.url || '';
    const cleanedUrl = cleanBiliUrl(rawUrl);
    const colTitle = await getBiliCollection(tab.id);

    if (!colTitle) return [];

    const storage = await browser.storage.local.get({ pinnedHistory: [] });

    // 匹配新的数据结构
    const newItem: HistoryItem = {
      id: crypto.randomUUID(), // 建议加上 ID
      title: colTitle,
      url: cleanedUrl,
      time: Date.now(),
      pinned: true,
      // 这里的 config 应该包含 opRanges, frameConfig, jumpConfig, mode
      ...config
    };

    const history = (storage.pinnedHistory as any[]) || [];
    const filteredHistory = history.filter(
      (item: any) => cleanBiliUrl(item.url) !== cleanedUrl
    );

    const newPinned = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_LENGTH);
    await browser.storage.local.set({ pinnedHistory: newPinned });
    return newPinned;
  };

  /**
   * 自动记录最近历史 (Latest)
   */
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    const rawUrl: string = tab.url || '';

    if (changeInfo.status === 'complete' && rawUrl.includes('bilibili.com/video')) {
      const cleanedUrl = cleanBiliUrl(rawUrl);
      const now = Date.now();

      // 防抖
      const lastTime = processedLogs.get(cleanedUrl) || 0;
      if (now - lastTime < DEBOUNCE_TIME) return;

      processedLogs.set(cleanedUrl, now);
      if (processedLogs.size > 50) { // 防止 Map 过大
        const firstKey = processedLogs.keys().next().value;
        if (firstKey) processedLogs.delete(firstKey);
      }

      const colTitle = await getBiliCollection(tabId);
      if (colTitle) {
        // 读取当前最新的配置快照
        const storage = await browser.storage.local.get({
          latestHistory: [],
          opRanges: [],
          frameConfig: { h: 0, m: 0, s: 0 },
          jumpConfig: { h: 0, m: 0, s: 0 },
          mode: 'auto'
        });

        const newItem: HistoryItem = {
          title: colTitle,
          url: cleanedUrl,
          time: now,
          opRanges: storage.opRanges as TimeRange[],
          frameConfig: storage.frameConfig as TimePoint,
          jumpConfig: storage.jumpConfig as TimePoint,
          mode: storage.mode as 'auto' | 'manual'
        };

        const history = (storage.latestHistory as any[]) || [];
        const filteredLatest = history.filter(
          (item: any) => cleanBiliUrl(item.url) !== cleanedUrl
        );

        const newLatest = [newItem, ...filteredLatest].slice(0, MAX_HISTORY_LENGTH);
        await browser.storage.local.set({ latestHistory: newLatest });

        // 广播更新通知给 Popup
        browser.runtime.sendMessage({
          type: 'REFRESH_HISTORY',
          data: newLatest // 直接传递数组
        }).catch(() => { });
      }
    }
  });

  /**
   * 监听消息请求
   */
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DO_ARCHIVE') {
      handleArchiveLogic(message.data.tab, message.data.config)
        .then(newPinned => {
          sendResponse({ success: true, pinnedHistory: newPinned });
        });
      return true; // 保持异步通道开启
    }
  });
});