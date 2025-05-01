// services/emailSender.js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class EmailSender {
  constructor() {
    // Transporter basierend auf Konfiguration erstellen
    this.transporter = nodemailer.createTransport({
      host: config.email?.host || 'smtp.gmail.com',
      port: config.email?.port || 587,
      secure: config.email?.secure || false,
      auth: {
        user: process.env.EMAIL_USER || config.email?.user,
        pass: process.env.EMAIL_PASS || config.email?.password
      }
    });
  }

  // Sendet einen Bericht per E-Mail
  async sendReport(report, recipients, reportType = 'full') {
    try {
      if (!Array.isArray(recipients)) {
        recipients = [recipients];
      }

      // Prüfe, ob die Berichtsdatei existiert
      if (!fs.existsSync(report.filePath)) {
        throw new Error(`Berichtsdatei nicht gefunden: ${report.filePath}`);
      }

      // E-Mail-Betreff basierend auf Berichtstyp
      const subjectPrefix = {
        'full': 'Vollständiger Website-Analyse-Bericht',
        'seo': 'SEO-Analyse-Bericht',
        'performance': 'Performance-Analyse-Bericht',
        'security': 'Sicherheits-Analyse-Bericht'
      };

      const subject = `${subjectPrefix[reportType] || 'Website-Analyse'}: ${report.websiteUrl}`;

      // E-Mail-Text basierend auf Berichtstyp
      const emailText = this.getEmailText(report, reportType);

      // E-Mail-Optionen
      const mailOptions = {
        from: `"Website Analyzer" <${process.env.EMAIL_USER || config.email?.sender || 'noreply@example.com'}>`,
        to: recipients.join(', '),
        subject: subject,
        text: emailText,
        html: this.getHtmlEmailContent(report, reportType),
        attachments: [
          {
            filename: report.filename,
            path: report.filePath
          }
        ]
      };

      // E-Mail senden
      const info = await this.transporter.sendMail(mailOptions);

      console.log(`Bericht per E-Mail gesendet: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error);
      throw error;
    }
  }

  // Generiert den Text für die E-Mail
  getEmailText(report, reportType) {
    return `
      Hallo,

      im Anhang finden Sie den ${this.getReportTypeName(reportType)} für ${report.websiteUrl}.
      Der Bericht wurde am ${new Date(report.generatedAt).toLocaleDateString('de-DE')} um ${new Date(report.generatedAt).toLocaleTimeString('de-DE')} erstellt.

      Mit freundlichen Grüßen,
      Ihr Website Analyzer
    `;
  }

  // Generiert den HTML-Inhalt für die E-Mail
  getHtmlEmailContent(report, reportType) {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f5f5f5; padding: 10px; border-radius: 5px; }
            .footer { margin-top: 30px; font-size: 0.8em; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Website-Analyse-Bericht</h2>
            </div>

            <p>Hallo,</p>

            <p>im Anhang finden Sie den ${this.getReportTypeName(reportType)} für <strong>${report.websiteUrl}</strong>.</p>

            <p>Der Bericht wurde am <strong>${new Date(report.generatedAt).toLocaleDateString('de-DE')}</strong> um <strong>${new Date(report.generatedAt).toLocaleTimeString('de-DE')}</strong> erstellt.</p>

            <p>Mit freundlichen Grüßen,<br>
            Ihr Website Analyzer</p>

            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Hilfsmethode, um den Berichtstyp für die Anzeige zu formatieren
  getReportTypeName(reportType) {
    const types = {
      'full': 'vollständigen Website-Analyse-Bericht',
      'seo': 'SEO-Analyse-Bericht',
      'performance': 'Performance-Analyse-Bericht',
      'security': 'Sicherheits-Analyse-Bericht'
    };

    return types[reportType.toLowerCase()] || 'Website-Analyse-Bericht';
  }

  // Testet die E-Mail-Verbindung
  async testConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Fehler bei der E-Mail-Verbindung:', error);
      return false;
    }
  }
}

module.exports = new EmailSender();