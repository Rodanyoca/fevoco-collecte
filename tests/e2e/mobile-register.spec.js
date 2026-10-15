import {test,expect} from '@playwright/test';
test('mobile: optional affiliation, clear list and detail, persistence offline',async({page,context},info)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.getByLabel('Nom du club',{exact:false}).fill('Club mobile');
 await page.getByRole('button',{name:'Enregistrer le club',exact:true}).click();
 await expect(page.locator('#connectivity')).toHaveText('Pr\u00eate hors ligne');
 await context.setOffline(true);
 await page.getByRole('button',{name:'Ajouter une personne',exact:true}).click();
 await page.getByLabel('Nom complet',{exact:false}).fill('Alice Exemple');
 await page.getByLabel('Type d\u2019acteur',{exact:false}).selectOption({index:1});
 await page.getByLabel('Sexe',{exact:false}).selectOption({index:1});
 await page.getByLabel('Date de naissance',{exact:false}).fill('01012000');
 await expect(page.locator('#affiliationDate')).not.toHaveAttribute('required');
 await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
 await expect(page.locator('.actor-table tbody tr')).toHaveCount(1);
 await expect(page.locator('.person-avatar')).toHaveCount(0);
 await expect(page.getByRole('columnheader',{name:'Nom',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('liste-mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Alice Exemple',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Coordonn\u00e9es',exact:true})).toBeVisible();
 await expect(page.locator('.profile-sections').getByText('Date d\u2019affiliation au club',{exact:true}).locator('..').locator('dd')).toHaveText('');
 await expect(page.locator('.person-avatar')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('detail-mobile.png'),fullPage:true});
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.getByRole('button',{name:'Modifier la fiche',exact:true}).click();
 await expect(page.locator('#affiliationDate')).toHaveValue('');
 await page.getByRole('button',{name:'Enregistrer la fiche',exact:true}).click();
 await page.reload();
 await page.getByRole('navigation',{name:'Navigation principale'}).getByRole('button',{name:'Acteurs',exact:true}).click();
 await expect(page.getByRole('button',{name:'Alice Exemple',exact:true})).toBeVisible();
});
