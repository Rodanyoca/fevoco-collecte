let registration;
let ready = false;
let installEvent;
let updateRequested = false;
const badge = document.querySelector('#connectivity');
const help = document.querySelector('#offline-help');
const update = document.querySelector('#update');
function status() {
  const connected = navigator.onLine;
  badge.textContent = ready ? (connected ? 'Prête hors ligne' : 'Hors ligne · prête') : (connected ? 'Préparation hors ligne…' : 'Hors ligne · préparation incomplète');
  badge.className = ready ? 'ready' : 'pending';
}
function verify(worker, repair = false) {
  return new Promise((resolve,reject)=>{
    const channel = new MessageChannel();
    const timer = setTimeout(()=>reject(new Error('Vérification du cache interrompue.')),12000);
    channel.port1.onmessage = event => { clearTimeout(timer);channel.port1.close();resolve(event.data); };
    worker.postMessage({type:repair?'REPAIR_CACHE':'VERIFY_CACHE'},[channel.port2]);
  });
}
export async function checkOffline(repair = false) {
  ready = false;status();
  try {
    if (!navigator.serviceWorker?.controller) throw new Error('Le cache est en cours de préparation.');
    const result = await verify(navigator.serviceWorker.controller,repair);
    if(!result.ready) throw new Error('Certaines ressources nécessaires sont absentes du cache.');
    // Both fonts are included in the verified service worker manifest, as are all export chunks.
    await document.fonts.ready;
    ready = true;help.hidden=true;status();
  } catch(error) {
    help.hidden=false;help.replaceChildren();
    help.append(document.createTextNode(error.message+' Restez en ligne puis réessayez. '));
    const retry = document.createElement('button');retry.className='text-button';retry.textContent='Préparer à nouveau';
    retry.onclick=async()=>{ if(!navigator.serviceWorker.controller){location.reload();return;} await registration?.update().catch(()=>{}); await checkOffline(true); };
    help.append(retry);status();
  }
}
function offerUpdate() {
  if(!registration.waiting || !navigator.serviceWorker.controller) return;
  update.hidden=false;update.replaceChildren(document.createTextNode('Une mise à jour est disponible. Les fiches locales sont conservées. '));
  const button=document.createElement('button');button.textContent='Appliquer la mise à jour';button.className='text-button';
  button.onclick=()=>{
    if(document.querySelector('form[data-person-form]')) { alert('Enregistrez ou annulez la fiche en cours avant la mise à jour.');return; }
    if(!registration.waiting){update.hidden=true;return;}
    updateRequested=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  };
  update.append(button);
}
export async function initializeOffline() {
  status();
  window.addEventListener('online',()=>{status();checkOffline();registration?.update().catch(()=>{});});
  window.addEventListener('offline',()=>{status();checkOffline();});
  if(!('serviceWorker' in navigator) || !window.isSecureContext) {
    badge.textContent='Hors ligne indisponible';help.hidden=false;
    help.textContent='Ouvrez l’application en HTTPS ou sur localhost pour préparer le fonctionnement hors ligne.';return;
  }
  if(import.meta.env.DEV) { badge.textContent='Développement · cache désactivé';help.hidden=false;help.textContent='La préparation hors ligne est disponible avec le build de production.';return; }
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(updateRequested) location.reload(); else checkOffline();
  });
  try {
    registration=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});
    offerUpdate();
    const watchInstalling = ()=>{
      const worker=registration.installing;
      worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed') { if(registration.waiting) offerUpdate(); }
        if(worker.state==='redundant') { if(!ready)badge.textContent='Préparation interrompue'; help.hidden=false;help.textContent='Préparation interrompue. Vérifiez la connexion puis rechargez pour réessayer.'; }
      });
    };
    registration.addEventListener('updatefound',watchInstalling);
    watchInstalling();
    await navigator.serviceWorker.ready;
    if(navigator.serviceWorker.controller) await checkOffline();
  } catch(_error) {
    help.hidden=false;help.textContent='La préparation hors ligne a échoué. Vérifiez la connexion et l’espace disponible, puis rechargez.';
  }
}
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();installEvent=event;document.querySelector('#install').hidden=false;
});
document.querySelector('#install').onclick=async()=>{
  if(!installEvent) return;
  await installEvent.prompt();installEvent=null;document.querySelector('#install').hidden=true;
};
window.addEventListener('appinstalled',()=>document.querySelector('#install').hidden=true);
export async function requestPersistence() {
  try {
    return await navigator.storage?.persist?.() || false;
  } catch(_error) { return false; }
}
