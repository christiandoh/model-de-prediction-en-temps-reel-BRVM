// Prédiction améliorée via LLM local (Ollama)
// Envoie les données exogènes au DeepSeek-V2 pour analyse et prédiction

const http = require('http');
const path = require('path');
const fs = require('fs');
const { 
  BRVM_DIR, COMMODITIES_DIR, MACRO_DIR, EVENTS_DIR,
  MODELS_DIR, log, logError, logSuccess, readCSV 
} = require('../scraping/engine/utils');

// Cache news par secteur pour chaque ticker
const COMPANY_KEYWORDS = {
  ORAC: ['ORANGE', 'ORAC', 'TELECOM', 'MTN', 'TELECOMMUNICATION'],
  SGBC: ['SGBC', 'SOG', 'GEN', 'SOCIETE GENERALE', 'BANK OF AFRICA', 'NSIA', 'BOA', 'BANQUE'],
  SLBC: ['SOLIBRA', 'SLBC', 'BRASSERIE', 'CASTEL', 'BGI'],
  SOGC: ['SOGB', 'PALM', 'HUILE', 'PALMIER', 'SAPH']
};

const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'qwen2.5:7b-instruct';
const TICKERS = ['ORAC', 'SGBC', 'SLBC', 'SOGC'];

// === 1. INTERROGER OLLAMA ===
function queryOllama(prompt, model = MODEL) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 4096
      }
    });

    const req = http.request(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed.response || '');
        } catch (e) {
          reject(new Error('Parse error: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// === 2. FORMER LE PROMPT AVEC TOUTES LES DONNÉES ===
function buildPrompt(ticker, prices, macro, events) {
  const last30 = prices.slice(-30).reverse();
  const priceHistory = last30.map(p => 
    `${p.date}: Close=${p.close} Vol=${p.volume}`
  ).join('\n');

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1].close > 0) {
      returns.push((prices[i].close - prices[i-1].close) / prices[i-1].close);
    }
  }
  const avgRet = returns.length > 0 
    ? (returns.reduce((a,b) => a+b, 0) / returns.length * 100).toFixed(2)
    : 'N/A';
  const vol = returns.length > 0 
    ? Math.sqrt(returns.reduce((sum,r) => sum + (r - returns.reduce((a,b)=>a+b,0)/returns.length)**2, 0) / returns.length) * Math.sqrt(252) * 100
    : 'N/A';

  // Volume analysis (données RÉELLES de volume)
  const lastPrice = prices[prices.length-1]?.close || 0;
  const firstPrice = prices[0]?.close || 1;
  const years = prices.length / 252;
  const annualRet = firstPrice > 0 
    ? (Math.pow(lastPrice / firstPrice, 1 / Math.max(years, 0.5)) - 1) * 100
    : 0;

  // Macro résumé (données RÉELLES)
  function lastRow(csv, key = 'value') {
    if (!csv || csv.length === 0) return 'N/A';
    return csv[csv.length-1]?.[key] || csv[0]?.[key] || 'N/A';
  }
  
  const bceao = readCSV(path.join(MACRO_DIR, 'bceao_rate.csv')).sort((a,b) => a.date?.localeCompare?.(b.date) || 0);
  const inflation = readCSV(path.join(MACRO_DIR, 'inflation_ci.csv')).sort((a,b) => a.date?.localeCompare?.(b.date) || 0);
  const gdp = readCSV(path.join(MACRO_DIR, 'gdp_ci.csv')).sort((a,b) => a.date?.localeCompare?.(b.date) || 0);
  const fed = readCSV(path.join(MACRO_DIR, 'fed_rate.csv')).sort((a,b) => a.date?.localeCompare?.(b.date) || 0);

  // Commodités (données RÉELLES)
  const commodities = {};
  const commFiles = ['brent','cocoa','copper','corn','cotton','gold'];
  for (const f of commFiles) {
    const data = readCSV(path.join(COMMODITIES_DIR, `${f}.csv`));
    if (data.length > 0) commodities[f.toUpperCase()] = data[data.length-1]?.price;
  }

  // Événements actifs (données RÉELLES)
  const eventMatrix = readCSV(path.join(EVENTS_DIR, 'events_daily_matrix.csv'));
  const today = new Date().toISOString().substring(0, 10);
  const todayEvents = eventMatrix.filter(e => e.date === today);
  const activeEvents = todayEvents.length > 0 
    ? Object.entries(todayEvents[0]).filter(([k,v]) => k !== 'date' && parseFloat(v) > 0).map(([k]) => k)
    : [];

  // Actualités récentes (données RÉELLES)
  let newsHeadlines = [];
  try {
    const newsData = JSON.parse(fs.readFileSync(path.join(EVENTS_DIR, 'economic_news.json'), 'utf8'));
    const keywords = COMPANY_KEYWORDS[ticker] || [ticker];
    newsHeadlines = newsData.articles
      .filter(a => keywords.some(k => a.title.toUpperCase().includes(k)))
      .slice(0, 5)
      .map(a => a.title);
  } catch (e) { /* no news */ }

  // Indicateurs techniques calculés sur données RÉELLES
  const latest50 = prices.slice(-50);
  const sma20 = latest50.slice(-20).reduce((s, p) => s + p.close, 0) / 20;
  const high50 = Math.max(...latest50.map(p => p.close));
  const low50 = Math.min(...latest50.map(p => p.close));
  const range50 = high50 - low50;
  const currentPos = range50 > 0 ? ((lastPrice - low50) / range50 * 100) : 50;
  const priceMomentum = prices.length > 30 
    ? ((lastPrice / prices[prices.length - 30]?.close - 1) * 100) : 0;

  const lastBCEAO = lastRow(bceao, 'value') !== 'N/A' ? lastRow(bceao, 'value') : lastRow(bceao, 'rate');
  const lastGDP = lastRow(gdp);
  const lastInfl = lastRow(inflation);
  const lastFed = lastRow(fed);

  // Volume analysis (données RÉELLES de volume)
  const volumes = prices.slice(-60).map(p => parseFloat(p.volume) || 0).filter(v => v > 0);
  const avgVol = volumes.length > 0 ? volumes.reduce((s, v) => s + v, 0) / volumes.length : 0;
  const lastVol = parseFloat(prices[prices.length-1]?.volume) || 0;
  const volSignal = avgVol > 0 ? (lastVol / avgVol > 1.5 ? 'HIGH' : lastVol / avgVol < 0.5 ? 'LOW' : 'NORMAL') : 'N/A';

  // News section
  const newsSection = newsHeadlines.length > 0
    ? 'RECENT NEWS:\n' + newsHeadlines.map((n, i) => `${i+1}. ${n}`).join('\n')
    : '';

  const macroSummary = [
    `BCEAO rate: ${lastBCEAO}%`,
    `GDP CI growth: ${lastGDP}%`,
    `Inflation CI: ${lastInfl}%`,
    `Fed Funds rate: ${lastFed}%`,
    `EUR/XOF: 655.957 (fixed peg)`,
    `Brent crude: $${commodities.BRENT || 'N/A'}/baril`,
    `Gold: $${commodities.GOLD || 'N/A'}/oz`,
    `Cocoa: $${commodities.COCOA || 'N/A'}/tonne`,
    `Copper: $${commodities.COPPER || 'N/A'}/lb`,
    `Active events: ${activeEvents.join(', ') || 'None'}`,
    `Company: ${getTickerName(ticker)}`
  ].join('\n');

  const technicalSection = [
    `SMA20: ${sma20.toFixed(0)} FCFA`,
    `50-day High: ${high50.toFixed(0)} FCFA`,
    `50-day Low: ${low50.toFixed(0)} FCFA`,
    `Price Position: ${currentPos.toFixed(0)}% of range`,
    `Momentum (30d): ${priceMomentum.toFixed(2)}%`,
    `Volume Signal: ${volSignal}`,
    `Avg Vol (60d): ${avgVol.toFixed(0)}`,
    `Last Vol: ${lastVol}`
  ].join('\n');

  const prompt = `[INST] You are a senior financial analyst for BRVM stocks. Use the REAL data below.

TICKER: ${ticker} (${getTickerName(ticker)})
LAST PRICE: ${lastPrice} FCFA
ANNUAL RETURN: ${annualRet.toFixed(2)}%
VOLATILITY: ${vol}%
DATA POINTS: ${prices.length}

TECHNICAL INDICATORS:
${technicalSection}

RECENT PRICES (last 30):
${priceHistory}

MACRO & EXOGENOUS DATA (REAL):
${macroSummary}

${newsSection}

Analyze this real data and return ONLY valid JSON:
{"ticker":"${ticker}","analysis":{"trend":"up_or_down_or_sideways","exogenousImpact":{"interestRates":5,"commodityPrices":5,"inflation":5,"geopolitical":5,"political":5}},"predictions":{"nextMonth":{"low":${Math.round(lastPrice*0.95)},"high":${Math.round(lastPrice*1.05)},"confidence":"MEDIUM"},"nextYear":{"low":${Math.round(lastPrice*0.85)},"high":${Math.round(lastPrice*1.3)},"direction":"up"}},"recommendation":"BUY_or_HOLD_or_SELL","reasoning":"Key insight based on real data","risks":["risk1","risk2","risk3"]}[/INST]`;

  return prompt;
}

