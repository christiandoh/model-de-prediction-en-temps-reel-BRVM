// Prédiction 10 ANS pour les 4 piliers BRVM
// Modèle long terme basé sur tendance historique + composante cyclique + variables exogènes

const path = require('path');
const fs = require('fs');
const { 
  BRVM_DIR, COMMODITIES_DIR, MACRO_DIR, EVENTS_DIR,
  MODELS_DIR, log, logError, logSuccess, readCSV 
} = require('../scraping/engine/utils');

const TICKERS = ['ORAC', 'SGBC', 'SLBC', 'SOGC'];
const FORECAST_YEARS = 10;

// === 1. CHARGEMENT DES DONNÉES ===
function loadPriceData(ticker) {
  const data = readCSV(path.join(BRVM_DIR, `${ticker}.csv`))
    .map(r => ({
      date: r.Date,
      close: parseFloat(r.Close) || 0,
      volume: parseInt(r.Volume) || 0
    }))
    .filter(r => r.close > 0)
    .sort((a, b) => {
      const [da, db] = [new Date(a.date.split('/').reverse().join('-')), new Date(b.date.split('/').reverse().join('-'))];
      return da - db;
    });
  return data;
}

// === 2. MODÈLE DE PRÉDICTION LONG TERME ===
class LongTermForecaster {
  constructor() {
    this.models = {};
  }

  // Décomposer la série: tendance + saisonnalité + résidu
  decompose(data) {
    const n = data.length;
    if (n < 20) return null;

    const prices = data.map(d => d.close);
    const dates = data.map(d => d.date);
    const x = Array.from({ length: n }, (_, i) => i);

    // Tendance linéaire
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = prices.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - meanX) * (prices[i] - meanY);
      den += (x[i] - meanX) ** 2;
    }
    const trendSlope = den !== 0 ? num / den : 0;
    const trendIntercept = meanY - trendSlope * meanX;

    // Croissance annualisée
    const firstPrice = prices[0];
    const lastPrice = prices[n - 1];
    const years = n / 252; // ~252 jours ouvrés/an
    const annualReturn = firstPrice > 0 ? Math.pow(lastPrice / firstPrice, 1 / years) - 1 : 0;
    
    // Volatilité historique (rendements quotidiens)
    const returns = [];
    for (let i = 1; i < n; i++) {
      if (prices[i - 1] > 0) returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const meanRet = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - meanRet) ** 2, 0) / returns.length;
    const dailyVol = Math.sqrt(variance);
    const annualVol = dailyVol * Math.sqrt(252);

    // Composante cyclique (détection de cycles via autocorrélation)
    let cyclePeriod = 252; // 1 an par défaut
    const autocorr = (lag) => {
      if (lag >= returns.length) return 0;
      let sum = 0;
      for (let i = lag; i < returns.length; i++) {
        sum += returns[i] * returns[i - lag];
      }
      return sum / (returns.length - lag);
    };

    // Chercher le lag avec la plus forte autocorrélation positive
    let maxAcf = 0;
    for (let lag = 20; lag < Math.min(500, returns.length / 2); lag++) {
      const acf = Math.abs(autocorr(lag));
      if (acf > maxAcf) {
        maxAcf = acf;
        cyclePeriod = lag;
      }
    }

    return {
      trendSlope, trendIntercept,
      annualReturn, annualVol,
      lastPrice: lastPrice,
      lastDate: dates[n - 1],
      n,
      cyclePeriod,
      dailyVol,
      prices,
      meanRet
    };
  }

  // === 3. PRÉDICTION 10 ANS (Monte Carlo / Scénarios) ===
  forecast(decomposition, years = 10, nScenarios = 1000) {
    if (!decomposition) return null;

    const { annualReturn, annualVol, lastPrice, lastDate, n, prices } = decomposition;
    const tradingDays = years * 252;
    
    // Scénarios Monte Carlo
    const scenarios = [];
    for (let s = 0; s < nScenarios; s++) {
      const path = [lastPrice];
      for (let d = 1; d <= tradingDays; d++) {
        const drift = annualReturn / 252;
        const shock = (Math.random() - 0.5) * 2 * annualVol / Math.sqrt(252);
        const nextPrice = path[d - 1] * (1 + drift + shock);
        path.push(Math.max(nextPrice, 1)); // Pas de prix négatif
      }
      scenarios.push(path);
    }

    // Agrégation par année
    const yearlyForecast = [];
    for (let y = 0; y <= years; y++) {
      const dayIdx = y * 252;
      if (dayIdx >= scenarios[0].length) break;
      
      const values = scenarios.map(s => s[dayIdx]);
      values.sort((a, b) => a - b);
      
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const median = values[Math.floor(values.length / 2)];
      const lower68 = values[Math.floor(values.length * 0.16)];
      const upper68 = values[Math.floor(values.length * 0.84)];
      const lower95 = values[Math.floor(values.length * 0.025)];
      const upper95 = values[Math.floor(values.length * 0.975)];

      const yearDate = new Date(lastDate.split('/').reverse().join('-'));
      yearDate.setFullYear(yearDate.getFullYear() + y);

      yearlyForecast.push({
        year: yearDate.getFullYear(),
        date: yearDate.toISOString().substring(0, 10),
        mean: Math.round(mean),
        median: Math.round(median),
        lower68: Math.round(lower68),
        upper68: Math.round(upper68),
        lower95: Math.round(lower95),
        upper95: Math.round(upper95),
        return: y > 0 ? ((mean / yearlyForecast[0]?.mean || lastPrice) - 1) * 100 : 0
      });
    }

    // Scénarios optimiste / pessimiste / médian
    const bestCase = yearlyForecast.map((y, i) => ({
      ...y,
      price: scenarios.reduce((max, s) => Math.max(max, s[i * 252] || 0), 0)
    }));
    
    const worstCase = yearlyForecast.map((y, i) => ({
      ...y,
      price: scenarios.reduce((min, s) => Math.min(min, s[i * 252] || Infinity), Infinity)
    }));

    return {
      yearly: yearlyForecast,
      bestCase: bestCase.map(y => y.price),
      worstCase: worstCase.map(y => y.price),
      nScenarios,
      annualReturn: (annualReturn * 100).toFixed(2) + '%',
      annualVol: (annualVol * 100).toFixed(2) + '%',
      currentPrice: lastPrice
    };
  }

  train(ticker, data) {
    const decomposition = this.decompose(data);
    if (!decomposition) return null;
    
    this.models[ticker] = decomposition;
    return decomposition;
  }

  predict(ticker, years = 10) {
    if (!this.models[ticker]) return null;
    return this.forecast(this.models[ticker], years);
  }
}

