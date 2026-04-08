import { browser } from 'wxt/browser';

/**
 * 检测当前页面是否为合集页，并返回合集标题
 */
export const getBiliCollection = async (tabId: number): Promise<string> => {
    try {
        const results = await browser.scripting.executeScript({
            target: { tabId },
            func: () => {
                const isPod = !!document.querySelector('.video-pod');
                if (!isPod) return '';
                const titleEl = document.querySelector('.video-title')?.textContent?.trim() || '未知合集';
                if (titleEl !== '未知合集') {
                    return titleEl.replace(/(\[|【)?(电视剧|美剧)(\]|】)?/g, '');
                }
                return titleEl;
            },
        });
        return results[0]?.result || '';
    } catch {
        return '';
    }
};

/**
 * 格式化历史记录标题
 */
export const formatTitle = (col: string, full: string): string =>
    `${col.slice(0, 10)}-${full.replace('_哔哩哔哩_bilibili', '').slice(0, 8)}`;


/**
 * 判断帧分析是否已经启动
 */
 