function getTickerName(t) {
  return {ORAC:"Orange Côte d'Ivoire",SGBC:"Société Générale Côte d'Ivoire",SLBC:"Solibra",SOGC:"SOGB"}[t] || t;
}

// === 3. ANALYSER LE TICKER VIA LLM ===
async function analyzeTicker(ticker) {
  log('LLM', `Analyse ${ticker} via ${MODEL}...`);

  const raw = readCSV(path.join(BRVM_DIR, `${ticker}.csv`))
    .map(r => ({ date: r.Date, close: parseFloat(r.Close) || 0, volume: parseInt(r.Volume) || 0 }))
    .filter(r => r.close > 0)
    .sort((a, b) => {
      const [da, db] = [a.date.split('/').reverse().join('-'), b.date.split('/').reverse().join('-')];
      return da.localeCompare(db);
    });

  if (raw.length < 20) {
    logError('LLM', `${ticker}: données insuffisantes`);
    return null;
  }

  const prompt = buildPrompt(ticker, raw, null, null);
  
  try {
    const start = Date.now();
    const response = await queryOllama(prompt);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    
    // Extraire le JSON de la réponse
    let clean = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/\[INST\].*?\[\/INST\]/gs, '')
      .trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logError('LLM', `${ticker}: pas de JSON dans la réponse`);
      return { raw: response.substring(0, 500) };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    parsed.lastPrice = raw[raw.length-1].close;
    parsed.lastDate = raw[raw.length-1].date;
    parsed.responseTime = elapsed + 's';
    
    logSuccess('LLM', `${ticker}: ${parsed.recommendation} (${elapsed}s)`);
    return parsed;

  } catch (err) {
    logError('LLM', `${ticker}: ${err.message}`);
    return null;
  }
}

