// Exporte toutes les données exogènes en fichiers Excel (.xlsx)
// Pour partager avec un collègue
// Usage: node export-excel.js

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const { COMMODITIES_DIR, MACRO_DIR, EVENTS_DIR, BRVM_DIR, readCSV, log, logSuccess, logError } = require('./scraping/engine/utils');

const EXPORT_DIR = path.join(__dirname, 'exports');

function csvToSheet(filePath, sheetName) {
  if (!fs.existsSync(filePath)) return null;
  const data = readCSV(filePath);
  if (data.length === 0) return null;
  
  const ws = XLSX.utils.json_to_sheet(data);
  // Ajuster la largeur des colonnes
  const cols = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 15) }));
  ws['!cols'] = cols;
  return { name: sheetName, data: ws };
}

async function exportAll() {
  log('EXCEL', 'Export des données exogènes en Excel...');
  
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

  // === 1. Workbook MATIÈRES PREMIÈRES ===
  const wbCommodities = XLSX.utils.book_new();
  const commFiles = fs.readdirSync(COMMODITIES_DIR).filter(f => f.endsWith('.csv'));
  
  for (const f of commFiles) {
    const sheet = csvToSheet(path.join(COMMODITIES_DIR, f), f.replace('.csv', ''));
    if (sheet) XLSX.utils.book_append_sheet(wbCommodities, sheet.data, sheet.name);
  }
  
  if (wbCommodities.SheetNames.length > 0) {
    XLSX.writeFile(wbCommodities, path.join(EXPORT_DIR, 'matieres_premieres.xlsx'));
    logSuccess('EXCEL', `matieres_premieres.xlsx (${wbCommodities.SheetNames.length} feuilles)`);
  }

  // === 2. Workbook MACRO-ÉCONOMIE ===
  const wbMacro = XLSX.utils.book_new();
  const macroFiles = fs.readdirSync(MACRO_DIR).filter(f => f.endsWith('.csv'));
  
  for (const f of macroFiles) {
    const sheet = csvToSheet(path.join(MACRO_DIR, f), f.replace('.csv', ''));
    if (sheet) XLSX.utils.book_append_sheet(wbMacro, sheet.data, sheet.name);
  }
  
  if (wbMacro.SheetNames.length > 0) {
    XLSX.writeFile(wbMacro, path.join(EXPORT_DIR, 'macro_economie.xlsx'));
    logSuccess('EXCEL', `macro_economie.xlsx (${wbMacro.SheetNames.length} feuilles)`);
  }

  // === 3. Workbook ÉVÉNEMENTS ===
  const wbEvents = XLSX.utils.book_new();
  const eventsFiles = fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith('.csv') || f.endsWith('.json'));
  
  for (const f of eventsFiles) {
    if (f.endsWith('.csv')) {
      const sheet = csvToSheet(path.join(EVENTS_DIR, f), f.replace('.csv', ''));
      if (sheet) XLSX.utils.book_append_sheet(wbEvents, sheet.data, sheet.name);
    } else if (f.endsWith('.json')) {
      try {
        const jsonData = JSON.parse(fs.readFileSync(path.join(EVENTS_DIR, f), 'utf8'));
        if (jsonData.articles) {
          const ws = XLSX.utils.json_to_sheet(jsonData.articles.map(a => ({
            title: a.title,
            date: a.pubDate,
            source: a.source
          })));
          ws['!cols'] = [{ wch: 60 }, { wch: 25 }, { wch: 15 }];
          XLSX.utils.book_append_sheet(wbEvents, ws, 'actualites');
          logSuccess('EXCEL', 'Feuille actualités ajoutée');
        }
      } catch(e) { /* skip */ }
    }
  }
  
  if (wbEvents.SheetNames.length > 0) {
    XLSX.writeFile(wbEvents, path.join(EXPORT_DIR, 'evenements.xlsx'));
    logSuccess('EXCEL', `evenements.xlsx (${wbEvents.SheetNames.length} feuilles)`);
  }

  // === 4. Workbook CONSOLIDÉ (tout en un) ===
  const wbAll = XLSX.utils.book_new();
  
  // Feuille synthèse
  const summary = [];
  
  // Ajouter les matières premières
  for (const f of commFiles) {
    const data = readCSV(path.join(COMMODITIES_DIR, f));
    if (data.length > 0) {
      const last = data[data.length - 1];
      summary.push({
        categorie: 'Matière première',
        indicateur: f.replace('.csv', '').toUpperCase(),
        valeur: last.price || last.value,
        unite: last.unit || '',
        date: last.date,
        source: last.source || 'Yahoo Finance'
      });
    }
  }
  
  // Ajouter les macro
  for (const f of macroFiles) {
    const data = readCSV(path.join(MACRO_DIR, f));
    if (data.length > 0) {
      const last = data[data.length - 1];
      summary.push({
        categorie: 'Macroéconomie',
        indicateur: f.replace('.csv', '').toUpperCase(),
        valeur: last.value || last.rate || '',
        unite: last.unit || '',
        date: last.date,
        source: last.source || 'BCEAO/World Bank'
      });
    }
  }
  
  // Ajouter les prix BRVM
  for (const t of ['ORAC', 'SGBC', 'SLBC', 'SOGC']) {
    const data = readCSV(path.join(BRVM_DIR, `${t}.csv`));
    if (data.length > 0) {
      const last = data[data.length - 1];
      summary.push({
        categorie: 'BRVM',
        indicateur: t,
        valeur: last.Close || last.close || last.price || '',
        unite: 'FCFA',
        date: last.Date || last.date,
        source: 'Sikafinance'
      });
    }
  }

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wbAll, wsSummary, 'Synthèse');

  // Feuille README
  const readmeData = [{
    info: 'Fichier généré le ' + new Date().toLocaleString('fr-FR'),
    projet: 'BRVM Prediction System',
    contact: 'christiandoh@github.com',
    description: 'Données exogènes pour prédiction BRVM - Orange CI, SGBC, Solibra, SOGB'
  }];
  const wsReadme = XLSX.utils.json_to_sheet(readmeData);
  XLSX.utils.book_append_sheet(wbAll, wsReadme, 'Info');

  XLSX.writeFile(wbAll, path.join(EXPORT_DIR, 'donnees_exogenes_consolidees.xlsx'));
  logSuccess('EXCEL', 'donnees_exogenes_consolidees.xlsx (tout-en-un avec synthèse)');

  logSuccess('EXCEL', '═══════════════════════════════════════');
  logSuccess('EXCEL', `Export terminé dans : ${EXPORT_DIR}`);
  logSuccess('EXCEL', 'Fichiers :');
  for (const f of fs.readdirSync(EXPORT_DIR)) {
    logSuccess('EXCEL', `  • ${f}`);
  }
  logSuccess('EXCEL', '═══════════════════════════════════════');
}

exportAll().catch(console.error);
