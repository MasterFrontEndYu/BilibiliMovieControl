import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-solid'],
  webExt:{
    binaries:{
      edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    }
  },
  manifest: {
    permissions: ['storage', 'tabs', 'activeTab', "scripting",],
    host_permissions: ['*://*.bilibili.com/*'],
    browser_specific_settings: {
      gecko: {
        // 这里的 ID 格式必须是：名称@域名 或 像 UUID 
        id: 'bilibili-movie-control@sanguogege.com ',
        // @ts-ignore
        data_collection_permissions: false, // 如果不收集数据设为 false
      },
    },
  },
});
