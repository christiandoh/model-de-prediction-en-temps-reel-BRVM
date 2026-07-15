// Dashboard Amélioré - Prédictions 10 ans + Temps Réel
// Serveur unique avec page HTML complète intégrée

const http = require('http');
const path = require('path');
const fs = require('fs');

const MODELS_DIR = path.resolve(__dirname, '..', 'models');
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const PORT = process.env.PORT || 3100;

function readJSON(fp) {
  try { if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (e) {}
  return null;
}

function readCSVasJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) return [];
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = [];
      let current = '', inQuotes = false;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === ',' && !inQuotes) { values.push(current); current = ''; }
        else current += ch;
      }
      values.push(current);
      const obj = {};
      headers.forEach((h, i) => { obj[h.trim()] = values[i] ? values[i].trim() : ''; });
      return obj;
    });
  } catch (e) { return []; }
}

// === PAGE HTML DU DASHBOARD ===
const llmColors = {BUY:'#00c853',HOLD:'#ff9100',SELL:'#ff1744'};
const HTML = (predictions, forecast, prices, llm) => `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BRVM Predictor — Fintech Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
:root {
  --navy: #0a1628;
  --navy-light: #132244;
  --accent: #4fc3f7;
  --accent2: #00e676;
  --accent3: #ff9100;
  --accent-danger: #ff1744;
  --text-primary: #ffffff;
  --text-secondary: #8899b4;
  --card-bg: #0f1d35;
  --card-border: #1a3054;
  --chart-grid: #1a3054;
  --orac: #4fc3f7;
  --sgbc: #00e676;
  --slbc: #ff9100;
  --sogc: #ce93d8;
  --radius: 12px;
  --shadow: 0 4px 24px rgba(0,0,0,0.3);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  background: var(--navy);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* HEADER */
.header {
  background: linear-gradient(135deg, #0a1628 0%, #132244 50%, #1a3054 100%);
  border-bottom: 1px solid var(--card-border);
  padding: 20px 40px;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(20px);
}
.header-inner {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.header-left h1 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #4fc3f7, #00e676);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.header-left p {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
  -webkit-text-fill-color: var(--text-secondary);
}
.header-actions { display: flex; gap: 8px; align-items: center; }
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(79,195,247,0.1);
  border: 1px solid rgba(79,195,247,0.3);
  color: var(--accent);
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 13px;
  transition: all .2s;
}
.export-btn:hover {
  background: rgba(79,195,247,0.2);
  border-color: var(--accent);
  transform: translateY(-1px);
}
.badge-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0,230,118,0.1);
  border: 1px solid rgba(0,230,118,0.2);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent2);
}
.badge-live .dot {
  width: 6px;
  height: 6px;
  background: var(--accent2);
  border-radius: 50%;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

/* CONTAINER */
.container { max-width: 1440px; margin: 0 auto; padding: 24px; }

/* STATS GRID */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: border-color .2s, transform .2s;
}
.stat-card:hover {
  border-color: rgba(79,195,247,0.3);
  transform: translateY(-2px);
}
.stat-card .icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  font-size: 16px;
}
.stat-card .icon.blue { background: rgba(79,195,247,0.15); color: var(--accent); }
.stat-card .icon.green { background: rgba(0,230,118,0.15); color: var(--accent2); }
.stat-card .icon.orange { background: rgba(255,145,0,0.15); color: var(--accent3); }
.stat-card .icon.purple { background: rgba(206,147,216,0.15); color: var(--sogc); }
.stat-card .label { font-size: 12px; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.stat-card .value { font-size: 26px; font-weight: 700; margin-top: 4px; letter-spacing: -0.5px; }

/* TABS */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 4px;
  overflow-x: auto;
}
.tab {
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  transition: all .2s;
  white-space: nowrap;
}
.tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }
.tab.active { background: rgba(79,195,247,0.15); color: var(--accent); }
.tab-content { display: none; }
.tab-content.active { display: block; }

/* CARDS */
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 20px;
  transition: border-color .2s;
}
.card:hover { border-color: rgba(79,195,247,0.2); }
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-header h2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-header h2 i { color: var(--accent); font-size: 16px; }

/* TABLES */
.table-wrapper { overflow-x: auto; }
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th {
  text-align: left;
  padding: 12px 14px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--card-border);
}
td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(26,48,84,0.5);
  color: var(--text-primary);
}
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(255,255,255,0.02); }
.up { color: var(--accent2); }
.down { color: var(--accent-danger); }

/* TICKER BADGES */
.ticker-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.3px;
  background: rgba(255,255,255,0.08);
  color: var(--text-primary);
}
.ticker-badge i { font-size: 8px; }
.orac { border-left: 3px solid var(--orac); }
.sgbc { border-left: 3px solid var(--sgbc); }
.slbc { border-left: 3px solid var(--slbc); }
.sogc { border-left: 3px solid var(--sogc); }

/* REC BADGES */
.rec {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.rec-buy { background: rgba(0,230,118,0.12); color: var(--accent2); }
.rec-wait { background: rgba(255,145,0,0.12); color: var(--accent3); }
.rec-sell { background: rgba(255,23,68,0.12); color: var(--accent-danger); }

/* CHART */
.chart-container { height: 350px; margin-top: 8px; position: relative; }
.chart-container canvas { width: 100% !important; height: 100% !important; }

/* LLM */
.llm-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: rgba(79,195,247,0.06);
  border: 1px solid rgba(79,195,247,0.15);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 12px;
}

/* DETAIL GRID */
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.detail-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 16px;
}
.detail-card .label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.detail-card .val { font-size: 20px; font-weight: 700; margin-top: 4px; }

/* SCROLLBAR */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--navy); }
::-webkit-scrollbar-thumb { background: var(--card-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #2a4a78; }

@media (max-width: 768px) {
  .header { padding: 14px 16px; }
  .container { padding: 12px; }
  .stats-grid { grid-template-columns: repeat(2,1fr); }
  .detail-grid { grid-template-columns: repeat(2,1fr); }
  .header-actions .badge-live span { display: none; }
}
@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>

<div class="header">
  <div class="header-inner">
    <div class="header-left">
      <h1>BRVM Predictor</h1>
      <p>Orange CI &middot; Soci&eacute;t&eacute; G&eacute;n&eacute;rale CI &middot; Solibra &middot; SOGB &mdash; Monte Carlo &middot; ARIMAX &middot; LLM</p>
    </div>
    <div class="header-actions">
      <span class="badge-live"><span class="dot"></span><span>Syst&egrave;me actif</span></span>
      <a href="/export" class="export-btn"><i class="fas fa-file-excel"></i> Export Excel</a>
    </div>
  </div>
</div>

<div class="container">

<div class="stats-grid">
  <div class="stat-card">
    <div class="icon blue"><i class="fas fa-chart-line"></i></div>
    <div class="label">March&eacute;</div>
    <div class="value">4 titres</div>
    <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">ORAC &middot; SGBC &middot; SLBC &middot; SOGC</div>
  </div>
  <div class="stat-card">
    <div class="icon green"><i class="fas fa-sync-alt"></i></div>
    <div class="label">Derni&egrave;re MAJ</div>
    <div class="value" style="font-size:18px">${new Date().toLocaleString('fr-FR')}</div>
    <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">Scraping temps r&eacute;el</div>
  </div>
  <div class="stat-card">
    <div class="icon orange"><i class="fas fa-calendar-alt"></i></div>
    <div class="label">Horizon</div>
    <div class="value">10 ans</div>
    <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">2026 &rarr; 2036 &times;1000 simulations</div>
  </div>
  <div class="stat-card">
    <div class="icon purple"><i class="fas fa-microchip"></i></div>
    <div class="label">IA Locale</div>
    <div class="value" style="font-size:18px">Qwen 2.5 7B</div>
    <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">Ollama &middot; Analyse LLM temps r&eacute;el</div>
  </div>
</div>

<div class="tabs" id="tabs">
  <button class="tab active" data-tab="overview"><i class="fas fa-th-large"></i> Vue d'ensemble</button>
  <button class="tab" data-tab="orac"><span class="ticker-badge orac">ORAC</span> Orange CI</button>
  <button class="tab" data-tab="sgbc"><span class="ticker-badge sgbc">SGBC</span> SGBCI</button>
  <button class="tab" data-tab="slbc"><span class="ticker-badge slbc">SLBC</span> Solibra</button>
  <button class="tab" data-tab="sogc"><span class="ticker-badge sogc">SOGC</span> SOGB</button>
</div>

<div id="tab-overview" class="tab-content active">
  <div class="card">
    <div class="card-header">
      <h2><i class="fas fa-chart-bar"></i> Pr&eacute;dictions 10 Ans &mdash; R&eacute;sum&eacute;</h2>
    </div>
    <div class="table-wrapper">
    <table>
      <tr><th>Ticker</th><th>Prix</th><th>2027</th><th>2031</th><th>2036</th><th>Rendement 10 ans</th><th>Volatilit&eacute;</th><th>Signal</th></tr>
      ${Object.entries(forecast?.tickers || {}).map(([t, f]) => {
        const y1 = f?.yearly?.[1], y5 = f?.yearly?.[5], y10 = f?.yearly?.[10];
        const cls = t.toLowerCase();
        const ret = y10?.return || 0;
        return `<tr>
          <td><span class="ticker-badge ${cls}"><i class="fas fa-circle" style="color:var(--${cls})"></i> ${t}</span></td>
          <td><strong>${f?.currentPrice?.toLocaleString() || 'N/A'}</strong></td>
          <td>${y1?.mean?.toLocaleString() || 'N/A'}</td>
          <td>${y5?.mean?.toLocaleString() || 'N/A'}</td>
          <td><strong>${y10?.mean?.toLocaleString() || 'N/A'}</strong></td>
          <td class="${ret > 0 ? 'up' : 'down'}">${ret ? (ret > 0 ? '+' : '') + ret.toFixed(1) + '%' : 'N/A'}</td>
          <td>${f?.annualVol || 'N/A'}</td>
          <td><span class="rec ${ret > 0 ? 'rec-buy' : 'rec-wait'}"><i class="fas ${ret > 0 ? 'fa-arrow-up' : 'fa-minus-circle'}"></i> ${ret > 0 ? 'ACHAT' : 'ATTENTE'}</span></td>
        </tr>`;
      }).join('')}
    </table>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2><i class="fas fa-chart-area"></i> Projection 10 Ans &mdash; Comparatif</h2>
    </div>
    <div class="chart-container">
      <canvas id="overviewChart"></canvas>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2><i class="fas fa-clock"></i> Pr&eacute;dictions Court Terme (ARIMAX)</h2>
    </div>
    <div class="table-wrapper">
    <table>
      <tr><th>Ticker</th><th>Prix Actuel</th><th>Pr&eacute;diction</th><th>Prix Estim&eacute;</th><th>Intervalle 68%</th><th>R&sup2;</th></tr>
      ${Object.entries(predictions?.predictions || {}).map(([t, p]) => {
        if (p.error) return '';
        const ret = parseFloat(p.predictedReturn) || 0;
        return `<tr>
          <td><span class="ticker-badge ${t.toLowerCase()}"><i class="fas fa-circle" style="color:var(--${t.toLowerCase()})"></i> ${t}</span></td>
          <td>${p.currentPrice?.toLocaleString() || 'N/A'}</td>
          <td class="${ret > 0 ? 'up' : 'down'}">${ret > 0 ? '+' : ''}${p.predictedReturn || 'N/A'}</td>
          <td><strong>${p.predictedPrice || 'N/A'}</strong></td>
          <td>${p.confidence68?.join(' &ndash; ') || 'N/A'}</td>
          <td>${p.r2 || 'N/A'}</td>
        </tr>`;
      }).join('')}
    </table>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h2><i class="fas fa-brain"></i> Analyse LLM &mdash; Qwen 2.5 7B (Local / Ollama)</h2>
    </div>
    <div class="table-wrapper">
    <table>
      <tr><th>Ticker</th><th>Signal</th><th>Tendance</th><th>30j Min</th><th>30j Max</th><th>1 an Min</th><th>1 an Max</th><th>Direction</th></tr>
      ${Object.entries(llm?.tickers || {}).map(([t, v]) => {
        if (!v?.recommendation) return '';
        const col = llmColors[v.recommendation] || '#666';
        const dir = v.predictions?.nextYear?.direction;
        return `<tr>
          <td><span class="ticker-badge ${t.toLowerCase()}"><i class="fas fa-circle" style="color:var(--${t.toLowerCase()})"></i> ${t}</span></td>
          <td style="color:${col};font-weight:700">${v.recommendation}</td>
          <td>${v.analysis?.trend || 'N/A'}</td>
          <td>${v.predictions?.nextMonth?.low?.toLocaleString() || 'N/A'}</td>
          <td>${v.predictions?.nextMonth?.high?.toLocaleString() || 'N/A'}</td>
          <td>${v.predictions?.nextYear?.low?.toLocaleString() || 'N/A'}</td>
          <td>${v.predictions?.nextYear?.high?.toLocaleString() || 'N/A'}</td>
          <td class="${dir === 'up' ? 'up' : 'down'}"><i class="fas fa-arrow-${dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'right'}"></i> ${dir || 'N/A'}</td>
        </tr>`;
      }).join('')}
    </table>
    </div>
    <div class="llm-badge">
      <i class="fas fa-robot"></i>
      Mod&egrave;le: qwen2.5:7b-instruct via Ollama &middot; Derni&egrave;re analyse: ${llm?.timestamp ? new Date(llm.timestamp).toLocaleString('fr-FR') : 'N/A'}
    </div>
  </div>
</div>

${['ORAC', 'SGBC', 'SLBC', 'SOGC'].map(t => {
  const f = forecast?.tickers?.[t];
  const p = predictions?.predictions?.[t];
  const h = prices?.[t] || [];
  const cls = t.toLowerCase();
  const name = {ORAC:"Orange CI",SGBC:"SGBCI",SLBC:"Solibra",SOGC:"SOGB"}[t];
  const ret = f?.yearly?.[10]?.return || 0;
  return `
