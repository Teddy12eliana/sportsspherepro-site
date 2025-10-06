import fs from 'fs';
const A='./netlify/functions/chat_arena.json'; const P='./netlify/functions/chat_analyst.json';
export async function handler(event){ const key=(event.queryStringParameters||{}).key; if(!key||key!==process.env.ADMIN_KEY) return {statusCode:403, body:'Forbidden'}; try{ fs.writeFileSync(A,'[]'); fs.writeFileSync(P,'[]'); }catch(e){}; return {statusCode:200, body:'CLEARED'}; }