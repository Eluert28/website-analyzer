// services/aiRecommendations.js
const { Configuration, OpenAIApi } = require('openai');
const config = require('../config');

class AIRecommendations {
  constructor() {
    this.configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY || config.openai?.apiKey,
    });
    this.openai = new OpenAIApi(this.configuration);
  }

  async generateRecommendations(analysisData) {
    try {
      // Prompt erstellen basierend auf den Analysedaten
      const prompt = this.createPrompt(analysisData);

      // Anfrage an OpenAI API senden
      const response = await this.openai.createCompletion({
        model: "gpt-4",
        prompt: prompt,
        max_tokens: 800,
        temperature: 0.7,
      });

      // Antwort analysieren und strukturieren
      return this.parseRecommendations(response.data.choices[0].text);
    } catch (error) {
      console.error('Fehler bei KI-Empfehlungen:', error);
      return {
        error: 'Fehler bei der Generierung von KI-Empfehlungen',
        recommendations: [
          "Die automatischen Empfehlungen konnten nicht generiert werden. Bitte überprüfen Sie die Analyseergebnisse manuell."
        ]
      };
    }
  }

  createPrompt(analysisData) {
    return `
      Du bist ein erfahrener SEO- und Web-Performance-Experte. Analysiere die folgenden Website-Daten und gib 5 spezifische, umsetzbare Verbesserungsvorschläge.

      URL: ${analysisData.url}

      SEO-DATEN:
      - Titel: ${analysisData.seo?.meta?.title || 'Nicht verfügbar'}
      - Titellänge: ${analysisData.seo?.meta?.titleLength || 'N/A'} Zeichen
      - Meta-Beschreibung: ${analysisData.seo?.meta?.description || 'Nicht verfügbar'}
      - Meta-Beschreibungslänge: ${analysisData.seo?.meta?.descriptionLength || 'N/A'} Zeichen
      - H1-Tags: ${analysisData.seo?.headings?.h1 || 'N/A'}
      - Bilder ohne Alt-Text: ${analysisData.seo?.images?.withoutAlt || 'N/A'} von ${analysisData.seo?.images?.total || 'N/A'}

      PERFORMANCE-DATEN:
      - Performance-Score: ${analysisData.performance?.score || 'N/A'}/100
      - First Contentful Paint: ${analysisData.performance?.metrics?.FCP || 'N/A'}
      - Largest Contentful Paint: ${analysisData.performance?.metrics?.LCP || 'N/A'}
      - Time to Interactive: ${analysisData.performance?.metrics?.TTI || 'N/A'}
      - Ladezeit: ${analysisData.loadTime || 'N/A'}

      SICHERHEITS-DATEN:
      - HTTPS: ${analysisData.security?.https?.enabled ? 'Aktiviert' : 'Nicht aktiviert'}
      - Security-Headers-Score: ${analysisData.security?.securityHeaders?.score || 'N/A'}/100

      INHALTS-DATEN:
      - Wortanzahl: ${analysisData.content?.textStats?.wordCount || 'N/A'}
      - Anzahl Absätze: ${analysisData.content?.structure?.paragraphs || 'N/A'}

      Gib 5 konkrete, priorisierte Empfehlungen zurück, die den größten Einfluss auf SEO, Performance und Nutzererfahrung haben werden.
      Stelle für jede Empfehlung einen klaren Titel, eine Beschreibung und die erwarteten Vorteile bereit.
      Formatiere die Antwort strukturiert im Format:

      1. [TITEL DER EMPFEHLUNG]
      Beschreibung: [DETAILLIERTE BESCHREIBUNG]
      Vorteile: [ERWARTETE VORTEILE]

      2. [TITEL DER EMPFEHLUNG]
      ...
    `;
  }

  parseRecommendations(text) {
    // Text in strukturierte Empfehlungen umwandeln
    const recommendations = [];
    const sections = text.split(/\d+\.\s+/).filter(section => section.trim().length > 0);

    sections.forEach(section => {
      const titleMatch = section.match(/^(.+?)\n/);
      const title = titleMatch ? titleMatch[1].trim() : 'Empfehlung';

      const descriptionMatch = section.match(/Beschreibung:\s*(.+?)(?=Vorteile:|$)/s);
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';

      const benefitsMatch = section.match(/Vorteile:\s*(.+?)$/s);
      const benefits = benefitsMatch ? benefitsMatch[1].trim() : '';

      recommendations.push({
        title,
        description,
        benefits,
        category: this.detectCategory(title + ' ' + description),
        priority: this.determinePriority(description)
      });
    });

    return {
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }

  detectCategory(text) {
    // Kategorie basierend auf Schlüsselwörtern erkennen
    const textLower = text.toLowerCase();
    if (/meta|title|description|keyword|h1|h2|h3|alt|headings/i.test(textLower)) return 'SEO';
    if (/speed|performance|loading|fcp|lcp|tti|cls|cache/i.test(textLower)) return 'Performance';
    if (/content|text|word|paragraph|struktur/i.test(textLower)) return 'Inhalt';
    if (/security|https|header|ssl|tls/i.test(textLower)) return 'Sicherheit';
    if (/mobile|responsive|viewport/i.test(textLower)) return 'Mobile';
    return 'Allgemein';
  }

  determinePriority(text) {
    // Priorität basierend auf Dringlichkeitswörtern bestimmen
    const textLower = text.toLowerCase();
    if (/kritisch|sofort|dringend|schwerwiegend|umgehend/i.test(textLower)) return 'Hoch';
    if (/wichtig|sollte|empfehlenswert|relevant/i.test(textLower)) return 'Mittel';
    return 'Normal';
  }
}

module.exports = new AIRecommendations();