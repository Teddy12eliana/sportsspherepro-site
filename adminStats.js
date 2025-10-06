import fs from 'fs';
const USAGE_PATH = '/tmp/usage.json';
const CACHE_PATH = '/tmp/liveCache.json';
function read(p){ try{ if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){} return {}; }
export async function handler(){
  const usage = read(USAGE_PATH);
  const cache = read(CACHE_PATH);
  const leagues = Object.keys(cache||{}).length;
  return { statusCode:200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({
    oddsCalls: usage.oddsCalls||0,
    scoreCalls: usage.scoreCalls||0,
    cacheKeys: leagues,
    lastCallAt: usage.last?.at ? new Date(usage.last.at).toISOString() : null
  }) };
}
