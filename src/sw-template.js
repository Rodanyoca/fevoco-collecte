/* Resources only. The actors database is never removed by this worker. */
const CACHE = 'fevoco-collecte-assets-__VERSION__';
const ASSETS = __ASSETS__;
async function digest(response) {
 const hash=await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer());
 return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function verifyCache() {
 const cache=await caches.open(CACHE),missing=[];
 for(const asset of ASSETS){
  const response=await cache.match(asset.url);
  if(!response || await digest(response)!==asset.sha256)missing.push(asset.url);
 }
 return {ready:missing.length===0,missing,count:ASSETS.length,version:CACHE};
}
async function prepare(cache,assets){
 const results=await Promise.allSettled(assets.map(async asset=>{
  const response=await fetch(new Request(asset.url,{cache:'reload'}));
  if(!response.ok || await digest(response)!==asset.sha256)throw new Error('Ressource invalide : '+asset.url);
  await cache.put(asset.url,response);
 }));
 const failed=results.find(result=>result.status==='rejected');
 if(failed)throw failed.reason;
}
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{await prepare(cache,ASSETS);}
  catch(error){await caches.delete(CACHE);throw error;}
  if(!self.registration.active)await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 // Old caches remain usable by already open tabs; local data is separate.
 event.waitUntil(self.clients.claim());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();
 if(event.data?.type==='VERIFY_CACHE' || event.data?.type==='REPAIR_CACHE')event.waitUntil((async()=>{
  try{
   let result=await verifyCache();
   if(event.data.type==='REPAIR_CACHE' && !result.ready){
    const cache=await caches.open(CACHE);
    await prepare(cache,ASSETS.filter(asset=>result.missing.includes(asset.url)));
    result=await verifyCache();
   }
   event.ports[0]?.postMessage(result);
  }catch(_error){event.ports[0]?.postMessage({ready:false,missing:[],error:true});}
 })());
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(event.request.mode==='navigate'?'/index.html':event.request,{ignoreSearch:true});
  if(cached)return cached;
  // Preceding versions can still be needed by another open tab after an update.
  if(url.pathname.startsWith('/assets/')){
   for(const key of await caches.keys()){
    if(key.startsWith('fevoco-collecte-assets-')){
     const old=await (await caches.open(key)).match(event.request,{ignoreSearch:true});if(old)return old;
    }
   }
  }
  return fetch(event.request);
 })());
});
