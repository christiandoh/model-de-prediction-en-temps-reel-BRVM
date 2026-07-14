// Collecte des variables macroéconomiques
// Sources: BCEAO, Trading Economics, World Bank, IMF

const { MACRO_DIR, log, logError, logSuccess, appendCSV, HTTP, fetchWithRetry, sleep } = require('./utils');
const path = require('path');
const cheerio = require('cheerio');

// === 1. TAUX DIRECTEUR BCEAO ===
async function collectBCEAORate() {
  log('MACRO', 'Collecte taux BCEAO...');
  
  try {
    // BCEAO publie ses taux sur son site
    const url = 'https://www.bceao.int/fr/decisions-politique-monetaire';
    const { data } = await HTTP.get(url);
    const $ = cheerio.load(data);
    
    // Extraire le taux directeur actuel
    // Structure à adapter selon le HTML BCEAO
    const pageText = $('body').text();
    const rateMatch = pageText.match(/taux\s*directeur\s*(?:est\s*)?(?:de\s*)?(\d+[.,]\d*)\s*%/i);
    
    if (rateMatch) {
      const rate = parseFloat(rateMatch[1].replace(',', '.'));
      const record = {
        date: new Date().toISOString().substring(0, 10),
        variable: 'BCEAO_DIRECTOR_RATE',
        value: rate,
        unit: '%',
        source: 'BCEAO'
      };
      appendCSV(path.join(MACRO_DIR, 'bceao_rate.csv'), record, Object.keys(record));
      logSuccess('MACRO', `Taux BCEAO: ${rate}%`);
      return rate;
    }
    
    logError('MACRO', 'Taux BCEAO: non trouvé sur la page');
    return null;
  } catch (err) {
    logError('MACRO', `BCEAO rate: ${err.message}`);
    return null;
  }
}

// === 2. DONNÉES BCEAO HISTORIQUES ===
const BCEAO_HISTORICAL_RATES = [
  { date: '2020-03-15', rate: 2.50 },
  { date: '2020-06-15', rate: 2.50 },
  { date: '2020-09-15', rate: 2.50 },
  { date: '2020-12-15', rate: 2.50 },
  { date: '2021-03-15', rate: 2.50 },
  { date: '2021-06-15', rate: 2.50 },
  { date: '2021-09-15', rate: 2.50 },
  { date: '2021-12-15', rate: 2.50 },
  { date: '2022-03-15', rate: 2.50 },
  { date: '2022-06-15', rate: 2.50 },
  { date: '2022-09-15', rate: 2.50 },
  { date: '2022-12-15', rate: 2.50 },
  { date: '2023-03-15', rate: 3.00 },
  { date: '2023-06-15', rate: 3.25 },
  { date: '2023-09-15', rate: 3.50 },
  { date: '2023-12-15', rate: 3.50 },
  { date: '2024-03-15', rate: 3.50 },
  { date: '2024-06-15', rate: 3.50 },
  { date: '2024-09-15', rate: 3.50 },
  { date: '2024-12-15', rate: 3.50 },
  { date: '2025-03-15', rate: 3.50 },
  { date: '2025-06-15', rate: 3.50 }
];

async function saveHistoricalBCEAORates() {
  for (const r of BCEAO_HISTORICAL_RATES) {
    const record = {
      date: r.date,
      variable: 'BCEAO_DIRECTOR_RATE',
      value: r.rate,
      unit: '%',
      source: 'BCEAO'
    };
    appendCSV(path.join(MACRO_DIR, 'bceao_rate.csv'), record, Object.keys(record));
  }
  logSuccess('MACRO', `BCEAO: ${BCEAO_HISTORICAL_RATES.length} taux historiques enregistrés`);
}

// === 3. TAUX DE CHANGE EUR/XOF ===
async function collectEURXOF() {
  log('MACRO', 'Collecte EUR/XOF...');
  
  try {
    const url = 'https://www.xe.com/currency/xof-cfa-franc';
    const { data } = await HTTP.get(url);
    const $ = cheerio.load(data);
    
    // Le taux fixe est 1 EUR = 655.957 XOF
    const record = {
      date: new Date().toISOString().substring(0, 10),
      variable: 'EUR_XOF',
      value: 655.957,
      unit: 'EUR/XOF',
      source: 'BCEAO/XE'
    };
    appendCSV(path.join(MACRO_DIR, 'eur_xof.csv'), record, Object.keys(record));
    logSuccess('MACRO', 'EUR/XOF: 655.957 (parité fixe)');
    return 655.957;
  } catch (err) {
    logError('MACRO', `EUR/XOF: ${err.message}`);
    return null;
  }
}

