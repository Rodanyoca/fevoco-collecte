import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDate,compactDate,validatePerson,filterPeople,exportRows,excelDate} from '../src/model.js';
const input={name:'Élodie Mbuyi',type:'Athlète',sex:'Féminin',affiliationDate:'17/08/2024',birthDate:'29/02/2000',phone:'+243 081 000 001'};
test('dates civiles et saisie compacte',()=>{
 assert.equal(compactDate('17082024'),'17/08/2024');
 assert.equal(compactDate('17/08/2024'),'17/08/2024');
 assert.equal(compactDate('1708202499'),'17/08/2024');
 assert.equal(compactDate('170'),'17/0');
 assert.equal(parseDate('29/02/2023'),null);assert.equal(parseDate('31/04/2024'),null);
 assert.equal(parseDate('00/12/2024'),null);assert.equal(parseDate('01/13/2024'),null);
 assert.equal(parseDate('29/02/2000').toISOString(),'2000-02-29T00:00:00.000Z');
});
test('affiliation obligatoire et distincte, facultatifs vides, téléphone texte',()=>{
 const result=validatePerson(input);assert.deepEqual(result.errors,{});
 assert.equal(result.data.affiliationDate,'2024-08-17');assert.equal(result.data.phone,input.phone);
 assert.equal(result.data.email,'');
 const blank=validatePerson({...input,affiliationDate:''});assert.ok(blank.errors.affiliationDate);assert.equal(blank.data.affiliationDate,'');
 for(const key of ['name','type','sex']) assert.ok(validatePerson({...input,[key]:''}).errors[key]);
 assert.ok(validatePerson({...input,affiliationDate:'31/02/2024'}).errors.affiliationDate);
 assert.ok(validatePerson({...input,affiliationDate:'01/01/1990'}).errors.affiliationDate);
 assert.ok(validatePerson({...input,email:'incorrect'}).errors.email);
});
test('recherche sans accents, filtre combiné, export sans clé interne',()=>{
 const people=[{...validatePerson(input).data,key:'private-key'},{...validatePerson(input).data,name:'Alice',type:'Médecin',key:'second-key'}];
 assert.equal(filterPeople(people,'elodie','Athlète').length,1);
 assert.equal(filterPeople(people,'elodie','Médecin').length,0);
 assert.equal(filterPeople(people,'081','').length,2);
 const rows=exportRows(people,'Club');assert.equal(rows[0][5],'17/08/2024');
 assert.equal(JSON.stringify(rows).includes('private-key'),false);
 assert.equal(excelDate('2024-08-17').toISOString(),'2024-08-17T00:00:00.000Z');
});