<div id="tab-${cls}" class="tab-content">
  <div class="detail-grid">
    <div class="detail-card">
      <div class="label">Cours actuel</div>
      <div class="val">${f?.currentPrice?.toLocaleString() || 'N/A'} <span style="font-size:12px;color:var(--text-secondary)">FCFA</span></div>
    </div>
    <div class="detail-card">
      <div class="label">Rendement annuel</div>
      <div class="val ${(parseFloat(f?.annualReturn)||0) > 0 ? 'up' : 'down'}">${f?.annualReturn || 'N/A'}</div>
    </div>
    <div class="detail-card">
      <div class="label">Volatilit&eacute; annualis&eacute;e</div>
      <div class="val">${f?.annualVol || 'N/A'}</div>
    </div>
    <div class="detail-card">
      <div class="label">Objectif 2036</div>
      <div class="val">${f?.yearly?.[10]?.mean?.toLocaleString() || 'N/A'} <span style="font-size:12px;color:var(--text-secondary)">FCFA</span></div>
      <div class="${ret > 0 ? 'up' : 'down'}" style="font-size:13px;font-weight:600;margin-top:2px">${ret ? (ret > 0 ? '+' : '') + ret.toFixed(1) + '%' : 'N/A'}</div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <h2><i class="fas fa-chart-area" style="color:var(--${cls})"></i> Projection 10 Ans &mdash; ${name}</h2>
    </div>
    <div class="chart-container"><canvas id="chart_${cls}"></canvas></div>
  </div>
  <div class="card">
    <div class="card-header">
      <h2><i class="fas fa-table"></i> D&eacute;tail Annuel</h2>
    </div>
    <div class="table-wrapper">
    <table>
      <tr><th>Ann&eacute;e</th><th>Prix M&eacute;dian</th><th>Moyen</th><th>Intervalle 68%</th><th>Intervalle 95%</th><th>Cumul</th></tr>
      ${(f?.yearly || []).map(y => `
        <tr>
          <td><strong>${y.year}</strong></td>
          <td>${y.median?.toLocaleString() || 'N/A'}</td>
          <td>${y.mean?.toLocaleString() || 'N/A'}</td>
          <td>${y.lower68?.toLocaleString()} &ndash; ${y.upper68?.toLocaleString()}</td>
          <td>${y.lower95?.toLocaleString()} &ndash; ${y.upper95?.toLocaleString()}</td>
          <td class="${y.return > 0 ? 'up' : 'down'}">${y.return ? (y.return > 0 ? '+' : '') + y.return.toFixed(1) + '%' : '0%'}</td>
        </tr>
      `).join('')}
    </table>
    </div>
  </div>