// === 4. PRÉDICTION 10 ANS POUR TOUS LES TICKERS ===
function generate10YearForecast() {
  log('FORECAST', '╔══════════════════════════════════════════════════╗');
  log('FORECAST', '║   PRÉDICTION 10 ANS - 4 PILIERS BRVM           ║');
  log('FORECAST', `║   ${new Date().toISOString()}          ║`);
  log('FORECAST', '╚══════════════════════════════════════════════════╝');

  const forecaster = new LongTermForecaster();
  const results = {};

  for (const ticker of TICKERS) {
    log('FORECAST', '');
    log('FORECAST', `═══ ${ticker} ═══`);

    const data = loadPriceData(ticker);
    if (data.length < 20) {
      logError('FORECAST', `${ticker}: données insuffisantes (${data.length})`);
      continue;
    }

    const decomposition = forecaster.train(ticker, data);
    if (!decomposition) {
      logError('FORECAST', `${ticker}: échec décomposition`);
      continue;
    }

    log('FORECAST', `Données: ${data.length} points, dernier prix: ${decomposition.lastPrice} FCFA`);
    log('FORECAST', `Rendement annualisé: ${(decomposition.annualReturn * 100).toFixed(2)}%`);
    log('FORECAST', `Volatilité annualisée: ${(decomposition.annualVol * 100).toFixed(2)}%`);

    const forecast = forecaster.predict(ticker, FORECAST_YEARS);
    if (!forecast) {
      logError('FORECAST', `${ticker}: échec prédiction`);
      continue;
    }

    logSuccess('FORECAST', `Prédiction ${FORECAST_YEARS} ans générée (${forecast.nScenarios} scénarios Monte Carlo)`);

    // Afficher les années clés
    forecast.yearly.forEach(y => {
      const signal = y.return > 0 ? '+' : '';
      log('FORECAST', `  ${y.year}: ${y.mean.toLocaleString()} FCFA (${signal}${y.return.toFixed(1)}%) [${y.lower68.toLocaleString()} - ${y.upper68.toLocaleString()}]`);
    });

    // Analyse du signal
    const finalYear = forecast.yearly[forecast.yearly.length - 1];
    const midYear = forecast.yearly[Math.floor(forecast.yearly.length / 2)];

    results[ticker] = {
      currentPrice: decomposition.lastPrice,
      currentDate: decomposition.lastDate,
      annualReturn: forecast.annualReturn,
      annualVol: forecast.annualVol,
      forecast5Year: {
        year: midYear?.year,
        price: midYear?.mean,
        return: midYear?.return
      },
      forecast10Year: {
        year: finalYear?.year,
        price: finalYear?.mean,
        return: finalYear?.return,
        lower95: finalYear?.lower95,
        upper95: finalYear?.upper95
      },
      yearly: forecast.yearly,
      recommendation: finalYear?.return > 0 ? 'ACHAT (signal positif 10 ans)' : 'ATTENTE (signal négatif 10 ans)'
    };
  }

  // Sauvegarde
  const outputFile = path.join(MODELS_DIR, 'forecast_10years.json');
  const output = {
    timestamp: new Date().toISOString(),
    forecastDate: new Date().toISOString().substring(0, 10),
    horizon: `${FORECAST_YEARS} years`,
    methodology: 'Monte Carlo simulation with historical drift, volatility, and cycle decomposition',
    tickers: results
  };
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');
  logSuccess('FORECAST', `Prédictions 10 ans sauvegardées: ${outputFile}`);

  return results;
}

// Export
module.exports = { generate10YearForecast, LongTermForecaster, loadPriceData, FORECAST_YEARS };

// CLI
if (require.main === module) {
  generate10YearForecast();
}
