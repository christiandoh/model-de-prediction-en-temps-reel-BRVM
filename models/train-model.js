// Entraînement complet du modèle de prédiction
// Combine ARIMAX + Régression Ridge + Forêt Aléatoire

const path = require('path');
const fs = require('fs');
const { 
  DATA_DIR, BRVM_DIR, COMMODITIES_DIR, MACRO_DIR, EVENTS_DIR,
  MODELS_DIR, log, logError, logSuccess, readCSV, appendCSV 
} = require('../scraping/engine/utils');

const TICKERS = ['ORAC', 'SGBC', 'SLBC', 'SOGC'];

// === 1. CONSTRUCTION DU DATASET COMPLET ===
function buildFeatureMatrix(ticker) {
  log('TRAIN', `Construction matrice pour ${ticker}...`);
  
  // Prix BRVM
  const prices = readCSV(path.join(BRVM_DIR, `${ticker}.csv`))
    .map(r => ({ date: r.Date, close: parseFloat(r.Close) || 0 }))
    .filter(r => r.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  if (prices.length < 10) {
    log('TRAIN', `${ticker}: données insuffisantes`);
    return null;
  }
  
  // Rendements
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const ret = (prices[i].close - prices[i - 1].close) / prices[i - 1].close;
    returns.push({ date: prices[i].date, price: prices[i].close, return: ret });
  }
  
  // Commodities (exemple: caoutchouc pour SOGC)
  const rubberPrice = readCSV(path.join(COMMODITIES_DIR, 'rubber.csv'));
  const palmOil = readCSV(path.join(COMMODITIES_DIR, 'palm_oil.csv'));
  const brent = readCSV(path.join(COMMODITIES_DIR, 'brent.csv'));
  const cocoa = readCSV(path.join(COMMODITIES_DIR, 'cocoa.csv'));
  const gold = readCSV(path.join(COMMODITIES_DIR, 'gold.csv'));
  
  // Macro
  const bceaoRate = readCSV(path.join(MACRO_DIR, 'bceao_rate.csv'));
  const inflationCI = readCSV(path.join(MACRO_DIR, 'inflation_ci.csv'));
  
  // Events
  const eventsMatrix = readCSV(path.join(EVENTS_DIR, 'events_daily_matrix.csv'));
  
  // Fusion
  const features = returns.map(r => {
    const date = r.date;
    
    // Fonction helper pour trouver la valeur la plus proche
    const findClosest = (data, dateStr) => {
      if (!data || data.length === 0) return 0;
      const sorted = data.sort((a, b) => a.date?.localeCompare?.(b.date) || 0);
      const match = sorted.find(d => d.date === dateStr);
      if (match) return parseFloat(match.price || match.value || 0) || 0;
      // Valeur la plus récente avant la date
      const before = sorted.filter(d => (d.date || '') <= dateStr);
      if (before.length > 0) return parseFloat(before[before.length - 1].price || before[before.length - 1].value || 0) || 0;
      return 0;
    };
    
    const findEventScore = (events, dateStr) => {
      if (!events || events.length === 0) return 0;
      const match = events.find(e => e.date === dateStr);
      if (!match) return 0;
      let score = 0;
      for (const [key, val] of Object.entries(match)) {
        if (key !== 'date' && parseFloat(val) > 0) score += parseFloat(val);
      }
      return score;
    };
    
    return {
      date,
      price: r.price,
      return: r.return,
      // Lag features
      return_lag1: returns[Math.max(0, returns.indexOf(r) - 1)]?.return || 0,
      return_lag5: returns[Math.max(0, returns.indexOf(r) - 5)]?.return || 0,
      return_lag22: returns[Math.max(0, returns.indexOf(r) - 22)]?.return || 0, // 1 mois
      // Commodities
      rubber_price: findClosest(rubberPrice, date),
      palm_oil_price: findClosest(palmOil, date),
      brent_price: findClosest(brent, date),
      cocoa_price: findClosest(cocoa, date),
      gold_price: findClosest(gold, date),
      // Macro
      bceao_rate: findClosest(bceaoRate, date),
      inflation: findClosest(inflationCI, date),
      // Events
      event_score: findEventScore(eventsMatrix, date)
    };
  });
  
  logSuccess('TRAIN', `${ticker}: matrice ${features.length} × ${Object.keys(features[0]).length}`);
  return features;
}

// === 2. MODÈLE DE RÉGRESSION AVEC RÉGULARISATION (RIDGE) ===
class RidgeRegression {
  constructor(lambda = 0.1) {
    this.lambda = lambda;
    this.coefficients = null;
    this.intercept = 0;
    this.featureNames = [];
  }
  
