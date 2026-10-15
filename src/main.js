import './style.css';
import { ACTOR_TYPES, SEXES, FIELDS, compactDate, displayDate, validatePerson, filterPeople, fileName, exportRows } from './model.js';
import { loadClub, loadPeople, saveClub, savePerson, deletePerson } from './db.js';
import { createWorkbook, createPdf, download, HEADERS } from './exports.js';
import { initializeOffline, requestPersistence } from './offline.js';
import { icon } from './icons.js';

const main=document.querySelector('#main');
let people=[],club='',view='home',currentKey=null,search='',typeFilter='',actorTypeFilter='',exportScope='all',busy=false,pdfUrl;
let returnView='list',actorOrigin='list';
const esc = value => String(value??'').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const option = (value,selected) => '<option '+(value===selected?'selected':'')+' value="'+esc(value)+'">'+esc(value)+'</option>';
const selectedPeople=()=> exportScope==='filtered'?filterPeople(people,search,typeFilter):people;
const scopeText=()=> exportScope==='filtered'?'Sélection filtrée':'Toutes les fiches';
document.querySelectorAll('[data-nav-icon]').forEach(element=>element.innerHTML=icon(element.dataset.navIcon));
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
  if(next==='form' && !club){
    view='club';currentKey=null;render();
    message('Renseignez le nom du club avant de créer une fiche.');
    document.querySelector('#club-name').focus();window.scrollTo(0,0);return;
  }
  view=next;currentKey=key;render();main.focus();window.scrollTo(0,0);
  if(view==='search') document.querySelector('#search').focus({preventScroll:true});
}
function render() {
  const section=view==='models'?'home':['form','detail'].includes(view)?actorOrigin:view;
  document.querySelectorAll('.nav-item[data-action]').forEach(button=>{
    const active=button.dataset.action===section;
    button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  document.querySelector('#install-tools').hidden=view!=='club';
  if(view==='club') renderClub();
  else if(view==='form') renderForm();
  else if(view==='detail') renderDetail();
  else if(view==='models') renderModels();
  else if(view==='home') renderHome();
  else if(view==='search') renderSearch();
  else renderList();
}
function renderHome() {
  const athletes=people.filter(person=>person.type==='Athlète').length;
  main.innerHTML=heading('ACCUEIL',club||'Votre registre','Votre registre d’identification, toujours à portée de main.')+
    '<section class="overview" aria-label="Aperçu du registre"><div class="overview-icon">'+icon('users')+'</div><div class="overview-copy"><span class="muted">Votre club en un regard</span><p><strong>'+people.length+'</strong> acteur'+(people.length>1?'s':'')+' enregistré'+(people.length>1?'s':'')+'</p><div class="overview-meta"><span>'+athletes+' athlète'+(athletes>1?'s':'')+'</span><span>'+ (people.length-athletes)+' autre'+(people.length-athletes>1?'s':'')+' acteur'+(people.length-athletes>1?'s':'')+'</span></div></div><button class="secondary" data-action="list">Voir les acteurs '+icon('arrow')+'</button></section>'+
    '<div class="quick-actions"><button class="quick-action primary" data-action="new" aria-label="Ajouter une personne"><span class="quick-icon">'+icon('plus')+'</span><span><strong>Ajouter une personne</strong><small>Créer une nouvelle fiche</small></span>'+icon('arrow')+'</button><button class="quick-action" data-action="search" aria-label="Rechercher un acteur"><span class="quick-icon">'+icon('search')+'</span><span><strong>Rechercher un acteur</strong><small>Retrouver une fiche rapidement</small></span>'+icon('arrow')+'</button></div>'+
    '<section class="panel export-panel" aria-labelledby="export-title"><div class="section-title"><span class="section-icon">'+icon('download')+'</span><div><h2 id="export-title">Exporter le registre</h2><p class="muted">Vos fichiers Excel et PDF, même hors ligne.</p></div></div><div class="export-controls"><div><label for="export-scope">Périmètre de l’export</label><select id="export-scope"><option value="all" '+(exportScope==='all'?'selected':'')+'>Toutes les fiches</option><option value="filtered" '+(exportScope==='filtered'?'selected':'')+'>Sélection filtrée</option></select></div><p id="export-count" class="help"></p><div id="selection-summary" class="selection-summary" hidden></div><div class="actions export-actions"><button class="secondary export-button" data-action="excel"></button><button class="secondary export-button" data-action="pdf"></button></div><button class="text-button models-link" data-action="models">Voir les modèles Excel et PDF '+icon('arrow')+'</button></div></section>'+
    '<p class="home-note">'+icon('shield')+'<span>Les fiches restent sur cet appareil. Exportez régulièrement votre registre.</span></p>';
  document.querySelector('#export-scope').onchange=event=>{exportScope=event.target.value;updateExportLabels();};
  updateExportLabels();
}
function renderClub() {
  main.innerHTML=heading('PARAMÈTRES','Votre club','Personnalisez votre registre et retrouvez les informations de l’application.')+
    '<section class="panel narrow"><div class="section-title"><span class="section-icon">'+icon('club')+'</span><div><h2>Nom du club</h2><p class="muted">Un seul nom pour toutes les fiches.</p></div></div><form id="club-form"><label for="club-name">Nom du club <span aria-hidden="true">*</span></label><input id="club-name" name="club" required maxlength="200" autocomplete="organization" value="'+esc(club)+'" placeholder="Renseigner le nom du club"><p class="help">Le nom peut être modifié. Il sera repris dans tous les exports.</p><div class="actions"><button type="submit">Enregistrer le club</button>'+(club?'<button type="button" class="secondary" data-action="home">Annuler</button>':'')+'</div></form></section>'+
    '<section class="panel local-note narrow"><div class="section-title"><span class="section-icon">'+icon('shield')+'</span><div><h2>Données et fonctionnement hors ligne</h2><p class="muted">Votre registre reste sur cet appareil.</p></div></div><p>Les fiches restent dans ce navigateur, même après fermeture. Aucun compte n’est nécessaire.</p><p>Après la première préparation en ligne, toutes les fonctions sont accessibles hors ligne. La suppression des données du navigateur efface ce registre local.</p><p id="persistence" class="help"></p></section>';
  document.querySelector('#club-form').onsubmit=async event=>{
    event.preventDefault();const name=new FormData(event.currentTarget).get('club').trim();if(!name)return;
    const button=event.currentTarget.querySelector('button');button.disabled=true;
    try{await saveClub(name);club=name;setView('home');message('Nom du club enregistré.');requestPersistence().then(persistent=>announce(persistent?'Stockage persistant accordé.':'Stockage local enregistré.'));}catch(error){button.disabled=false;message(errorMessage(error),true);}
  };
  navigator.storage?.persisted?.().then(value=>{const label=document.querySelector('#persistence');if(label) label.textContent=value?'Protection du stockage contre l’éviction : accordée par le navigateur.':'La conservation dépend de l’espace disponible et des réglages du navigateur. Exportez régulièrement.';});
}
function typeSelector(id,value) {
  return '<div><label for="'+id+'">Type d’acteur</label><select id="'+id+'"><option value="">Tous les types</option>'+ACTOR_TYPES.map(type=>option(type,value)).join('')+'</select></div>';
}
function renderList() {
  main.innerHTML=heading('REGISTRE','Acteurs',esc(club)+' · '+people.length+' fiche'+(people.length>1?'s':''),'<button data-action="new">'+icon('plus')+' Ajouter une personne</button>')+
    '<section class="panel people-panel"><div class="list-toolbar">'+typeSelector('actor-type-filter',actorTypeFilter)+'</div><div id="people-list"></div></section>';
  document.querySelector('#actor-type-filter').onchange=event=>{actorTypeFilter=event.target.value;renderRows();};
  renderRows();
}
function renderSearch() {
  main.innerHTML=heading('RECHERCHE','Retrouver un acteur','Recherchez par nom, téléphone ou e-mail.')+
    '<section class="panel search-panel"><label for="search">Rechercher une personne</label><div class="search-input">'+icon('search')+'<input type="search" id="search" value="'+esc(search)+'" placeholder="Nom, téléphone ou e-mail" autocomplete="off" enterkeyhint="search"></div><div class="search-filters">'+typeSelector('type-filter',typeFilter)+'<button class="text-button" data-action="reset-filters">Effacer les filtres</button></div></section><section class="panel people-panel" aria-label="Résultats de recherche"><div id="people-list"></div></section>'+
    '<button class="selection-export-link secondary" data-action="export-selection">'+icon('download')+' Exporter cette sélection depuis l’accueil</button>';
  document.querySelector('#search').oninput=event=>{search=event.target.value;renderRows();};
  document.querySelector('#type-filter').onchange=event=>{typeFilter=event.target.value;renderRows();};
  renderRows();
}
function renderRows() {
  const visible=view==='search'?filterPeople(people,search,typeFilter):filterPeople(people,'',actorTypeFilter);
  const list=document.querySelector('#people-list');
  list.innerHTML='<p class="list-count" aria-live="polite">'+visible.length+' personne'+(visible.length>1?'s':'')+' affichée'+(visible.length>1?'s':'')+' sur '+people.length+'</p>'+
    (visible.length?'<div class="actor-table-wrap"><table class="actor-table"><caption class="sr-only">Acteurs du club</caption><thead><tr><th scope="col">Nom</th><th scope="col" class="actor-type-column">Type</th><th scope="col">Sexe</th><th scope="col" class="actor-actions-heading">Actions</th></tr></thead><tbody>'+visible.map(person=>'<tr><td><button class="person-name text-button" data-action="detail" data-key="'+esc(person.key)+'">'+esc(person.name)+'</button><span class="actor-mobile-type">'+esc(person.type)+'</span></td><td class="actor-type-column">'+esc(person.type)+'</td><td class="actor-sex">'+esc(person.sex)+'</td><td><div class="actor-row-actions"><button class="text-button" data-action="edit" data-key="'+esc(person.key)+'" aria-label="Modifier la fiche de '+esc(person.name)+'">'+icon('edit')+'<span>Modifier</span></button><button class="text-button red" data-action="delete" data-key="'+esc(person.key)+'" aria-label="Supprimer la fiche de '+esc(person.name)+'">'+icon('trash')+'<span>Supprimer</span></button></div></td></tr>').join('')+'</tbody></table></div>':'<div class="empty">'+icon(view==='search'?'search':'users')+'<h2>'+(people.length?'Aucun résultat':'Votre registre commence ici')+'</h2><p>'+(people.length?'Essayez un autre nom ou un autre type d’acteur.':'Ajoutez la première personne de votre club.')+'</p>'+(people.length?(view==='search'?'':'<button class="text-button" data-action="reset-filters">Effacer les filtres</button>'):'<button class="secondary" data-action="new">Créer la première fiche</button>')+'</div>');
}
function updateExportLabels(){
  const count=selectedPeople().length;
  const label=scopeText().toLocaleLowerCase('fr');
  for(const format of ['excel','pdf']){const button=main.querySelector('[data-action="'+format+'"]');if(button){button.textContent='Exporter en '+(format==='excel'?'Excel':'PDF')+' · '+label;button.disabled=busy||count===0;}}
  const countLabel=document.querySelector('#export-count');if(countLabel) countLabel.textContent=count+' fiche'+(count>1?'s':'')+' dans cet export.';
  const summary=document.querySelector('#selection-summary');
  if(summary){summary.hidden=exportScope!=='filtered';summary.innerHTML='<p><strong>Sélection de la recherche</strong><br>'+esc([search?'« '+search+' »':'',typeFilter].filter(Boolean).join(' · ')||'Aucun filtre : toutes les fiches')+'</p><button class="text-button" data-action="search">Modifier la sélection '+icon('arrow')+'</button>';}
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
    '<section class="panel"><p class="help">Les champs marqués * sont obligatoires. La date d’affiliation est celle de l’entrée au club.</p><form id="person-form" data-person-form novalidate><div class="form-grid">'+FIELDS.map(([key,label])=>inputField(key,label,['name','type','sex'].includes(key),person?.[key]||'')).join('')+'</div><div class="actions form-actions"><button type="submit">Enregistrer la fiche</button><button type="button" class="secondary" data-action="cancel-form">Annuler</button></div></form></section>';
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
      people=await loadPeople();sortPeople();view=actorOrigin;currentKey=null;render();main.focus();message('Fiche enregistrée sur cet appareil.');
    }catch(error){buttons.forEach(button=>button.disabled=false);message(errorMessage(error),true);}
  };
}
function renderDetail(){
  const person=people.find(p=>p.key===currentKey);if(!person){view='list';render();return;}
  const fields=keys=>'<dl class="detail-grid">'+FIELDS.filter(([key])=>keys.includes(key)).map(([key,label])=>'<div><dt>'+label+'</dt><dd>'+esc(key.endsWith('Date')?displayDate(person[key]):person[key])+'</dd></div>').join('')+'</dl>';
  main.innerHTML=heading('FICHE DU CLUB','Consulter la fiche',esc(club),'<button class="secondary" data-action="return-actors">Retour aux acteurs</button>')+
    '<section class="profile-hero"><div><span class="tag">'+esc(person.type)+'</span><h2>'+esc(person.name)+'</h2><p class="muted">'+esc(person.sex)+'</p></div></section>'+
    '<div class="profile-sections"><section class="panel"><h2>Identit\u00e9 et affiliation</h2>'+fields(['type','name','sex','birthDate','affiliationDate'])+'</section><section class="panel"><h2>Coordonn\u00e9es</h2>'+fields(['phone','email','address'])+'</section></div>'+
    '<div class="actions profile-actions"><button data-action="edit" data-key="'+esc(person.key)+'">Modifier la fiche</button><button class="secondary red" data-action="delete" data-key="'+esc(person.key)+'">Supprimer la fiche</button></div>';
}
function renderModels(){
  main.innerHTML=heading('MODÈLES D’EXPORT','Aperçu des modèles','Les aperçus reprennent le périmètre : '+scopeText().toLocaleLowerCase('fr')+'.','<button class="secondary" data-action="home">Retour à l’accueil</button>')+
    '<section class="panel"><h2>Excel · deux feuilles</h2><p class="muted">Feuille CLUB</p><div class="table-scroll"><table><thead><tr><th>Nom du club</th></tr></thead><tbody><tr><td>'+esc(club)+'</td></tr></tbody></table></div><p class="muted">Feuille ACTEURS · aperçu de 5 lignes maximum</p><div class="table-scroll"><table><thead><tr>'+HEADERS.map(label=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+exportRows(selectedPeople().slice(0,5),club).map(row=>'<tr>'+row.map(value=>'<td>'+esc(value)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="help">Dans le fichier Excel, les dates sont de vraies cellules de date au format JJ/MM/AAAA. Les téléphones sont du texte.</p><button class="secondary" data-action="excel">Exporter en Excel · '+scopeText().toLocaleLowerCase('fr')+'</button></section>'+
    '<section class="panel"><h2>PDF · registre institutionnel</h2><p class="muted">Acteurs regroupés par catégorie, puis par nom. Format A3 paysage, en-têtes répétés et pages numérotées.</p><div class="actions"><button class="secondary" data-action="preview">Afficher l’aperçu PDF</button><button class="secondary" data-action="pdf">Exporter en PDF · '+scopeText().toLocaleLowerCase('fr')+'</button></div><div id="pdf-preview"></div></section>';
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
  try{await deletePerson(key);people=await loadPeople();view=actorOrigin;currentKey=null;render();main.focus();message('Fiche supprimée.');}
  catch(error){message(errorMessage(error),true);}
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action,key=button.dataset.key;
  if(['home','list','search','club','models'].includes(action))setView(action);
  else if(action==='new'){returnView='list';actorOrigin='list';setView('form');}
  else if(action==='edit'){if(view!=='detail')actorOrigin=view==='search'?'search':'list';returnView=view==='detail'?'detail':actorOrigin;setView('form',key);}
  else if(action==='detail'){actorOrigin=view==='search'?'search':'list';setView('detail',key);}
  else if(action==='return-actors')setView(actorOrigin);
  else if(action==='export-selection'){exportScope='filtered';setView('home');}
  else if(action==='cancel-form'){view=returnView;render();main.focus();}
  else if(action==='delete')removePerson(key);
  else if(action==='excel'||action==='pdf')performExport(action);
  else if(action==='preview')performExport('pdf',true);
  else if(action==='reset-filters'){if(view==='search'){search='';typeFilter='';}else actorTypeFilter='';render();if(view==='search')document.querySelector('#search').focus();}
});
function sortPeople(){people.sort((a,b)=>a.name.localeCompare(b.name,'fr'));}
window.addEventListener('beforeunload',event=>{if(document.querySelector('form[data-person-form]')){event.preventDefault();event.returnValue='';}});
try{[club,people]=await Promise.all([loadClub(),loadPeople()]);sortPeople();if(!club)view='club';render();}
catch(error){main.innerHTML='<h1>Le stockage local est indisponible</h1><p role="alert">'+esc(errorMessage(error))+'</p><p>Vérifiez les autorisations de stockage du navigateur. Aucun enregistrement temporaire en mémoire ne remplace vos fiches.</p><button onclick="location.reload()">Réessayer</button>';}
initializeOffline();
