// entrypoints/background.ts
import { browser } from 'wxt/browser';
import { getBiliCollection, formatTitle } from '@/utils/bili';

export default defineBackground(() => {
  // --- 1. 自动记录历史 (只要页面加载完成就记录，无需点开 Popup) ---
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url?.includes('bilibili.com/video')) {
      const colTitle = await getBiliCollection(tabId);
      if (colTitle) {
        const res:any = await browser.storage.local.get({
          latestHistory: [],
          sH: 0, sM: 0, sS: 0, mH: 0, mM: 0, mS: 0, eH: 0, eM: 0, eS: 0
        });

        const newItem = {
          title: formatTitle(colTitle, tab.title || ''),
          url: tab.url || '',
          time: Date.now(),
          config: {
            sH: res.sH, sM: res.sM, sS: res.sS,
            mH: res.mH, mM: res.mM, mS: res.mS,
            eH: res.eH, eM: res.eM, eS: res.eS,
          },
        };

        const newLatest = [newItem, ...res.latestHistory.filter((h: any) => h.url !== newItem.url)].slice(0, 2);
        await browser.storage.local.set({ latestHistory: newLatest });

        // 广播给已打开的 Popup 刷新 UI (可选)
        browser.runtime.sendMessage({ type: 'REFRESH_HISTORY', data: newLatest }).catch(() => { });
      }
    }
  });

  // --- 2. 集中处理手动存档指令 ---
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DO_ARCHIVE') {
      const { tab, config } = message.data;

      // 执行原有的 Archive 逻辑计算
      browser.storage.local.get({ pinnedHistory: [] }).then(async (res: any) => {
        const colTitle = await getBiliCollection(tab.id);
        if (!colTitle) return;

        const newItem = {
          title: formatTitle(colTitle, tab.title || ''),
          url: tab.url || '',
          time: Date.now(),
          config: config
        };

        const newPinned = [newItem, ...res.pinnedHistory.filter((h: any) => h.url !== newItem.url)].slice(0, 3);
        await browser.storage.local.set({ pinnedHistory: newPinned });

        // 返回更新后的列表
        sendResponse({ pinnedHistory: newPinned });
      });
      return true; // 异步响应
    }
  });
});