import fs from 'fs';
const A='./netlify/functions/chat_arena.json'; const P='./netlify/functions/chat_analyst.json';
function read(p){ try{ if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){} return []; }
function write(p, v){ try{ fs.writeFileSync(p, JSON.stringify(v.slice(-5000))); }catch(e){} }
function gen(){ return 'm_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7); }
export async function handler(event){
  if(event.httpMethod!=='POST') return {statusCode:405, body:'Method Not Allowed'};
  const { room='arena', text='', user='User', tier='Free' } = JSON.parse(event.body||'{}');
  const rec = { id: gen(), user: String(user).slice(0,24), text: String(text).slice(0,500), tier, ts: Date.now(), replies: [] };
  const file = room==='analyst'?P:A; const arr = read(file); arr.push(rec); write(file, arr);
  return {statusCode:200, body:'OK'};
}