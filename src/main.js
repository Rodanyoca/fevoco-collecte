import './style.css';
import { ACTOR_TYPES, SEXES, FIELDS, compactDate, displayDate, validatePerson, filterPeople, fileName, exportRows } from './model.js';
import { loadClub, loadPeople, saveClub, savePerson, deletePerson } from './db.js';
import { createWorkbook, createPdf, download, HEADERS } from './exports.js';
import { initializeOffline, requestPersistence } from './offline.js';
const main=document.querySelector('#main');
let people=[],club='',view='list',currentKey=null,search='',typeFilter='',exportScope='all',busy=false,pdfUrl;
let returnView='list';
const esc = value => String(value??'').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const option = (value,selected) => '<option '+(value===selected?'selected':'')+' value="'+esc(value)+'">'+esc(value)+'</option>';
const selectedPeople=()=> exportScope==='filtered'?filterPeople(people,search,typeFilter):people;
const scopeText=()=> exportScope==='filtered'?'Sélection filtrée':'Toutes les fiches';
function announce(text) {document.querySelector('#announcement').textContent=text;}
function message(text,isError=false) {
  let box=main.querySelector('#feedback');
  if(!box){box=document.createElement('p');box.id='feedback';main.prepend(box);}
  box.className=isError?'error':'success';box.setAttribute('role',isError?'alert':'status');box.textContent=text;
}
function errorMessage(error) {
  if(error?.name==='QuotaExceededError') return 'Espace local insuffisant. Libérez de l’espace sur cet appareil puis réessayez ; cette saisie n’a pas été enregistrée.';
  return 'Opération impossible : '+(error?.message||'stockage local indisponible')+'.';
}
function heading(kicker,title,description,action='') {
  return '<div class="page-heading"><div><p class="eyebrow">'+kicker+'</p><h1>'+esc(title)+'</h1><p class="muted">'+description+'</p></div>'+action+'</div>';
}
function setView(next,key=null) {
  if(document.querySelector('form[data-person-form]') && next!==view && !confirm('Quitter cette fiche sans enregistrer les modifications ?')) return;
  if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null;}
  view=next;currentKey=key;render();main.focus();window.scrollTo(0,0);
}
function render() {
  document.querySelectorAll('.nav-item[data-action]').forEach(button=>button.classList.toggle('active',button.dataset.action===(view==='club'?'club':'list')));
  if(!club && view!=='club') view='club';
  if(view==='club') renderClub();
  else if(view==='form') renderForm();
  else if(view==='detail') renderDetail();
  else if(view==='models') renderModels();
  else renderList();
}
function renderClub() {
  main.innerHTML=heading('CONFIGURATION','Votre club','Un seul nom pour toutes les fiches du registre.')+
    '<section class="panel narrow"><form id="club-form"><label for="club-name">Nom du club <span aria-hidden="true">*</span></label><input id="club-name" name="club" required maxlength="200" autocomplete="organization" value="'+esc(club)+'" placeholder="Renseigner le nom du club"><p class="help">Le nom peut être modifié. Il sera repris dans tous les exports.</p><div class="actions"><button type="submit">Enregistrer le club</button>'+(club?'<button type="button" class="secondary" data-action="list">Annuler</button>':'')+'</div></form></section>'+
    '<section class="local-note narrow"><h2>Un registre sur cet appareil</h2><p>Les fiches restent dans ce navigateur, même après fermeture. Aucun compte n’est nécessaire.</p><p>Après la première préparation en ligne, toutes les fonctions sont accessibles hors ligne. La suppression des données du navigateur efface ce registre local.</p><p>Pour l’installation sur téléphone : utilisez « Installer l’application » si proposé, ou le menu du navigateur puis « Ajouter à l’écran d’accueil ».</p><p id="persistence" class="muted"></p></section>';
  document.querySelector('#club-form').onsubmit=async event=>{
    event.preventDefault();const name=new FormData(event.currentTarget).get('club').trim();if(!name)return;
    const button=event.currentTarget.querySelector('button');button.disabled=true;
    try{await saveClub(name);club=name;setView('list');message('Nom du club enregistré.');requestPersistence().then(persistent=>announce(persistent?'Stockage persistant accordé.':'Stockage local enregistré.'));}catch(error){button.disabled=false;message(errorMessage(error),true);}
  };
  navigator.storage?.persisted?.().then(value=>{const label=document.querySelector('#persistence');if(label) label.textContent=value?'Protection du stockage contre l’éviction : accordée par le navigateur.':'La conservation dépend de l’espace disponible et des réglages du navigateur. Exportez régulièrement.';});
}
function renderList() {
  main.innerHTML=heading('REGISTRE DU CLUB',club,'Identification des acteurs · '+people.length+' fiche'+(people.length>1?'s':''),'<button data-action="new">Ajouter une personne</button>')+
    '<section class="panel"><div class="filters"><div><label for="search">Rechercher une personne</label><input type="search" id="search" value="'+esc(search)+'" placeholder="Nom, téléphone ou e-mail"></div><div><label for="type-filter">Type d’acteur</label><select id="type-filter"><option value="">Tous les types</option>'+ACTOR_TYPES.map(value=>option(value,typeFilter)).join('')+'</select></div></div><div id="people-list"></div></section>'+
    '<section class="panel export-panel"><div><h2>Exporter le registre</h2><p class="muted">Fichiers générés sur cet appareil, également hors ligne.</p></div><div class="export-controls"><div><label for="export-scope">Périmètre de l’export</label><select id="export-scope"><option value="all" '+(exportScope==='all'?'selected':'')+'>Toutes les fiches</option><option value="filtered" '+(exportScope==='filtered'?'selected':'')+'>Sélection filtrée</option></select></div><p id="export-count" class="help"></p><div class="actions"><button class="secondary" data-action="excel"></button><button class="secondary" data-action="pdf"></button></div><button class="text-button" data-action="models">Voir les modèles Excel et PDF</button></div></section>';
  document.querySelector('#search').oninput=event=>{search=event.target.value;renderRows();};
  document.querySelector('#type-filter').onchange=event=>{typeFilter=event.target.value;renderRows();};
  document.querySelector('#export-scope').onchange=event=>{exportScope=event.target.value;updateExportLabels();};
  renderRows();
}
function renderRows() {
  const visible=filterPeople(people,search,typeFilter);
  const list=document.querySelector('#people-list');
  list.innerHTML='<p class="list-count" aria-live="polite">'+visible.length+' personne'+(visible.length>1?'s':'')+' affichée'+(visible.length>1?'s':'')+' sur '+people.length+'</p>'+
    (visible.length?'<ul class="people">'+visible.map(person=>'<li><div class="person-info"><button class="person-name text-button" data-action="detail" data-key="'+esc(person.key)+'">'+esc(person.name)+'</button><p><span class="tag">'+esc(person.type)+'</span> <span>'+esc(person.sex)+'</span><span class="affiliation">Affiliation : '+displayDate(person.affiliationDate)+'</span></p></div><div class="row-actions"><button class="text-button" data-action="edit" data-key="'+esc(person.key)+'" aria-label="Modifier la fiche de '+esc(person.name)+'">Modifier</button><button class="text-button red" data-action="delete" data-key="'+esc(person.key)+'" aria-label="Supprimer la fiche de '+esc(person.name)+'">Supprimer</button></div></li>').join('')+'</ul>':'<div class="empty"><h2>'+(people.length?'Aucun résultat':'Votre registre commence ici')+'</h2><p>'+(people.length?'Essayez un autre nom ou un autre type d’acteur.':'Ajoutez la première personne de votre club.')+'</p>'+(people.length?'<button class="text-button" data-action="reset-filters">Effacer les filtres</button>':'')+'</div>');
  updateExportLabels();
}
function updateExportLabels(){
  const count=selectedPeople().length;
  const label=scopeText().toLocaleLowerCase('fr');
  for(const format of ['excel','pdf']){const button=main.querySelector('[data-action="'+format+'"]');if(button){button.textContent='Exporter en '+(format==='excel'?'Excel':'PDF')+' · '+label;button.disabled=busy||count===0;}}
  const countLabel=document.querySelector('#export-count');if(countLabel) countLabel.textContent=count+' fiche'+(count>1?'s':'')+' dans cet export.';
}
function inputField(key,label,required,value=''){
  const req=required?' required':'';
  let input;
  if(key==='type'||key==='sex') input='<select id="'+key+'" name="'+key+'"'+req+'><option value="">Sélectionner</option>'+(key==='type'?ACTOR_TYPES:SEXES).map(item=>option(item,value)).join('')+'</select>';
  else if(key==='address') input='<textarea id="address" name="address" maxlength="1000" rows="3" autocomplete="street-address">'+esc(value)+'</textarea>';
  else {
    const date=key.endsWith('Date'),inputType=key==='email'?'email':key==='phone'?'tel':'text';
    input='<input id="'+key+'" name="'+key+'" type="'+inputType+'"'+req+' value="'+esc(date?displayDate(value):value)+'" '+(date?'inputmode="numeric" maxlength="10" placeholder="JJMMAAAA" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}"': 'maxlength="'+(key==='name'?200:key==='phone'?80:254)+'" autocomplete="'+(key==='name'?'name':key==='phone'?'tel':'email')+'"')+'>';
  }
  return '<div class="field '+(key==='address'?'full':'')+'"><label for="'+key+'">'+label+(required?' <span aria-hidden="true">*</span>':' <span class="optional">(facultatif)</span>')+'</label>'+input+'<p class="field-error" id="'+key+'-error" hidden></p></div>';
}
function renderForm(){
  const person=people.find(p=>p.key===currentKey);
  main.innerHTML=heading('IDENTIFICATION',person?'Modifier la fiche':'Ajouter une personne',esc(club))+
    '<section class="panel"><p class="help">Les champs marqués * sont obligatoires. La date d’affiliation est celle de l’entrée au club.</p><form id="person-form" data-person-form novalidate><div class="form-grid">'+FIELDS.map(([key,label])=>inputField(key,label,['name','type','sex','affiliationDate'].includes(key),person?.[key]||'')).join('')+'</div><div class="actions form-actions"><button type="submit">Enregistrer la fiche</button><button type="button" class="secondary" data-action="cancel-form">Annuler</button></div></form></section>';
  main.querySelectorAll('input[inputmode="numeric"]').forEach(input=>input.oninput=()=>{input.value=compactDate(input.value);});
  document.querySelector('#person-form').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget;
    const {data,errors}=validatePerson(Object.fromEntries(new FormData(form)));
    form.querySelectorAll('[aria-invalid]').forEach(input=>{input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');});
    form.querySelectorAll('.field-error').forEach(error=>{error.hidden=true;error.textContent='';});
    if(Object.keys(errors).length){
      for(const [key,error]of Object.entries(errors)){const input=form.elements.namedItem(key),label=document.querySelector('#'+key+'-error');input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',label.id);label.hidden=false;label.textContent=error;}
      form.elements.namedItem(Object.keys(errors)[0]).focus();announce('Vérifiez les champs signalés.');return;
    }
    const buttons=form.querySelectorAll('button');buttons.forEach(button=>button.disabled=true);
    try{
      await savePerson({...data,key:person?.key||crypto.randomUUID()});
      people=await loadPeople();sortPeople();view='list';currentKey=null;render();main.focus();message('Fiche enregistrée sur cet appareil.');
    }catch(error){buttons.forEach(button=>button.disabled=false);message(errorMessage(error),true);}
  };
}
function renderDetail(){
  const person=people.find(p=>p.key===currentKey);if(!person){view='list';render();return;}
  main.innerHTML=heading('FICHE DU CLUB',person.name,esc(club),'<button class="secondary" data-action="list">Retour au registre</button>')+
    '<section class="panel"><dl class="detail-grid">'+FIELDS.map(([key,label])=>'<div><dt>'+label+'</dt><dd>'+esc(key.endsWith('Date')?displayDate(person[key]):person[key])+'</dd></div>').join('')+'</dl><div class="actions"><button data-action="edit" data-key="'+esc(person.key)+'">Modifier la fiche</button><button class="secondary red" data-action="delete" data-key="'+esc(person.key)+'">Supprimer la fiche</button></div></section>';
}
function renderModels(){
  main.innerHTML=heading('MODÈLES D’EXPORT','Aperçu des modèles','Les aperçus reprennent le périmètre : '+scopeText().toLocaleLowerCase('fr')+'.','<button class="secondary" data-action="list">Retour au registre</button>')+
    '<section class="panel"><h2>Excel · deux feuilles</h2><p class="muted">Feuille CLUB</p><div class="table-scroll"><table><thead><tr><th>Nom du club</th></tr></thead><tbody><tr><td>'+esc(club)+'</td></tr></tbody></table></div><p class="muted">Feuille ACTEURS · aperçu de 5 lignes maximum</p><div class="table-scroll"><table><thead><tr>'+HEADERS.map(label=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+exportRows(selectedPeople().slice(0,5),club).map(row=>'<tr>'+row.map(value=>'<td>'+esc(value)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="help">Dans le fichier Excel, les dates sont de vraies cellules de date au format JJ/MM/AAAA. Les téléphones sont du texte.</p><button class="secondary" data-action="excel">Exporter en Excel · '+scopeText().toLocaleLowerCase('fr')+'</button></section>'+
    '<section class="panel"><h2>PDF · registre institutionnel</h2><p class="muted">Format A3 paysage, en-têtes répétés et pages numérotées.</p><div class="actions"><button class="secondary" data-action="preview">Afficher l’aperçu PDF</button><button class="secondary" data-action="pdf">Exporter en PDF · '+scopeText().toLocaleLowerCase('fr')+'</button></div><div id="pdf-preview"></div></section>';
}
async function performExport(format,preview=false){
  if(busy)return;busy=true;updateExportLabels();
  const rows=selectedPeople(),scope=scopeText();
  try{
    if(format==='excel'){
      const buffer=await createWorkbook(club,rows);
      download(buffer,fileName(club,exportScope==='all'?'toutes-fiches':'selection-filtree','xlsx'),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }else{
      const buffer=await createPdf(club,rows,scope);
      if(preview){
        if(pdfUrl)URL.revokeObjectURL(pdfUrl);
        pdfUrl=URL.createObjectURL(new Blob([buffer],{type:'application/pdf'}));
        const target=document.querySelector('#pdf-preview');target.replaceChildren();
        const link=document.createElement('a');link.href=pdfUrl;link.target='_blank';link.rel='noopener';link.textContent='Ouvrir le PDF en plein écran';link.className='text-button';target.append(link);
        const frame=document.createElement('iframe');frame.title='Aperçu du registre PDF';frame.src=pdfUrl;target.append(frame);
      }else download(buffer,fileName(club,exportScope==='all'?'toutes-fiches':'selection-filtree','pdf'),'application/pdf');
    }
    if(!preview)message('Export '+(format==='excel'?'Excel':'PDF')+' généré · '+scope.toLocaleLowerCase('fr')+' ('+rows.length+' fiches).');
  }catch(error){message(errorMessage(error),true);}finally{busy=false;updateExportLabels();}
}
async function removePerson(key){
  const person=people.find(p=>p.key===key);if(!person)return;
  const dialog=document.querySelector('#confirm');document.querySelector('#confirm-name').textContent=person.name;
  dialog.returnValue='cancel';dialog.showModal();
  const result=await new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue),{once:true}));
  if(result!=='delete')return;
  try{await deletePerson(key);people=await loadPeople();view='list';currentKey=null;render();main.focus();message('Fiche supprimée.');}
  catch(error){message(errorMessage(error),true);}
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action,key=button.dataset.key;
  if(action==='list'||action==='club'||action==='models')setView(action);
  else if(action==='new'){returnView='list';setView('form');}
  else if(action==='edit'){returnView=view==='detail'?'detail':'list';setView('form',key);}
  else if(action==='detail')setView('detail',key);
  else if(action==='cancel-form'){view=returnView;render();main.focus();}
  else if(action==='delete')removePerson(key);
  else if(action==='excel'||action==='pdf')performExport(action);
  else if(action==='preview')performExport('pdf',true);
  else if(action==='reset-filters'){search='';typeFilter='';render();}
});
function sortPeople(){people.sort((a,b)=>a.name.localeCompare(b.name,'fr'));}
window.addEventListener('beforeunload',event=>{if(document.querySelector('form[data-person-form]')){event.preventDefault();event.returnValue='';}});
try{[club,people]=await Promise.all([loadClub(),loadPeople()]);sortPeople();render();}
catch(error){main.innerHTML='<h1>Le stockage local est indisponible</h1><p role="alert">'+esc(errorMessage(error))+'</p><p>Vérifiez les autorisations de stockage du navigateur. Aucun enregistrement temporaire en mémoire ne remplace vos fiches.</p><button onclick="location.reload()">Réessayer</button>';}
initializeOffline();
