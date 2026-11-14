// Appends one JSON line per event to the audit log using async fs calls only.
// A logging failure is reported on the console but never thrown to the caller.
const fs = require('fs/promises');
const path = require('path');
const { auditLogPath } = require('../config/env');

const logFile = path.resolve(__dirname, '..', '..', auditLogPath);
let directoryReady = null;

function ensureDirectory() {
  if (!directoryReady) {
    directoryReady = fs.mkdir(path.dirname(logFile), { recursive: true }).catch((err) => {
      directoryReady = null; // try again next time
      throw err;
    });
  }
  return directoryReady;
}

async function audit(event, data = {}) {
  try {
    await ensureDirectory();
    const line = JSON.stringify({ timestamp: new Date().toISOString(), event, ...data });
    await fs.appendFile(logFile, `${line}\n`, 'utf8');
  } catch (err) {
    console.error(`[audit] could not write "${event}" event: ${err.message}`);
  }
}

module.exports = { audit };
