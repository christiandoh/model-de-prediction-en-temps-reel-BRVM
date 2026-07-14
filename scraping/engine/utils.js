const fs = require('fs');
const path = require('path');

// === PATHS ===
const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const BRVM_DIR = path.join(DATA_DIR, 'brvm');
const COMMODITIES_DIR = path.join(DATA_DIR, 'exogenous', 'commodities');
const MACRO_DIR = path.join(DATA_DIR, 'exogenous', 'macro');
const EVENTS_DIR = path.join(DATA_DIR, 'exogenous', 'events');
const MODELS_DIR = path.join(ROOT, 'models');
const LOGS_DIR = path.join(ROOT, 'scraping', 'logs');

// Ensure directories exist
[DATA_DIR, BRVM_DIR, COMMODITIES_DIR, MACRO_DIR, EVENTS_DIR, MODELS_DIR, LOGS_DIR].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// === LOGGING ===
function log(source, message, type = 'INFO') {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const line = `[${timestamp}] [${type}] [${source}] ${message}`;
  console.log(line);
  const logFile = path.join(LOGS_DIR, `engine_${new Date().toISOString().substring(0, 10)}.log`);
  fs.appendFileSync(logFile, line + '\n', 'utf8');
}

function logError(source, message) { log(source, message, 'ERROR'); }
function logWarn(source, message) { log(source, message, 'WARN'); }
function logSuccess(source, message) { log(source, message, 'SUCCESS'); }

// === CSV HELPERS ===
function toCSVRow(obj, columns) {
  return columns.map(col => {
    const val = obj[col];
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }).join(',');
}

function appendCSV(filePath, row, columns) {
  const exists = fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
  const header = columns.join(',');
  const dataLine = toCSVRow(row, columns);
  
  if (!exists) {
    fs.writeFileSync(filePath, header + '\n' + dataLine + '\n', 'utf8');
  } else {
    // Avoid duplicates by checking last line
    const content = fs.readFileSync(filePath, 'utf8').trim();
    const lines = content.split('\n');
    const lastLine = lines[lines.length - 1];
    // If last line matches the new data, skip
    if (lastLine !== dataLine) {
      fs.appendFileSync(filePath, dataLine + '\n', 'utf8');
    }
  }
}

function readCSV(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(current); current = ''; }
      else { current += ch; }
    }
    values.push(current);
    
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = values[i] ? values[i].trim() : ''; });
    return obj;
  });
}

// === HTTP CLIENT (Axios with retry) ===
const axios = require('axios');

const HTTP = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/json,*/*',
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
  }
});

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await HTTP.get(url, options);
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

async function postWithRetry(url, data, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await HTTP.post(url, data, options);
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

module.exports = {
  DATA_DIR, BRVM_DIR, COMMODITIES_DIR, MACRO_DIR, EVENTS_DIR, MODELS_DIR, LOGS_DIR,
  log, logError, logWarn, logSuccess,
  appendCSV, readCSV, toCSVRow,
  HTTP, fetchWithRetry, postWithRetry,
  sleep: (ms) => new Promise(r => setTimeout(r, ms))
};
