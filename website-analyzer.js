// Website-Analyse-Tool
// Ein Tool zum Analysieren von Webseiten auf SEO, Performance, Inhalte, Sicherheit und mehr

// Benötigte Pakete installieren mit:
// npm init -y
// npm install express axios cheerio lighthouse html-validator cors nodemailer puppeteer pdfkit

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const htmlValidator = require('html-validator');
const cors = require('cors');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Hauptroute - Frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API-Endpunkt zum Analysieren einer Website
app.post('/analyze', async (req, res) => {
  try {
    const { url, email } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL ist erforderlich' });
    }

    console.log(`Analysiere Website: ${url}`);

    // Alle Analysen parallel durchführen
    const results = await Promise.all([
      analyzeSEO(url),
      analyzePerformance(url),
      analyzeContent(url),
      analyzeSecurity(url),
      analyzeQuality(url),
      collectStatistics(url)
    ]);

    // Ergebnisse zusammenfassen
    const report = {
      url,
      timestamp: new Date().toISOString(),
      seo: results[0],
      performance: results[1],
      content: results[2],
      security: results[3],
      quality: results[4],
      statistics: results[5]
    };

    // PDF-Bericht erstellen
    const pdfPath = await generatePDF(report);

    // Per E-Mail senden, wenn eine E-Mail-Adresse angegeben wurde
    if (email) {
      await sendReportByEmail(email, pdfPath, url);
      console.log(`Bericht an ${email} gesendet`);
    }

    res.json({
      success: true,
      message: 'Analyse abgeschlossen',
      reportPath: pdfPath,
      report
    });

  } catch (error) {
    console.error('Fehler bei der Analyse:', error);
    res.status(500).json({
      success: false,
      error: 'Ein Fehler ist bei der Analyse aufgetreten',
      details: error.message
    });
  }
});

// SEO-Analyse
async function analyzeSEO(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Meta-Tags extrahieren
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    const keywords = $('meta[name="keywords"]').attr('content') || '';

    // H1-H6 Tags zählen
    const headings = {
      h1: $('h1').length,
      h2: $('h2').length,
      h3: $('h3').length,
      h4: $('h4').length,
      h5: $('h5').length,
      h6: $('h6').length
    };

    // Alt-Attribute für Bilder prüfen
    const images = $('img').length;
    const imagesWithAlt = $('img[alt]').length;

    // Links analysieren
    const internalLinks = $('a[href^="/"], a[href^="' + url + '"]').length;
    const externalLinks = $('a[href^="http"]').not($('a[href^="' + url + '"]')).length;

    return {
      meta: {
        title,
        titleLength: title.length,
        description,
        descriptionLength: description.length,
        keywords
      },
      headings,
      images: {
        total: images,
        withAlt: imagesWithAlt,
        withoutAlt: images - imagesWithAlt,
        altPercentage: images > 0 ? Math.round((imagesWithAlt / images) * 100) : 0
      },
      links: {
        internal: internalLinks,
        external: externalLinks,
        total: internalLinks + externalLinks
      }
    };
  } catch (error) {
    console.error('Fehler bei SEO-Analyse:', error);
    return { error: 'SEO-Analyse fehlgeschlagen', details: error.message };
  }
}

// Performance-Analyse mit Lighthouse
async function analyzePerformance(url) {
  try {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = {
      logLevel: 'info',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
    };

    const runnerResult = await lighthouse(url, options);
    await chrome.kill();

    const { performance, accessibility, 'best-practices': bestPractices, seo } = runnerResult.lhr.categories;

    return {
      scores: {
        performance: Math.round(performance.score * 100),
        accessibility: Math.round(accessibility.score * 100),
        bestPractices: Math.round(bestPractices.score * 100),
        seo: Math.round(seo.score * 100)
      },
      metrics: {
        firstContentfulPaint: runnerResult.lhr.audits['first-contentful-paint'].displayValue,
        speedIndex: runnerResult.lhr.audits['speed-index'].displayValue,
        largestContentfulPaint: runnerResult.lhr.audits['largest-contentful-paint'].displayValue,
        timeToInteractive: runnerResult.lhr.audits['interactive'].displayValue,
        totalBlockingTime: runnerResult.lhr.audits['total-blocking-time'].displayValue,
        cumulativeLayoutShift: runnerResult.lhr.audits['cumulative-layout-shift'].displayValue
      }
    };
  } catch (error) {
    console.error('Fehler bei Performance-Analyse:', error);
    return { error: 'Performance-Analyse fehlgeschlagen', details: error.message };
  }
}

