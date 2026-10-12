import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',timeout:240000,workers:1,fullyParallel:false,
 expect:{timeout:15000},
 use:{baseURL:'http://127.0.0.1:4174',headless:true},
 webServer:{command:'node scripts/serve.mjs --port 4174',url:'http://127.0.0.1:4174',reuseExistingServer:false,timeout:60000},
 reporter:[['list']],
});
