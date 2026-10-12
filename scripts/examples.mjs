import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createWorkbook,createPdf} from '../src/exports.js';
const directory='output/modeles';await mkdir(directory,{recursive:true});
const people=[
 {key:'example-only-1',type:'Athlète',name:'Élodie Mbuyi',sex:'Féminin',birthDate:'2000-02-29',affiliationDate:'2024-08-17',address:'12, avenue de l’Équateur',phone:'+243 081 234 5678',email:'elodie@example.org'},
 {key:'example-only-2',type:'Entraîneur',name:'André N’Kulu',sex:'Masculin',birthDate:'',affiliationDate:'2023-09-05',address:'Quartier des écoles, bâtiment B, deuxième étage',phone:'00243 089 000 1122',email:''},
 {key:'example-only-3',type:'Médecin',name:'Noëlle Lema',sex:'Féminin',birthDate:'1987-11-02',affiliationDate:'2025-02-01',address:'',phone:'',email:'noelle@example.org'},
];
const fonts=await Promise.all(['Regular','Bold'].map(style=>readFile('public/fonts/NotoSans-'+style+'.ttf')));
await writeFile(directory+'/exemple-registre.xlsx',await createWorkbook('CLUB EXEMPLE · données de démonstration',people));
await writeFile(directory+'/exemple-registre.pdf',new Uint8Array(await createPdf('CLUB EXEMPLE · données de démonstration',people,'Exemple de modèle · données fictives',fonts,new Date('2026-10-12T10:00:00Z'))));
const long=Array.from({length:80},(_,index)=>({...people[index%people.length],name:people[index%people.length].name+' '+(index+1),address:'Adresse longue : avenue de l’Équateur, bâtiment des entraîneurs, accès principal. '.repeat(4)}));
await writeFile(directory+'/exemple-multipage.pdf',new Uint8Array(await createPdf('CLUB EXEMPLE · données de démonstration',long,'Exemple multipage · données fictives',fonts,new Date('2026-10-12T10:00:00Z'))));
console.log('Modèles générés dans '+directory+' (aucune insertion dans le registre).');
