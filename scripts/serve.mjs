import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const port=Number(process.argv[process.argv.indexOf('--port')+1])||4174;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.ttf':'font/ttf','.png':'image/png','.webmanifest':'application/manifest+json','.txt':'text/plain'};
createServer(async(request,response)=>{
 try{
  const url=new URL(request.url,'http://localhost');
  const pathname=decodeURIComponent(url.pathname)==='/'?'/index.html':decodeURIComponent(url.pathname);
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||request.method!=='GET') {response.writeHead(403);response.end();return;}
  if(!(await stat(file)).isFile())throw new Error('Not a file');
  const content=await readFile(file);
  response.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff'});
  response.end(content);
 }catch(_error){response.writeHead(404,{'content-type':'text/plain'});response.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('FEVOCO Collecte : http://127.0.0.1:'+port));
