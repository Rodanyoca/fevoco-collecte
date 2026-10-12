import {defineConfig} from '@playwright/test';
const dev=process.env.FEVOCO_TEST_DEV==='1';
const baseURL=dev?'http://127.0.0.1:5179':'http://127.0.0.1:4174';
export default defineConfig({
 testDir:'./tests/e2e',timeout:240000,workers:1,fullyParallel:false,
 expect:{timeout:15000},
 use:{baseURL,headless:true},
 webServer:{command:dev?'npm.cmd run dev -- --port 5179 --strictPort':'node scripts/serve.mjs --port 4174',url:baseURL,reuseExistingServer:dev,timeout:60000},
 reporter:[['list']],
});
