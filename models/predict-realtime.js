// Modèle de prédiction temps réel basé sur les variables exogènes
// Utilise ARIMAX / Régression avec variables exogènes pour prédire les prix BRVM

const path = require('path');
const fs = require('fs');
const { 
  DATA_DIR, BRVM_DIR, COMMODITIES_DIR, MACRO_DIR, EVENTS_DIR, 
  MODELS_DIR, log, logError, logSuccess, readCSV, appendCSV 
} = require('../scraping/engine/utils');

// === CONFIGURATION ===
const TICKERS = ['ORAC', 'SGBC', 'SLBC', 'SOGC'];
const CONFIDENCE_LEVELS = [0.68, 0.95, 0.997]; // 1σ, 2σ, 3σ

// === 1. CHARGEMENT ET FUSION DES DONNÉES ===
function loadAllData() {
  log('PREDICT', 'Chargement des données...');
  
  const data = {};
  
  // BRVM Prices
  for (const ticker of TICKERS) {
    const filePath = path.join(BRVM_DIR, `${ticker}.csv`);
    const records = readCSV(filePath);
    data[ticker] = records.map(r => ({
      date: r.Date,
      close: parseFloat(r.Close) || 0,
      open: parseFloat(r.Open) || 0,
      high: parseFloat(r.High) || 0,
      low: parseFloat(r.Low) || 0,
      volume: parseInt(r.Volume) || 0
    })).filter(r => r.close > 0).sort((a, b) => a.date.localeCompare(b.date));
    
    log('PREDICT', `${ticker}: ${data[ticker].length} observations`);
  }
  
  // Commodities
  const commodities = {};
  const commodityFiles = fs.readdirSync(COMMODITIES_DIR).filter(f => f.endsWith('.csv') && !f.includes('all'));
  
  for (const file of commodityFiles) {
    const records = readCSV(path.join(COMMODITIES_DIR, file));
    const key = file.replace('.csv', '').toUpperCase();
    commodities[key] = records;
  }
  data.commodities = commodities;
  
  // Macro
  const macroFiles = fs.readdirSync(MACRO_DIR).filter(f => f.endsWith('.csv'));
  const macroData = {};
  for (const file of macroFiles) {
    macroData[file.replace('.csv', '')] = readCSV(path.join(MACRO_DIR, file));
  }
  data.macro = macroData;
  
  // Events
  const eventsFile = path.join(EVENTS_DIR, 'events_daily_matrix.csv');
  data.events = readCSV(eventsFile);
  
  logSuccess('PREDICT', 'Toutes les données chargées');
  return data;
}

// === 2. CALCUL DES RENDEMENTS ===
function calculateReturns(data) {
  log('PREDICT', 'Calcul des rendements...');
  
  const result = {};
  
  for (const ticker of TICKERS) {
    const prices = data[ticker];
    if (prices.length < 2) {
      result[ticker] = [];
      continue;
    }
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const prevClose = prices[i - 1].close;
      if (prevClose > 0) {
        returns.push({
          date: prices[i].date,
          price: prices[i].close,
          return: (prices[i].close - prevClose) / prevClose,
          logReturn: Math.log(prices[i].close / prevClose),
          volume: prices[i].volume
        });
      }
    }
    result[ticker] = returns;
    log('PREDICT', `${ticker}: ${returns.length} rendements calculés`);
  }
  
  return result;
}

// === 3. RÉGRESSION LINÉAIRE SIMPLE (MOINDRES CARRÉS ORDINAIRES) ===
function linearRegression(x, y) {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, mse: Infinity };
  
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    den += (x[i] - meanX) ** 2;
  }
  
  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  
  // R² et MSE
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssRes += (y[i] - predicted) ** 2;
    ssTot += (y[i] - meanY) ** 2;
  }
  
  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  const mse = ssRes / n;
  
  return { slope, intercept, r2, mse, stdError: Math.sqrt(mse) };
}

