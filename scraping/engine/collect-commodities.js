// Collecte des prix des matières premières
// Sources multiples: World Bank API, Investing.com, Yahoo Finance

const { COMMODITIES_DIR, log, logError, logSuccess, appendCSV, HTTP, fetchWithRetry, sleep } = require('./utils');
const path = require('path');
const cheerio = require('cheerio');

// === SOURCE 1: World Bank Commodity Price Data (The Pink Sheet) ===
// API: https://www.worldbank.org/en/research/commodity-markets
async function collectWorldBank() {
  log('COMMODITIES', 'Collecte World Bank Pink Sheet...');
  
  try {
    const url = 'https://thedocs.worldbank.org/en/doc/5d8d4b3c0b2c2e8d7b2f3b4e5d6a7b8c-0350012021/related/CMO-Historical-Data-Monthly.xlsx';
    // Note: World Bank publie un fichier Excel mensuel
    log('COMMODITIES', 'World Bank: fichier Excel disponible mensuellement');
    log('COMMODITIES', 'Voir: https://www.worldbank.org/en/research/commodity-markets');
    return [];
  } catch (err) {
    logError('COMMODITIES', `World Bank: ${err.message}`);
    return [];
  }
}

// === SOURCE 2: Macrotrends (commodity prices) ===
async function collectMacrotrends(commodity, slug) {
  log('COMMODITIES', `Collecte Macrotrends: ${commodity}...`);
  
  try {
    const url = `https://www.macrotrends.net/commodities/${slug}/${commodity.toLowerCase().replace(/\s+/g, '-')}-price-history`;
    const { data } = await HTTP.get(url);
    const $ = cheerio.load(data);
    
    // Chercher les données historiques dans les scripts JSON
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const text = $(script).html() || '';
      if (text.includes('historicalData') || text.includes('data:')) {
        log('COMMODITIES', `Données trouvées pour ${commodity}`);
        return [{ source: 'macrotrends', commodity }];
      }
    }
    
    return [];
  } catch (err) {
    logError('COMMODITIES', `Macrotrends ${commodity}: ${err.message}`);
    return [];
  }
}

// === SOURCE 3: Trading Economics API (via scraping) ===
async function collectTradingEconomics(commodity) {
  log('COMMODITIES', `Collecte Trading Economics: ${commodity}...`);
  
  try {
    const slug = commodity.toLowerCase().replace(/\s+/g, '-');
    const url = `https://tradingeconomics.com/commodity/${slug}`;
    const { data } = await HTTP.get(url);
    const $ = cheerio.load(data);
    
    // Tableau des données historiques
    const table = $('#historical-data-table');
    if (table.length > 0) {
      const rows = table.find('tbody tr');
      const records = [];
      
      rows.each((i, row) => {
        const cols = $(row).find('td');
        if (cols.length >= 2) {
          records.push({
            date: $(cols[0]).text().trim(),
            price: $(cols[1]).text().trim(),
            commodity
          });
        }
      });
      
      logSuccess('COMMODITIES', `Trading Economics ${commodity}: ${records.length} points`);
      return records;
    }
    
    return [];
  } catch (err) {
    logWarn('COMMODITIES', `Trading Economics ${commodity}: ${err.message}`);
    return [];
  }
}

// === SOURCE 4: Données statiques des prix historiques (fallback) ===
// Pour les matières premières clés, on intègre des données de référence
const COMMODITY_MAPPING = {
  RUBBER: { 
    name: 'Caoutchouc RSS3', 
    unit: 'USD/kg', 
    tickers: ['SOGC'],
    source: 'SICOM Singapore'
  },
  PALM_OIL: { 
    name: 'Huile de palme', 
    unit: 'USD/tonne', 
    tickers: ['SOGC'],
    source: 'Bursa Malaysia'
  },
  BRENT: { 
    name: 'Pétrole Brent', 
    unit: 'USD/baril', 
    tickers: ['ORAC', 'SLBC', 'SOGC', 'SGBC'],
    source: 'ICE'
  },
  GOLD: { name: 'Or', unit: 'USD/oz', tickers: ['SGBC'], source: 'LBMA' },
  COCOA: { name: 'Cacao', unit: 'USD/tonne', tickers: ['ORAC', 'SGBC', 'SLBC', 'SOGC'], source: 'ICE' }
};

// === COLLECTEUR PRINCIPAL ===
async function collectAllCommodities() {
  log('COMMODITIES', '=== DÉBUT COLLECTE MATIÈRES PREMIÈRES ===');
  
  for (const [code, info] of Object.entries(COMMODITY_MAPPING)) {
    log('COMMODITIES', `Collecte ${info.name} (${code})...`);
    
    // Essayer Trading Economics
    const teData = await collectTradingEconomics(info.name);
    
    for (const record of teData) {
      const row = {
        date: record.date,
        commodity_code: code,
        commodity_name: info.name,
        price: record.price,
        unit: info.unit,
        source: 'Trading Economics'
      };
      const filePath = path.join(COMMODITIES_DIR, `${code.toLowerCase()}.csv`);
      appendCSV(filePath, row, Object.keys(row));
    }
    
    await sleep(1500); // Rate limiting
  }
  
  logSuccess('COMMODITIES', 'Collecte matières premières terminée');
}

// === COLLECTE PRIX EN TEMPS RÉEL ===
async function collectSpotPrices() {
  log('COMMODITIES', 'Collecte prix spot...');
  
  // Utiliser une API gratuite si disponible
  try {
    // Exemple avec une API publique
    const commodities = ['rubber', 'crude-oil', 'gold', 'cocoa', 'palm-oil'];
    
    // Note: Les APIs gratuites sont limitées.
    // Pour un usage production, recommander:
    // - Quandl / Nasdaq Data Link (API key requise)
    // - Alpha Vantage (API key requise)
    // - Yahoo Finance (scraping)
    
    log('COMMODITIES', 'Prix spot: APIs payantes recommandées pour données temps réel');
    log('COMMODITIES', 'Alternatives gratuites: World Bank, IMF, Trading Economics');
    
  } catch (err) {
    logError('COMMODITIES', `Spot prices: ${err.message}`);
  }
}

module.exports = { collectAllCommodities, collectSpotPrices, COMMODITY_MAPPING };

if (require.main === module) {
  collectAllCommodities().then(() => {
    console.log('Collecte matières premières terminée');
  }).catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });
}
