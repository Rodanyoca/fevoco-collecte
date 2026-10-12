import {test,expect,chromium} from '@playwright/test';
import {mkdir,mkdtemp,readFile,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import ExcelJS from 'exceljs';
const origin='http://127.0.0.1:4174';
async function profileDirectory(prefix) { await mkdir('.qa-profile',{recursive:true});return mkdtemp(path.resolve('.qa-profile',prefix)); }
const launch=profile=>chromium.launchPersistentContext(profile,{headless:true,acceptDownloads:true,viewport:{width:1440,height:1000}});
async function navigate(page,name){await page.getByRole('navigation',{name:'Navigation principale'}).getByRole('button',{name,exact:true}).click();}
async function addPerson(page,{name='Élodie Mbuyi',type='Athlète',sex='Féminin',affiliation='17082024',birth='29022000',phone='+243 081 234 5678'}={}) {
 await page.getByRole('button',{name:'Ajouter une personne',exact:true}).click();
 await expect(page.getByLabel('Date d’affiliation au club',{exact:false})).toHaveValue('');
 await page.getByLabel('Nom complet',{exact:false}).fill(name);
 await page.getByLabel('Type d’acteur',{exact:false}).selectOption(type);
 await page.getByLabel('Sexe',{exact:false}).selectOption(sex);
 await page.getByLabel('Date de naissance',{exact:false}).fill(birth);
 await page.getByLabel('Date d’affiliation au club',{exact:false}).fill(affiliation);
 await page.getByLabel('Téléphone',{exact:false}).fill(phone);
 await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
 await expect(page.getByText('Fiche enregistrée sur cet appareil.',{exact:true})).toBeVisible();
}
async function download(page,label,file){
 const promise=page.waitForEvent('download');
 await page.getByRole('button',{name:label,exact:true}).click();
 const item=await promise;await item.saveAs(file);return file;
}
test('parcours complet : cache, CRUD hors ligne, fermeture, exports et mise à jour sans perte',async({browserName},info)=>{
 expect(browserName).toBe('chromium');
 const profile=await profileDirectory('main-');
 let context=await launch(profile);
 try {
  let page=context.pages()[0];
  const errors=[],requests=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  await page.goto(origin);
  await expect(page.getByRole('heading',{name:'Votre club',exact:true})).toBeVisible();
  await page.getByLabel('Nom du club',{exact:false}).fill('Club Étoile');
  await page.getByRole('button',{name:'Enregistrer le club',exact:true}).click();
  await expect(page.locator('#connectivity')).toHaveText('Prête hors ligne');
  const cached=await page.evaluate(async()=>{
   const keys=await caches.keys();const cache=await caches.open(keys.find(key=>key.startsWith('fevoco-collecte-assets-')));
   return (await cache.keys()).map(request=>new URL(request.url).pathname);
  });
  expect(cached).toContain('/fonts/NotoSans-Regular.ttf');
  expect(cached).toContain('/fonts/NotoSans-Bold.ttf');
  expect(cached.filter(url=>url.endsWith('.js')).length).toBeGreaterThan(2);
  await context.setOffline(true);
  await expect(page.locator('#connectivity')).toHaveText('Hors ligne · prête');
  await page.getByRole('button',{name:'Ajouter une personne',exact:true}).click();
  await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
  await expect(page.locator('#name-error')).toBeVisible();await expect(page.locator('#affiliationDate-error')).toBeVisible();
  await page.getByLabel('Nom complet',{exact:false}).fill('Élodie Mbuyi');
  await page.getByLabel('Type d’acteur',{exact:false}).selectOption('Athlète');
  await page.getByLabel('Sexe',{exact:false}).selectOption('Féminin');
  const aff=page.getByLabel('Date d’affiliation au club',{exact:false});
  await aff.pressSequentially('31022024');await expect(aff).toHaveValue('31/02/2024');
  await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
  await expect(page.locator('#affiliationDate-error')).toHaveText(/date réelle/);
  await aff.fill('17082024');await expect(aff).toHaveValue('17/08/2024');
  await page.getByLabel('Date de naissance',{exact:false}).fill('29022000');
  await page.getByLabel('Téléphone',{exact:false}).fill('00243 081 234 5678');
  await page.getByLabel('Adresse',{exact:false}).fill('Avenue de l’Équateur, bâtiment des entraîneurs');
  await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
  await expect(page.getByText('Fiche enregistrée sur cet appareil.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Élodie Mbuyi',exact:true}).click();
  await expect(page.getByRole('definition').filter({hasText:'17/08/2024'})).toBeVisible();
  await page.getByRole('button',{name:'Modifier la fiche',exact:true}).click();
  await expect(aff).toHaveValue('17/08/2024');
  await aff.fill('18082024');
  await page.getByLabel('Téléphone',{exact:false}).fill('+243 081 000 001');
  await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
  await expect(page.getByText('Fiche enregistrée sur cet appareil.',{exact:true})).toBeVisible();
  await addPerson(page,{name:'André N’Kulu',type:'Entraîneur',sex:'Masculin',affiliation:'05092023',birth:'',phone:'00243 089 000 1122'});
  await navigate(page,'Recherche');
  await page.getByLabel('Rechercher une personne').fill('elodie');
  await expect(page.locator('.people li')).toHaveCount(1);
  await page.getByLabel('Type d’acteur',{exact:true}).selectOption('Médecin');
  await expect(page.getByText('Aucun résultat',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Effacer les filtres',exact:true}).click();
  await page.getByLabel('Type d’acteur',{exact:true}).selectOption('Athlète');
  await page.getByRole('button',{name:'Exporter cette sélection depuis l’accueil',exact:true}).click();
  await expect(page.locator('#selection-summary')).toContainText('Athlète');
  await page.getByLabel('Périmètre de l’export').selectOption('filtered');
  const xlsx=await download(page,'Exporter en Excel · sélection filtrée',info.outputPath('filtre.xlsx'));
  const book=new ExcelJS.Workbook();await book.xlsx.load(await readFile(xlsx));
  const sheet=book.getWorksheet('ACTEURS');
  expect(sheet.rowCount).toBe(2);expect(sheet.getCell('F2').value.toISOString()).toBe('2024-08-18T00:00:00.000Z');
  expect(sheet.getCell('H2').value).toBe('+243 081 000 001');
  expect(book.worksheets.map(s=>s.name)).toEqual(['CLUB','ACTEURS']);
  const internalKeys=await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('fevoco-collecte');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const rows=await new Promise(resolve=>{const r=db.transaction('people').objectStore('people').getAll();r.onsuccess=()=>resolve(r.result);});db.close();return rows.map(p=>p.key);
  });
  for(const key of internalKeys)expect(JSON.stringify(sheet.getSheetValues())).not.toContain(key);
  await download(page,'Exporter en PDF · sélection filtrée',info.outputPath('filtre.pdf'));
  await page.getByRole('button',{name:'Voir les modèles Excel et PDF',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Excel · deux feuilles',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Afficher l’aperçu PDF',exact:true}).click();
  await expect(page.getByTitle('Aperçu du registre PDF')).toBeVisible();
  await page.getByRole('button',{name:'Retour à l’accueil',exact:true}).click();
  await page.getByLabel('Périmètre de l’export').selectOption('all');
  await page.screenshot({path:info.outputPath('accueil-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:info.outputPath('accueil-mobile.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await navigate(page,'Acteurs');
  await page.screenshot({path:info.outputPath('acteurs-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Modifier la fiche de Élodie Mbuyi',exact:true}).click();
  await page.screenshot({path:info.outputPath('formulaire-mobile.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Annuler',exact:true}).click();
  expect(errors).toEqual([]);
  expect(requests.filter(url=>/^https?:/.test(url)).every(url=>url.startsWith(origin))).toBe(true);
  await context.close();
  // A fresh browser process uses the same on-disk profile with network disabled before navigation.
  context=await chromium.launchPersistentContext(profile,{headless:true,acceptDownloads:true,offline:true,viewport:{width:390,height:844}});
  page=context.pages()[0];
  await page.goto(origin);
  await expect(page.locator('#connectivity')).toHaveText('Hors ligne · prête');
  await expect(page.getByRole('heading',{name:'Club Étoile',exact:true})).toBeVisible();
  await navigate(page,'Acteurs');
  await expect(page.locator('.people li')).toHaveCount(2);
  await navigate(page,'Accueil');
  await download(page,'Exporter en Excel · toutes les fiches',info.outputPath('reouverture.xlsx'));
  await download(page,'Exporter en PDF · toutes les fiches',info.outputPath('reouverture.pdf'));
  await navigate(page,'Paramètres');
  await page.getByLabel('Nom du club',{exact:false}).fill('Club Étoile rénové');
  await page.getByRole('button',{name:'Enregistrer le club',exact:true}).click();
  const renamed=await download(page,'Exporter en Excel · toutes les fiches',info.outputPath('club-renomme.xlsx'));
  const renamedBook=new ExcelJS.Workbook();await renamedBook.xlsx.load(await readFile(renamed));
  expect(renamedBook.getWorksheet('CLUB').getCell('A2').value).toBe('Club Étoile rénové');
  const beforeKeys=[...internalKeys].sort();
  await context.setOffline(false);
  execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{cwd:process.cwd(),env:{...process.env,FEVOCO_RELEASE:'qa-update-'+Date.now(),NODE_ENV:'production'},stdio:'pipe'});
  await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await expect(page.getByRole('button',{name:'Appliquer la mise à jour',exact:true})).toBeVisible();
  const navigation=page.waitForEvent('load');
  await page.getByRole('button',{name:'Appliquer la mise à jour',exact:true}).click();
  await navigation;
  await expect(page.locator('#connectivity')).toHaveText('Prête hors ligne');
  await navigate(page,'Acteurs');
  await expect(page.locator('.people li')).toHaveCount(2);
  await navigate(page,'Accueil');
  const afterKeys=await page.evaluate(async()=>{
    const db=await new Promise(resolve=>{const r=indexedDB.open('fevoco-collecte');r.onsuccess=()=>resolve(r.result);});
    const rows=await new Promise(resolve=>{const r=db.transaction('people').objectStore('people').getAll();r.onsuccess=()=>resolve(r.result);});db.close();return rows.map(p=>p.key).sort();
  });
  expect(afterKeys).toEqual(beforeKeys);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#connectivity')).toHaveText('Hors ligne · prête');
  await expect(page.getByRole('heading',{name:'Club Étoile rénové',exact:true})).toBeVisible();
  await navigate(page,'Acteurs');
  await page.getByRole('button',{name:'Supprimer la fiche de André N’Kulu',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Annuler',exact:true}).click();
  await expect(page.locator('.people li')).toHaveCount(2);
  await page.getByRole('button',{name:'Supprimer la fiche de André N’Kulu',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Supprimer la fiche',exact:true}).click();
  await expect(page.locator('.people li')).toHaveCount(1);
  await page.reload();await navigate(page,'Acteurs');await expect(page.locator('.people li')).toHaveCount(1);
  await navigate(page,'Accueil');
  const finalXlsx=await download(page,'Exporter en Excel · toutes les fiches',info.outputPath('apres-mise-a-jour.xlsx'));
  const finalBook=new ExcelJS.Workbook();await finalBook.xlsx.load(await readFile(finalXlsx));
  expect(finalBook.getWorksheet('ACTEURS').getCell('F2').value.toISOString()).toBe('2024-08-18T00:00:00.000Z');
  expect(finalBook.getWorksheet('ACTEURS').rowCount).toBe(2);
  await download(page,'Exporter en PDF · toutes les fiches',info.outputPath('apres-mise-a-jour.pdf'));
 } finally {await context.close();}
});
test('première page visible ne signifie pas cache prêt si une police manque',async({browserName})=>{
 expect(browserName).toBe('chromium');
 const font=path.resolve('dist/fonts/NotoSans-Bold.ttf'),backup=path.resolve('.tmp/NotoSans-Bold.ttf');
 await mkdir(path.dirname(backup),{recursive:true});
 await rename(font,backup);
 const context=await launch(await profileDirectory('incomplete-'));
 try{
  const page=context.pages()[0];await page.goto(origin);
  await expect(page.getByRole('heading',{name:'Votre club',exact:true})).toBeVisible();
  await expect(page.locator('#offline-help')).toContainText(/interrompue|échoué/,{timeout:30000});
  await expect(page.locator('#connectivity')).not.toHaveText('Prête hors ligne');
 }finally{await context.close();await rename(backup,font);}
});

test('cache corrompu : statut retiré et réparation en ligne vérifiée',async({browserName})=>{
 expect(browserName).toBe('chromium');
 const context=await launch(await profileDirectory('repair-'));
 try{
  const page=context.pages()[0];await page.goto(origin);
  await expect(page.locator('#connectivity')).toHaveText('Prête hors ligne');
  await expect(page.locator('#update')).toBeHidden();
  await page.evaluate(async()=>{
   for(const key of await caches.keys())if(key.startsWith('fevoco-collecte-assets-')){
    const cache=await caches.open(key);
    await cache.put('/fonts/NotoSans-Regular.ttf',new Response('<html>Wrong resource</html>',{headers:{'content-type':'text/html'}}));
   }
   window.dispatchEvent(new Event('offline'));
  });
  await expect(page.locator('#offline-help')).toContainText('ressources nécessaires');
  await expect(page.locator('#connectivity')).not.toHaveText('Prête hors ligne');
  await page.getByRole('button',{name:'Préparer à nouveau',exact:true}).click();
  await expect(page.locator('#connectivity')).toHaveText('Prête hors ligne');
  await expect(page.locator('#offline-help')).toBeHidden();
 }finally{await context.close();}
});