</div>`;
}).join('')}

</div>

<script>
const forecast = ${JSON.stringify(forecast?.tickers || {})};
const predictions = ${JSON.stringify(predictions?.predictions || {})};

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

function buildOverviewChart() {
  const ctx = document.getElementById('overviewChart')?.getContext('2d');
  if (!ctx || !forecast) return;
  const datasets = [];
  const colors = {ORAC:'#4fc3f7',SGBC:'#00e676',SLBC:'#ff9100',SOGC:'#ce93d8'};
  for (const [t, f] of Object.entries(forecast)) {
    if (!f?.yearly) continue;
    datasets.push({
      label: t, data: f.yearly.map(y => y.mean),
      borderColor: colors[t] || '#666',
      backgroundColor: colors[t] + '22',
      fill: true, tension: 0.4, pointRadius: 4,
      pointBackgroundColor: colors[t]
    });
  }
  new Chart(ctx, {
    type: 'line',
    data: { labels: forecast.ORAC?.yearly?.map(y => y.year) || [], datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#8899b4', font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 16 }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(26,48,84,0.3)' },
          ticks: { color: '#8899b4', font: { family: 'Inter' } },
          title: { display: true, text: 'Année', color: '#8899b4', font: { family: 'Inter', size: 12 } }
        },
        y: {
          grid: { color: 'rgba(26,48,84,0.3)' },
          ticks: { color: '#8899b4', font: { family: 'Inter' }, callback: v => v.toLocaleString('fr-FR') },
          title: { display: true, text: 'Prix (FCFA)', color: '#8899b4', font: { family: 'Inter', size: 12 } },
          beginAtZero: false
        }
      }
    }
  });
}

function buildTickerChart(ticker) {
  const ctx = document.getElementById('chart_' + ticker.toLowerCase())?.getContext('2d');
  if (!ctx || !forecast[ticker]) return;
  const f = forecast[ticker];
  const colors = {ORAC:'#4fc3f7',SGBC:'#00e676',SLBC:'#ff9100',SOGC:'#ce93d8'};
  const color = colors[ticker] || '#666';
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: f.yearly?.map(y => y.year) || [],
      datasets: [
        {
          label: 'Médian', data: f.yearly?.map(y => y.median),
          borderColor: color, backgroundColor: color + '22',
          fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: color
        },
        {
          label: 'Optimiste (84%)', data: f.yearly?.map(y => y.upper68),
          borderColor: color + '66', borderDash: [4,4], pointRadius: 0, borderWidth: 1.5, fill: false
        },
        {
          label: 'Pessimiste (16%)', data: f.yearly?.map(y => y.lower68),
          borderColor: color + '66', borderDash: [4,4], pointRadius: 0, borderWidth: 1.5, fill: false
        },
        {
          label: 'Extrême (95%)', data: f.yearly?.map(y => y.upper95),
          borderColor: color + '33', borderDash: [2,6], pointRadius: 0, borderWidth: 1, fill: false
        },
        {
          label: 'Extrême (5%)', data: f.yearly?.map(y => y.lower95),
          borderColor: color + '33', borderDash: [2,6], pointRadius: 0, borderWidth: 1, fill: false
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#8899b4', font: { family: 'Inter', size: 11 }, usePointStyle: true, padding: 14 }
        },
        tooltip: {
          backgroundColor: '#0f1d35',
          titleFont: { family: 'Inter' },
          bodyFont: { family: 'Inter' },
          borderColor: '#1a3054',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: ctx => ctx.parsed.y?.toLocaleString('fr-FR') + ' FCFA'
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(26,48,84,0.3)' },
          ticks: { color: '#8899b4', font: { family: 'Inter' } },
          title: { display: true, text: 'Année', color: '#8899b4', font: { family: 'Inter', size: 12 } }
        },
        y: {
          grid: { color: 'rgba(26,48,84,0.3)' },
          ticks: { color: '#8899b4', font: { family: 'Inter' }, callback: v => v.toLocaleString('fr-FR') },
          title: { display: true, text: 'Prix (FCFA)', color: '#8899b4', font: { family: 'Inter', size: 12 } },
          beginAtZero: false
        }
      }
    }
  });
}

setTimeout(() => {
  buildOverviewChart();
  ['ORAC','SGBC','SLBC','SOGC'].forEach(buildTickerChart);
}, 100);
</script>
</body>
</html>`;