// Inhaltsanalyse
async function analyzeContent(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Text extrahieren und analysieren
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(/\s+/).length;

    // Bilder und Videos zählen
    const imageCount = $('img').length;
    const videoCount = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;

    // Strukturanalyse
    const paragraphCount = $('p').length;
    const listCount = $('ul, ol').length;
    const tableCount = $('table').length;

    return {
      textStats: {
        wordCount,
        characterCount: bodyText.length,
        averageWordLength: wordCount > 0 ? Math.round((bodyText.length / wordCount) * 10) / 10 : 0,
        paragraphCount
      },
      media: {
        images: imageCount,
        videos: videoCount
      },
      structure: {
        paragraphs: paragraphCount,
        lists: listCount,
        tables: tableCount
      }
    };
  } catch (error) {
    console.error('Fehler bei Inhaltsanalyse:', error);
    return { error: 'Inhaltsanalyse fehlgeschlagen', details: error.message };
  }
}

// Sicherheitsanalyse
async function analyzeSecurity(url) {
  try {
    // HTTP-Header prüfen
    const response = await axios.get(url, { validateStatus: () => true });
    const headers = response.headers;

    // HTTPS-Prüfung
    const isHttps = url.startsWith('https://');

    // Sicherheitsheader prüfen
    const securityHeaders = {
      'Strict-Transport-Security': headers['strict-transport-security'] || null,
      'Content-Security-Policy': headers['content-security-policy'] || null,
      'X-XSS-Protection': headers['x-xss-protection'] || null,
      'X-Frame-Options': headers['x-frame-options'] || null,
      'X-Content-Type-Options': headers['x-content-type-options'] || null,
      'Referrer-Policy': headers['referrer-policy'] || null,
      'Feature-Policy': headers['feature-policy'] || headers['permissions-policy'] || null
    };

    // Cookies analysieren
    const cookies = response.headers['set-cookie'] || [];
    const secureCookies = cookies.filter(cookie => cookie.includes('Secure')).length;
    const httpOnlyCookies = cookies.filter(cookie => cookie.includes('HttpOnly')).length;
    const sameSiteCookies = cookies.filter(cookie => cookie.includes('SameSite')).length;

    return {
      https: {
        enabled: isHttps,
        score: isHttps ? 'Gut' : 'Schlecht'
      },
      securityHeaders: {
        headers: securityHeaders,
        implemented: Object.values(securityHeaders).filter(h => h !== null).length,
        missing: Object.values(securityHeaders).filter(h => h === null).length,
        score: Math.round((Object.values(securityHeaders).filter(h => h !== null).length / Object.keys(securityHeaders).length) * 100)
      },
      cookies: {
        total: cookies.length,
        secure: secureCookies,
        httpOnly: httpOnlyCookies,
        sameSite: sameSiteCookies,
        score: cookies.length > 0 ?
          Math.round(((secureCookies + httpOnlyCookies + sameSiteCookies) / (cookies.length * 3)) * 100) : 100
      }
    };
  } catch (error) {
    console.error('Fehler bei Sicherheitsanalyse:', error);
    return { error: 'Sicherheitsanalyse fehlgeschlagen', details: error.message };
  }
}

// Qualitätsanalyse
async function analyzeQuality(url) {
  try {
    const { data } = await axios.get(url);

    // HTML-Validierung
    const validationResult = await htmlValidator({
      data,
      format: 'json'
    });

    const errors = validationResult.messages.filter(msg => msg.type === 'error').length;
    const warnings = validationResult.messages.filter(msg => msg.type === 'info' || msg.type === 'warning').length;

    // Responsive Design prüfen mit Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Prüfen, ob Viewport-Meta-Tag vorhanden ist
    const hasViewportMeta = await page.evaluate(() => {
      return document.querySelector('meta[name="viewport"]') !== null;
    });

    // Prüfen, ob Media Queries verwendet werden
    const hasMediaQueries = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      let mediaQueriesCount = 0;

      styleSheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule.type === CSSRule.MEDIA_RULE) {
              mediaQueriesCount++;
            }
          });
        } catch (e) {
          // CORS-Fehler bei externen Stylesheets ignorieren
        }
      });

      return mediaQueriesCount;
    });

    await browser.close();

    return {
      htmlValidation: {
        errors,
        warnings,
        score: errors === 0 ? 'Ausgezeichnet' : errors <= 5 ? 'Gut' : errors <= 15 ? 'Mittelmäßig' : 'Schlecht'
      },
      responsiveDesign: {
        viewportMeta: hasViewportMeta,
        mediaQueries: hasMediaQueries > 0,
        score: hasViewportMeta && hasMediaQueries > 0 ? 'Gut' : hasViewportMeta || hasMediaQueries > 0 ? 'Mittelmäßig' : 'Schlecht'
      }
    };
  } catch (error) {
    console.error('Fehler bei Qualitätsanalyse:', error);
    return { error: 'Qualitätsanalyse fehlgeschlagen', details: error.message };
  }
}

