// services/reportGenerator.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('../database');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../reports');

    // Stelle sicher, dass das Berichte-Verzeichnis existiert
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // Generiert einen Bericht basierend auf Analyseergebnissen
  async generate(analysisResult, websiteId, reportType = 'full') {
    try {
      // Website-Informationen aus der Datenbank abrufen
      const website = await db.get(
        'SELECT * FROM websites WHERE id = ?',
        [websiteId]
      );

      if (!website) {
        throw new Error(`Website mit ID ${websiteId} nicht gefunden.`);
      }

      // Berichtstyp bestimmen
      let reportData;
      switch (reportType.toLowerCase()) {
        case 'seo':
          reportData = this.prepareSeoReportData(analysisResult, website);
          break;
        case 'performance':
          reportData = this.preparePerformanceReportData(analysisResult, website);
          break;
        case 'security':
          reportData = this.prepareSecurityReportData(analysisResult, website);
          break;
        case 'full':
        default:
          reportData = this.prepareFullReportData(analysisResult, website);
          break;
      }

      // Berichts-Dateinamen generieren
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${website.url.replace(/[^a-z0-9]/gi, '-')}_${reportType}_${timestamp}.pdf`;
      const filePath = path.join(this.reportsDir, filename);

      // PDF-Bericht erstellen
      await this.generatePdfReport(reportData, filePath);

      return {
        filename,
        filePath,
        reportType,
        websiteId,
        websiteUrl: website.url,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Fehler bei der Berichtsgenerierung:', error);
      throw error;
    }
  }

  // Bereitet Daten für einen vollständigen Bericht vor
  prepareFullReportData(analysisResult, website) {
    return {
      title: `Vollständiger Website-Analyse-Bericht: ${website.url}`,
      website,
      date: new Date().toLocaleDateString('de-DE'),
      sections: [
        this.prepareSeoSection(analysisResult),
        this.preparePerformanceSection(analysisResult),
        this.prepareContentSection(analysisResult),
        this.prepareSecuritySection(analysisResult),
        {
          title: 'Zusammenfassung & Empfehlungen',
          content: this.generateRecommendations(analysisResult)
        }
      ]
    };
  }

  // Bereitet Daten für einen SEO-Bericht vor
  prepareSeoReportData(analysisResult, website) {
    return {
      title: `SEO-Analyse-Bericht: ${website.url}`,
      website,
      date: new Date().toLocaleDateString('de-DE'),
      sections: [
        this.prepareSeoSection(analysisResult),
        {
          title: 'SEO-Empfehlungen',
          content: this.generateSeoRecommendations(analysisResult)
        }
      ]
    };
  }

  // Bereitet Daten für einen Performance-Bericht vor
  preparePerformanceReportData(analysisResult, website) {
    return {
      title: `Performance-Analyse-Bericht: ${website.url}`,
      website,
      date: new Date().toLocaleDateString('de-DE'),
      sections: [
        this.preparePerformanceSection(analysisResult),
        {
          title: 'Performance-Empfehlungen',
          content: this.generatePerformanceRecommendations(analysisResult)
        }
      ]
    };
  }

  // Bereitet Daten für einen Sicherheits-Bericht vor
  prepareSecurityReportData(analysisResult, website) {
    return {
      title: `Sicherheits-Analyse-Bericht: ${website.url}`,
      website,
      date: new Date().toLocaleDateString('de-DE'),
      sections: [
        this.prepareSecuritySection(analysisResult),
        {
          title: 'Sicherheits-Empfehlungen',
          content: this.generateSecurityRecommendations(analysisResult)
        }
      ]
    };
  }

  // Bereitet SEO-Abschnitt vor
  prepareSeoSection(analysisResult) {
    // Hier extrahieren wir die relevanten SEO-Daten aus dem Analyseergebnis
    const seoData = analysisResult.seo || {};

    return {
      title: 'SEO-Analyse',
      subsections: [
        {
          title: 'Meta-Tags',
          items: [
            { label: 'Titel', value: seoData.meta?.title || 'Nicht gefunden' },
            { label: 'Beschreibung', value: seoData.meta?.description || 'Nicht gefunden' },
            { label: 'Canonical URL', value: seoData.canonicalUrl || 'Nicht definiert' }
          ]
        },
        {
          title: 'Überschriften',
          items: this.formatHeadings(seoData.headings || {})
        },
        {
          title: 'Bilder',
          items: [
            { label: 'Bilder mit Alt-Text', value: `${seoData.images?.withAlt || 0}/${seoData.images?.total || 0}` },
            { label: 'Bilder ohne Alt-Text', value: seoData.images?.withoutAlt || 0 }
          ]
        },
        {
          title: 'Links',
          items: [
            { label: 'Interne Links', value: seoData.links?.internal || 0 },
            { label: 'Externe Links', value: seoData.links?.external || 0 }
          ]
        }
      ]
    };
  }

  // Bereitet Performance-Abschnitt vor
  preparePerformanceSection(analysisResult) {
    const performanceData = analysisResult.performance || {};

    return {
      title: 'Performance-Analyse',
      subsections: [
        {
          title: 'Lighthouse-Metriken',
          items: [
            { label: 'Performance-Score', value: `${performanceData.score || 'N/A'}/100` },
            { label: 'First Contentful Paint', value: performanceData.metrics?.FCP || 'N/A' },
            { label: 'Largest Contentful Paint', value: performanceData.metrics?.LCP || 'N/A' },
            { label: 'Time to Interactive', value: performanceData.metrics?.TTI || 'N/A' },
            { label: 'Total Blocking Time', value: performanceData.metrics?.TBT || 'N/A' },
            { label: 'Cumulative Layout Shift', value: performanceData.metrics?.CLS || 'N/A' }
          ]
        },
        {
          title: 'Ladezeiten',
          items: [
            { label: 'Server-Antwortzeit', value: analysisResult.statistics?.loadTime || 'N/A' },
            { label: 'DOM Content Loaded', value: analysisResult.statistics?.domContentLoaded || 'N/A' }
          ]
        }
      ]
    };
  }

  // Bereitet Inhalts-Abschnitt vor
  prepareContentSection(analysisResult) {
    const contentData = analysisResult.content || {};

    return {
      title: 'Inhaltsanalyse',
      subsections: [
        {
          title: 'Textstatistiken',
          items: [
            { label: 'Wortanzahl', value: contentData.textStats?.wordCount || 0 },
            { label: 'Zeichenanzahl', value: contentData.textStats?.characterCount || 0 },
            { label: 'Durchschnittliche Wortlänge', value: contentData.textStats?.averageWordLength ? `${contentData.textStats.averageWordLength} Zeichen` : 'N/A' }
          ]
        },
        {
          title: 'Medien',
          items: [
            { label: 'Bilder', value: contentData.media?.images || 0 },
            { label: 'Videos', value: contentData.media?.videos || 0 }
          ]
        },
        {
          title: 'Seitenstruktur',
          items: [
            { label: 'Absätze', value: contentData.structure?.paragraphs || 0 },
            { label: 'Listen', value: contentData.structure?.lists || 0 },
            { label: 'Tabellen', value: contentData.structure?.tables || 0 }
          ]
        }
      ]
    };
  }

  // Bereitet Sicherheits-Abschnitt vor
  prepareSecuritySection(analysisResult) {
    const securityData = analysisResult.security || {};

    return {
      title: 'Sicherheitsanalyse',
      subsections: [
        {
          title: 'HTTPS',
          items: [
            { label: 'Aktiviert', value: securityData.https?.enabled ? 'Ja' : 'Nein' },
            { label: 'Bewertung', value: securityData.https?.score || 'N/A' }
          ]
        },
        {
          title: 'Sicherheits-Header',
          items: [
            { label: 'Implementierte Header', value: `${securityData.securityHeaders?.implemented || 0}/${securityData.securityHeaders?.implemented + securityData.securityHeaders?.missing || 0}` },
            { label: 'Header-Score', value: `${securityData.securityHeaders?.score || 0}%` }
          ]
        }
      ]
    };
  }

  // Generiert ein PDF-Dokument
  async generatePdfReport(reportData, filePath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        // Wenn der Stream geschlossen wird, ist das PDF fertig
        stream.on('close', () => {
          resolve(filePath);
        });

        doc.pipe(stream);

        // Titelseite
        doc.fontSize(25).text(reportData.title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Erstellt am: ${reportData.date}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Für: ${reportData.website.url}`, { align: 'center' });

        doc.addPage();

        // Inhaltsverzeichnis
        doc.fontSize(20).text('Inhaltsverzeichnis', { align: 'center' });
        doc.moveDown();

        reportData.sections.forEach((section, index) => {
          doc.fontSize(12)
             .text(`${index + 1}. ${section.title}`, {
               link: `#section_${index}`,
               underline: true
             });
        });

        doc.addPage();

        // Sektionen
        reportData.sections.forEach((section, sectionIndex) => {
          // Setze einen Anker für das Inhaltsverzeichnis
          doc.addNamedDestination(`section_${sectionIndex}`);

          doc.fontSize(18).text(section.title, { underline: true });
          doc.moveDown();

          if (section.content) {
            doc.fontSize(12).text(section.content);
            doc.moveDown();
          }

          if (section.subsections) {
            section.subsections.forEach(subsection => {
              doc.fontSize(14).text(subsection.title);
              doc.moveDown();

              if (subsection.content) {
                doc.fontSize(12).text(subsection.content);
                doc.moveDown();
              }

              if (subsection.items) {
                subsection.items.forEach(item => {
                  if (item.label) {
                    doc.fontSize(12).text(`${item.label}: ${item.value}`);
                  } else {
                    doc.fontSize(12).text(item);
                  }
                });
                doc.moveDown();
              }
            });
          }

          // Neue Seite für jede Sektion, außer für die letzte
          if (sectionIndex < reportData.sections.length - 1) {
            doc.addPage();
          }
        });

        // Fertigstellen
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Hilfsmethode zur Formatierung von Überschriften
  formatHeadings(headings) {
    const result = [];

    for (const [level, count] of Object.entries(headings)) {
      if (count > 0) {
        result.push({
          label: level.toUpperCase(),
          value: count
        });
      }
    }

    return result;
  }

  // Generiert Gesamtempfehlungen
  generateRecommendations(analysisResult) {
    // Diese Methode würde Empfehlungen basierend auf allen Aspekten erstellen
    const recommendations = [];

    recommendations.push(...this.generateSeoRecommendations(analysisResult));
    recommendations.push(...this.generatePerformanceRecommendations(analysisResult));
    recommendations.push(...this.generateSecurityRecommendations(analysisResult));

    return recommendations.join('\n\n');
  }

  // Generiert SEO-Empfehlungen
  generateSeoRecommendations(analysisResult) {
    const recommendations = [];
    const seo = analysisResult.seo;

    if (!seo) return recommendations;

    // Titel-Empfehlungen
    if (!seo.meta?.title || seo.meta?.titleLength < 30) {
      recommendations.push('Der Seitentitel ist zu kurz. Optimale Titel haben 50-60 Zeichen für bessere Sichtbarkeit in Suchmaschinen.');
    } else if (seo.meta?.titleLength > 60) {
      recommendations.push('Der Seitentitel ist zu lang und könnte in Suchergebnissen abgeschnitten werden. Kürze ihn auf 50-60 Zeichen.');
    }

    // Meta-Description-Empfehlungen
    if (!seo.meta?.description || seo.meta?.descriptionLength < 70) {
      recommendations.push('Die Meta-Beschreibung ist zu kurz. Eine optimale Beschreibung hat 150-160 Zeichen und enthält relevante Keywords.');
    } else if (seo.meta?.descriptionLength > 160) {
      recommendations.push('Die Meta-Beschreibung ist zu lang und könnte in Suchergebnissen abgeschnitten werden. Kürze sie auf 150-160 Zeichen.');
    }

    // H1-Empfehlungen
    if (seo.headings?.h1 === 0) {
      recommendations.push('Die Seite hat kein H1-Element. Jede Seite sollte genau ein H1-Element haben, das den Hauptinhalt beschreibt.');
    } else if (seo.headings?.h1 > 1) {
      recommendations.push(`Die Seite hat ${seo.headings.h1} H1-Elemente. Verwende nur ein H1-Element pro Seite für eine klare Hierarchie.`);
    }

    // Alt-Text-Empfehlungen
    if (seo.images?.withoutAlt > 0) {
      recommendations.push(`${seo.images.withoutAlt} Bilder haben keinen Alt-Text. Füge allen Bildern beschreibende Alt-Texte hinzu für bessere Zugänglichkeit und SEO.`);
    }

    return recommendations;
  }

  // Generiert Performance-Empfehlungen
  generatePerformanceRecommendations(analysisResult) {
    const recommendations = [];
    const performance = analysisResult.performance;

    if (!performance) return recommendations;

    // Score-basierte Empfehlungen
    if (performance.score < 50) {
      recommendations.push('Die Website hat erhebliche Performance-Probleme, die die Benutzererfahrung und das Ranking in Suchmaschinen beeinträchtigen können.');
    } else if (performance.score < 80) {
      recommendations.push('Die Website-Performance könnte verbessert werden, um ein besseres Nutzererlebnis zu bieten.');
    }

    // LCP-Empfehlungen
    if (performance.metrics?.LCP && performance.metrics.LCP.includes('> 2.5s')) {
      recommendations.push('Der Largest Contentful Paint (LCP) ist zu langsam. Optimiere die Ladezeit des Hauptinhalts, z.B. durch Bildoptimierung und serverseitiges Caching.');
    }

    // CLS-Empfehlungen
    if (performance.metrics?.CLS && parseFloat(performance.metrics.CLS) > 0.1) {
      recommendations.push('Der Cumulative Layout Shift (CLS) ist zu hoch. Vermeide unerwartete Layout-Verschiebungen, indem du Bildern und Elementen explizite Dimensionen gibst.');
    }

    return recommendations;
  }

  // Generiert Sicherheits-Empfehlungen
  generateSecurityRecommendations(analysisResult) {
    const recommendations = [];
    const security = analysisResult.security;

    if (!security) return recommendations;

    // HTTPS-Empfehlungen
    if (!security.https?.enabled) {
      recommendations.push('Die Website verwendet kein HTTPS. Implementiere HTTPS, um die Sicherheit der Benutzer zu gewährleisten und das SEO-Ranking zu verbessern.');
    }

    // Security-Header-Empfehlungen
    if (security.securityHeaders?.score < 50) {
      recommendations.push('Die Website implementiert wichtige Sicherheits-Header nicht. Füge fehlende Header wie Strict-Transport-Security, Content-Security-Policy und X-Content-Type-Options hinzu.');
    }

    return recommendations;
  }
}

module.exports = new ReportGenerator();