// === SERVEUR HTTP ===
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/' || pathname === '/index.html') {
      const p = readJSON(path.join(MODELS_DIR, 'predictions_realtime.json'));
      const f = readJSON(path.join(MODELS_DIR, 'forecast_10years.json'));
      const llm = readJSON(path.join(MODELS_DIR, 'llm_predictions.json'));
      const prices = {};
      for (const t of ['ORAC','SGBC','SLBC','SOGC']) {
        prices[t] = readCSVasJSON(path.join(DATA_DIR, 'brvm', `${t}.csv`)).slice(-100);
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(HTML(p, f, prices, llm));
    }
    else if (pathname === '/api/predictions') {
      res.writeHead(200);
      res.end(JSON.stringify(readJSON(path.join(MODELS_DIR, 'predictions_realtime.json')) || {}));
    }
    else if (pathname === '/api/forecast-10y') {
      res.writeHead(200);
      res.end(JSON.stringify(readJSON(path.join(MODELS_DIR, 'forecast_10years.json')) || {}));
    }
    else if (pathname.startsWith('/api/prices/')) {
      const ticker = pathname.split('/').pop().toUpperCase();
      const data = readCSVasJSON(path.join(DATA_DIR, 'brvm', `${ticker}.csv`));
      res.writeHead(200);
      res.end(JSON.stringify({ ticker, count: data.length, data: data.slice(-500) }));
    }
    else if (pathname === '/api/llm') {
      res.writeHead(200);
      res.end(JSON.stringify(readJSON(path.join(MODELS_DIR, 'llm_predictions.json')) || {}));
    }
    else if (pathname === '/api/consolidated') {
      res.writeHead(200);
      res.end(JSON.stringify(readJSON(path.join(MODELS_DIR, 'consolidated_report.json')) || {}));
    }
    else if (pathname === '/export') {
      try {
        const XLSX = require('xlsx');
        const expDir = path.join(__dirname, '..', 'exports');
        const xlsxPath = path.join(expDir, 'donnees_exogenes_consolidees.xlsx');
        
        if (!fs.existsSync(xlsxPath)) {
          require('child_process').execSync('node ' + path.join(__dirname, '..', 'export-excel.js'), { cwd: path.join(__dirname, '..') });
        }
        
        if (fs.existsSync(xlsxPath)) {
          const stat = fs.statSync(xlsxPath);
          res.writeHead(200, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="donnees_exogenes_BRVM.xlsx"',
            'Content-Length': stat.size
          });
          fs.createReadStream(xlsxPath).pipe(res);
          return;
        }
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Export temporairement indisponible. Utilisez: node export-excel.js' }));
        return;
      }
    }
    else if (pathname === '/api/status') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'online', version: '2.0.0', port: PORT,
        tickers: ['ORAC','SGBC','SLBC','SOGC'],
        lastPredictions: readJSON(path.join(MODELS_DIR, 'predictions_realtime.json'))?.timestamp || null,
        lastForecast: readJSON(path.join(MODELS_DIR, 'forecast_10years.json'))?.timestamp || null
      }));
    }
    else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Route inconnue' }));
    }
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
});

// === NETTOYAGE DU PORT PRÉCÉDENT ===
function startServer(port) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} occupé, tentative ${port + 1}...`);
      server.listen(port + 1, '0.0.0.0');
    }
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   BRVM PREDICTOR 2.0 - DASHBOARD                ║
║   ${new Date().toLocaleString('fr-FR')}           ║
║                                                  ║
║   Dashboard : http://localhost:${server.address().port}            ║
║   API       : http://localhost:${server.address().port}/api        ║
║                                                  ║
║   Fonctionnalités :                              ║
║   - Prédictions 10 ANS (Monte Carlo ×1000)       ║
║   - Prédictions temps réel (ARIMAX)              ║
║   - Graphiques interactifs (Chart.js)            ║
║   - 4 piliers: ORAC · SGBC · SLBC · SOGC        ║
╚══════════════════════════════════════════════════╝
    `);
  });
}

startServer(PORT);
