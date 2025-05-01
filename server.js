// server.js - Hauptdatei zum Starten des Servers

const express = require('express');
const path = require('path');
const app = require('./website-analyzer'); // Den Code aus dem Hauptartifakt importieren

// Download-Endpunkt für Berichte
app.get('/download', (req, res) => {
  try {
    const filePath = req.query.path;

    if (!filePath) {
      return res.status(400).send('Kein Dateipfad angegeben');
    }

    // Sicherheitsüberprüfung - nur Dateien aus dem Reports-Verzeichnis erlauben
    const reportDir = path.join(__dirname, 'reports');
    const requestedFile = path.resolve(filePath);

    if (!requestedFile.startsWith(reportDir)) {
      return res.status(403).send('Zugriff verweigert');
    }

    // Datei senden
    res.download(requestedFile, (err) => {
      if (err) {
        console.error('Fehler beim Herunterladen der Datei:', err);
        res.status(500).send('Ein Fehler ist beim Herunterladen der Datei aufgetreten');
      }
    });

  } catch (error) {
    console.error('Fehler beim Verarbeiten der Download-Anfrage:', error);
    res.status(500).send('Ein Fehler ist aufgetreten');
  }
});

// Starten des Servers
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
  console.log(`Öffne http://localhost:${port} in deinem Browser`);
});

// HINWEIS: Pakete und Konfiguration für die Produktion
//
// Hier ist eine Liste der benötigten Pakete für package.json:
//
// {
//   "name": "website-analyzer",
//   "version": "1.0.0",
//   "description": "Tool zur Analyse von Websites auf SEO, Performance, Inhalte, Sicherheit und mehr",
//   "main": "server.js",
//   "scripts": {
//     "start": "node server.js",
//     "dev": "nodemon server.js"
//   },
//   "dependencies": {
//     "axios": "^0.27.2",
//     "cheerio": "^1.0.0-rc.12",
//     "chrome-launcher": "^0.15.1",
//     "cors": "^2.8.5",
//     "express": "^4.18.1",
//     "html-validator": "^6.0.1",
//     "lighthouse": "^9.6.8",
//     "nodemailer": "^6.8.0",
//     "pdfkit": "^0.13.0",
//     "puppeteer": "^19.0.0"
//   },
//   "devDependencies": {
//     "nodemon": "^2.0.20"
//   },
//   "engines": {
//     "node": ">=14.0.0"
//   }
// }
//

// Installationsanleitung:
//
// Schritt 1: Projektordner erstellen
// mkdir website-analyzer
// cd website-analyzer
//
// Schritt 2: Projektdateien anlegen
// - Erstelle eine Datei website-analyzer.js mit dem Code aus dem Hauptartifakt
// - Erstelle eine Datei server.js mit dem Code aus diesem Artifact
// - Erstelle einen Ordner 'public'
// - Erstelle eine Datei 'public/index.html' mit dem HTML-Code aus dem Frontend-Artifact
//
// Schritt 3: NPM initialisieren und benötigte Pakete installieren
// npm init -y
// npm install express axios cheerio lighthouse html-validator cors nodemailer puppeteer pdfkit chrome-launcher
// npm install --save-dev nodemon
//
// Schritt 4: Konfiguration für E-Mail-Versand
// - Für Gmail: Aktiviere "Zugriff durch weniger sichere Apps" in deinen Google-Kontoeinstellungen oder
// - Besser: Erstelle einen App-Passwort in deinen Google-Kontoeinstellungen
// - Setze dann die Umgebungsvariablen:
//   export EMAIL_USER=deine-email@gmail.com
//   export EMAIL_PASS=dein-passwort-oder-app-passwort
//
// Schritt 5: Server starten
// npm start
//
// Die Website läuft dann unter http://localhost:3000
//

// Weitere Verbesserungen und Tipps:
//
// 1. Fehlerbehebung bei Chrome/Puppeteer auf Linux-Servern:
// Wenn du auf einem Linux-Server ohne GUI bist, könntest du folgende Fehler bekommen:
// - "Failed to launch Chrome"
// - ECONNREFUSED Fehler bei Lighthouse
//
// Lösung:
// sudo apt-get update
// sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget libgbm-dev
//
// Und dann im Code:
// const browser = await puppeteer.launch({
//   headless: true,
//   args: ['--no-sandbox', '--disable-setuid-sandbox']
// });
//
// 2. Leistungsoptimierung:
// - Implementiere Caching für Analyseberichte
// - Füge eine Queue-Lösung wie Bull hinzu, um mehrere Anfragen gleichzeitig zu verarbeiten
// - Verwende einen Worker-Prozess für die ressourcenintensiven Analysen
//
// 3. Sicherheit:
// - Füge eine Rate-Limiting-Middleware hinzu, um DoS-Angriffe zu verhindern
// - Implementiere CSRF-Schutz
// - Verwende Helmet.js für zusätzliche HTTP-Header-Sicherheit
//
// 4. Bericht-Verbesserungen:
// - Füge Diagramme und Visualisierungen zum PDF-Bericht hinzu
// - Speichere Berichte in einer Datenbank, um Verlaufsanalysen zu ermöglichen
// - Implementiere einen Vergleich mit Konkurrenz-Websites
//
// 5. Deployment:
// - Für die Produktion wird empfohlen, die Anwendung hinter einem Reverse-Proxy wie Nginx zu betreiben
// - Verwende PM2 oder ähnliche Tools für Prozess-Management und Auto-Restart
// - Setze Umgebungsvariablen für sensible Informationen wie E-Mail-Anmeldedaten
//
// Beispiel für eine einfache Nginx-Konfiguration:
// server {
//     listen 80;
//     server_name deine-domain.de;
//
//     location / {
//         proxy_pass http://localhost:3000;
//         proxy_http_version 1.1;
//         proxy_set_header Upgrade $http_upgrade;
//         proxy_set_header Connection 'upgrade';
//         proxy_set_header Host $host;
//         proxy_cache_bypass $http_upgrade;
//     }
// }