  fit(features, target) {
    const n = features.length;
    const p = features[0].length;
    
    this.featureNames = Object.keys(features[0]).filter(k => k !== 'date' && k !== 'price' && k !== 'return');
    
    // Matrice de design standardisée
    const X = [];
    const means = Array(p).fill(0);
    const stds = Array(p).fill(0);
    
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < p; j++) {
        const val = features[i][this.featureNames[j]] || 0;
        row.push(val);
        means[j] += val;
      }
      X.push(row);
    }
    
    for (let j = 0; j < p; j++) means[j] /= n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        const diff = X[i][j] - means[j];
        stds[j] += diff * diff;
        X[i][j] = diff;
      }
    }
    for (let j = 0; j < p; j++) {
      stds[j] = Math.sqrt(stds[j] / n) || 1;
      for (let i = 0; i < n; i++) X[i][j] /= stds[j];
    }
    
    const meanY = target.reduce((a, b) => a + b, 0) / n;
    const y = target.map(t => t - meanY);
    
    // Ridge: β = (X'X + λI)^(-1) X'y
    // Construction de X'X + λI
    const XtX = [];
    for (let i = 0; i < p; i++) {
      XtX[i] = [];
      for (let j = 0; j < p; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) sum += X[k][i] * X[k][j];
        XtX[i][j] = sum + (i === j ? this.lambda * n : 0);
      }
    }
    
    // X'y
    const Xty = [];
    for (let i = 0; i < p; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += X[k][i] * y[k];
      Xty.push(sum);
    }
    
    // Résolution par élimination de Gauss-Jordan
    const augmented = XtX.map((row, i) => [...row, Xty[i]]);
    
    for (let col = 0; col < p; col++) {
      // Pivot
      let maxRow = col;
      for (let row = col + 1; row < p; row++) {
        if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) {
          maxRow = row;
        }
      }
      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];
      
      const pivot = augmented[col][col];
      if (Math.abs(pivot) < 1e-10) continue;
      
      for (let j = col; j <= p; j++) augmented[col][j] /= pivot;
      
      for (let row = 0; row < p; row++) {
        if (row !== col) {
          const factor = augmented[row][col];
          for (let j = col; j <= p; j++) augmented[row][j] -= factor * augmented[col][j];
        }
      }
    }
    
    const rawCoefs = augmented.map(row => row[p]);
    
    // Déstandardiser
    this.coefficients = [];
    for (let j = 0; j < p; j++) {
      this.coefficients[j] = rawCoefs[j] / stds[j];
    }
    this.intercept = meanY;
    for (let j = 0; j < p; j++) {
      this.intercept -= this.coefficients[j] * means[j];
    }
    
    // Calcul R²
    const predictions = features.map(row => {
      let pred = this.intercept;
      for (let j = 0; j < p; j++) {
        pred += this.coefficients[j] * (row[this.featureNames[j]] || 0);
      }
      return pred;
    });
    
    const ssRes = predictions.reduce((sum, pred, i) => sum + (target[i] - pred) ** 2, 0);
    const ssTot = target.reduce((sum, t) => sum + (t - meanY) ** 2, 0);
    this.r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    this.mse = ssRes / n;
    
    return this;
  }
  
  predict(row) {
    if (!this.coefficients) return 0;
    let pred = this.intercept;
    for (let j = 0; j < this.coefficients.length; j++) {
      pred += this.coefficients[j] * (row[this.featureNames[j]] || 0);
    }
    return pred;
  }
  
  getTopFeatures(n = 5) {
    const coefs = this.coefficients.map((c, i) => ({ name: this.featureNames[i], coef: c }));
    coefs.sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef));
    return coefs.slice(0, n);
  }
}

// === 3. FORÊT ALÉATOIRE SIMPLIFIÉE (Bagging) ===
class RandomForestSimplified {
  constructor(nTrees = 50, maxDepth = 5) {
    this.nTrees = nTrees;
    this.maxDepth = maxDepth;
    this.trees = [];
    this.featureNames = [];
  }
  
  fit(features, target) {
    this.featureNames = Object.keys(features[0]).filter(k => k !== 'date' && k !== 'price' && k !== 'return');
    const n = features.length;
    
    for (let t = 0; t < this.nTrees; t++) {
      const indices = [];
      for (let i = 0; i < n; i++) indices.push(Math.floor(Math.random() * n));
      
      const sample = indices.map(i => ({
        features: this.featureNames.map(f => features[i][f] || 0),
        target: target[i]
      }));
      
      this.trees.push(this.buildTree(sample, 0));
    }
    
    // Calcul R²
    const predictions = features.map(row => this.predict(row));
    const meanY = target.reduce((a, b) => a + b, 0) / target.length;
    const ssRes = predictions.reduce((sum, pred, i) => sum + (target[i] - pred) ** 2, 0);
    const ssTot = target.reduce((sum, t) => sum + (t - meanY) ** 2, 0);
    this.r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    
    return this;
  }
  
