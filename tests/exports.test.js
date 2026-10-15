import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {createWorkbook,createPdf,HEADERS} from '../src/exports.js';
const person={key:'secret-internal-key',name:'Élodie Mbuyi',type:'Athlète',sex:'Féminin',birthDate:'2000-02-29',affiliationDate:'2024-08-17',phone:'00243 0812345678',email:'',address:'Avenue de l’Équateur'};
test('XLSX réel, dates typées, téléphone texte, aucun identifiant',async()=>{
 const buffer=await createWorkbook('Club Étoile',[person,{...person,name:'=1+1',birthDate:'',affiliationDate:'',phone:'+243 (0) 81'}]);
 const book=new ExcelJS.Workbook();await book.xlsx.load(buffer);
 assert.deepEqual(book.worksheets.map(s=>s.name),['CLUB','ACTEURS']);
 assert.equal(book.getWorksheet('CLUB').getCell('A2').value,'Club Étoile');
 const sheet=book.getWorksheet('ACTEURS');
 assert.deepEqual(sheet.getRow(1).values.slice(1),HEADERS);
 assert.equal(sheet.getCell('E2').value.toISOString(),'2000-02-29T00:00:00.000Z');
 assert.equal(sheet.getCell('F2').value.toISOString(),'2024-08-17T00:00:00.000Z');
 assert.equal(sheet.getCell('F2').numFmt,'dd/mm/yyyy');
 assert.equal(sheet.getCell('H2').value,'00243 0812345678');assert.equal(sheet.getCell('H2').type,ExcelJS.ValueType.String);
 assert.equal(sheet.getCell('H2').numFmt,'@');
 assert.equal(sheet.getCell('C3').value,'=1+1');assert.equal(sheet.getCell('C3').type,ExcelJS.ValueType.String);
 assert.equal(sheet.getCell('E3').value,null);
 assert.equal(sheet.getCell('F3').value,null);
 assert.ok(!JSON.stringify(sheet.getSheetValues()).includes(person.key));
});
test('XLSX vide',async()=>{
 const buffer=await createWorkbook('Club',[]);const book=new ExcelJS.Workbook();await book.xlsx.load(buffer);
 assert.equal(book.getWorksheet('ACTEURS').rowCount,1);
});
test('PDF local avec polices embarquées, texte long et pages multiples',async()=>{
 const fonts=await Promise.all(['Regular','Bold'].map(style=>readFile('public/fonts/NotoSans-'+style+'.ttf')));
 const people=Array.from({length:80},(_,i)=>({...person,name:'Élodie Mbuyi '+(i+1),address:'Adresse longue, avec accents : Équateur, bâtiment des entraîneurs. '.repeat(4)}));
 const pdf=await createPdf('Club Étoile',people,'Toutes les fiches',fonts,new Date('2026-10-12T10:00:00Z'));
 assert.ok(new TextDecoder().decode(pdf.slice(0,8)).startsWith('%PDF-'));
 assert.ok(pdf.byteLength>20000);
});