// === 4. LANCER POUR TOUS LES TICKERS ===
async function runLLMAnalysis() {
  log('LLM', '╔══════════════════════════════════════════════════╗');
  log('LLM', '║   PRÉDICTION LLM - DEEPSEEK-V2 LOCAL            ║');
  log('LLM', `║   ${new Date().toISOString()}          ║`);
  log('LLM', '╚══════════════════════════════════════════════════╝');

  const results = {};
  for (const ticker of TICKERS) {
    log('LLM', '');
    log('LLM', `═══ ${ticker} ═══`);
    const result = await analyzeTicker(ticker);
    results[ticker] = result;
    if (result) {
      log('LLM', `Recommandation: ${result.recommendation}`);
      log('LLM', `Prédiction 30j: ${result.predictions?.nextMonth?.low} - ${result.predictions?.nextMonth?.high} FCFA`);
      log('LLM', `Tendance: ${result.analysis?.trend}`);
    }
  }

  const output = {
    timestamp: new Date().toISOString(),
    model: MODEL,
    tickers: results
  };

  fs.writeFileSync(path.join(MODELS_DIR, 'llm_predictions.json'), JSON.stringify(output, null, 2), 'utf8');
  logSuccess('LLM', 'Analyses LLM sauvegardées');

  return results;
}

// === 5. INTÉGRER DANS LE DASHBOARD (fichier de fusion) ===
function generateLLMEnhancedReport() {
  // Lit les prédictions LLM + ARIMAX + 10 ans et fusionne
  const llm = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'llm_predictions.json'), 'utf8'));
  const arimax = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'predictions_realtime.json'), 'utf8'));
  const forecast10y = JSON.parse(fs.readFileSync(path.join(MODELS_DIR, 'forecast_10years.json'), 'utf8'));

  const report = {
    generated: new Date().toISOString(),
    summary: Object.entries(llm.tickers || {}).map(([t, v]) => ({
      ticker: t,
      company: v?.company,
      price: v?.lastPrice,
      llmSignal: v?.recommendation,
      llmReasoning: v?.reasoning?.substring(0, 200),
      arimaxSignal: arimax?.predictions?.[t]?.predictedReturn,
      forecast2036: forecast10y?.tickers?.[t]?.yearly?.[10]?.mean,
      trend: v?.analysis?.trend
    }))
  };

  fs.writeFileSync(path.join(MODELS_DIR, 'consolidated_report.json'), JSON.stringify(report, null, 2), 'utf8');
  logSuccess('LLM', 'Rapport consolidé généré');
  return report;
}

module.exports = { runLLMAnalysis, generateLLMEnhancedReport, analyzeTicker, queryOllama };

// CLI
if (require.main === module) {
  runLLMAnalysis().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
