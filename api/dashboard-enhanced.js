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
const llmColors = {BUY:'#2e7d32',HOLD:'#e65100',SELL:'#c62828'};
const HTML = (predictions, forecast, prices, llm) => `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BRVM - Prédiction 10 Ans</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI',system-ui,sans-serif; background: #f0f2f5; color: #1a1a2e; }
.header { background: linear-gradient(135deg, #1a237e, #0d47a1); color: white; padding: 24px 40px; }
.header h1 { font-size: 28px; }
.header p { opacity: 0.85; margin-top: 4px; }
.container { max-width: 1400px; margin: 0 auto; padding: 24px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px; }
.card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.card h2 { font-size: 16px; color: #666; margin-bottom: 8px; }
.card .value { font-size: 28px; font-weight: 700; }
.card .sub { font-size: 13px; color: #888; margin-top: 4px; }
.up { color: #2e7d32; }
.down { color: #c62828; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
th { background: #f5f5f5; font-weight: 600; color: #555; }
.ticker-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; color: white; }
.orac-bg { background: #1565c0; }
.sgbc-bg { background: #2e7d32; }
.slbc-bg { background: #e65100; }
.sogc-bg { background: #6a1b9a; }
.chart-container { height: 300px; margin-top: 12px; }
.rec { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.rec-buy { background: #e8f5e9; color: #2e7d32; }
.rec-wait { background: #fce4ec; color: #c62828; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-on { background: #4caf50; }
.status-off { background: #f44336; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab { padding: 8px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; border: none; background: #e0e0e0; }
.tab.active { background: #1a237e; color: white; }
.tab-content { display: none; }
.tab-content.active { display: block; }
@media (max-width: 768px) {
  .header { padding: 16px; }
  .container { padding: 12px; }
  .grid { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<div class="header">
  <h1>BRVM · Prédiction 10 Ans</h1>
  <p>Orange CI · Société Générale CI · Solibra · SOGB — Modèle Monte Carlo + ARIMAX</p>
</div>
<div class="container">

<div class="grid">
  <div class="card">
    <h2>📈 Marché</h2>
    <div class="value">4 titres</div>
    <div class="sub">ORAC · SGBC · SLBC · SOGC</div>
  </div>
  <div class="card">
    <h2>🔄 Dernière MAJ</h2>
    <div class="value">${new Date().toLocaleString('fr-FR')}</div>
    <div class="sub">Données scraping en temps réel</div>
  </div>
  <div class="card">
    <h2>📊 Horizon</h2>
    <div class="value">10 ans</div>
    <div class="sub">2026 → 2036 (Monte Carlo ×1000)</div>
  </div>
  <div class="card">
    <h2>📡 API</h2>
    <div class="value" style="font-size:16px">http://localhost:${PORT}/api</div>
    <div class="sub">/predictions · /forecast-10y · /prices/:ticker</div>
  </div>
</div>

<div class="tabs" id="tabs">
  <button class="tab active" data-tab="overview">Vue d'ensemble</button>
  <button class="tab" data-tab="orac">Orange CI</button>
  <button class="tab" data-tab="sgbc">SGBCI</button>
  <button class="tab" data-tab="slbc">Solibra</button>
  <button class="tab" data-tab="sogc">SOGB</button>
</div>

<div id="tab-overview" class="tab-content active">
  <div class="card">
    <h2>Prédictions 10 Ans — Résumé</h2>
    <table>
      <tr><th>Ticker</th><th>Prix</th><th>2027</th><th>2031</th><th>2036</th><th>Rendement 10 ans</th><th>Volatilité</th><th>Signal</th></tr>
      ${Object.entries(forecast?.tickers || {}).map(([t, f]) => {
        const y1 = f?.yearly?.[1], y5 = f?.yearly?.[5], y10 = f?.yearly?.[10];
        const cls = t.toLowerCase();
        return `<tr>
          <td><span class="ticker-badge ${cls}-bg">${t}</span></td>
          <td><strong>${f?.currentPrice?.toLocaleString() || 'N/A'}</strong></td>
          <td>${y1?.mean?.toLocaleString() || 'N/A'}</td>
          <td>${y5?.mean?.toLocaleString() || 'N/A'}</td>
          <td><strong>${y10?.mean?.toLocaleString() || 'N/A'}</strong></td>
          <td class="${(y10?.return || 0) > 0 ? 'up' : 'down'}">${y10?.return ? (y10.return > 0 ? '+' : '') + y10.return.toFixed(1) + '%' : 'N/A'}</td>
          <td>${f?.annualVol || 'N/A'}</td>
          <td><span class="rec ${(y10?.return || 0) > 0 ? 'rec-buy' : 'rec-wait'}">${(y10?.return || 0) > 0 ? '🟢 ACHAT' : '🔴 ATTENTE'}</span></td>
        </tr>`;
      }).join('')}
    </table>
  </div>

  <div class="card" style="margin-top:20px">
    <h2>Projection 10 Ans — Comparatif</h2>
    <div class="chart-container">
      <canvas id="overviewChart"></canvas>
    </div>
  </div>

  <div class="card" style="margin-top:20px">
    <h2>Prédictions Court Terme (ARIMAX)</h2>
    <table>
      <tr><th>Ticker</th><th>Prix Actuel</th><th>Prédiction</th><th>Prix Estimé</th><th>Intervalle 68%</th><th>R²</th></tr>
      ${Object.entries(predictions?.predictions || {}).map(([t, p]) => {
        if (p.error) return '';
        return `<tr>
          <td><span class="ticker-badge ${t.toLowerCase()}-bg">${t}</span></td>
          <td>${p.currentPrice?.toLocaleString() || 'N/A'}</td>
          <td class="${(parseFloat(p.predictedReturn) || 0) > 0 ? 'up' : 'down'}">${p.predictedReturn || 'N/A'}</td>
          <td><strong>${p.predictedPrice || 'N/A'}</strong></td>
          <td>${p.confidence68?.join(' - ') || 'N/A'}</td>
          <td>${p.r2 || 'N/A'}</td>
        </tr>`;
      }).join('')}
    </table>
  </div>

  <div class="card" style="margin-top:20px">
    <h2>🤖 Analyse LLM (Qwen 2.5 7B - Local)</h2>
    <table>
      <tr><th>Ticker</th><th>Signal</th><th>Tendance</th><th>30j Min</th><th>30j Max</th><th>1 an Min</th><th>1 an Max</th><th>Direction</th></tr>
      ${Object.entries(llm?.tickers || {}).map(([t, v]) => {
        if (!v?.recommendation) return '';
        const col = llmColors[v.recommendation] || '#666';
        return `<tr>
          <td><span class="ticker-badge ${t.toLowerCase()}-bg">${t}</span></td>
          <td style="color:${col};font-weight:700">${v.recommendation}</td>
          <td>${v.analysis?.trend || 'N/A'}</td>
          <td>${v.predictions?.nextMonth?.low?.toLocaleString() || 'N/A'}</td>
          <td>${v.predictions?.nextMonth?.high?.toLocaleString() || 'N/A'}</td>
          <td>${v.predictions?.nextYear?.low?.toLocaleString() || 'N/A'}</td>
          <td>${v.predictions?.nextYear?.high?.toLocaleString() || 'N/A'}</td>
          <td class="${v.predictions?.nextYear?.direction === 'up' ? 'up' : 'down'}">${v.predictions?.nextYear?.direction || 'N/A'}</td>
        </tr>`;
      }).join('')}
    </table>
    <p style="color:#888;font-size:12px;margin-top:8px">Modèle: qwen2.5:7b-instruct via Ollama (local) · Dernière analyse: ${llm?.timestamp ? new Date(llm.timestamp).toLocaleString('fr-FR') : 'N/A'}</p>
  </div>
</div>

${['ORAC', 'SGBC', 'SLBC', 'SOGC'].map(t => {
  const f = forecast?.tickers?.[t];
  const p = predictions?.predictions?.[t];
  const h = prices?.[t] || [];
  const cls = t.toLowerCase();
  const name = {ORAC:"Orange CI",SGBC:"SGBCI",SLBC:"Solibra",SOGC:"SOGB"}[t];
  return `
