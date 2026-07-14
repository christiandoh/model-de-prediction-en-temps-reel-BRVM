// BRVM Scraping Engine - Master Orchestrator
// Collecte toutes les données (endogènes + exogènes) et prédit en temps réel

const { log, logError, logSuccess } = require('./utils');
const { collectAllBRVM, collectIndices } = require('./collect-brvm');
const { collectAllCommodities, collectSpotPrices } = require('./collect-commodities');
const { collectAllMacro } = require('./collect-macro');
const { collectAllEvents } = require('./collect-events');

async function runFullPipeline() {
  const startTime = Date.now();
  
  log('MASTER', '╔══════════════════════════════════════════════════╗');
  log('MASTER', '║   BRVM SCRAPING ENGINE - PIPELINE COMPLET        ║');
  log('MASTER', `║   ${new Date().toISOString()}           ║`);
  log('MASTER', '╚══════════════════════════════════════════════════╝');
  
  const results = {};
  
  // === ÉTAPE 1: Données BRVM (endogènes) ===
  log('MASTER', '');
  log('MASTER', '═' .repeat(50));
  log('MASTER', 'ÉTAPE 1/4: Données BRVM (prix, volumes, indices)');
  log('MASTER', '═' .repeat(50));
  try {
    const brvmCount = await collectAllBRVM();
    results.brvm = brvmCount;
    logSuccess('MASTER', `BRVM: ${brvmCount} enregistrements`);
  } catch (err) {
    logError('MASTER', `BRVM: ${err.message}`);
    results.brvm = 0;
  }
  
  // === ÉTAPE 2: Matières premières ===
  log('MASTER', '');
  log('MASTER', '═' .repeat(50));
  log('MASTER', 'ÉTAPE 2/4: Matières premières');
  log('MASTER', '═' .repeat(50));
  try {
    await collectAllCommodities();
    await collectSpotPrices();
    results.commodities = 'OK';
  } catch (err) {
    logError('MASTER', `Commodities: ${err.message}`);
    results.commodities = 'FAIL';
  }
  
  // === ÉTAPE 3: Macroéconomie ===
  log('MASTER', '');
  log('MASTER', '═' .repeat(50));
  log('MASTER', 'ÉTAPE 3/4: Variables macroéconomiques');
  log('MASTER', '═' .repeat(50));
  try {
    await collectAllMacro();
    results.macro = 'OK';
  } catch (err) {
    logError('MASTER', `Macro: ${err.message}`);
    results.macro = 'FAIL';
  }
  
  // === ÉTAPE 4: Événements ===
  log('MASTER', '');
  log('MASTER', '═' .repeat(50));
  log('MASTER', 'ÉTAPE 4/4: Événements exogènes');
  log('MASTER', '═' .repeat(50));
  try {
    collectAllEvents();
    results.events = 'OK';
  } catch (err) {
    logError('MASTER', `Events: ${err.message}`);
    results.events = 'FAIL';
  }
  
  // === RAPPORT FINAL ===
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  log('MASTER', '');
  log('MASTER', '╔══════════════════════════════════════════════════╗');
  log('MASTER', '║   RAPPORT FINAL                                  ║');
  log('MASTER', '╚══════════════════════════════════════════════════╝');
  log('MASTER', JSON.stringify(results, null, 2));
  logSuccess('MASTER', `Pipeline terminé en ${elapsed}s`);
  
  return results;
}

// Mode rapide (seulement les nouvelles données)
async function runQuickUpdate() {
  log('MASTER', '=== MISE À JOUR RAPIDE ===');
  
  try {
    const brvmCount = await collectAllBRVM();
    logSuccess('MASTER', `BRVM mis à jour: ${brvmCount} nouveaux enregistrements`);
  } catch (err) {
    logError('MASTER', `Quick update: ${err.message}`);
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    runQuickUpdate().then(() => process.exit(0));
  } else if (args.includes('--brvm-only')) {
    collectAllBRVM().then(() => process.exit(0));
  } else if (args.includes('--commodities-only')) {
    collectAllCommodities().then(() => process.exit(0));
  } else if (args.includes('--macro-only')) {
    collectAllMacro().then(() => process.exit(0));
  } else if (args.includes('--events-only')) {
    collectAllEvents();
    process.exit(0);
  } else {
    runFullPipeline().then(() => process.exit(0));
  }
}

module.exports = { runFullPipeline, runQuickUpdate };