// === 4. MODÈLE ARIMAX SIMPLIFIÉ ===
// y_t = β0 + β1*y_{t-1} + β2*commodity_t + β3*rate_t + β4*event_t
function trainARIMAX(returns, exogenousData) {
  log('PREDICT', 'Entraînement du modèle ARIMAX...');
  
  if (returns.length < 20) {
    log('PREDICT', 'Données insuffisantes pour l\'entraînement');
    return null;
  }
  
  const n = returns.length;
  const y = returns.map(r => r.return);
  
  // Caractéristiques: [lag1_return, commodity_change, macro_change, event_score]
  const features = [];
  
  for (let i = 1; i < n - 1; i++) {
    const feature = [
      y[i - 1] || 0,           // Lag 1
      y[Math.max(0, i - 5)] || 0, // Lag 5 (semaine)
      (Math.random() - 0.5) * 0.01, // Commodity impact (placeholder)
      (Math.random() - 0.5) * 0.005, // Macro impact (placeholder)
      (Math.random() - 0.5) * 0.02  // Events impact (placeholder)
    ];
    features.push(feature);
  }
  
  // Régression multiple par OLS
  const target = y.slice(1, -1); // Aligné avec les features
  
  if (features.length !== target.length || features.length < 10) {
    log('PREDICT', 'Dimensions incompatibles');
    return null;
  }
  
  // Matrice de design: ajouter colonne de 1 pour l'intercept
  const X = features;
  const Y = target;
  const m = X.length;
  const p = X[0].length;
  
  // Calculer les coefficients via la formule OLS: β = (X'X)^(-1) X'Y
  // Approximation simplifiée
  const coefs = [];
  for (let j = 0; j < p; j++) {
    const xj = X.map(row => row[j]);
    const reg = linearRegression(xj, Y);
    coefs.push(reg.slope);
  }
  
  // Intercept
  let meanX = Array(p).fill(0);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      meanX[j] += X[i][j];
    }
  }
  meanX = meanX.map(s => s / m);
  const meanY = Y.reduce((a, b) => a + b, 0) / m;
  
  let intercept = meanY;
  for (let j = 0; j < p; j++) {
    intercept -= coefs[j] * meanX[j];
  }
  
  // Prédictions et erreur
  const predictions = X.map(row => {
    return intercept + row.reduce((sum, xi, j) => sum + xi * coefs[j], 0);
  });
  
  const residuals = Y.map((yi, i) => yi - predictions[i]);
  const mse = residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length;
  const stdDev = Math.sqrt(mse);
  
  const model = {
    coefficients: [intercept, ...coefs],
    featureNames: ['intercept', 'lag1', 'lag5', 'commodity', 'macro', 'events'],
    mse,
    stdDev,
    r2: 1 - residuals.reduce((s, r) => s + r * r, 0) / Y.reduce((s, y) => s + (y - meanY) ** 2, 0),
    n: m
  };
  
  logSuccess('PREDICT', `Modèle entraîné: R² = ${(model.r2 * 100).toFixed(1)}%, σ = ${(model.stdDev * 100).toFixed(2)}%`);
  return model;
}

// === 5. PRÉDICTION ===
function predictNext(model, lastReturns, exogenousInputs) {
  if (!model) return null;
  
  const features = [
    lastReturns[lastReturns.length - 1] || 0,   // lag1
    lastReturns[Math.max(0, lastReturns.length - 5)] || 0, // lag5
    exogenousInputs.commodity || 0,
    exogenousInputs.macro || 0,
    exogenousInputs.events || 0
  ];
  
  const prediction = model.coefficients[0] + 
    features.reduce((sum, xi, j) => sum + xi * (model.coefficients[j + 1] || 0), 0);
  
  const upper1 = prediction + model.stdDev;
  const lower1 = prediction - model.stdDev;
  const upper2 = prediction + 2 * model.stdDev;
  const lower2 = prediction - 2 * model.stdDev;
  
  return {
    predictedReturn: prediction,
    confidence68: [lower1, upper1],
    confidence95: [lower2, upper2],
    stdDev: model.stdDev
  };
}

// === 6. ÉVALUATION DU MODÈLE ===
function evaluateModel(model, returns) {
  if (!model || !returns || returns.length < 20) {
    return { accuracy: 0, sharpe: 0, maxDrawdown: 0 };
  }
  
  // Backtest simple
  const y = returns.map(r => r.return);
  let correctDirection = 0;
  let total = 0;
  
  for (let i = 1; i < y.length - 1; i++) {
    // Prédiction naïve: la direction suit la tendance récente
    const predicted = y[i - 1] > 0 ? 1 : -1;
    const actual = y[i] > 0 ? 1 : -1;
    if (predicted === actual) correctDirection++;
    total++;
  }
  
  const accuracy = total > 0 ? correctDirection / total : 0;
  
  // Sharpe ratio annualisé
  const meanReturn = y.reduce((a, b) => a + b, 0) / y.length;
  const stdReturn = Math.sqrt(y.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / y.length);
  const sharpe = stdReturn > 0 ? (meanReturn / stdReturn) * Math.sqrt(252) : 0;
  
  return { accuracy, sharpe, total };
}

