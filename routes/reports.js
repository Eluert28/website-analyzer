// routes/reports.js
const express = require('express');
const router = express.Router();
const reportScheduler = require('../services/reportScheduler');
const reportScheduleModel = require('../models/reportSchedule');

// Middleware für einfache Authentifizierung (falls benötigt)
const checkAuth = (req, res, next) => {
  // In einer Produktionsumgebung würdest du hier eine richtige Authentifizierung implementieren
  // Für jetzt lassen wir jeden Zugriff zu
  next();
};

// Middleware anwenden, falls Authentifizierung benötigt wird
// router.use(checkAuth);

// Alle Zeitpläne abrufen
router.get('/schedules', async (req, res) => {
  try {
    // Alle Zeitpläne aus der Datenbank abrufen
    const schedules = await reportScheduleModel.getAllActiveSchedules();
    res.json({ success: true, schedules });
  } catch (error) {
    console.error('Fehler beim Abrufen der Zeitpläne:', error);
    res.status(500).json({ success: false, error: 'Interner Serverfehler' });
  }
});

// Einzelnen Zeitplan abrufen
router.get('/schedules/:id', async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);

    // Zeitplan aus der Datenbank abrufen
    const schedule = await reportScheduleModel.getScheduleById(scheduleId);

    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Zeitplan nicht gefunden' });
    }

    res.json({ success: true, schedule });
  } catch (error) {
    console.error(`Fehler beim Abrufen des Zeitplans ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Interner Serverfehler' });
  }
});

// Neuen Zeitplan erstellen
router.post('/schedules', async (req, res) => {
  try {
    const { websiteId, interval, recipients, reportType } = req.body;

    // Eingaben validieren
    if (!websiteId || !interval || !recipients || !reportType) {
      return res.status(400).json({
        success: false,
        error: 'Fehlende Eingaben: websiteId, interval, recipients und reportType sind erforderlich'
      });
    }

    // Zeitplan erstellen
    const scheduleId = await reportScheduler.createSchedule(
      websiteId,
      interval,
      recipients,
      reportType
    );

    res.status(201).json({
      success: true,
      message: 'Zeitplan erfolgreich erstellt',
      scheduleId
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Zeitplans:', error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Erstellen des Zeitplans: ${error.message}`
    });
  }
});

// Zeitplan aktualisieren
router.put('/schedules/:id', async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);
    const { interval, recipients, reportType, isActive } = req.body;

    // Eingaben validieren
    if (!interval && !recipients && reportType === undefined && isActive === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Mindestens ein zu aktualisierendes Feld ist erforderlich'
      });
    }

    // Prüfen, ob der Zeitplan existiert
    const existingSchedule = await reportScheduleModel.getScheduleById(scheduleId);

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        error: 'Zeitplan nicht gefunden'
      });
    }

    // Zeitplan aktualisieren
    await reportScheduler.updateSchedule(
      scheduleId,
      interval || existingSchedule.cron_expression,
      recipients || existingSchedule.recipients,
      reportType || existingSchedule.report_type,
      isActive !== undefined ? isActive : existingSchedule.is_active === 1
    );

    res.json({
      success: true,
      message: 'Zeitplan erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error(`Fehler beim Aktualisieren des Zeitplans ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Aktualisieren des Zeitplans: ${error.message}`
    });
  }
});

// Zeitplan löschen
router.delete('/schedules/:id', async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);

    // Prüfen, ob der Zeitplan existiert
    const existingSchedule = await reportScheduleModel.getScheduleById(scheduleId);

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        error: 'Zeitplan nicht gefunden'
      });
    }

    // Zeitplan löschen
    await reportScheduler.deleteSchedule(scheduleId);

    res.json({
      success: true,
      message: 'Zeitplan erfolgreich gelöscht'
    });
  } catch (error) {
    console.error(`Fehler beim Löschen des Zeitplans ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Löschen des Zeitplans: ${error.message}`
    });
  }
});

// Ausführungsverlauf für einen Zeitplan abrufen
router.get('/schedules/:id/history', async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 10;

    // Prüfen, ob der Zeitplan existiert
    const existingSchedule = await reportScheduleModel.getScheduleById(scheduleId);

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        error: 'Zeitplan nicht gefunden'
      });
    }

    // Ausführungsverlauf abrufen
    const history = await reportScheduleModel.getExecutionHistory(scheduleId, limit);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error(`Fehler beim Abrufen des Ausführungsverlaufs für Zeitplan ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler'
    });
  }
});

// Zeitplan manuell ausführen
router.post('/schedules/:id/execute', async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);

    // Prüfen, ob der Zeitplan existiert
    const existingSchedule = await reportScheduleModel.getScheduleById(scheduleId);

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        error: 'Zeitplan nicht gefunden'
      });
    }

    // Zeitplan ausführen
    await reportScheduler.executeSchedule(existingSchedule);

    res.json({
      success: true,
      message: 'Zeitplan wird ausgeführt'
    });
  } catch (error) {
    console.error(`Fehler beim manuellen Ausführen des Zeitplans ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: `Fehler beim Ausführen des Zeitplans: ${error.message}`
    });
  }
});

module.exports = router;