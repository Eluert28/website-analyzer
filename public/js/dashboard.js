// In public/js/dashboard.js oder einer neuen Datei

// KI-Empfehlungen laden
async function loadAIRecommendations(analysisId) {
  // Karte anzeigen und Ladeindikator aktivieren
  const recommendationsCard = document.getElementById('ai-recommendations-card');
  const loadingIndicator = document.getElementById('ai-recommendations-loading');
  const contentContainer = document.getElementById('ai-recommendations-content');
  const errorContainer = document.getElementById('ai-recommendations-error');

  recommendationsCard.style.display = 'block';
  loadingIndicator.style.display = 'block';
  contentContainer.style.display = 'none';
  errorContainer.style.display = 'none';

  try {
    // API-Anfrage stellen
    const response = await fetch(`/api/analysis/${analysisId}/ai-recommendations`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Unbekannter Fehler');
    }

    // Empfehlungen anzeigen
    renderAIRecommendations(data.recommendations);

    // Ladeindikator ausblenden und Container anzeigen
    loadingIndicator.style.display = 'none';
    contentContainer.style.display = 'block';
  } catch (error) {
    console.error('Fehler beim Laden der KI-Empfehlungen:', error);
    loadingIndicator.style.display = 'none';
    errorContainer.style.display = 'block';
    errorContainer.textContent = `Fehler: ${error.message}`;
  }
}

// Empfehlungen rendern
function renderAIRecommendations(recommendations) {
  const container = document.getElementById('ai-recommendations-content');
  container.innerHTML = '';

  if (!recommendations || !recommendations.recommendations || recommendations.recommendations.length === 0) {
    container.innerHTML = '<p>Keine Empfehlungen verfügbar.</p>';
    return;
  }

  // Generierungsdatum anzeigen
  const generatedDate = new Date(recommendations.generatedAt);
  const dateFormatted = `${generatedDate.toLocaleDateString()} ${generatedDate.toLocaleTimeString()}`;
  container.innerHTML = `<p class="text-muted small mb-4">Generiert am: ${dateFormatted}</p>`;

  // Empfehlungskarten erstellen
  const recommendationsContainer = document.createElement('div');
  recommendationsContainer.className = 'recommendations-container';

  recommendations.recommendations.forEach((rec, index) => {
    const card = document.createElement('div');
    card.className = 'card mb-3 recommendation-card';
    card.style.backgroundColor = '#1a1a1a';
    card.style.borderColor = '#333';

    // Badge für Kategorie
    let categoryBadge = '';
    if (rec.category) {
      const badgeClass = getCategoryBadgeClass(rec.category);
      categoryBadge = `<span class="badge ${badgeClass} ms-2">${rec.category}</span>`;
    }

    // Badge für Priorität
    let priorityBadge = '';
    if (rec.priority) {
      const priorityClass = getPriorityBadgeClass(rec.priority);
      priorityBadge = `<span class="badge ${priorityClass} ms-2">${rec.priority}</span>`;
    }

    card.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">${index + 1}. ${rec.title} ${categoryBadge} ${priorityBadge}</h5>
      </div>
      <div class="card-body">
        <h6>Beschreibung:</h6>
        <p>${rec.description}</p>
        ${rec.benefits ? `<h6>Vorteile:</h6><p>${rec.benefits}</p>` : ''}
      </div>
    `;

    recommendationsContainer.appendChild(card);
  });

  container.appendChild(recommendationsContainer);

  // Event-Listener für Aktualisierungsbutton
  document.getElementById('refresh-ai-recommendations').addEventListener('click', () => {
    const analysisId = getCurrentAnalysisId(); // Diese Funktion müsste implementiert werden
    loadAIRecommendations(analysisId);
  });
}

// Hilfsfunktionen für die Styling-Klassen
function getCategoryBadgeClass(category) {
  switch (category.toLowerCase()) {
    case 'seo': return 'bg-primary';
    case 'performance': return 'bg-warning text-dark';
    case 'inhalt': return 'bg-info text-dark';
    case 'sicherheit': return 'bg-success';
    case 'mobile': return 'bg-secondary';
    default: return 'bg-dark';
  }
}

function getPriorityBadgeClass(priority) {
  switch (priority.toLowerCase()) {
    case 'hoch': return 'bg-danger';
    case 'mittel': return 'bg-warning text-dark';
    case 'normal': return 'bg-secondary';
    default: return 'bg-dark';
  }
}