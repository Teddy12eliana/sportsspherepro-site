import fetch from 'node-fetch';
import fs from 'fs';

const CACHE_PATH = '/tmp/liveCache.json';
const USAGE_PATH = '/tmp/usage.json';
const CACHE_TTL_MS = 60 * 1000; // 60s

const leagueToSportsDB = {
  'NBA': 4387, 'NFL': 4391, 'EPL': 4328, 'La Liga': 4335, 'MLB': 4424, 'UCL': 4329, 'UFC': 4414
};
const leagueToOddsKey = {
  'NBA': 'basketball_nba','NFL': 'americanfootball_nfl','EPL': 'soccer_epl','La Liga': 'soccer_spain_la_liga','MLB': 'baseball_mlb','UCL': 'soccer_uefa_champs_league','UFC': 'mma_mixed_martial_arts'
};

function readJSON(p){ try{ if(fs.existsSync(p)) return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){} return null; }
function writeJSON(p, v){ try{ fs.writeFileSync(p, JSON.stringify(v)); }catch(e){} }
function addUsage(metric){ const u=readJSON(USAGE_PATH)||{oddsCalls:0,scoreCalls:0,last:{}};
  u.last = { at: Date.now() }; if(metric==='odds') u.oddsCalls++; if(metric==='scores') u.scoreCalls++; writeJSON(USAGE_PATH,u); }

function americanToProb(odds){ const n=Number(odds); if(!isFinite(n)||n===0) return null; return n>0?100/(n+100):(-n)/(-n+100); }

export async function handler(event){
  const params = event.queryStringParameters || {};
  const league = params.league || 'NBA';
  const view = params.view || 'live';
  const cacheKey = `${league}:${view}`;

  const c = readJSON(CACHE_PATH)||{};
  if(c[cacheKey] && Date.now() - (c[cacheKey].ts||0) < CACHE_TTL_MS){
    return { statusCode:200, headers:{'Content-Type':'application/json'}, body: JSON.stringify(c[cacheKey].payload) };
  }

  const sportsKey = leagueToSportsDB[league];
  const oddsKey = leagueToOddsKey[league] || 'basketball_nba';
  const sportsdbKey = process.env.SPORTSDB_KEY || '1';
  const oddsApiKey = process.env.ODDS_API_KEY || '';

  // Scores
  let events = [];
  try{
    const url = view==='live'
      ? `https://www.thesportsdb.com/api/v1/json/${sportsdbKey}/eventspastleague.php?id=${sportsKey}`
      : `https://www.thesportsdb.com/api/v1/json/${sportsdbKey}/eventsnextleague.php?id=${sportsKey}`;
    const r = await fetch(url); const j = await r.json(); addUsage('scores');
    events = (j?.events || j?.event || j?.results || []).slice(0,12);
  }catch(e){}

  const games = (events||[]).map(ev=>{
    const home = ev.strHomeTeam || (ev.strEvent?.split(' vs ')[0]) || 'Home';
    const away = ev.strAwayTeam || (ev.strEvent?.split(' vs ')[1]) || 'Away';
    const score = (ev.intHomeScore!=null && ev.intAwayScore!=null) ? `${ev.intHomeScore} - ${ev.intAwayScore}` : (view==='upcoming' ? '-' : '-');
    return { id: ev.idEvent || `${home}-${away}`, date: ev.dateEvent || ev.strTimestamp || ev.dateEventLocal || '', home, away, score, moneyline:null, spread:null, total:null, aiWinPct:null };
  });

  // Odds
  if(oddsApiKey){
    try{
      const url = `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds/?regions=us&markets=h2h,spreads,totals&oddsFormat=american&apiKey=${oddsApiKey}`;
      const r = await fetch(url); const data = await r.json(); addUsage('odds');
      if(Array.isArray(data)){
        for(const g of games){
          const match = data.find(e =>
            (e.home_team && (e.home_team.toLowerCase().includes(g.home.toLowerCase()) || g.home.toLowerCase().includes(e.home_team.toLowerCase()))) ||
            (e.away_team && (e.away_team.toLowerCase().includes(g.away.toLowerCase()) || g.away.toLowerCase().includes(e.away_team.toLowerCase())))
          );
          if(!match) continue;
          let moneyline=null, spread=null, total=null, ai=null;
          for(const bk of (match.bookmakers||[])){
            for(const m of (bk.markets||[])){
              if(m.key==='h2h' && !moneyline){
                const outs = m.outcomes||[];
                const h = outs.find(o=>o.name && o.name.toLowerCase().includes(g.home.toLowerCase()));
                const a = outs.find(o=>o.name && o.name.toLowerCase().includes(g.away.toLowerCase()));
                if(h&&a){ moneyline = `${bk.title}: ${g.home} ${h.price>0?`+${h.price}`:h.price} | ${g.away} ${a.price>0?`+${a.price}`:a.price}`; ai = americanToProb(h.price); }
              }
              if(m.key==='spreads' && !spread){
                const outs = m.outcomes||[];
                const h = outs.find(o=>o.name && o.name.toLowerCase().includes(g.home.toLowerCase()));
                const a = outs.find(o=>o.name && o.name.toLowerCase().includes(g.away.toLowerCase()));
                if(h&&a){ spread = `${bk.title}: ${g.home} ${h.point??''} (${h.price>0?`+${h.price}`:h.price}) | ${g.away} ${a.point??''} (${a.price>0?`+${a.price}`:a.price})`; }
              }
              if(m.key==='totals' && !total){
                const outs = m.outcomes||[];
                const over = outs.find(o=>o.name==='Over');
                const under= outs.find(o=>o.name==='Under');
                if(over&&under){ total = `${bk.title}: O${over.point} (${over.price>0?`+${over.price}`:over.price}) | U${under.point} (${under.price>0?`+${under.price}`:under.price})`; }
              }
            }
            if(moneyline && spread && total) break;
          }
          g.moneyline = moneyline; g.spread = spread; g.total = total; g.aiWinPct = ai;
        }
      }
    }catch(e){}
  }

  const picks = games.filter(g=>g.aiWinPct!=null).sort((a,b)=> (b.aiWinPct||0)-(a.aiWinPct||0)).slice(0,5).map(g=> `${league}: ${g.home} vs ${g.away} → ${g.home} edge ${Math.round((g.aiWinPct||0)*100)}% (value ML)`);

  const payload = { games, picks };
  c[cacheKey] = { ts: Date.now(), payload }; writeJSON(CACHE_PATH, c);
  return { statusCode:200, headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) };
}