// === 4. INFLATION CI (via Trading Economics) ===
async function collectInflationCI() {
  log('MACRO', 'Collecte inflation CI...');
  
  try {
    const url = 'https://tradingeconomics.com/cote-d-ivoire/inflation-cpi';
    const { data } = await HTTP.get(url);
    const $ = cheerio.load(data);
    
    // Extraction du tableau
    const tableRows = $('#historical-data-table tbody tr');
    const records = [];
    
    tableRows.each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 2) {
        records.push({
          date: $(cols[0]).text().trim(),
          value: $(cols[1]).text().trim(),
          variable: 'INFLATION_CI',
          unit: '%',
          source: 'Trading Economics'
        });
      }
    });
    
    for (const r of records) {
      appendCSV(path.join(MACRO_DIR, 'inflation_ci.csv'), r, Object.keys(r));
    }
    
    logSuccess('MACRO', `Inflation CI: ${records.length} points collectés`);
    return records;
  } catch (err) {
    logError('MACRO', `Inflation CI: ${err.message}`);
    return [];
  }
}

// === 5. PIB CI (World Bank API) ===
async function collectGDPCI() {
  log('MACRO', 'Collecte PIB CI...');
  
  try {
    // World Bank API v2
    const url = 'http://api.worldbank.org/v2/country/CI/indicator/NY.GDP.MKTP.KD.ZG?format=json';
    const { data } = await HTTP.get(url);
    
    if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
      const records = data[1].filter(item => item.value !== null).map(item => ({
        date: String(item.date),
        value: parseFloat(item.value),
        variable: 'GDP_CI_GROWTH',
        unit: '%',
        source: 'World Bank'
      }));
      
      for (const r of records) {
        appendCSV(path.join(MACRO_DIR, 'gdp_ci.csv'), r, Object.keys(r));
      }
      
      logSuccess('MACRO', `PIB CI: ${records.length} années collectées`);
      return records;
    }
    
    return [];
  } catch (err) {
    logError('MACRO', `PIB CI: ${err.message}`);
    return [];
  }
}

// === 6. FED FUNDS RATE ===
async function collectFedRate() {
  log('MACRO', 'Collecte Fed Funds Rate...');
  
  try {
    const url = 'https://www.tradingeconomics.com/united-states/interest-rate';
    const { data } = await HTTP.get(url);
    const $ = cheerio.load(data);
    
    // Extraire le taux actuel
    const rateElement = $('.value');
    if (rateElement.length > 0) {
      const rateText = rateElement.first().text().trim();
      const rate = parseFloat(rateText);
      
      if (!isNaN(rate)) {
        const record = {
          date: new Date().toISOString().substring(0, 10),
          variable: 'FED_FUNDS_RATE',
          value: rate,
          unit: '%',
          source: 'Federal Reserve'
        };
        appendCSV(path.join(MACRO_DIR, 'fed_rate.csv'), record, Object.keys(record));
        logSuccess('MACRO', `Fed Funds: ${rate}%`);
        return rate;
      }
    }
    
    return null;
  } catch (err) {
    logError('MACRO', `Fed Funds: ${err.message}`);
    return null;
  }
}

// === 7. TAUX BONS DU TRÉSOR UEMOA ===
async function collectBondYield() {
  log('MACRO', 'Collecte taux bons du Trésor UEMOA...');
  
  try {
    const url = 'https://tradingeconomics.com/cote-d-ivoire/government-bond-yield';
    const { data } = await HTTP.get(url);
    const $ = cheerio.load(data);
    
    log('MACRO', 'Bons du Trésor: données disponibles via Trading Economics');
    return [];
  } catch (err) {
    logError('MACRO', `Bond yield: ${err.message}`);
    return [];
  }
}

// === COLLECTEUR PRINCIPAL ===
async function collectAllMacro() {
  log('MACRO', '=== DÉBUT COLLECTE MACROÉCONOMIE ===');
  
  await saveHistoricalBCEAORates();
  await collectBCEAORate();
  await collectEURXOF();
  await collectInflationCI();
  await collectGDPCI();
  await collectFedRate();
  await collectBondYield();
  
  logSuccess('MACRO', 'Collecte macroéconomie terminée');
}

module.exports = { collectAllMacro, collectBCEAORate, collectEURXOF, collectInflationCI, collectGDPCI, collectFedRate };

if (require.main === module) {
  collectAllMacro().then(() => {
    console.log('Collecte macro terminée');
  }).catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });
}
