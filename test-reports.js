// Testdatei für die Report-Scheduler-Integration
// Speichere diese als test-reports.js

const express = require('express');
const path = require('path');
const fs = require('fs');

// Express-App erstellen
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Einfache Hauptroute
app.get('/', (req, res) => {
  res.send('Report-Scheduler Test-Server läuft!');
});

// Einfacher Test-Endpunkt
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API funktioniert!' });
});

// Starten des Servers
const server = app.listen(port, async () => {
  console.log(`Server läuft auf Port ${port}`);
  console.log(`Öffne http://localhost:${port} in deinem Browser`);

  // Initialisiere den Report-Scheduler
  try {
    // Stelle sicher, dass die notwendigen Verzeichnisse existieren
    ensureDirectoriesExist();

    const reportScheduler = require('./services/reportScheduler');
    await reportScheduler.initialize();
    console.log('Report-Scheduler erfolgreich initialisiert');
  } catch (error) {
    console.error('Fehler beim Initialisieren des Report-Schedulers:', error);
  }
});

// Hilfsfunktion zum Erstellen benötigter Verzeichnisse
function ensureDirectoriesExist() {
  const dirs = [
    path.join(__dirname, 'data'),
    path.join(__dirname, 'reports'),
    path.join(__dirname, 'services'),
    path.join(__dirname, 'models'),
    path.join(__dirname, 'routes'),
    path.join(__dirname, 'middleware')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Erstelle Verzeichnis: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('Server wird heruntergefahren...');
  server.close(() => {
    console.log('Server wurde beendet');
    process.exit(0);
  });
});