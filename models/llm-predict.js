// Prédiction améliorée via LLM local (Ollama)
// Envoie les données exogènes au DeepSeek-V2 pour analyse et prédiction

const http = require('http');
const path = require('path');
const fs = require('fs');
const { 
  BRVM_DIR, COMMODITIES_DIR, MACRO_DIR, EVENTS_DIR,
  MODELS_DIR, log, logError, logSuccess, readCSV 
} = require('../scraping/engine/utils');

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

  const lastPrice = prices[prices.length-1]?.close || 0;
  const firstPrice = prices[0]?.close || 1;
  const years = prices.length / 252;
  const annualRet = firstPrice > 0 
    ? (Math.pow(lastPrice / firstPrice, 1 / Math.max(years, 0.5)) - 1) * 100
    : 0;

  // Macro résumé
  const bceao = readCSV(path.join(MACRO_DIR, 'bceao_rate.csv'));
  const inflation = readCSV(path.join(MACRO_DIR, 'inflation_ci.csv'));
  const gdp = readCSV(path.join(MACRO_DIR, 'gdp_ci.csv'));

  // Événements actifs
  const eventMatrix = readCSV(path.join(EVENTS_DIR, 'events_daily_matrix.csv'));
  const today = new Date().toISOString().substring(0, 10);
  const todayEvents = eventMatrix.filter(e => e.date === today);
  const activeEvents = todayEvents.length > 0 
    ? Object.entries(todayEvents[0]).filter(([k,v]) => k !== 'date' && parseFloat(v) > 0).map(([k]) => k)
    : [];

  const macroSummary = [
    `BCEAO rate: ${bceao.length > 0 ? (bceao[bceao.length-1]?.value || bceao[bceao.length-1]?.rate || 'N/A') : 'N/A'}`,
    `GDP CI: ${gdp.length > 0 ? (gdp[gdp.length-1]?.value || 'N/A') : 'N/A'}`,
    `Inflation: ${inflation.length > 0 ? (inflation[inflation.length-1]?.value || 'N/A') : 'N/A'}`,
    `Active events: ${activeEvents.join(', ') || 'None'}`,
    `Ticker full name: ${getTickerName(ticker)}`
  ].join('\n');

  const prompt = `[INST] You are a senior financial analyst for BRVM stocks. Analyze the data and return ONLY valid JSON.

TICKER: ${ticker} (${getTickerName(ticker)})
LAST PRICE: ${lastPrice} FCFA
ANNUAL RETURN: ${annualRet.toFixed(2)}%
VOLATILITY: ${vol}%
DATA POINTS: ${prices.length}

RECENT PRICES:
${priceHistory}

MACRO:
${macroSummary}

Respond with EXACTLY this JSON structure, no other text:
{"ticker":"${ticker}","analysis":{"trend":"up_or_down_or_sideways","exogenousImpact":{"interestRates":5,"commodityPrices":5,"inflation":5,"geopolitical":5,"political":5}},"predictions":{"nextMonth":{"low":${Math.round(lastPrice*0.95)},"high":${Math.round(lastPrice*1.05)},"confidence":"MEDIUM"},"nextYear":{"low":${Math.round(lastPrice*0.85)},"high":${Math.round(lastPrice*1.3)},"direction":"up"}},"recommendation":"HOLD","reasoning":"Brief reasoning here","risks":["risk1","risk2","risk3"]}[/INST]`;

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
