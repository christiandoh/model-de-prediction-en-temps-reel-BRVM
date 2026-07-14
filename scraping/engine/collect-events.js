// Gestion des événements exogènes
// Crée et met à jour la matrice des événements impactant les titres BRVM

const { EVENTS_DIR, log, logError, logSuccess, appendCSV, readCSV } = require('./utils');
const path = require('path');
const fs = require('fs');

// === DÉFINITION DES ÉVÉNEMENTS ===
const EVENTS_MASTER = [
  // Géopolitiques
  { id: 'WUKR', name: 'Guerre Ukraine-Russie', category: 'geopolitical', 
    start: '2022-02-24', end: null, severity: 4, tickers: 'ALL', ongoing: true },
  { id: 'GAZA', name: 'Conflit Gaza-Israël', category: 'geopolitical',
    start: '2023-10-07', end: null, severity: 3, tickers: 'ALL', ongoing: true },
  { id: 'REDSEA', name: 'Tensions Mer Rouge', category: 'geopolitical',
    start: '2024-01-01', end: null, severity: 3, tickers: 'ALL', ongoing: true },
  { id: 'ARABSP', name: 'Printemps arabe', category: 'geopolitical',
    start: '2011-01-01', end: '2011-12-31', severity: 2, tickers: 'ALL', ongoing: false },
  { id: 'SANCRU', name: 'Sanctions économiques Russie', category: 'geopolitical',
    start: '2022-03-08', end: null, severity: 3, tickers: 'SOGC', ongoing: true },
  
  // Sanitaires
  { id: 'COVID', name: 'Pandémie COVID-19', category: 'health',
    start: '2020-03-11', end: '2023-05-05', severity: 4, tickers: 'ALL', ongoing: false },
  { id: 'LOCKCI', name: 'Confinement Côte d\'Ivoire', category: 'health',
    start: '2020-03-16', end: '2020-05-15', severity: 3, tickers: 'ALL', ongoing: false },
  { id: 'EBOLA', name: 'Épidémie Ebola Afrique Ouest', category: 'health',
    start: '2014-03-01', end: '2016-06-01', severity: 3, tickers: 'ALL', ongoing: false },
  
  // Climatiques
  { id: 'DROU11', name: 'Sécheresse Côte d\'Ivoire 2011', category: 'climate',
    start: '2011-01-01', end: '2011-06-30', severity: 2, tickers: 'SOGC', ongoing: false },
  { id: 'FLOOD20', name: 'Inondations Côte d\'Ivoire 2020', category: 'climate',
    start: '2020-06-01', end: '2020-09-30', severity: 2, tickers: 'SOGC', ongoing: false },
  { id: 'ELNINO', name: 'El Niño (fort)', category: 'climate',
    start: '2015-01-01', end: '2016-12-31', severity: 3, tickers: 'SOGC', ongoing: false },
  { id: 'DROU12', name: 'Sécheresse Sahélienne', category: 'climate',
    start: '2012-01-01', end: '2012-12-31', severity: 2, tickers: 'SOGC', ongoing: false },
  
  // Politiques CI
  { id: 'ELEC10', name: 'Élection présidentielle CI 2010', category: 'political',
    start: '2010-10-31', end: '2010-11-28', severity: 2, tickers: 'ALL', ongoing: false },
  { id: 'CRISIS10', name: 'Crise post-électorale CI 2010-2011', category: 'political',
    start: '2010-11-28', end: '2011-04-11', severity: 4, tickers: 'ALL', ongoing: false },
  { id: 'ELEC15', name: 'Élection présidentielle CI 2015', category: 'political',
    start: '2015-10-25', end: '2015-10-25', severity: 1, tickers: 'ALL', ongoing: false },
  { id: 'ELEC20', name: 'Élection présidentielle CI 2020', category: 'political',
    start: '2020-10-31', end: '2020-11-30', severity: 3, tickers: 'ALL', ongoing: false },
  { id: 'BCEAOREF', name: 'Réforme monétaire BCEAO', category: 'political',
    start: '2019-12-21', end: '2020-01-15', severity: 2, tickers: 'SGBC', ongoing: false },
  
  // Économiques
  { id: 'EURODEBT', name: 'Crise dette zone euro', category: 'economic',
    start: '2011-01-01', end: '2012-12-31', severity: 3, tickers: 'SGBC', ongoing: false },
  { id: 'SVBCR', name: 'Crise bancaire SVB/Credit Suisse', category: 'economic',
    start: '2023-03-08', end: '2023-03-15', severity: 3, tickers: 'SGBC', ongoing: false },
  { id: 'GFC08', name: 'Crise financière globale 2008', category: 'economic',
    start: '2008-09-15', end: '2009-06-30', severity: 4, tickers: 'ALL', ongoing: false },
  { id: 'OILSHOCK20', name: 'Choc pétrole COVID-19', category: 'economic',
    start: '2020-01-01', end: '2020-12-31', severity: 3, tickers: 'ALL', ongoing: false },
  { id: 'NEGOIL', name: 'Pétrole négatif WTI', category: 'economic',
    start: '2020-04-20', end: '2020-04-20', severity: 3, tickers: 'ALL', ongoing: false },
];

