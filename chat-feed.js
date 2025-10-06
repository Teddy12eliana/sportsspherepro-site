import fs from 'fs';
const A='./netlify/functions/chat_arena.json'; const P='./netlify/functions/chat_analyst.json';
function read(p){ try{ if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){} return []; }
function online(list){ const now=Date.now(); return (list||[]).filter(m=> now-(m.ts||0) < 60_000 ).length; }
export async function handler(){ const arena=read(A), analyst=read(P); return {statusCode:200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({arena,analyst,arenaOnline:online(arena),analystOnline:online(analyst)})}; }