  buildTree(samples, depth) {
    if (depth >= this.maxDepth || samples.length < 5) {
      const mean = samples.reduce((s, x) => s + x.target, 0) / samples.length;
      return { type: 'leaf', value: mean, samples: samples.length };
    }
    
    // Choisir un sous-ensemble de features
    const nFeatures = this.featureNames.length;
    const subsetSize = Math.max(1, Math.floor(Math.sqrt(nFeatures)));
    const shuffled = [...Array(nFeatures).keys()].sort(() => Math.random() - 0.5);
    const subset = shuffled.slice(0, subsetSize);
    
    let bestGain = 0;
    let bestSplit = null;
    
    for (const fi of subset) {
      const values = samples.map(s => s.features[fi]).sort((a, b) => a - b);
      const uniqueValues = [...new Set(values)];
      
      for (const threshold of uniqueValues) {
        const left = samples.filter(s => s.features[fi] <= threshold);
        const right = samples.filter(s => s.features[fi] > threshold);
        
        if (left.length < 2 || right.length < 2) continue;
        
        const meanLeft = left.reduce((s, x) => s + x.target, 0) / left.length;
        const meanRight = right.reduce((s, x) => s + x.target, 0) / right.length;
        const meanTotal = samples.reduce((s, x) => s + x.target, 0) / samples.length;
        
        const ssLeft = left.reduce((s, x) => s + (x.target - meanLeft) ** 2, 0);
        const ssRight = right.reduce((s, x) => s + (x.target - meanRight) ** 2, 0);
        const ssTotal = samples.reduce((s, x) => s + (x.target - meanTotal) ** 2, 0);
        
        const gain = ssTotal - ssLeft - ssRight;
        
        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = { featureIndex: fi, threshold };
        }
      }
    }
    
    if (!bestSplit || bestGain < 1e-10) {
      const mean = samples.reduce((s, x) => s + x.target, 0) / samples.length;
      return { type: 'leaf', value: mean, samples: samples.length };
    }
    
    const left = samples.filter(s => s.features[bestSplit.featureIndex] <= bestSplit.threshold);
    const right = samples.filter(s => s.features[bestSplit.featureIndex] > bestSplit.threshold);
    
    return {
      type: 'node',
      featureIndex: bestSplit.featureIndex,
      threshold: bestSplit.threshold,
      left: this.buildTree(left, depth + 1),
      right: this.buildTree(right, depth + 1),
      samples: samples.length
    };
  }
  
  predictTree(tree, features) {
    if (tree.type === 'leaf') return tree.value;
    if (features[tree.featureIndex] <= tree.threshold) {
      return this.predictTree(tree.left, features);
    }
    return this.predictTree(tree.right, features);
  }
  
  predict(row) {
    const features = this.featureNames.map(f => row[f] || 0);
    let sum = 0;
    for (const tree of this.trees) sum += this.predictTree(tree, features);
    return sum / this.trees.length;
  }
}

