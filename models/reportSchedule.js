// models/reportSchedule.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Datenverzeichnis sicherstellen
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Datenbank-Verbindung erstellen
const db = new sqlite3.Database(path.join(dbDir, 'website_analysis.db'));

// Erstellt Tabellen, falls sie noch nicht existieren
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Zeitpläne-Tabelle
      db.run(`
        CREATE TABLE IF NOT EXISTS report_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          website_id INTEGER NOT NULL,
          cron_expression TEXT NOT NULL,
          recipients TEXT NOT NULL,
          report_type TEXT NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (website_id) REFERENCES websites (id)
        )
      `, (err) => {
        if (err) {
          console.error('Fehler beim Erstellen der report_schedules-Tabelle:', err);
          reject(err);
          return;
        }
      });

      // Ausführungs-Tabelle
      db.run(`
        CREATE TABLE IF NOT EXISTS report_executions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          schedule_id INTEGER NOT NULL,
          success INTEGER NOT NULL,
          error_message TEXT,
          execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (schedule_id) REFERENCES report_schedules (id)
        )
      `, (err) => {
        if (err) {
          console.error('Fehler beim Erstellen der report_executions-Tabelle:', err);
          reject(err);
          return;
        }

        resolve();
      });
    });
  });
}

// Hilfsfunktionen für Datenbankoperationen mit Promises
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

// Fügt einen neuen Zeitplan hinzu
async function createSchedule(websiteId, cronExpression, recipients, reportType) {
  try {
    const recipientsStr = Array.isArray(recipients) ? recipients.join(',') : recipients;
    const result = await run(
      `INSERT INTO report_schedules
       (website_id, cron_expression, recipients, report_type)
       VALUES (?, ?, ?, ?)`,
      [websiteId, cronExpression, recipientsStr, reportType]
    );

    return result.lastID;
  } catch (error) {
    console.error('Fehler beim Erstellen des Zeitplans:', error);
    throw error;
  }
}

// Holt einen Zeitplan nach ID
async function getScheduleById(id) {
  try {
    return await get(
      `SELECT * FROM report_schedules WHERE id = ?`,
      [id]
    );
  } catch (error) {
    console.error(`Fehler beim Abrufen des Zeitplans ${id}:`, error);
    throw error;
  }
}

// Holt alle aktiven Zeitpläne
async function getAllActiveSchedules() {
  try {
    return await all(
      `SELECT * FROM report_schedules WHERE is_active = 1`
    );
  } catch (error) {
    console.error('Fehler beim Abrufen der aktiven Zeitpläne:', error);
    throw error;
  }
}

// Aktualisiert einen Zeitplan
async function updateSchedule(id, cronExpression, recipients, reportType, isActive) {
  try {
    const recipientsStr = Array.isArray(recipients) ? recipients.join(',') : recipients;
    await run(
      `UPDATE report_schedules
       SET cron_expression = ?, recipients = ?, report_type = ?, is_active = ?
       WHERE id = ?`,
      [cronExpression, recipientsStr, reportType, isActive ? 1 : 0, id]
    );
    return true;
  } catch (error) {
    console.error(`Fehler beim Aktualisieren des Zeitplans ${id}:`, error);
    throw error;
  }
}

// Löscht einen Zeitplan
async function deleteSchedule(id) {
  try {
    await run(
      `DELETE FROM report_schedules WHERE id = ?`,
      [id]
    );
    return true;
  } catch (error) {
    console.error(`Fehler beim Löschen des Zeitplans ${id}:`, error);
    throw error;
  }
}

// Protokolliert eine Berichtsausführung
async function logExecution(scheduleId, success, errorMessage = null) {
  try {
    await run(
      `INSERT INTO report_executions
       (schedule_id, success, error_message)
       VALUES (?, ?, ?)`,
      [scheduleId, success ? 1 : 0, errorMessage]
    );
    return true;
  } catch (error) {
    console.error(`Fehler beim Protokollieren der Ausführung für Zeitplan ${scheduleId}:`, error);
    throw error;
  }
}

// Holt Ausführungsverlauf für einen Zeitplan
async function getExecutionHistory(scheduleId, limit = 10) {
  try {
    return await all(
      `SELECT * FROM report_executions
       WHERE schedule_id = ?
       ORDER BY execution_time DESC
       LIMIT ?`,
      [scheduleId, limit]
    );
  } catch (error) {
    console.error(`Fehler beim Abrufen des Ausführungsverlaufs für Zeitplan ${scheduleId}:`, error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  createSchedule,
  getScheduleById,
  getAllActiveSchedules,
  updateSchedule,
  deleteSchedule,
  logExecution,
  getExecutionHistory
};