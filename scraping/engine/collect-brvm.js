// BRVM Data Collector
// Collecte les prix historiques des 4 piliers via sikafinance.com API
// et via scraping du site officiel BRVM

const { BRVM_DIR, log, logError, logSuccess, appendCSV, postWithRetry, sleep, readCSV } = require('./utils');
const path = require('path');
const fs = require('fs');

const TICKERS = {
  ORAC: { name: "Orange Côte d'Ivoire", sector: 'Telecom', full: 'ORAC.CI' },
  SGBC: { name: "Société Générale Côte d'Ivoire", sector: 'Finance', full: 'SGBC.CI' },
  SLBC: { name: 'Solibra', sector: 'Industry', full: 'SLBC.CI' },
  SOGC: { name: 'SOGB', sector: 'Agriculture', full: 'SOGC.CI' }
};

const API_URL = 'https://www.sikafinance.com/api/general/GetHistos';
const CSV_COLUMNS = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'Ticker'];

// === SCRAPING VIA SIKAFINANCE API (identique au package R) ===
async function scrapeSikafinance(ticker, fromDate, toDate, period = 0) {
  try {
    const payload = {
      ticker: TICKERS[ticker].full,
      datedeb: fromDate,
      datefin: toDate,
      xperiod: String(period)
    };
    
    const response = await postWithRetry(API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.sikafinance.com',
        'Referer': `https://www.sikafinance.com/marches/historiques/${TICKERS[ticker].full}`
      }
    });
    
    if (response.data && response.data.lst) {
      const rawData = response.data.lst;
      const records = [];
      
      // L'API retourne un tableau d'objets avec Date, Open, High, Low, Close, Volume
      if (Array.isArray(rawData)) {
        for (const item of rawData) {
          if (typeof item === 'object' && item !== null) {
            records.push({
              Date: item.Date || item.date,
              Open: parseFloat(item.Open || item.open),
              High: parseFloat(item.High || item.high),
              Low: parseFloat(item.Low || item.low),
              Close: parseFloat(item.Close || item.close),
              Volume: parseInt(item.Volume || item.volume) || 0,
              Ticker: ticker
            });
          }
        }
      }
      
      return records;
    }
    
    return [];
  } catch (err) {
    logError('BRVM', `${ticker}: ${err.message}`);
    return [];
  }
}

// === ALTERNATIVE : SCRAPING BRVM.ORG ===
async function scrapeBrvmOrg(ticker) {
  try {
    const url = `https://www.brvm.org/en/cours-actions/0/status/200`;
    const { HTTP } = require('./utils');
    const cheerio = require('cheerio');
    
    const response = await HTTP.get(url);
    const $ = cheerio.load(response.data);
    
    // Cherche le tableau des cotations
    const tables = $('table');
    log('BRVM', `Tables trouvées sur BRVM.ORG: ${tables.length}`);
    
    // Extraction des données (structure à adapter selon le HTML réel)
    // Retourne les données disponibles
    return [];
  } catch (err) {
    logError('BRVM', `BRVM.ORG ${ticker}: ${err.message}`);
    return [];
  }
}

// === COLLECTEUR PRINCIPAL ===
async function collectAllBRVM(fromDate = '2010-01-01', toDate = null) {
  toDate = toDate || new Date().toISOString().substring(0, 10);
  
  log('BRVM', `=== DÉBUT COLLECTE BRVM: ${fromDate} → ${toDate} ===`);
  
  let totalRecords = 0;
  
  for (const [ticker, info] of Object.entries(TICKERS)) {
    // Découper en périodes de 89 jours (comme le package R)
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const chunks = [];
    
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 89)) {
      const chunkEnd = new Date(d);
      chunkEnd.setDate(chunkEnd.getDate() + 89);
      if (chunkEnd > end) chunkEnd.setTime(end.getTime());
      
      const fmt = (dt) => dt.toISOString().substring(0, 10);
      chunks.push({ from: fmt(d), to: fmt(chunkEnd) });
    }
    
    let tickerRecords = 0;
    for (const chunk of chunks) {
      const data = await scrapeSikafinance(ticker, chunk.from, chunk.to);
      
      for (const record of data) {
        const filePath = path.join(BRVM_DIR, `${ticker}.csv`);
        appendCSV(filePath, record, CSV_COLUMNS);
        tickerRecords++;
      }
      
      await sleep(200); // Rate limiting
    }
    
    logSuccess('BRVM', `${ticker} (${info.name}): ${tickerRecords} enregistrements`);
    totalRecords += tickerRecords;
  }
  
  logSuccess('BRVM', `Total: ${totalRecords} enregistrements collectés`);
  return totalRecords;
}

// === COLLECTE DES INDICES BRVM ===
async function collectIndices() {
  log('BRVM', 'Collecte des indices BRVM...');
  
  const indices = [
    'BRVM30', 'BRVMC', 'BRVMAG', 'BRVMDI', 'BRVMFI', 
    'BRVMIN', 'BRVMSP', 'BRVMTR', 'BRVMPR', 'BRVMPA'
  ];
  
  let total = 0;
  for (const idx of indices) {
    const data = await scrapeSikafinance(`BRVM${idx === 'BRVM30' ? '30' : idx}`, 
                                          '2020-01-01', 
                                          new Date().toISOString().substring(0, 10));
    for (const record of data) {
      const filePath = path.join(BRVM_DIR, `INDEX_${idx}.csv`);
      appendCSV(filePath, record, CSV_COLUMNS);
      total++;
    }
    await sleep(100);
  }
  
  logSuccess('BRVM', `Indices: ${total} enregistrements`);
  return total;
}

// Export
module.exports = { collectAllBRVM, collectIndices, TICKERS };

// Run directly
if (require.main === module) {
  collectAllBRVM().then(n => {
    console.log(`Collecte terminée: ${n} données`);
  }).catch(err => {
    console.error('Erreur collecte BRVM:', err);
    process.exit(1);
  });
}
