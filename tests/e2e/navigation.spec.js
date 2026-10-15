import {test,expect} from '@playwright/test';
const menu=page=>page.getByRole('navigation',{name:'Navigation principale'});
async function tab(page,name){await menu(page).getByRole('button',{name,exact:true}).click();}
test('navigation mobile : quatre sections, recherche conservée, exports sur accueil et barre accessible',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(menu(page).getByRole('button')).toHaveCount(4);
 await expect(menu(page).getByRole('button',{name:'Paramètres',exact:true})).toHaveAttribute('aria-current','page');
 await page.getByLabel('Nom du club',{exact:false}).fill('Club Mobile');
 await page.getByRole('button',{name:'Enregistrer le club',exact:true}).click();
 await expect(page.locator('#connectivity')).toHaveText('Prête hors ligne');
 await page.context().setOffline(true);
 await expect(menu(page).getByRole('button',{name:'Accueil',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.getByRole('heading',{name:'Exporter le registre',exact:true})).toBeVisible();
 await expect(page.getByLabel('Rechercher une personne')).toHaveCount(0);
 await page.getByRole('button',{name:'Ajouter une personne',exact:true}).click();
 await page.getByLabel('Nom complet',{exact:false}).fill('Élodie Mbuyi');
 await page.getByLabel('Type d’acteur',{exact:false}).selectOption('Athlète');
 await page.getByLabel('Sexe',{exact:false}).selectOption('Féminin');
 await page.getByLabel('Date d’affiliation au club',{exact:false}).fill('17082024');
 await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
 await expect(menu(page).getByRole('button',{name:'Acteurs',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.locator('.actor-table tbody tr')).toHaveCount(1);
 await expect(page.locator('[data-action="excel"]')).toHaveCount(0);
 await expect(page.getByLabel('Rechercher une personne')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('acteurs-mobile.png')});
 await page.getByLabel('Type d’acteur',{exact:true}).selectOption('Médecin');
 await expect(page.getByRole('heading',{name:'Aucun résultat',exact:true})).toBeVisible();
 await tab(page,'Recherche');
 const search=page.getByLabel('Rechercher une personne');
 await expect(search).toBeFocused();
 await expect(page.locator('.actor-table tbody tr')).toHaveCount(1);
 await search.fill('elodie');
 await expect(search).toBeFocused();
 await page.getByLabel('Type d’acteur',{exact:true}).selectOption('Athlète');
 await page.screenshot({path:info.outputPath('recherche-mobile.png')});
 await page.getByRole('button',{name:'Élodie Mbuyi',exact:true}).click();
 await expect(menu(page).getByRole('button',{name:'Recherche',exact:true})).toHaveAttribute('aria-current','page');
 await page.getByRole('button',{name:'Retour aux acteurs',exact:true}).click();
 await expect(search).toHaveValue('elodie');
 await page.getByRole('button',{name:'Modifier la fiche de Élodie Mbuyi',exact:true}).click();
 await page.getByLabel('Nom complet',{exact:false}).fill('Modification non enregistrée');
 page.once('dialog',dialog=>dialog.dismiss());
 await tab(page,'Accueil');
 await expect(page.getByLabel('Nom complet',{exact:false})).toHaveValue('Modification non enregistrée');
 await page.getByRole('button',{name:'Annuler',exact:true}).click();
 await expect(search).toHaveValue('elodie');
 await page.getByRole('button',{name:'Exporter cette sélection depuis l’accueil',exact:true}).click();
 await expect(menu(page).getByRole('button',{name:'Accueil',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.getByLabel('Périmètre de l’export')).toHaveValue('filtered');
 await expect(page.locator('#selection-summary')).toContainText('elodie');
 await expect(page.locator('#selection-summary')).toContainText('Athlète');
 await expect(page.locator('#export-count')).toHaveText('1 fiche dans cet export.');
 await page.screenshot({path:info.outputPath('accueil-mobile.png')});
 for(const width of [320,390,600,1440]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const rect=await menu(page).boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(width+1);
  expect(rect.y+rect.height).toBeLessThanOrEqual(845);expect(rect.y).toBeGreaterThan(600);
  for(const button of await menu(page).getByRole('button').all()){
   const box=await button.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 const lastAction=await page.getByRole('button',{name:/Voir les modèles Excel et PDF/}).boundingBox();
 const nav=await menu(page).boundingBox();expect(lastAction.y+lastAction.height).toBeLessThan(nav.y);
 const file=page.waitForEvent('download');
 await page.getByRole('button',{name:'Exporter en Excel · sélection filtrée',exact:true}).click();
 expect((await file).suggestedFilename()).toContain('selection-filtree.xlsx');
 await tab(page,'Paramètres');
 await expect(page.getByLabel('Nom du club',{exact:false})).toHaveValue('Club Mobile');
 await expect(page.locator('#install-tools')).toBeVisible();
 await page.screenshot({path:info.outputPath('parametres-mobile.png')});
 await tab(page,'Acteurs');
 // The actors filter remains independent of the search selection.
 await page.getByLabel('Type d’acteur',{exact:true}).selectOption('');
 await page.getByRole('button',{name:'Modifier la fiche de Élodie Mbuyi',exact:true}).click();
 await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 const save=await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).boundingBox();
 const formNav=await menu(page).boundingBox();expect(save.y+save.height).toBeLessThan(formNav.y);
 await page.screenshot({path:info.outputPath('formulaire-bas-mobile.png')});
 await page.getByRole('button',{name:'Annuler',exact:true}).click();
});

test('navigation accessible avant configuration du club',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Votre club',exact:true})).toBeVisible();
 for(const [name,title] of [['Acteurs','Acteurs'],['Recherche','Retrouver un acteur'],['Accueil','Votre registre'],['Paramètres','Votre club']]){
  await tab(page,name);
  await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(menu(page).getByRole('button',{name,exact:true})).toHaveAttribute('aria-current','page');
 }
 await tab(page,'Accueil');
 await page.getByRole('button',{name:'Ajouter une personne',exact:true}).click();
 await expect(page.getByLabel('Nom du club',{exact:false})).toBeFocused();
 await expect(page.getByRole('status').filter({hasText:'Renseignez'})).toBeVisible();
 await page.getByLabel('Nom du club',{exact:false}).fill('Club Navigation');
 await page.getByRole('button',{name:'Enregistrer le club',exact:true}).click();
 await tab(page,'Acteurs');
 await expect(page.getByRole('heading',{name:'Acteurs',exact:true})).toBeVisible();
});
