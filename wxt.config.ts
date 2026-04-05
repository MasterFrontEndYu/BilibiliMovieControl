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
    permissions: ['storage', 'tabs', 'activeTab'],
    host_permissions: ['*://*.bilibili.com/*'],
  },
});