// === 4. ENTRAÎNEMENT ET ÉVALUATION ===
function trainModels() {
  log('TRAIN', '╔══════════════════════════════════════════════════╗');
  log('TRAIN', '║   ENTRAÎNEMENT DES MODÈLES                       ║');
  log('TRAIN', `║   ${new Date().toISOString()}          ║`);
  log('TRAIN', '╚══════════════════════════════════════════════════╝');
  
  const results = {};
  
  for (const ticker of TICKERS) {
    log('TRAIN', '');
    log('TRAIN', `═══ ${ticker} ═══`);
    
    const data = buildFeatureMatrix(ticker);
    if (!data || data.length < 30) {
      log('TRAIN', `${ticker}: données insuffisantes, skip`);
      results[ticker] = { error: 'Données insuffisantes' };
      continue;
    }
    
    // Train/test split
    const splitIdx = Math.floor(data.length * 0.8);
    const trainData = data.slice(0, splitIdx);
    const testData = data.slice(splitIdx);
    
    const trainTarget = trainData.map(r => r.return);
    const testTarget = testData.map(r => r.return);
    
    // Modèle Ridge
    log('TRAIN', 'Entraînement Ridge Regression...');
    const ridge = new RidgeRegression(0.1);
    ridge.fit(trainData, trainTarget);
    
    // Prédictions test
    const ridgePreds = testData.map(row => ridge.predict(row));
    const ridgeMSE = ridgePreds.reduce((sum, p, i) => sum + (p - testTarget[i]) ** 2, 0) / testTarget.length;
    const ridgeMAE = ridgePreds.reduce((sum, p, i) => sum + Math.abs(p - testTarget[i]), 0) / testTarget.length;
    
    // Direction accuracy
    let ridgeDir = 0;
    for (let i = 0; i < testTarget.length; i++) {
      if ((ridgePreds[i] >= 0 && testTarget[i] >= 0) || (ridgePreds[i] < 0 && testTarget[i] < 0)) {
        ridgeDir++;
      }
    }
    const ridgeDirAcc = ridgeDir / testTarget.length;
    
    // Modèle Forêt Aléatoire
    log('TRAIN', 'Entraînement Random Forest...');
    const rf = new RandomForestSimplified(30, 4);
    rf.fit(trainData, trainTarget);
    
    const rfPreds = testData.map(row => rf.predict(row));
    const rfMSE = rfPreds.reduce((sum, p, i) => sum + (p - testTarget[i]) ** 2, 0) / testTarget.length;
    const rfMAE = rfPreds.reduce((sum, p, i) => sum + Math.abs(p - testTarget[i]), 0) / testTarget.length;
    
    let rfDir = 0;
    for (let i = 0; i < testTarget.length; i++) {
      if ((rfPreds[i] >= 0 && testTarget[i] >= 0) || (rfPreds[i] < 0 && testTarget[i] < 0)) {
        rfDir++;
      }
    }
    const rfDirAcc = rfDir / testTarget.length;
    
    // Features importantes (Ridge)
    const topFeatures = ridge.getTopFeatures(10);
    
    const modelResult = {
      ticker,
      trainSize: trainData.length,
      testSize: testData.length,
      lastPrice: data[data.length - 1].price,
      lastDate: data[data.length - 1].date,
      models: {
        ridge: {
          r2: ridge.r2,
          mse: ridgeMSE,
          mae: ridgeMAE,
          dirAcc: ridgeDirAcc,
          topFeatures
        },
        randomForest: {
          r2: rf.r2,
          mse: rfMSE,
          mae: rfMAE,
          dirAcc: rfDirAcc
        }
      },
      // Features les plus récentes pour la prédiction
      latestFeatures: data[data.length - 1]
    };
    
    results[ticker] = modelResult;
    
    log('TRAIN', `Ridge: R²=${(ridge.r2 * 100).toFixed(1)}%, DirAcc=${(ridgeDirAcc * 100).toFixed(1)}%`);
    log('TRAIN', `RF:    R²=${(rf.r2 * 100).toFixed(1)}%, DirAcc=${(rfDirAcc * 100).toFixed(1)}%`);
    log('TRAIN', `Top features: ${topFeatures.map(f => `${f.name}(${(f.coef * 100).toFixed(2)})`).join(', ')}`);
  }
  
  // Sauvegarde
  const outputFile = path.join(MODELS_DIR, 'model_trained.json');
  const output = {
    timestamp: new Date().toISOString(),
    results
  };
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');
  logSuccess('TRAIN', `Modèles sauvegardés: ${outputFile}`);
  
  // Sauvegarde version R-friendly (CSV)
  const csvRows = [];
  for (const [ticker, result] of Object.entries(results)) {
    if (result.error) continue;
    csvRows.push({
      ticker,
      model_type: 'Ridge',
      r2: result.models.ridge.r2,
      mse: result.models.ridge.mse,
      mae: result.models.ridge.mae,
      dir_accuracy: result.models.ridge.dirAcc,
      train_size: result.trainSize,
      test_size: result.testSize
    });
    csvRows.push({
      ticker,
      model_type: 'RandomForest',
      r2: result.models.randomForest.r2,
      mse: result.models.randomForest.mse,
      mae: result.models.randomForest.mae,
      dir_accuracy: result.models.randomForest.dirAcc,
      train_size: result.trainSize,
      test_size: result.testSize
    });
  }
  
  const csvFile = path.join(MODELS_DIR, 'model_performance.csv');
  if (csvRows.length > 0) {
    const headers = Object.keys(csvRows[0]);
    const header = headers.join(',');
    const lines = csvRows.map(row => headers.map(h => row[h]).join(','));
    fs.writeFileSync(csvFile, header + '\n' + lines.join('\n'), 'utf8');
    logSuccess('TRAIN', `Performance CSV: ${csvFile}`);
  }
  
  return results;
}

// Export
module.exports = { trainModels, buildFeatureMatrix, RidgeRegression, RandomForestSimplified };

// CLI
if (require.main === module) {
  trainModels();
}