// Statistiken sammeln
async function collectStatistics(url) {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Ressourcen erfassen
    const resources = [];
    page.on('response', async (response) => {
      const request = response.request();
      resources.push({
        url: request.url(),
        type: request.resourceType(),
        size: response.headers()['content-length'] || 0,
        status: response.status()
      });
    });

    await page.goto(url, { waitUntil: 'networkidle2' });

    // Seitengröße berechnen
    const totalSize = resources.reduce((sum, resource) => sum + parseInt(resource.size || 0), 0);

    // Ressourcen nach Typ gruppieren
    const resourceTypes = {};
    resources.forEach(resource => {
      if (!resourceTypes[resource.type]) {
        resourceTypes[resource.type] = { count: 0, size: 0 };
      }
      resourceTypes[resource.type].count++;
      resourceTypes[resource.type].size += parseInt(resource.size || 0);
    });

    // Ladezeit messen
    const loadingTime = await page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });

    // DOM-Größe ermitteln
    const domSize = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });

    await browser.close();

    return {
      pageSize: {
        total: formatBytes(totalSize),
        totalRaw: totalSize
      },
      resources: {
        total: resources.length,
        byType: resourceTypes
      },
      performance: {
        loadingTime: `${loadingTime} ms`
      },
      dom: {
        elements: domSize
      }
    };
  } catch (error) {
    console.error('Fehler bei Statistiksammlung:', error);
    return { error: 'Statistiksammlung fehlgeschlagen', details: error.message };
  }
}

