import { browser } from 'wxt/browser';
import { getBiliCollection } from '@/utils/bili';

import { HistoryItem } from '../assets/types';


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
   * 核心：处理手动存档
   */
  const handleArchiveLogic = async (tab: any, config: any) => {
    const rawUrl = tab.url || '';
    const cleanedUrl = cleanBiliUrl(rawUrl);
    const colTitle = await getBiliCollection(tab.id);

    if (!colTitle) return [];

    // 指定获取的类型
    const storage:any = await browser.storage.local.get({ pinnedHistory: [] }) ;

    const newItem: HistoryItem = {
      title: colTitle,
      url: cleanedUrl,
      time: Date.now(),
      config: config
    };

    const filteredHistory = storage.pinnedHistory.filter(
      (item:any) => cleanBiliUrl(item.url) !== cleanedUrl
    );

    const newPinned = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_LENGTH);
    await browser.storage.local.set({ pinnedHistory: newPinned });
    return newPinned;
  };

  /**
   * 自动记录历史
   */
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // 修复：确保 url 始终为 string 传给 getBiliCollection 或其他函数
    const rawUrl: string = tab.url || '';

    if (changeInfo.status === 'complete' && rawUrl.includes('bilibili.com/video')) {
      const cleanedUrl = cleanBiliUrl(rawUrl);
      const now = Date.now();

      const lastTime = processedLogs.get(cleanedUrl) || 0;
      if (now - lastTime < DEBOUNCE_TIME) return;

      processedLogs.set(cleanedUrl, now);
      const firstKey = processedLogs.keys().next().value;
      if (typeof firstKey === 'string') {
        processedLogs.delete(firstKey);
      }

      const colTitle = await getBiliCollection(tabId);
      if (colTitle) {
        // 指定获取的类型
        const storage: any = await browser.storage.local.get({
          latestHistory: [],
          sH: 0, sM: 0, sS: 0, mH: 0, mM: 0, mS: 0, eH: 0, eM: 0, eS: 0 }) ;

        const newItem: HistoryItem = {
          title: colTitle,
          url: cleanedUrl,
          time: now,
          config: {
            sH: storage.sH, sM: storage.sM, sS: storage.sS,
            mH: storage.mH, mM: storage.mM, mS: storage.mS,
            eH: storage.eH, eM: storage.eM, eS: storage.eS,
          },
        };

        const filteredLatest = storage.latestHistory.filter(
          (item:any) => cleanBiliUrl(item.url) !== cleanedUrl
        );

        const newLatest = [newItem, ...filteredLatest].slice(0, MAX_HISTORY_LENGTH);
        await browser.storage.local.set({ latestHistory: newLatest });

        browser.runtime.sendMessage({
          type: 'REFRESH_HISTORY',
          data: { latestHistory: newLatest }
        }).catch(() => { });
      }
    }
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DO_ARCHIVE') {
      handleArchiveLogic(message.data.tab, message.data.config)
        .then(newPinned => {
          sendResponse({ success: true, pinnedHistory: newPinned });
        });
      return true;
    }
  });
});