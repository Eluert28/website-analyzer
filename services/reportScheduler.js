// services/reportScheduler.js
const cron = require('node-cron');
const reportScheduleModel = require('../models/reportSchedule');
const reportGenerator = require('./reportGenerator');
const emailSender = require('./emailSender');
const analyzer = require('../website-analyzer'); // Pfad zu deiner Analysefunktion anpassen

class ReportScheduler {
  constructor() {
    this.activeJobs = new Map();
  }

  // Initialisiert alle aktiven Zeitpläne aus der Datenbank
  async initialize() {
    try {
      // Stelle sicher, dass die Datenbanktabellen existieren
      await reportScheduleModel.initializeDatabase();

      // Hole alle aktiven Zeitpläne
      const activeSchedules = await reportScheduleModel.getAllActiveSchedules();

      // Starte Jobs für alle aktiven Zeitpläne
      for (const schedule of activeSchedules) {
        this.activateSchedule(schedule);
      }

      console.log(`${activeSchedules.length} Berichts-Zeitpläne aktiviert.`);
      return true;
    } catch (error) {
      console.error('Fehler beim Initialisieren der Berichts-Zeitpläne:', error);
      throw error;
    }
  }

  // Konvertiert benutzerfreundliches Intervall in cron-Syntax
  static intervalToCron(interval) {
    switch(interval) {
      case 'hourly': return '0 * * * *';        // Jede Stunde
      case 'daily': return '0 8 * * *';         // Jeden Tag um 8 Uhr
      case 'weekly': return '0 8 * * 1';        // Jeden Montag um 8 Uhr
      case 'biweekly': return '0 8 1,15 * *';   // Am 1. und 15. jeden Monats um 8 Uhr
      case 'monthly': return '0 8 1 * *';       // Am 1. jeden Monats um 8 Uhr
      default: return interval;                  // Falls direkter cron-Ausdruck übergeben wird
    }
  }

  // Erstellt einen neuen Zeitplan
  async createSchedule(websiteId, interval, recipients, reportType) {
    try {
      // Konvertiere Intervall zu Cron-Ausdruck
      const cronExpression = ReportScheduler.intervalToCron(interval);

      // Validiere Cron-Ausdruck
      if (!cron.validate(cronExpression)) {
        throw new Error(`Ungültiges Cron-Ausdrucksformat: ${cronExpression}`);
      }

      // In Datenbank speichern
      const scheduleId = await reportScheduleModel.createSchedule(
        websiteId,
        cronExpression,
        Array.isArray(recipients) ? recipients.join(',') : recipients,
        reportType
      );

      // Zeitplan-Objekt abrufen
      const schedule = await reportScheduleModel.getScheduleById(scheduleId);

      // Zeitplan aktivieren
      this.activateSchedule(schedule);

      return scheduleId;
    } catch (error) {
      console.error('Fehler beim Erstellen des Zeitplans:', error);
      throw error;
    }
  }

  // Aktiviert einen Zeitplan
  activateSchedule(schedule) {
    try {
      // Prüfe, ob der Cron-Ausdruck gültig ist
      if (!cron.validate(schedule.cron_expression)) {
        console.error(`Ungültiger Cron-Ausdruck für Zeitplan ${schedule.id}: ${schedule.cron_expression}`);
        return false;
      }

      // Falls bereits ein Job für diesen Zeitplan läuft, stoppe ihn
      if (this.activeJobs.has(schedule.id)) {
        this.activeJobs.get(schedule.id).stop();
      }

      // Erstelle neuen Job
      const job = cron.schedule(schedule.cron_expression, async () => {
        await this.executeSchedule(schedule);
      });

      // Job in der Map speichern
      this.activeJobs.set(schedule.id, job);

      console.log(`Zeitplan ${schedule.id} aktiviert: ${schedule.cron_expression}`);
      return true;
    } catch (error) {
      console.error(`Fehler beim Aktivieren des Zeitplans ${schedule.id}:`, error);
      return false;
    }
  }

  // Führt einen Zeitplan aus
  async executeSchedule(schedule) {
    console.log(`Führe Zeitplan ${schedule.id} für Website ${schedule.website_id} aus...`);

    try {
      // Website-Analyse durchführen
      // Hier müsste deine bestehende Analysefunktion verwendet werden
      const analysisResult = await analyzer.analyzeWebsite(schedule.website_id);

      // Report generieren
      const report = await reportGenerator.generate(
        analysisResult,
        schedule.website_id,
        schedule.report_type
      );

      // Report per E-Mail senden
      const recipients = schedule.recipients.split(',').map(r => r.trim());
      await emailSender.sendReport(report, recipients, schedule.report_type);

      // Erfolg protokollieren
      await reportScheduleModel.logExecution(schedule.id, true);

      console.log(`Zeitplan ${schedule.id} erfolgreich ausgeführt.`);
    } catch (error) {
      console.error(`Fehler bei der Ausführung des Zeitplans ${schedule.id}:`, error);

      // Fehler protokollieren
      await reportScheduleModel.logExecution(schedule.id, false, error.message);
    }
  }

  // Stoppt einen Zeitplan
  stopSchedule(scheduleId) {
    if (this.activeJobs.has(scheduleId)) {
      this.activeJobs.get(scheduleId).stop();
      this.activeJobs.delete(scheduleId);
      console.log(`Zeitplan ${scheduleId} gestoppt.`);
      return true;
    }

    return false;
  }

  // Aktualisiert einen Zeitplan
  async updateSchedule(id, interval, recipients, reportType, isActive) {
    try {
      // Konvertiere Intervall zu Cron-Ausdruck
      const cronExpression = interval.includes('*')
        ? interval // Falls bereits im Cron-Format
        : ReportScheduler.intervalToCron(interval);

      // Validiere Cron-Ausdruck
      if (!cron.validate(cronExpression)) {
        throw new Error(`Ungültiges Cron-Ausdrucksformat: ${cronExpression}`);
      }

      // In Datenbank aktualisieren
      await reportScheduleModel.updateSchedule(
        id,
        cronExpression,
        Array.isArray(recipients) ? recipients.join(',') : recipients,
        reportType,
        isActive
      );

      // Alten Job stoppen, falls vorhanden
      this.stopSchedule(id);

      // Wenn aktiv, neuen Job starten
      if (isActive) {
        const schedule = await reportScheduleModel.getScheduleById(id);
        this.activateSchedule(schedule);
      }

      return true;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Zeitplans ${id}:`, error);
      throw error;
    }
  }

  // Löscht einen Zeitplan
  async deleteSchedule(id) {
    try {
      // Stoppe den Job, falls er läuft
      this.stopSchedule(id);

      // Aus Datenbank löschen
      await reportScheduleModel.deleteSchedule(id);

      return true;
    } catch (error) {
      console.error(`Fehler beim Löschen des Zeitplans ${id}:`, error);
      throw error;
    }
  }
}

// Export als Singleton
module.exports = new ReportScheduler();