// === GÉNÉRATION DE LA MATRICE QUOTIDIENNE ===
function generateDailyEventMatrix(events, fromDate = '2008-01-01', toDate = null) {
  toDate = toDate || new Date().toISOString().substring(0, 10);
  
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  log('EVENTS', `Génération matrice quotidienne: ${days} jours de ${fromDate} à ${toDate}`);
  
  const eventIds = events.map(e => e.id);
  const matrix = [];
  
  for (let d = 0; d < days; d++) {
    const currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + d);
    const dateStr = currentDate.toISOString().substring(0, 10);
    
    const row = { date: dateStr };
    
    for (const event of events) {
      const eventStart = new Date(event.start);
      const eventEnd = event.end ? new Date(event.end) : new Date();
      
      if (currentDate >= eventStart && currentDate <= eventEnd) {
        row[event.id] = event.severity / 4; // Normalisé 0-1
      } else {
        row[event.id] = 0;
      }
    }
    
    matrix.push(row);
    
    if (d % 500 === 0) process.stdout.write('.');
  }
  
  log('EVENTS', `\nMatrice générée: ${matrix.length} lignes`);
  return matrix;
}

// === SAUVEGARDE ===
function saveEvents() {
  // 1. Fichier maître des événements
  const masterFile = path.join(EVENTS_DIR, 'events_master.csv');
  
  for (const event of EVENTS_MASTER) {
    const record = {
      id: event.id,
      name: event.name,
      category: event.category,
      start_date: event.start,
      end_date: event.end || 'present',
      severity: event.severity,
      tickers_impacted: event.tickers,
      ongoing: event.ongoing ? 'yes' : 'no'
    };
    appendCSV(masterFile, record, Object.keys(record));
  }
  
  logSuccess('EVENTS', `Fichier maître: ${EVENTS_MASTER.length} événements`);
  
  // 2. Matrice quotidienne
  const matrix = generateDailyEventMatrix(EVENTS_MASTER);
  const matrixFile = path.join(EVENTS_DIR, 'events_daily_matrix.csv');
  
  if (matrix.length > 0) {
    const columns = ['date', ...EVENTS_MASTER.map(e => e.id)];
    const header = columns.join(',');
    const lines = matrix.map(row => columns.map(c => row[c] ?? 0).join(','));
    fs.writeFileSync(matrixFile, header + '\n' + lines.join('\n'), 'utf8');
    logSuccess('EVENTS', `Matrice quotidienne: ${matrix.length} jours x ${EVENTS_MASTER.length} événements`);
  }
  
  // 3. Fichiers par ticker
  for (const ticker of ['ORAC', 'SGBC', 'SLBC', 'SOGC']) {
    const tickerEvents = EVENTS_MASTER.filter(e => 
      e.tickers === 'ALL' || e.tickers.includes(ticker)
    );
    const tickerFile = path.join(EVENTS_DIR, `events_${ticker.toLowerCase()}.csv`);
    
    for (const event of tickerEvents) {
      appendCSV(tickerFile, {
        id: event.id, name: event.name, category: event.category,
        start: event.start, end: event.end || 'present', severity: event.severity
      }, ['id', 'name', 'category', 'start', 'end', 'severity']);
    }
    
    log('EVENTS', `${ticker}: ${tickerEvents.length} événements spécifiques`);
  }
}

// === AJOUTER UN ÉVÉNEMENT ===
function addEvent(id, name, category, start, end, severity, tickers) {
  EVENTS_MASTER.push({ id, name, category, start, end, severity, tickers, ongoing: !end });
  saveEvents();
  logSuccess('EVENTS', `Nouvel événement ajouté: ${name} (${id})`);
}

// === COLLECTEUR PRINCIPAL ===
function collectAllEvents() {
  log('EVENTS', '=== DÉBUT COLLECTE ÉVÉNEMENTS ===');
  saveEvents();
  logSuccess('EVENTS', 'Collecte événements terminée');
}

module.exports = { collectAllEvents, addEvent, EVENTS_MASTER, generateDailyEventMatrix };

if (require.main === module) {
  collectAllEvents();
}
