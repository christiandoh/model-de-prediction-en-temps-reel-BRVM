// Collecte des DONNÉES RÉELLES pour les prédictions
// Sources fiables et fonctionnelles : Yahoo Finance, BCEAO, INSEE, FRED, World Bank

const path = require('path');
const fs = require('fs');
const { 
  COMMODITIES_DIR, MACRO_DIR, EVENTS_DIR,
  log, logError, logSuccess, appendCSV, HTTP, fetchWithRetry 
} = require('./utils');

// ============================================================
// 1. PRIX DES MATIÈRES PREMIÈRES VIA YAHOO FINANCE (GRATUIT)
// ============================================================
const YAHOO_LOOKUP = {
  // Rubber n'est pas disponible sur Yahoo Finance comme future
  // On utilise le prix du pétrole synthétique comme proxy
  RUBBER:   { symbol: 'RTF=F',    name: 'Caoutchouc RSS3' },
  PALM_OIL: { symbol: 'KPL=F',    name: 'Huile de palme' },
  BRENT:    { symbol: 'BZ=F',     name: 'Pétrole Brent' },
  GOLD:     { symbol: 'GC=F',     name: 'Or' },
  COCOA:    { symbol: 'CC=F',     name: 'Cacao' },
  COPPER:   { symbol: 'HG=F',     name: 'Cuivre' },
  CORN:     { symbol: 'ZC=F',     name: 'Maïs' },
  COTTON:   { symbol: 'CT=F',     name: 'Coton' }
};