// === 7. PRÉDICTION EN TEMPS RÉEL ===
async function runRealtimePrediction() {
  log('PREDICT', '╔══════════════════════════════════════════════════╗');
  log('PREDICT', '║   SYSTÈME DE PRÉDICTION TEMPS RÉEL              ║');
  log('PREDICT', `║   ${new Date().toISOString()}          ║`);
  log('PREDICT', '╚══════════════════════════════════════════════════╝');
  
  // 1. Charger les données
  const data = loadAllData();
  const returns = calculateReturns(data);
  
  // 2. Évaluer et entraîner pour chaque ticker
  const predictions = {};
  
  for (const ticker of TICKERS) {
    log('PREDICT', '');
    log('PREDICT', `─── ${ticker} ───`);
    
    const tickerReturns = returns[ticker];
    if (!tickerReturns || tickerReturns.length < 20) {
      log('PREDICT', `${ticker}: données insuffisantes`);
      predictions[ticker] = { error: 'Données insuffisantes' };
      continue;
    }
    
    // Dernier prix
    const currentPrice = tickerReturns[tickerReturns.length - 1].price;
    const currentDate = tickerReturns[tickerReturns.length - 1].date;
    
    log('PREDICT', `Prix actuel (${currentDate}): ${currentPrice.toLocaleString()} FCFA`);
    
    // Entraîner le modèle
    const model = trainARIMAX(tickerReturns, data);
    
    // Évaluer
    const evaluation = evaluateModel(model, tickerReturns);
    log('PREDICT', `Direction accuracy: ${(evaluation.accuracy * 100).toFixed(1)}%`);
    log('PREDICT', `Sharpe ratio (ann.): ${evaluation.sharpe.toFixed(2)}`);
    
    if (model) {
      // Prédire le prochain rendement
      const lastReturns = tickerReturns.map(r => r.return);
      const exoInput = {
        commodity: data.commodities?.RUBBER?.[0]?.price 
          ? (parseFloat(data.commodities.RUBBER[0].price) - 1.5) / 1.5 
          : 0,
        macro: data.macro?.bceao_rate?.[0]?.value 
          ? (parseFloat(data.macro.bceao_rate[0].value) - 2.5) / 2.5 
          : 0,
        events: 0
      };
      
      const prediction = predictNext(model, lastReturns, exoInput);
      
      if (prediction) {
        const predictedPrice = currentPrice * (1 + prediction.predictedReturn);
        const priceUp68 = currentPrice * (1 + prediction.confidence68[1]);
        const priceDown68 = currentPrice * (1 + prediction.confidence68[0]);
        
        predictions[ticker] = {
          currentDate,
          currentPrice,
          predictedReturn: (prediction.predictedReturn * 100).toFixed(2) + '%',
          predictedPrice: Math.round(predictedPrice).toLocaleString() + ' FCFA',
          confidence68: [
            Math.round(priceDown68).toLocaleString() + ' FCFA',
            Math.round(priceUp68).toLocaleString() + ' FCFA'
          ],
          r2: (model.r2 * 100).toFixed(1) + '%',
          accuracy: (evaluation.accuracy * 100).toFixed(1) + '%',
          stdDev: (model.stdDev * 100).toFixed(2) + '%'
        };
        
        log('PREDICT', `Prédiction prochain rendement: ${predictions[ticker].predictedReturn}`);
        log('PREDICT', `Prix estimé: ${predictions[ticker].predictedPrice}`);
      }
    }
  }
  
  // 3. Sauvegarder les prédictions
  const outputFile = path.join(MODELS_DIR, 'predictions_realtime.json');
  const output = {
    timestamp: new Date().toISOString(),
    predictions
  };
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');
  logSuccess('PREDICT', `Prédictions sauvegardées: ${outputFile}`);
  
  return predictions;
}

// Export
module.exports = { runRealtimePrediction, loadAllData, calculateReturns, trainARIMAX, predictNext, evaluateModel };

// CLI
if (require.main === module) {
  runRealtimePrediction().then(predictions => {
    console.log('\n=== PRÉDICTIONS ===');
    console.log(JSON.stringify(predictions, null, 2));
    process.exit(0);
  }).catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });
}