<div id="tab-${cls}" class="tab-content">
  <div class="grid">
    <div class="card"><h2>${name}</h2><div class="value">${f?.currentPrice?.toLocaleString() || 'N/A'} FCFA</div><div class="sub">Dernier cours</div></div>
    <div class="card"><h2>Rendement annuel</h2><div class="value ${(parseFloat(f?.annualReturn)||0) > 0 ? 'up' : 'down'}">${f?.annualReturn || 'N/A'}</div><div class="sub">Basé sur l'historique</div></div>
    <div class="card"><h2>Volatilité</h2><div class="value">${f?.annualVol || 'N/A'}</div><div class="sub">Risque annualisé</div></div>
    <div class="card"><h2>Objectif 2036</h2><div class="value">${f?.yearly?.[10]?.mean?.toLocaleString() || 'N/A'} FCFA</div><div class="sub ${(f?.yearly?.[10]?.return||0) > 0 ? 'up' : 'down'}">${f?.yearly?.[10]?.return ? ((f.yearly[10].return > 0 ? '+' : '') + f.yearly[10].return.toFixed(1) + '%') : 'N/A'}</div></div>
  </div>
  <div class="card">
    <h2>Projection 10 Ans — ${name}</h2>
    <div class="chart-container"><canvas id="chart_${cls}"></canvas></div>
  </div>
  <div class="card" style="margin-top:16px">
    <h2>Détail Annuel</h2>
    <table>
      <tr><th>Année</th><th>Prix Médian</th><th>Moyen</th><th>Intervalle 68%</th><th>Intervalle 95%</th><th>Cumul</th></tr>
      ${(f?.yearly || []).map(y => `
        <tr>
          <td><strong>${y.year}</strong></td>
          <td>${y.median?.toLocaleString() || 'N/A'}</td>
          <td>${y.mean?.toLocaleString() || 'N/A'}</td>
          <td>[${y.lower68?.toLocaleString()} - ${y.upper68?.toLocaleString()}]</td>
          <td>[${y.lower95?.toLocaleString()} - ${y.upper95?.toLocaleString()}]</td>
          <td class="${y.return > 0 ? 'up' : 'down'}">${y.return ? (y.return > 0 ? '+' : '') + y.return.toFixed(1) + '%' : '0%'}</td>
        </tr>
      `).join('')}
    </table>
  </div>