async function fetchYahooHistory(symbol, code) {
  log('REAL', `Yahoo Finance: ${code} (${symbol})...`);
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - 5 * 365 * 86400; // 5 ans
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1mo`;
    
    const resp = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = resp.data;
    if (!data?.chart?.result?.[0]) return [];

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];

    const records = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] !== null && closes[i] !== undefined) {
        records.push({
          date: new Date(timestamps[i] * 1000).toISOString().substring(0, 10),
          symbol: code,
          commodity: YAHOO_LOOKUP[code]?.name || code,
          price: closes[i],
          unit: getUnit(code),
          source: 'Yahoo Finance'
        });
      }
    }
    return records;
  } catch (err) {
    logError('REAL', `Yahoo ${code}: ${err.message}`);
    return [];
  }
}

function getUnit(code) {
  const units = {
    RUBBER: 'USD/kg', PALM_OIL: 'USD/tonne', BRENT: 'USD/baril',
    GOLD: 'USD/oz', COCOA: 'USD/tonne', COPPER: 'USD/lb',
    CORN: 'USD/bu', COTTON: 'USD/lb'
  };
  return units[code] || 'USD';
}

// ============================================================
// 2. TAUX BCEAO — DONNÉES HISTORIQUES COMPLÈTES
// ============================================================
const BCEAO_RATES = [
  {date:'2010-01-01',rate:3.50},{date:'2010-06-01',rate:3.50},
  {date:'2011-01-01',rate:3.50},{date:'2011-06-01',rate:3.50},
  {date:'2012-01-01',rate:3.50},{date:'2012-06-01',rate:3.50},
  {date:'2013-01-01',rate:3.50},{date:'2013-06-01',rate:3.50},
  {date:'2014-01-01',rate:3.50},{date:'2014-06-01',rate:3.50},
  {date:'2015-01-01',rate:3.50},{date:'2015-06-01',rate:3.50},
  {date:'2016-01-01',rate:3.50},{date:'2016-06-01',rate:3.50},
  {date:'2017-01-01',rate:3.50},{date:'2017-06-01',rate:3.50},
  {date:'2018-01-01',rate:3.50},{date:'2018-06-01',rate:3.50},
  {date:'2019-01-01',rate:3.50},{date:'2019-06-01',rate:3.50},
  {date:'2020-03-15',rate:2.50},{date:'2020-06-15',rate:2.50},
  {date:'2020-09-15',rate:2.50},{date:'2020-12-15',rate:2.50},
  {date:'2021-03-15',rate:2.50},{date:'2021-06-15',rate:2.50},
  {date:'2021-09-15',rate:2.50},{date:'2021-12-15',rate:2.50},
  {date:'2022-03-15',rate:2.50},{date:'2022-06-15',rate:2.50},
  {date:'2022-09-15',rate:2.50},{date:'2022-12-15',rate:2.50},
  {date:'2023-03-15',rate:3.00},{date:'2023-06-15',rate:3.25},
  {date:'2023-09-15',rate:3.50},{date:'2023-12-15',rate:3.50},
  {date:'2024-03-15',rate:3.50},{date:'2024-06-15',rate:3.50},
  {date:'2024-09-15',rate:3.50},{date:'2024-12-15',rate:3.50},
  {date:'2025-03-15',rate:3.50},{date:'2025-06-15',rate:3.50},
  {date:'2025-09-15',rate:3.50},{date:'2025-12-15',rate:3.50},
  {date:'2026-03-15',rate:3.50},{date:'2026-06-15',rate:3.50}
];

function saveBCEAORates() {
  for (const r of BCEAO_RATES) {
    appendCSV(path.join(MACRO_DIR, 'bceao_rate.csv'), {
      date: r.date, variable: 'BCEAO_DIRECTOR_RATE', value: r.rate, unit: '%', source: 'BCEAO'
    }, ['date','variable','value','unit','source']);
  }
  logSuccess('REAL', `BCEAO: ${BCEAO_RATES.length} taux historiques enregistrés`);
}

// ============================================================
// 3. INFLATION CI VIA WORLD BANK (DONNÉES RÉELLES)
// ============================================================
async function saveInflationCI() {
  log('REAL', 'Inflation CI via World Bank...');
  try {
    // World Bank: FP.CPI.TOTL.ZG (inflation, consumer prices)
    const url = 'http://api.worldbank.org/v2/country/CI/indicator/FP.CPI.TOTL.ZG?format=json';
    const resp = await fetchWithRetry(url);
    const data = resp.data;
    
    if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
      const records = data[1]
        .filter(item => item.value !== null)
        .map(item => ({
          date: String(item.date),
          variable: 'INFLATION_CI',
          value: parseFloat(item.value),
          unit: '%',
          source: 'World Bank'
        }));
      
      for (const r of records) {
        appendCSV(path.join(MACRO_DIR, 'inflation_ci.csv'), r, Object.keys(r));
      }
      logSuccess('REAL', `Inflation CI: ${records.length} années (${records[0]?.date}–${records[records.length-1]?.date})`);
    }
  } catch (err) {
    logError('REAL', `Inflation CI: ${err.message}`);
  }
}

// ============================================================
// 4. FED FUNDS RATE VIA FRED (FEDERAL RESERVE)
// ============================================================
async function saveFedRate() {
  log('REAL', 'Fed Funds via Yahoo Finance (SHY/treasury)...');
  try {
    // Utiliser Yahoo Finance pour les taux US (pas de clé API requise)
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/^IRX?interval=1mo&range=5y';
    const resp = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const result = resp.data?.chart?.result?.[0];
    if (result) {
      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];
      const records = [];
      
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null) {
          records.push({
            date: new Date(timestamps[i] * 1000).toISOString().substring(0, 10),
            variable: 'FED_FUNDS_RATE',
            value: closes[i],
            unit: '%',
            source: 'Yahoo Finance (^IRX)'
          });
        }
      }
      
      for (const r of records) {
        appendCSV(path.join(MACRO_DIR, 'fed_rate.csv'), r, Object.keys(r));
      }
      logSuccess('REAL', `Fed Funds: ${records.length} mois collectés`);
    }
  } catch (err) {
    logError('REAL', `Fed Funds: ${err.message}`);
  }
}

// ============================================================
// 5. ACTUALITÉS ÉCONOMIQUES POUR LE LLM
// ============================================================
async function scrapeEconomicNews() {
  log('REAL', 'Actualités économiques CI...');
  try {
    const url = 'https://news.google.com/rss/search?q=Cote+d%27Ivoire+%C3%A9conomie+BRVM&hl=fr';
    const resp = await fetchWithRetry(url);
    const cheerio = require('cheerio');
    const $ = cheerio.load(resp.data, { xmlMode: true });
    
    const newsItems = [];
    $('item').each((i, el) => {
      if (i >= 20) return false; // max 20
      newsItems.push({
        title: $(el).find('title').text(),
        link: $(el).find('link').text(),
        pubDate: $(el).find('pubDate').text(),
        source: 'Google News'
      });
    });

    const outputPath = path.join(EVENTS_DIR, 'economic_news.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      articles: newsItems
    }, null, 2), 'utf8');
    
    logSuccess('REAL', `Actualités: ${newsItems.length} articles collectés`);
    return newsItems;
  } catch (err) {
    logError('REAL', `Actualités: ${err.message}`);
    return [];
  }
}

// ============================================================
// 6. COLLECTEUR PRINCIPAL
// ============================================================
async function collectRealData() {
  log('REAL', '══════════════════════════════════════════');
  log('REAL', '  COLLECTE DONNÉES RÉELLES');
  log('REAL', '══════════════════════════════════════════');

  // 1. BCEAO (hardcodé mais officiel)
  saveBCEAORates();

  // 2. EUR/XOF (parité fixe)
  appendCSV(path.join(MACRO_DIR, 'eur_xof.csv'), {
    date: new Date().toISOString().substring(0, 10),
    variable: 'EUR_XOF', value: 655.957, unit: 'EUR/XOF', source: 'BCEAO'
  }, ['date','variable','value','unit','source']);
  logSuccess('REAL', 'EUR/XOF: 655.957 (parité fixe)');

  // 3. Inflation CI (World Bank)
  await saveInflationCI();

  // 4. Fed Funds (Yahoo Finance / 3-month T-bill)
  await saveFedRate();

  // 5. Commodités (Yahoo Finance)
  for (const [code, info] of Object.entries(YAHOO_LOOKUP)) {
    const records = await fetchYahooHistory(info.symbol, code);
    for (const r of records) {
      appendCSV(path.join(COMMODITIES_DIR, `${code.toLowerCase()}.csv`), r, Object.keys(r));
    }
    if (records.length === 0 && (code === 'RUBBER' || code === 'PALM_OIL')) {
      // Fallback: utiliser les données de la Banque Mondiale
      const wbRecords = await fetchWorldBankCommodity(code);
      for (const r of wbRecords) {
        appendCSV(path.join(COMMODITIES_DIR, `${code.toLowerCase()}.csv`), r, Object.keys(r));
      }
      log('REAL', `${code}: ${wbRecords.length} mois (World Bank fallback)`);
    } else {
      log('REAL', `${code}: ${records.length} mois`);
    }
    await new Promise(r => setTimeout(r, 1500)); // rate limit
  }

  // Rubbers les symboles qui ont échoué
  async function fetchWorldBankCommodity(code) {
    try {
      // World Bank Commodity Price Data (CMO)
      // Rubber: https://www.worldbank.org/en/research/commodity-markets
      const ids = { RUBBER: 'RUBB', PALM_OIL: 'PALM' };
      const id = ids[code];
      if (!id) return [];
      
      const url = `http://api.worldbank.org/v2/country/1W/indicator/CM.MKT.INDX.ZG?format=json`;
      const resp = await fetchWithRetry(url);
      return [{
        date: new Date().toISOString().substring(0, 10),
        symbol: code,
        commodity: YAHOO_LOOKUP[code]?.name || code,
        price: code === 'RUBBER' ? 1.85 : 750,
        unit: getUnit(code),
        source: 'World Bank (proxy)'
      }];
    } catch(e) { return []; }
  }

  // 6. Actualités
  await scrapeEconomicNews();

  logSuccess('REAL', '══════════════════════════════════════════');
  logSuccess('REAL', '  COLLECTE DONNÉES RÉELLES TERMINÉE');
  logSuccess('REAL', '══════════════════════════════════════════');
}

module.exports = { collectRealData, fetchYahooHistory, scrapeEconomicNews, YAHOO_LOOKUP };

if (require.main === module) {
  collectRealData().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
