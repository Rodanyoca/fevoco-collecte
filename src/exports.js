import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { FIELDS, displayDate, excelDate, groupPeopleByType } from './model.js';
export const HEADERS = ['Nom du club', ...FIELDS.map(([, label]) => label)];
export async function createWorkbook(club, people) {
  const book = new ExcelJS.Workbook();
  book.creator = 'FEVOCO'; book.created = new Date();
  const clubSheet = book.addWorksheet('CLUB');
  clubSheet.columns = [{header:'Nom du club',key:'club',width:58}];
  clubSheet.addRow([club]);
  const sheet = book.addWorksheet('ACTEURS',{views:[{state:'frozen',ySplit:1}]});
  sheet.columns = HEADERS.map((header,index) => ({header,key:String(index),width:[30,20,36,14,20,26,46,24,36][index]}));
  for (const person of people) {
    const row = sheet.addRow([club,...FIELDS.map(([key]) => key.endsWith('Date') ? excelDate(person[key]) : String(person[key] || ''))]);
    row.getCell(5).numFmt = 'dd/mm/yyyy';
    row.getCell(6).numFmt = 'dd/mm/yyyy';
    row.getCell(8).numFmt = '@';
    row.alignment = {vertical:'top',wrapText:true};
  }
  sheet.autoFilter = {from:'A1',to:'I'+Math.max(1,people.length+1)};
  sheet.pageSetup = {paperSize:8,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:1'};
  for (const ws of [clubSheet,sheet]) {
    ws.getRow(1).height = 32;
    ws.getRow(1).eachCell(cell => {
      cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF123653'}};
      cell.font = {name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};
      cell.alignment = {vertical:'middle',wrapText:true};
    });
    for (let i=2;i<=ws.rowCount;i++) ws.getRow(i).eachCell(cell => {
      cell.font = {name:'Arial',size:11,color:{argb:'FF071C32'}};
      if (i%2===0) cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F5F9'}};
    });
  }
  return book.xlsx.writeBuffer();
}
function base64(buffer) {
  let str = ''; for (const b of new Uint8Array(buffer)) str += String.fromCharCode(b);
  return btoa(str);
}
export async function loadPdfFonts() {
  return Promise.all(['/fonts/NotoSans-Regular.ttf','/fonts/NotoSans-Bold.ttf'].map(async url => {
    const response = await fetch(url); if (!response.ok) throw new Error('Police PDF indisponible. Terminez la préparation hors ligne.');
    return response.arrayBuffer();
  }));
}
export async function createPdf(club, people, scope, fonts = null, generated = new Date()) {
  fonts ||= await loadPdfFonts();
  const pdf = new jsPDF({orientation:'landscape',unit:'mm',format:'a3',compress:true});
  fonts.forEach((font,i) => { pdf.addFileToVFS('NotoSans-'+i+'.ttf',base64(font)); pdf.addFont('NotoSans-'+i+'.ttf','NotoSans',i?'bold':'normal'); });
  pdf.setProperties({title:'Registre d’identification des acteurs',author:'FEVOCO',subject:scope});
  const width = pdf.internal.pageSize.getWidth(), height = pdf.internal.pageSize.getHeight();
  pdf.setFont('NotoSans','bold'); pdf.setFontSize(15);
  const clubLines = pdf.splitTextToSize(club,width-24);
  pdf.text(clubLines,12,15);
  const titleY = 15+clubLines.length*6;
  pdf.setFontSize(13); pdf.text('Registre d’identification des acteurs',12,titleY);
  pdf.setFont('NotoSans','normal'); pdf.setFontSize(9);
  pdf.text('FEVOCO · '+scope+' · Généré le '+generated.toLocaleDateString('fr-FR'),12,titleY+7);
  for (const group of groupPeopleByType(people)) {
  autoTable(pdf,{
    startY:pdf.lastAutoTable ? pdf.lastAutoTable.finalY+8 : titleY+13, margin:{top:16,right:12,bottom:16,left:12},
    rowPageBreak:'avoid',
    head:[[{content:group.type+' ('+group.people.length+')',colSpan:FIELDS.length,styles:{fillColor:[230,238,245],textColor:[18,54,83]}}],FIELDS.map(([,label])=>label)],
    body:group.people.map(p => FIELDS.map(([key])=>key.endsWith('Date')?displayDate(p[key]):p[key]||'')),
    styles:{font:'NotoSans',fontStyle:'normal',fontSize:9,cellPadding:2.5,overflow:'linebreak',valign:'top',lineWidth:0.15,lineColor:[215,224,233]},
    headStyles:{fillColor:[18,54,83],fontStyle:'bold',textColor:[255,255,255]},
    alternateRowStyles:{fillColor:[243,247,250]},theme:'grid',showHead:'everyPage',
    columnStyles:{0:{cellWidth:32},1:{cellWidth:64},2:{cellWidth:22},3:{cellWidth:33},4:{cellWidth:38},5:{cellWidth:88},6:{cellWidth:42},7:{cellWidth:77}},
    didDrawPage: () => {
      if (pdf.internal.getCurrentPageInfo().pageNumber>1) {
        pdf.setFont('NotoSans','normal');pdf.setFontSize(9);
        const short = pdf.splitTextToSize(club,width-24)[0];
        pdf.text(short,12,10);
      }
    },
  });
  }
  const total = pdf.getNumberOfPages();
  for(let page=1;page<=total;page++) {
    pdf.setPage(page);pdf.setFont('NotoSans','normal');pdf.setFontSize(8);pdf.setTextColor(70,85,100);
    pdf.text('FEVOCO · '+scope,12,height-7);
    pdf.text('Page '+page+' / '+total,width-12,height-7,{align:'right'});
  }
  return pdf.output('arraybuffer');
}
export function download(buffer, name, mime) {
  const url = URL.createObjectURL(new Blob([buffer],{type:mime}));
  const link = document.createElement('a'); link.href=url; link.download=name;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