</div>`;
}).join('')}

</div>

<script>
const forecast = ${JSON.stringify(forecast?.tickers || {})};
const predictions = ${JSON.stringify(predictions?.predictions || {})};

// === TABS ===
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// === OVERVIEW CHART ===
function buildOverviewChart() {
  const ctx = document.getElementById('overviewChart')?.getContext('2d');
  if (!ctx || !forecast) return;
  const datasets = [];
  const colors = {ORAC:'#1565c0',SGBC:'#2e7d32',SLBC:'#e65100',SOGC:'#6a1b9a'};
  for (const [t, f] of Object.entries(forecast)) {
    if (!f?.yearly) continue;
    datasets.push({
      label: t, data: f.yearly.map(y => y.mean),
      borderColor: colors[t] || '#666',
      backgroundColor: colors[t] + '22',
      fill: true, tension: 0.3, pointRadius: 4
    });
    // Zone de confiance 68%
    if (f.yearly[0]?.lower68) {
      datasets.push({
        label: t + ' (68%)', data: f.yearly.map(y => y.upper68),
        borderColor: colors[t] + '44', backgroundColor: 'transparent',
        borderDash: [4,4], pointRadius: 0, borderWidth: 1
      });
      datasets.push({
        label: t + '_lower', data: f.yearly.map(y => y.lower68),
        borderColor: colors[t] + '44', backgroundColor: 'transparent',
        borderDash: [4,4], pointRadius: 0, borderWidth: 1, fill: false
      });
    }
  }
  new Chart(ctx, {
    type: 'line',
    data: { labels: forecast.ORAC?.yearly?.map(y => y.year) || [], datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { title: { display: true, text: 'Année' } },
        y: { title: { display: true, text: 'Prix (FCFA)' }, beginAtZero: false }
      }
    }
  });
}

// === TICKER CHARTS ===
function buildTickerChart(ticker) {
  const ctx = document.getElementById('chart_' + ticker.toLowerCase())?.getContext('2d');
  if (!ctx || !forecast[ticker]) return;
  const f = forecast[ticker];
  const colors = {ORAC:'#1565c0',SGBC:'#2e7d32',SLBC:'#e65100',SOGC:'#6a1b9b'};
  const color = colors[ticker] || '#666';
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: f.yearly?.map(y => y.year) || [],
      datasets: [
        {
          label: 'Médian', data: f.yearly?.map(y => y.median),
          borderColor: color, backgroundColor: color + '22',
          fill: true, tension: 0.3, pointRadius: 5, pointBackgroundColor: color
        },
        {
          label: 'Optimiste (84%)', data: f.yearly?.map(y => y.upper68),
          borderColor: color + '66', borderDash: [4,4], pointRadius: 0, fill: false
        },
        {
          label: 'Pessimiste (16%)', data: f.yearly?.map(y => y.lower68),
          borderColor: color + '66', borderDash: [4,4], pointRadius: 0, fill: false
        },
        {
          label: 'Extrême (95%)', data: f.yearly?.map(y => y.upper95),
          borderColor: color + '33', borderDash: [2,6], pointRadius: 0, fill: false
        },
        {
          label: 'Extrême (5%)', data: f.yearly?.map(y => y.lower95),
          borderColor: color + '33', borderDash: [2,6], pointRadius: 0, fill: false
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: ctx => ctx.parsed.y?.toLocaleString('fr-FR') + ' FCFA'
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Année' } },
        y: { title: { display: true, text: 'Prix (FCFA)' }, beginAtZero: false }
      }
    }
  });
}

// Build all charts
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
║   BRVM PREDICTOR 2.0 - DASHBOARD AMÉLIORÉ       ║
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
