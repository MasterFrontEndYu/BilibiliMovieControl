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
                const titleEl2 = document.querySelector('.simple-base-item.video-pod__item.active.normal .title-txt')?.textContent?.trim();
                if (titleEl !== '未知合集') {
                    return titleEl.replace(/(\[|【)?(电视剧|美剧)(\]|】)?/g, '').slice(0, 10) + (titleEl2 ? `- ${titleEl2.slice(0, 8) }` : '');
                }
                return titleEl;
            },
        });
        return results[0]?.result || '';
    } catch {
        return '';
    }
};


export const getSoftName = () => browser.runtime.getManifest().name;


export const getSoftVersion = () => browser.runtime.getManifest().version;