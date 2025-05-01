const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Stelle sicher, dass das Datenverzeichnis existiert
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Datenbank-Verbindung erstellen
const db = new sqlite3.Database(path.join(dbDir, 'website_analysis.db'));

// Promise-Wrapper für DB-Methoden
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  run,
  get,
  all,
  close: () => {
    return new Promise((resolve, reject) => {
      db.close(err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
};