// PDF-Bericht generieren
// Hilfsfunktion zum Formatieren von Bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function generatePDF(report) {
  return new Promise((resolve, reject) => {
    try {
      const reportDir = path.join(__dirname, 'reports');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      const filename = `website-report-${new Date().getTime()}.pdf`;
      const filePath = path.join(reportDir, filename);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Titelseite
      doc.fontSize(25).text('Website-Analysebericht', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text(`URL: ${report.url}`, { align: 'center' });
      doc.fontSize(12).text(`Erstellt am: ${new Date(report.timestamp).toLocaleString('de-DE')}`, { align: 'center' });
      doc.moveDown(2);

      // Inhaltsverzeichnis
      doc.fontSize(16).text('Inhaltsverzeichnis', { underline: true });
      doc.fontSize(12);
      doc.text('1. Zusammenfassung');
      doc.text('2. SEO-Analyse');
      doc.text('3. Performance-Analyse');
      doc.text('4. Inhaltsanalyse');
      doc.text('5. Sicherheitsanalyse');
      doc.text('6. Qualitätsanalyse');
      doc.text('7. Website-Statistiken');
      doc.addPage();

      // Zusammenfassung
      doc.fontSize(18).text('1. Zusammenfassung', { underline: true });
      doc.moveDown();

      const performanceScore = report.performance?.scores?.performance || 'N/A';
      const seoScore = report.performance?.scores?.seo || 'N/A';
      const accessibilityScore = report.performance?.scores?.accessibility || 'N/A';
      const securityScore = report.security?.securityHeaders?.score || 'N/A';

      doc.fontSize(12).text('Gesamtbewertung:');
      doc.list([
        `Performance: ${performanceScore}/100`,
        `SEO: ${seoScore}/100`,
        `Zugänglichkeit: ${accessibilityScore}/100`,
        `Sicherheit: ${securityScore}/100`
      ]);

      doc.moveDown();
      doc.text('Wichtigste Erkenntnisse:');

      const insights = [];

      // Performance-Insights
      if (performanceScore < 50) {
        insights.push('Die Website hat erhebliche Performance-Probleme, die behoben werden sollten.');
      } else if (performanceScore < 80) {
        insights.push('Die Website-Performance könnte verbessert werden.');
      } else if (performanceScore >= 80) {
        insights.push('Die Website hat eine gute Performance.');
      }

      // SEO-Insights
      if (report.seo?.meta) {
        const { title, description } = report.seo.meta;
        if (!title || title.length < 10) {
          insights.push('Der Seitentitel fehlt oder ist zu kurz für SEO.');
        }
        if (!description || description.length < 50) {
          insights.push('Die Meta-Beschreibung fehlt oder ist zu kurz für SEO.');
        }
        if (report.seo.images.withoutAlt > 0) {
          insights.push(`${report.seo.images.withoutAlt} Bilder haben keine Alt-Attribute.`);
        }
      }

      // Sicherheits-Insights
      if (!report.security?.https?.enabled) {
        insights.push('Die Website verwendet kein HTTPS, was ein Sicherheitsrisiko darstellt.');
      }
      if (report.security?.securityHeaders?.missing > 3) {
        insights.push('Mehrere wichtige Sicherheits-Header fehlen.');
      }

      doc.list(insights.length > 0 ? insights : ['Keine kritischen Probleme gefunden.']);

      doc.addPage();

      // SEO-Analyse
      doc.fontSize(18).text('2. SEO-Analyse', { underline: true });
      doc.moveDown();

      if (report.seo?.error) {
        doc.fontSize(12).text(`Fehler: ${report.seo.error}`);
      } else if (report.seo) {
        doc.fontSize(14).text('Meta-Informationen:');
        doc.fontSize(12).text(`Titel: ${report.seo.meta.title}`);
        doc.text(`Titellänge: ${report.seo.meta.titleLength} Zeichen ${report.seo.meta.titleLength < 30 || report.seo.meta.titleLength > 60 ? '(nicht optimal)' : '(gut)'}`);
        doc.text(`Beschreibung: ${report.seo.meta.description}`);
        doc.text(`Beschreibungslänge: ${report.seo.meta.descriptionLength} Zeichen ${report.seo.meta.descriptionLength < 50 || report.seo.meta.descriptionLength > 160 ? '(nicht optimal)' : '(gut)'}`);

        doc.moveDown();
        doc.fontSize(14).text('Überschriften:');
        doc.fontSize(12).list([
          `H1: ${report.seo.headings.h1} ${report.seo.headings.h1 !== 1 ? '(nicht optimal)' : '(gut)'}`,
          `H2: ${report.seo.headings.h2}`,
          `H3: ${report.seo.headings.h3}`,
          `H4: ${report.seo.headings.h4}`,
          `H5: ${report.seo.headings.h5}`,
          `H6: ${report.seo.headings.h6}`
        ]);

        doc.moveDown();
        doc.fontSize(14).text('Bilder:');
        doc.fontSize(12).list([
          `Gesamtzahl: ${report.seo.images.total}`,
          `Mit Alt-Text: ${report.seo.images.withAlt}`,
          `Ohne Alt-Text: ${report.seo.images.withoutAlt}`,
          `Alt-Text-Abdeckung: ${report.seo.images.altPercentage}%`
        ]);

        doc.moveDown();
        doc.fontSize(14).text('Links:');
        doc.fontSize(12).list([
          `Interne Links: ${report.seo.links.internal}`,
          `Externe Links: ${report.seo.links.external}`,
          `Gesamtzahl: ${report.seo.links.total}`
        ]);
      }

      doc.addPage();

      // Performance-Analyse
      doc.fontSize(18).text('3. Performance-Analyse', { underline: true });
      doc.moveDown();

      if (report.performance?.error) {
        doc.fontSize(12).text(`Fehler: ${report.performance.error}`);
      } else if (report.performance) {
        doc.fontSize(14).text('Lighthouse-Scores:');
        doc.fontSize(12).list([
          `Performance: ${report.performance.scores.performance}/100`,
          `Zugänglichkeit: ${report.performance.scores.accessibility}/100`,
          `Best Practices: ${report.performance.scores.bestPractices}/100`,
          `SEO: ${report.performance.scores.seo}/100`
        ]);

        doc.moveDown();
        doc.fontSize(14).text('Wichtige Metriken:');
        doc.fontSize(12).list([
          `First Contentful Paint: ${report.performance.metrics.firstContentfulPaint}`,
          `Speed Index: ${report.performance.metrics.speedIndex}`,
          `Largest Contentful Paint: ${report.performance.metrics.largestContentfulPaint}`,
          `Time to Interactive: ${report.performance.metrics.timeToInteractive}`,
          `Total Blocking Time: ${report.performance.metrics.totalBlockingTime}`,
          `Cumulative Layout Shift: ${report.performance.metrics.cumulativeLayoutShift}`
        ]);
      }

      doc.addPage();

      // Inhaltsanalyse
      doc.fontSize(18).text('4. Inhaltsanalyse', { underline: true });
      doc.moveDown();

      if (report.content?.error) {
        doc.fontSize(12).text(`Fehler: ${report.content.error}`);
      } else if (report.content) {
        doc.fontSize(14).text('Textstatistiken:');
        doc.fontSize(12).list([
          `Wortanzahl: ${report.content.textStats.wordCount}`,
          `Zeichenanzahl: ${report.content.textStats.characterCount}`,
          `Durchschnittliche Wortlänge: ${report.content.textStats.averageWordLength} Zeichen`,
          `Absätze: ${report.content.textStats.paragraphCount}`
        ]);

        doc.moveDown();
        doc.fontSize(14).text('Medien:');
        doc.fontSize(12).list([
          `Bilder: ${report.content.media.images}`,
          `Videos: ${report.content.media.videos}`
        ]);

        doc.moveDown();
        doc.fontSize(14).text('Seitenstruktur:');
        doc.fontSize(12).list([
          `Absätze: ${report.content.structure.paragraphs}`,
          `Listen: ${report.content.structure.lists}`,
          `Tabellen: ${report.content.structure.tables}`
        ]);
      }

      doc.addPage();

      // Sicherheitsanalyse
      doc.fontSize(18).text('5. Sicherheitsanalyse', { underline: true });
      doc.moveDown();

      if (report.security?.error) {
        doc.fontSize(12).text(`Fehler: ${report.security.error}`);
      } else if (report.security) {
        doc.fontSize(14).text('HTTPS:');
        doc.fontSize(12).list([
          `Aktiviert: ${report.security.https.enabled ? 'Ja' : 'Nein'}`,
          `Bewertung: ${report.security.https.score}`
        ]);

        doc.moveDown();
        doc.fontSize(14).text('Sicherheits-Header:');
        doc.fontSize(12).text(`Implementiert: ${report.security.securityHeaders.implemented} von ${report.security.securityHeaders.implemented + report.security.securityHeaders.missing}`);
        doc.text(`Score: ${report.security.securityHeaders.score}%`);

        doc.moveDown();
        doc.text('Header-Details:');
        for (const [header, value] of Object.entries(report.security.securityHeaders.headers)) {
          doc.text(`${header}: ${value || 'Nicht implementiert'}`);
        }

        doc.moveDown();
        doc.fontSize(14).text('Cookies:');
        doc.fontSize(12).list([
          `Insgesamt: ${report.security.cookies.total}`,
          `Secure-Flag: ${report.security.cookies.secure}`,
          `HttpOnly-Flag: ${report.security.cookies.httpOnly}`,
          `SameSite-Flag: ${report.security.cookies.sameSite}`,
          `Sicherheitsbewertung: ${report.security.cookies.score}%`
        ]);
      }

      doc.addPage();

      // Qualitätsanalyse
      doc.fontSize(18).text('6. Qualitätsanalyse', { underline: true });
      doc.moveDown();

      if (report.quality?.error) {
        doc.fontSize(12).text(`Fehler: ${report.quality.error}`);
      } else if (report.quality) {
        doc.fontSize(14).text('HTML-Validierung:');
        doc.fontSize(12).list([
          `Fehler: ${report.quality.htmlValidation.errors}`,
          `Warnungen: ${report.quality.htmlValidation.warnings}`,
          `Bewertung: ${report.quality.htmlValidation.score}`
        ]);

        doc.moveDown();
        doc.fontSize(14).text('Responsive Design:');
        doc.fontSize(12).list([
          `Viewport-Meta-Tag: ${report.quality.responsiveDesign.viewportMeta ? 'Vorhanden' : 'Fehlt'}`,
          `Media Queries: ${report.quality.responsiveDesign.mediaQueries ? 'Vorhanden' : 'Fehlt'}`,
          `Bewertung: ${report.quality.responsiveDesign.score}`
        ]);
      }

      doc.addPage();

      // Website-Statistiken
      doc.fontSize(18).text('7. Website-Statistiken', { underline: true });
      doc.moveDown();

      if (report.statistics?.error) {
        doc.fontSize(12).text(`Fehler: ${report.statistics.error}`);
      } else if (report.statistics) {
        doc.fontSize(14).text('Seitengröße:');
        doc.fontSize(12).text(`Gesamt: ${report.statistics.pageSize.total}`);

        doc.moveDown();
        doc.fontSize(14).text('Ressourcen:');
        doc.fontSize(12).text(`Gesamtzahl: ${report.statistics.resources.total}`);

        doc.moveDown();
        doc.text('Nach Ressourcentyp:');
        for (const [type, data] of Object.entries(report.statistics.resources.byType)) {
          doc.text(`${type}: ${data.count} (${formatBytes(data.size)})`);
        }

        doc.moveDown();
        doc.fontSize(14).text('Leistung:');
        doc.fontSize(12).text(`Ladezeit: ${report.statistics.performance.loadingTime}`);

        doc.moveDown();
        doc.fontSize(14).text('DOM:');
        doc.fontSize(12).text(`Anzahl der Elemente: ${report.statistics.dom.elements}`);
      }

      // Abschluss
      doc.addPage();
      doc.fontSize(18).text('Empfehlungen', { underline: true });
      doc.moveDown();

      const recommendations = [];

      // SEO-Empfehlungen
      if (report.seo && !report.seo.error) {
        if (report.seo.meta.titleLength < 30 || report.seo.meta.titleLength > 60) {
          recommendations.push('Optimieren Sie den Seitentitel auf 30-60 Zeichen für bessere SEO-Ergebnisse.');
        }
        if (report.seo.meta.descriptionLength < 50 || report.seo.meta.descriptionLength > 160) {
          recommendations.push('Passen Sie die Meta-Beschreibung auf 50-160 Zeichen an.');
        }
        if (report.seo.headings.h1 !== 1) {
          recommendations.push('Verwenden Sie genau ein H1-Element pro Seite.');
        }
        if (report.seo.images.withoutAlt > 0) {
          recommendations.push(`Fügen Sie Alt-Attribute zu allen ${report.seo.images.withoutAlt} Bildern ohne Alt-Text hinzu.`);
        }
      }

      // Performance-Empfehlungen
      if (report.performance && !report.performance.error) {
        if (report.performance.scores.performance < 70) {
          recommendations.push('Verbessern Sie die Website-Performance:');
          recommendations.push('  - Optimieren Sie Bilder');
          recommendations.push('  - Minimieren Sie CSS und JavaScript');
          recommendations.push('  - Nutzen Sie Browser-Caching');
          recommendations.push('  - Reduzieren Sie Server-Antwortzeiten');
        }
      }

      // Sicherheitsempfehlungen
      if (report.security && !report.security.error) {
        if (!report.security.https.enabled) {
          recommendations.push('Implementieren Sie HTTPS für Ihre Website.');
        }
        if (report.security.securityHeaders.missing > 0) {
          recommendations.push('Fügen Sie die fehlenden Sicherheits-Header hinzu:');
          for (const [header, value] of Object.entries(report.security.securityHeaders.headers)) {
            if (!value) {
              recommendations.push(`  - ${header}`);
            }
          }
        }
      }

      // Qualitätsempfehlungen
      if (report.quality && !report.quality.error) {
        if (report.quality.htmlValidation.errors > 0) {
          recommendations.push(`Beheben Sie die ${report.quality.htmlValidation.errors} HTML-Validierungsfehler.`);
        }
        if (!report.quality.responsiveDesign.viewportMeta) {
          recommendations.push('Fügen Sie das Viewport-Meta-Tag für responsive Design hinzu.');
        }
        if (!report.quality.responsiveDesign.mediaQueries) {
          recommendations.push('Implementieren Sie Media Queries für ein besseres responsives Design.');
        }
      }

      doc.list(recommendations.length > 0 ? recommendations : ['Keine spezifischen Empfehlungen notwendig.']);

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}