const db = require('../database');

/**
 * Zeigt die Seite zur Verwaltung der Berichts-Zeitpläne an
 */
exports.showReportSchedules = async (req, res) => {
  try {
    // Alle Websites aus der Datenbank abrufen
    const websites = await db.all('SELECT * FROM websites ORDER BY domain');

    // Render View mit Daten
    res.render('report-schedules', {
      title: 'Berichts-Zeitpläne',
      websites,
      user: req.user // Falls Authentifizierung verwendet wird
    });
  } catch (error) {
    console.error('Fehler beim Laden der Report-Schedules-Seite:', error);
    res.status(500).render('error', {
      title: 'Fehler',
      message: 'Die Seite konnte nicht geladen werden',
      error
    });
  }
};