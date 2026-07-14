// API REST - Tableau de bord temps réel pour les prédictions BRVM
// Servir les données via HTTP pour visualisation

const http = require('http');
const path = require('path');
const fs = require('fs');

const MODELS_DIR = path.resolve(__dirname, '..', 'models');
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const PORT = process.env.PORT || 3099;

// Helper: lire et parser JSON
function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {}
  return null;
}

// Helper: lire CSV et retourner JSON
function readCSVasJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) return [];
    
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { values.push(current); current = ''; }
        else { current += ch; }
      }
      values.push(current);
      
      const obj = {};
      headers.forEach((h, i) => { obj[h.trim()] = values[i] ? values[i].trim() : ''; });
      return obj;
    });
  } catch (e) {
    return [];
  }
}

// === SERVEUR HTTP ===
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  
  try {
    // === ROUTES API ===
    
    // GET /api/predictions - Dernières prédictions
    if (pathname === '/api/predictions') {
      const predictions = readJSON(path.join(MODELS_DIR, 'predictions_realtime.json'));
      res.writeHead(200);
      res.end(JSON.stringify(predictions || { error: 'Aucune prédiction disponible' }));
    }
    
    // GET /api/prices/:ticker - Prix historiques d'un ticker
    else if (pathname.startsWith('/api/prices/')) {
      const ticker = pathname.split('/').pop().toUpperCase();
      const data = readCSVasJSON(path.join(DATA_DIR, 'brvm', `${ticker}.csv`));
      const returns = data.length > 1 ? data.slice(-100).map((r, i, arr) => {
        if (i === 0) return { date: r.Date, price: parseFloat(r.Close) || 0, return: 0 };
        const prevClose = parseFloat(arr[i - 1].Close) || 0;
        const currClose = parseFloat(r.Close) || 0;
        return {
          date: r.Date,
          price: currClose,
          return: prevClose > 0 ? (currClose - prevClose) / prevClose : 0
        };
      }) : [];
      
      res.writeHead(200);
      res.end(JSON.stringify({ ticker, data: data.slice(-365), returns })); // Dernière année
    }
    
    // GET /api/commodities - Prix des matières premières
    else if (pathname === '/api/commodities') {
      const commoditiesDir = path.join(DATA_DIR, 'exogenous', 'commodities');
      const result = {};
      if (fs.existsSync(commoditiesDir)) {
        const files = fs.readdirSync(commoditiesDir).filter(f => f.endsWith('.csv'));
        for (const file of files) {
          const key = file.replace('.csv', '').toUpperCase();
          result[key] = readCSVasJSON(path.join(commoditiesDir, file));
        }
      }
      res.writeHead(200);
      res.end(JSON.stringify(result));
    }
    
    // GET /api/macro - Variables macroéconomiques
    else if (pathname === '/api/macro') {
      const macroDir = path.join(DATA_DIR, 'exogenous', 'macro');
      const result = {};
      if (fs.existsSync(macroDir)) {
        const files = fs.readdirSync(macroDir).filter(f => f.endsWith('.csv'));
        for (const file of files) {
          const key = file.replace('.csv', '');
          result[key] = readCSVasJSON(path.join(macroDir, file));
        }
      }
      res.writeHead(200);
      res.end(JSON.stringify(result));
    }
    
    // GET /api/events - Événements exogènes
    else if (pathname === '/api/events') {
      const eventsData = readCSVasJSON(path.join(DATA_DIR, 'exogenous', 'events', 'events_master.csv'));
      res.writeHead(200);
      res.end(JSON.stringify(eventsData));
    }
    
    // GET /api/status - Statut du système
    else if (pathname === '/api/status') {
      const predictions = readJSON(path.join(MODELS_DIR, 'predictions_realtime.json'));
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'running',
        lastUpdate: predictions?.timestamp || null,
        tickers: ['ORAC', 'SGBC', 'SLBC', 'SOGC'],
        modelVersion: '1.0.0',
        dataFreshness: predictions ? 
          Math.floor((Date.now() - new Date(predictions.timestamp).getTime()) / 1000 / 60) + ' min' 
          : 'N/A'
      }));
    }
    
    // GET / - Page d'accueil HTML simple
    else if (pathname === '/' || pathname === '/index.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>BRVM Predictor - Tableau de Bord</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', sans-serif; margin: 40px; background: #f5f5f5; }
            h1 { color: #1a237e; }
            .card { background: white; border-radius: 8px; padding: 20px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .ticker { display: inline-block; background: #1a237e; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
            .positive { color: #2e7d32; }
            .negative { color: #c62828; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            .endpoint { background: #e8eaf6; padding: 4px 8px; border-radius: 4px; font-family: monospace; }
          </style>
        </head>
        <body>
          <h1>BRVM - Prédiction Temps Réel</h1>
          <p>Système de collecte et prédiction basé sur les variables exogènes</p>
          
          <div class="card">
            <h2>API Endpoints</h2>
            <table>
              <tr><td><span class="endpoint">GET /api/predictions</span></td><td>Dernières prédictions</td></tr>
              <tr><td><span class="endpoint">GET /api/prices/ORAC</span></td><td>Prix historiques d'un ticker</td></tr>
              <tr><td><span class="endpoint">GET /api/commodities</span></td><td>Prix matières premières</td></tr>
              <tr><td><span class="endpoint">GET /api/macro</span></td><td>Variables macroéconomiques</td></tr>
              <tr><td><span class="endpoint">GET /api/events</span></td><td>Événements exogènes</td></tr>
              <tr><td><span class="endpoint">GET /api/status</span></td><td>Statut du système</td></tr>
            </table>
          </div>
          
          <div id="predictions" class="card">
            <h2>Chargement des prédictions...</h2>
          </div>
          
          <script>
            fetch('/api/predictions')
              .then(r => r.json())
              .then(data => {
                const div = document.getElementById('predictions');
                if (!data.predictions) {
                  div.innerHTML = '<h2>Aucune prédiction disponible</h2><p>Lancez d\\'abord le scraping: <code>node scraping/engine/index.js</code></p>';
                  return;
                }
                let html = '<h2>Prédictions Temps Réel</h2><table><tr><th>Ticker</th><th>Prix Actuel</th><th>Prédiction</th><th>Intervalle (68%)</th><th>R²</th><th>Précision</th></tr>';
                for (const [t, p] of Object.entries(data.predictions)) {
                  if (p.error) continue;
                  html += '<tr>' +
                    '<td><span class="ticker">' + t + '</span></td>' +
                    '<td>' + p.currentPrice?.toLocaleString() + ' FCFA</td>' +
                    '<td class="' + (p.predictedReturn?.startsWith('-') ? 'negative' : 'positive') + '">' + p.predictedReturn + '</td>' +
                    '<td>' + (p.confidence68?.join(' - ') || 'N/A') + '</td>' +
                    '<td>' + (p.r2 || 'N/A') + '</td>' +
                    '<td>' + (p.accuracy || 'N/A') + '</td>' +
                    '</tr>';
                }
                html += '</table><p><small>Mise à jour: ' + (data.timestamp || 'N/A') + '</small></p>';
                div.innerHTML = html;
              })
              .catch(err => {
                document.getElementById('predictions').innerHTML = '<h2>Erreur de chargement</h2><p>' + err.message + '</p>';
              });
          </script>
        </body>
        </html>
      `);
    }
    
    // 404
    else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Route non trouvée', routes: ['/api/predictions', '/api/prices/:ticker', '/api/commodities', '/api/macro', '/api/events', '/api/status'] }));
    }
    
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   BRVM PREDICTOR DASHBOARD                       ║
║   Serveur démarré sur http://localhost:${PORT}    ║
║                                                  ║
║   Endpoints:                                     ║
║   - Prédictions:    /api/predictions             ║
║   - Prix BRVM:      /api/prices/:ticker          ║
║   - Commodités:     /api/commodities             ║
║   - Macro:          /api/macro                   ║
║   - Événements:     /api/events                  ║
║   - Dashboard:      http://localhost:${PORT}      ║
╚══════════════════════════════════════════════════╝
  `);
});
