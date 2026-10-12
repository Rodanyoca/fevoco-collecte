import { defineConfig } from 'vite';
import { readdirSync,readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
export default defineConfig({
  build:{target:'es2022',assetsInlineLimit:0,chunkSizeWarningLimit:1600},
  plugins:[{
    name:'complete-offline-cache',
    closeBundle() {
      const root = path.resolve('dist');
      const scan = dir => readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory()?scan(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
      const files = scan(root).filter(file=>!file.endsWith('sw.js'));
      const assets = files.map(file=>({url:'/'+path.relative(root,file).replaceAll('\\','/'),sha256:createHash('sha256').update(readFileSync(file)).digest('hex')}));
      const digest = createHash('sha256');
      for (const file of files.sort()) digest.update(readFileSync(file));
      digest.update(readFileSync('src/sw-template.js'));
      digest.update(process.env.FEVOCO_RELEASE || '1.0.0');
      const version = digest.digest('hex').slice(0,16);
      const worker = readFileSync('src/sw-template.js','utf8').replace('__VERSION__',version).replace('__ASSETS__',JSON.stringify(assets));
      writeFileSync(path.join(root,'sw.js'),worker);
    },
  }],
});
