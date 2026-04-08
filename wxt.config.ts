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
    options_ui: {
      page: "entrypoints/options/index.html",
      open_in_tab: true, 
    },
    permissions: ['storage', 'tabs', 'activeTab', "scripting",],
    host_permissions: ['*://*.bilibili.com/*'],
  },
});
