// entrypoints/background.ts
import { browser } from 'wxt/browser';
import { getBiliCollection } from '@/utils/bili';

export default defineBackground(() => {

  // 核心：处理手动存档 (对应原  的核心部分)
  const handleArchiveLogic = async (tab: any, config: any) => {
    const res:any = await browser.storage.local.get({ pinnedHistory: [] });
    const colTitle = await getBiliCollection(tab.id);

    if (colTitle) {
      const newItem = {
        title: colTitle,
        url: tab.url || '',
        time: Date.now(),
        config: config
      };

      const newPinned = [newItem, ...res.pinnedHistory.filter((h: any) => h.url !== newItem.url)].slice(0, 50);
      await browser.storage.local.set({ pinnedHistory: newPinned });
      return newPinned;
    }
    return res.pinnedHistory;
  };

  // 1. 自动记录历史
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('bilibili.com/video')) {
      const colTitle = await getBiliCollection(tabId);
      if (colTitle) {
        const res:any = await browser.storage.local.get({
          latestHistory: [],
          sH: 0, sM: 0, sS: 0, mH: 0, mM: 0, mS: 0, eH: 0, eM: 0, eS: 0
        });

        const newItem = {
          title: colTitle,
          url: tab.url || '',
          time: Date.now(),
          config: {
            sH: res.sH, sM: res.sM, sS: res.sS,
            mH: res.mH, mM: res.mM, mS: res.mS,
            eH: res.eH, eM: res.eM, eS: res.eS,
          },
        };

        const newLatest = [newItem, ...res.latestHistory.filter((h: any) => h.url !== newItem.url)].slice(0, 50);
        await browser.storage.local.set({ latestHistory: newLatest });

        // 通知所有 UI 刷新 (Popup 或 Options)
        browser.runtime.sendMessage({ type: 'REFRESH_HISTORY', data: { latestHistory: newLatest } }).catch(() => { });
      }
    }
  });

  // 2. 消息监听器
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DO_ARCHIVE') {
      handleArchiveLogic(message.data.tab, message.data.config).then(newPinned => {
        sendResponse({ pinnedHistory: newPinned });
      });
      return true;
    }
  });
});