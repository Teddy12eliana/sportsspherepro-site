SportsSpherePro — Holiday Full (Unified Live)
Includes:
- Live scores + odds via /.netlify/functions/liveGames (60s cache, usage counters)
- Stripe promo stubs + discount ladder via /.netlify/functions/config
- Arena + Analyst Hub chat (JSON persisted)
- Admin mini-dashboard at /admin.html reading /.netlify/functions/adminStats

Netlify env:
SPORTSDB_KEY=1
ODDS_API_KEY=your_odds_key
ADMIN_KEY=your_admin_key
(plus Stripe keys if used)

Notes:
- Upgrade live odds capacity by replacing ODDS_API_KEY with higher tier later.
- liveGames caches per league/view for 60s to protect your 500-calls budget.
