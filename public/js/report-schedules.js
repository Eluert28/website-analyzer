/**
 * Report Schedules Manager
 * Verwaltet die Anzeige und Verwaltung von Berichts-Zeitplänen im Dashboard
 */
class ReportSchedulesManager {
  constructor() {
    this.schedulesTable = document.getElementById('schedulesTable');
    this.scheduleForm = document.getElementById('scheduleForm');
    this.editScheduleModal = document.getElementById('editScheduleModal');
    this.historyModal = document.getElementById('historyModal');

    this.schedules = [];
    this.currentScheduleId = null;

    // Event-Listener
    this.bindEvents();

    // Zeitpläne laden
    this.loadSchedules();
  }

  /**
   * Bindet Event-Listener an UI-Elemente
   */
  bindEvents() {
    // Formular für neuen Zeitplan
    if (this.scheduleForm) {
      this.scheduleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createSchedule();
      });
    }

    // Speichern-Button im Bearbeiten-Modal
    const saveEditBtn = document.getElementById('saveEditBtn');
    if (saveEditBtn) {
      saveEditBtn.addEventListener('click', () => {
        this.saveEditedSchedule();
      });
    }

    // Intervall-Selektoren Event-Listener
    const intervalSelect = document.getElementById('interval');
    if (intervalSelect) {
      intervalSelect.addEventListener('change', () => {
        const customCronGroup = document.getElementById('customCronGroup');
        if (customCronGroup) {
          customCronGroup.style.display = intervalSelect.value === 'custom' ? 'block' : 'none';
        }
      });
    }

    const editIntervalSelect = document.getElementById('editInterval');
    if (editIntervalSelect) {
      editIntervalSelect.addEventListener('change', () => {
        const editCustomCronGroup = document.getElementById('editCustomCronGroup');
        if (editCustomCronGroup) {
          editCustomCronGroup.style.display = editIntervalSelect.value === 'custom' ? 'block' : 'none';
        }
      });
    }

    // Empfänger hinzufügen
    const addRecipientBtn = document.getElementById('addRecipientBtn');
    if (addRecipientBtn) {
      addRecipientBtn.addEventListener('click', () => {
        this.addRecipientField('recipientsContainer');
      });
    }
  }

  /**
   * Lädt alle Zeitpläne vom Server
   */
  async loadSchedules() {
    try {
      const response = await fetch('/api/reports/schedules');
      const data = await response.json();

      if (data.success) {
        this.schedules = data.schedules;
        this.renderSchedulesTable();
      } else {
        this.showError('Fehler beim Laden der Zeitpläne: ' + data.error);
      }
    } catch (error) {
      this.showError('Fehler beim Laden der Zeitpläne: ' + error.message);
    }
  }

  /**
   * Rendert die Tabelle mit allen Zeitplänen
   */
  renderSchedulesTable() {
    if (!this.schedulesTable) return;

    // Tabellenkörper leeren
    const tbody = this.schedulesTable.querySelector('tbody');
    tbody.innerHTML = '';

    if (this.schedules.length === 0) {
      // Zeige Nachricht, wenn keine Zeitpläne vorhanden sind
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="6" class="text-center">Keine Berichts-Zeitpläne vorhanden</td>
      `;
      tbody.appendChild(row);
      return;
    }

    // Zeitpläne anzeigen
    this.schedules.forEach(schedule => {
      const row = document.createElement('tr');

      // Benutzerfreundlichen Text für cron-Ausdruck
      const cronText = this.getCronDescription(schedule.cron_expression);

      // Status-Badge
      const statusBadge = schedule.is_active
        ? '<span class="badge bg-success">Aktiv</span>'
        : '<span class="badge bg-secondary">Inaktiv</span>';

      row.innerHTML = `
        <td>${schedule.id}</td>
        <td>${schedule.website_id}</td>
        <td>${schedule.report_type}</td>
        <td>${cronText}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-info btn-history" data-id="${schedule.id}" title="Verlauf">
              <i class="bi bi-clock-history"></i>
            </button>
            <button class="btn btn-primary btn-edit" data-id="${schedule.id}" title="Bearbeiten">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-success btn-execute" data-id="${schedule.id}" title="Jetzt ausführen">
              <i class="bi bi-play-fill"></i>
            </button>
            <button class="btn btn-danger btn-delete" data-id="${schedule.id}" title="Löschen">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;

      // Event-Listener für Buttons hinzufügen
      row.querySelector('.btn-history').addEventListener('click', () => {
        this.showHistory(schedule.id);
      });

      row.querySelector('.btn-edit').addEventListener('click', () => {
        this.editSchedule(schedule.id);
      });

      row.querySelector('.btn-execute').addEventListener('click', () => {
        this.executeSchedule(schedule.id);
      });

      row.querySelector('.btn-delete').addEventListener('click', () => {
        this.deleteSchedule(schedule.id);
      });

      tbody.appendChild(row);
    });
  }

  /**
   * Erstellt einen neuen Zeitplan
   */
  async createSchedule() {
    // Formular-Daten sammeln
    const websiteId = document.getElementById('websiteId').value;
    const interval = document.getElementById('interval').value;
    const customCron = document.getElementById('customCron').value;
    const reportType = document.getElementById('reportType').value;

    // E-Mail-Empfänger sammeln
    const recipientInputs = document.querySelectorAll('.recipient-input');
    const recipients = Array.from(recipientInputs)
      .map(input => input.value.trim())
      .filter(email => email !== '');

    if (recipients.length === 0) {
      this.showError('Bitte geben Sie mindestens einen Empfänger an.');
      return;
    }

    try {
      // API-Anfrage senden
      const response = await fetch('/api/reports/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          websiteId: parseInt(websiteId),
          interval: interval === 'custom' ? customCron : interval,
          recipients,
          reportType
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('Zeitplan erfolgreich erstellt');
        this.resetForm();
        this.loadSchedules(); // Zeitpläne neu laden
      } else {
        this.showError('Fehler beim Erstellen des Zeitplans: ' + data.error);
      }
    } catch (error) {
      this.showError('Fehler beim Erstellen des Zeitplans: ' + error.message);
    }
  }

  /**
   * Zeigt den Modal-Dialog zum Bearbeiten eines Zeitplans
   */
  async editSchedule(id) {
    try {
      // Zeitplan-Daten laden
      const response = await fetch(`/api/reports/schedules/${id}`);
      const data = await response.json();

      if (!data.success) {
        this.showError('Fehler beim Laden des Zeitplans: ' + data.error);
        return;
      }

      const schedule = data.schedule;
      this.currentScheduleId = id;

      // Modal-Felder füllen
      document.getElementById('editWebsiteId').value = schedule.website_id;

      // Intervall-Typ bestimmen
      const cronExpr = schedule.cron_expression;
      let intervalType = 'custom';

      // Bekannte Cron-Ausdrücke erkennen
      if (cronExpr === '0 * * * *') intervalType = 'hourly';
      else if (cronExpr === '0 8 * * *') intervalType = 'daily';
      else if (cronExpr === '0 8 * * 1') intervalType = 'weekly';
      else if (cronExpr === '0 8 1,15 * *') intervalType = 'biweekly';
      else if (cronExpr === '0 8 1 * *') intervalType = 'monthly';

      document.getElementById('editInterval').value = intervalType;
      document.getElementById('editCustomCron').value = cronExpr;

      // Custom Cron-Feld anzeigen, wenn nötig
      document.getElementById('editCustomCronGroup').style.display =
        intervalType === 'custom' ? 'block' : 'none';

      // Report-Typ setzen
      document.getElementById('editReportType').value = schedule.report_type;

      // Status setzen
      document.getElementById('editIsActive').checked = schedule.is_active === 1;

      // Empfänger hinzufügen
      const recipientsContainer = document.getElementById('editRecipientsContainer');
      recipientsContainer.innerHTML = ''; // Container leeren

      const recipients = schedule.recipients.split(',');
      recipients.forEach(email => {
        this.addRecipientField('editRecipientsContainer', email.trim());
      });

      // Modal anzeigen
      const modal = new bootstrap.Modal(this.editScheduleModal);
      modal.show();
    } catch (error) {
      this.showError('Fehler beim Laden des Zeitplans: ' + error.message);
    }
  }

  /**
   * Speichert den bearbeiteten Zeitplan
   */
  async saveEditedSchedule() {
    if (!this.currentScheduleId) return;

    try {
      // Formular-Daten sammeln
      const interval = document.getElementById('editInterval').value;
      const customCron = document.getElementById('editCustomCron').value;
      const reportType = document.getElementById('editReportType').value;
      const isActive = document.getElementById('editIsActive').checked;

      // E-Mail-Empfänger sammeln
      const recipientInputs = document.querySelectorAll('#editRecipientsContainer .recipient-input');
      const recipients = Array.from(recipientInputs)
        .map(input => input.value.trim())
        .filter(email => email !== '');

      if (recipients.length === 0) {
        this.showError('Bitte geben Sie mindestens einen Empfänger an.');
        return;
      }

      // API-Anfrage senden
      const response = await fetch(`/api/reports/schedules/${this.currentScheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interval: interval === 'custom' ? customCron : interval,
          recipients,
          reportType,
          isActive
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('Zeitplan erfolgreich aktualisiert');

        // Modal schließen
        const modal = bootstrap.Modal.getInstance(this.editScheduleModal);
        if (modal) modal.hide();

        // Zeitpläne neu laden
        this.loadSchedules();
      } else {
        this.showError('Fehler beim Aktualisieren des Zeitplans: ' + data.error);
      }
    } catch (error) {
      this.showError('Fehler beim Aktualisieren des Zeitplans: ' + error.message);
    }
  }

  /**
   * Löscht einen Zeitplan
   */
  async deleteSchedule(id) {
    if (!confirm('Sind Sie sicher, dass Sie diesen Zeitplan löschen möchten?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/schedules/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('Zeitplan erfolgreich gelöscht');
        this.loadSchedules(); // Zeitpläne neu laden
      } else {
        this.showError('Fehler beim Löschen des Zeitplans: ' + data.error);
      }
    } catch (error) {
      this.showError('Fehler beim Löschen des Zeitplans: ' + error.message);
    }
  }

  /**
   * Führt einen Zeitplan manuell aus
   */
  async executeSchedule(id) {
    try {
      const response = await fetch(`/api/reports/schedules/${id}/execute`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('Zeitplan wird ausgeführt');
      } else {
        this.showError('Fehler beim Ausführen des Zeitplans: ' + data.error);
      }
    } catch (error) {
      this.showError('Fehler beim Ausführen des Zeitplans: ' + error.message);
    }
  }

  /**
   * Zeigt den Ausführungsverlauf eines Zeitplans
   */
  async showHistory(id) {
    try {
      const response = await fetch(`/api/reports/schedules/${id}/history`);
      const data = await response.json();

      if (!data.success) {
        this.showError('Fehler beim Laden des Ausführungsverlaufs: ' + data.error);
        return;
      }

      // Modal-Inhalt füllen
      const historyTableBody = this.historyModal.querySelector('tbody');
      historyTableBody.innerHTML = '';

      if (data.history.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">Keine Ausführungen vorhanden</td>';
        historyTableBody.appendChild(row);
      } else {
        data.history.forEach(execution => {
          const row = document.createElement('tr');

          // Status-Badge
          const statusBadge = execution.success
            ? '<span class="badge bg-success">Erfolgreich</span>'
            : '<span class="badge bg-danger">Fehler</span>';

          // Datum formatieren
          const date = new Date(execution.execution_time);
          const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

          row.innerHTML = `
            <td>${execution.id}</td>
            <td>${formattedDate}</td>
            <td>${statusBadge}</td>
            <td>${execution.error_message || '-'}</td>
          `;

          historyTableBody.appendChild(row);
        });
      }

      // Modal anzeigen
      const modal = new bootstrap.Modal(this.historyModal);
      modal.show();
    } catch (error) {
      this.showError('Fehler beim Laden des Ausführungsverlaufs: ' + error.message);
    }
  }

  /**
   * Fügt ein Empfänger-Eingabefeld hinzu
   */
  addRecipientField(containerId, value = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group mb-2';
    inputGroup.innerHTML = `
      <input type="email" class="form-control recipient-input" value="${value}" placeholder="E-Mail-Adresse" required>
      <button type="button" class="btn btn-outline-danger remove-recipient">
        <i class="bi bi-trash"></i>
      </button>
    `;

    // Event-Listener für Löschen-Button
    inputGroup.querySelector('.remove-recipient').addEventListener('click', function() {
      // Prüfen, ob es das letzte Eingabefeld ist
      const allInputs = container.querySelectorAll('.input-group');
      if (allInputs.length > 1) {
        this.parentElement.remove();
      } else {
        // Letztes Element nicht entfernen, stattdessen leeren
        inputGroup.querySelector('.recipient-input').value = '';
      }
    });

    container.appendChild(inputGroup);
  }

  /**
   * Setzt das Formular zurück
   */
  resetForm() {
    if (this.scheduleForm) {
      this.scheduleForm.reset();

      // Rezipient-Container zurücksetzen
      const recipientsContainer = document.getElementById('recipientsContainer');
      if (recipientsContainer) {
        // Alle Eingabefelder entfernen
        recipientsContainer.innerHTML = '';

        // Ein leeres Eingabefeld hinzufügen
        this.addRecipientField('recipientsContainer');
      }

      // Custom Cron-Feld ausblenden
      const customCronGroup = document.getElementById('customCronGroup');
      if (customCronGroup) {
        customCronGroup.style.display = 'none';
      }
    }
  }

  /**
   * Zeigt eine Fehlermeldung an
   */
  showError(message) {
    const alertsContainer = document.getElementById('alerts');
    if (!alertsContainer) return;

    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Schließen"></button>
    `;

    alertsContainer.appendChild(alert);

    // Nach 5 Sekunden automatisch ausblenden
    setTimeout(() => {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  }

  /**
   * Zeigt eine Erfolgsmeldung an
   */
  showSuccess(message) {
    const alertsContainer = document.getElementById('alerts');
    if (!alertsContainer) return;

    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show';
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Schließen"></button>
    `;

    alertsContainer.appendChild(alert);

    // Nach 5 Sekunden automatisch ausblenden
    setTimeout(() => {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  }

  /**
   * Generiert eine benutzerfreundliche Beschreibung eines Cron-Ausdrucks
   */
  getCronDescription(cronExpression) {
    // Einfache Übersetzungen für einige Standard-Cron-Ausdrücke
    switch (cronExpression) {
      case '0 * * * *': return 'Stündlich';
      case '0 8 * * *': return 'Täglich um 8 Uhr';
      case '0 8 * * 1': return 'Wöchentlich (Montag, 8 Uhr)';
      case '0 8 1,15 * *': return 'Zweimal monatlich (1. & 15., 8 Uhr)';
      case '0 8 1 * *': return 'Monatlich (1., 8 Uhr)';
      default: return cronExpression;
    }
  }
}

// Initialisierung, wenn das DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
  const reportSchedulesManager = new ReportSchedulesManager();
});