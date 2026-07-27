/* ============================================================
   EduScheduler Pro — views/config.js
   Configuration and Dashboard views
   ============================================================ */
'use strict';

const ViewDashboard = {
  render: function() {
    const data = Store.getData() || {};
    const config = data.config || {};
    const stats = Store.getStats();

    const html = `
      <div class="page-header mb-6">
        <h1 class="page-title">🏫 ${config.schoolName || 'Mi Colegio'}</h1>
        <p class="page-subtitle">Año Lectivo ${config.year || '2026'} · Jornada ${config.jornada || 'única'} · Ciclo de ${config.cycleDays || 5} Días</p>
      </div>

      <!-- Stat Cards Grid -->
      <div class="dashboard-grid">
        <div class="stat-card">
          <div class="stat-icon" style="color:var(--accent)">👨‍🏫</div>
          <div class="stat-value">${stats.teachers}</div>
          <div class="stat-label">Profesores Registrados</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color:var(--success)">👥</div>
          <div class="stat-value">${stats.groups}</div>
          <div class="stat-label">Grupos de Clase</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color:var(--warning)">📚</div>
          <div class="stat-value">${stats.subjects}</div>
          <div class="stat-label">Asignaturas</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color:var(--info)">🏛️</div>
          <div class="stat-value">${stats.rooms}</div>
          <div class="stat-label">Espacios / Aulas</div>
        </div>
      </div>

      <!-- Current State Card -->
      <div class="card mb-6">
        <div class="card-header">
          <div class="card-title">📊 Estado Actual del Sistema</div>
        </div>
        <div class="card-body">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
            <div>
              <div class="text-sm text-muted">Asignaciones de Carga</div>
              <div style="font-size:20px; font-weight:700;">${stats.assignments} asignaciones (${stats.totalAssignmentHours}h)</div>
            </div>
            <div>
              <div class="text-sm text-muted">Estado del Horario</div>
              <div>
                <span class="badge ${stats.scheduleReady ? 'badge-success' : 'badge-warning'}">
                  ${stats.scheduleReady ? '✓ Horario Generado' : '⚡ Pendiente por Generar'}
                </span>
              </div>
            </div>
            <div>
              <div class="text-sm text-muted">Puntuación de Calidad</div>
              <div style="font-size:20px; font-weight:800; color:${stats.quality ? 'var(--success)' : 'var(--text-muted)'};">
                ${stats.quality ? `${stats.quality.overallScore} / 100` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps to Begin -->
      <div class="card mb-6">
        <div class="card-header">
          <div class="card-title">🚀 Flujo de Trabajo (Pasos para crear horarios)</div>
        </div>
        <div class="card-body">
          <div class="quick-actions">
            <div class="quick-action-card" onclick="App.navigate('config')">
              <div class="quick-action-icon">⚙️</div>
              <div class="quick-action-label">1. Configuración</div>
            </div>
            <div class="quick-action-card" onclick="App.navigate('profesores')">
              <div class="quick-action-icon">👨‍🏫</div>
              <div class="quick-action-label">2. Profesores</div>
            </div>
            <div class="quick-action-card" onclick="App.navigate('grupos')">
              <div class="quick-action-icon">👥</div>
              <div class="quick-action-label">3. Grupos</div>
            </div>
            <div class="quick-action-card" onclick="App.navigate('asignaturas')">
              <div class="quick-action-icon">📚</div>
              <div class="quick-action-label">4. Asignaturas</div>
            </div>
            <div class="quick-action-card" onclick="App.navigate('asignaciones')">
              <div class="quick-action-icon">📋</div>
              <div class="quick-action-label">5. Carga Horaria</div>
            </div>
            <div class="quick-action-card" style="border-color:var(--accent)" onclick="App.navigate('generador')">
              <div class="quick-action-icon">⚡</div>
              <div class="quick-action-label" style="color:var(--accent-light)">6. Generar</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('view-container').innerHTML = html;
  }
};

const ViewConfig = {
  render: function() {
    const data = Store.getData() || {};
    const config = data.config || {};

    const html = `
      <div class="page-header">
        <div class="page-header-top">
          <div>
            <h1 class="page-title">⚙️ Configuración General</h1>
            <p class="page-subtitle">Parámetros institucionales y franjas horarias</p>
          </div>
        </div>
      </div>

      <!-- School General Info -->
      <div class="card mb-6">
        <div class="card-header">
          <div class="card-title">🏫 Datos de la Institución</div>
        </div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nombre del Colegio / Institución</label>
              <input type="text" id="cfgSchoolName" class="form-control" value="${config.schoolName || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Año Lectivo</label>
              <input type="text" id="cfgYear" class="form-control" value="${config.year || '2026'}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Días del Ciclo Horario</label>
              <select id="cfgCycleDays" class="form-control">
                <option value="5" ${config.cycleDays == 5 ? 'selected' : ''}>5 Días (Lunes a Viernes)</option>
                <option value="6" ${config.cycleDays == 6 ? 'selected' : ''}>6 Días (Lunes a Sábado)</option>
                <option value="7" ${config.cycleDays == 7 ? 'selected' : ''}>7 Días (Semana completa)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Jornada Escolar (Colombia)</label>
              <input type="text" class="form-control" value="Única" disabled readonly>
              <div class="form-hint">Parametrizado según normativa MEN Colombia</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Periods Table -->
      <div class="card">
        <div class="card-header" style="justify-content:space-between;">
          <div class="card-title">⏰ Franjas Horarias (Períodos del Día)</div>
          <button class="btn btn-secondary btn-sm" id="btnAddPeriod">+ Añadir Franja</button>
        </div>
        <div class="card-body p-0">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Nombre / Franja</th>
                  <th>Hora Inicio</th>
                  <th>Hora Fin</th>
                  <th style="text-align:center">¿Es Descanso / Recreo?</th>
                  <th style="text-align:center">Acciones</th>
                </tr>
              </thead>
              <tbody id="periodsTbody">
                ${this.generatePeriodsRows(config.periods || [])}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('view-container').innerHTML = html;
    this.initEvents();
  },

  generatePeriodsRows: function(periods) {
    if (!periods || periods.length === 0) {
      return `<tr><td colspan="5" class="empty-state">Sin franjas horarias</td></tr>`;
    }

    return periods.map((p, index) => `
      <tr data-index="${index}">
        <td>
          <input type="text" class="form-control period-input" data-field="name" value="${p.name || ''}" style="min-width:130px">
        </td>
        <td>
          <input type="time" class="form-control period-input" data-field="start" value="${p.start || ''}">
        </td>
        <td>
          <input type="time" class="form-control period-input" data-field="end" value="${p.end || ''}">
        </td>
        <td style="text-align:center">
          <input type="checkbox" class="period-input" data-field="isBreak" ${p.isBreak ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--accent)">
        </td>
        <td style="text-align:center">
          <button class="btn btn-icon-sm btn-danger remove-period" data-index="${index}" title="Eliminar">✕</button>
        </td>
      </tr>
    `).join('');
  },

  initEvents: function() {
    const saveChanges = () => {
      const data = Store.getData();
      data.config.schoolName = document.getElementById('cfgSchoolName').value.trim();
      data.config.year = document.getElementById('cfgYear').value.trim();

      const newCycle = parseInt(document.getElementById('cfgCycleDays').value);
      if (newCycle !== data.config.cycleDays) {
        data.config.cycleDays = newCycle;
        const defaultNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        data.config.dayNames = defaultNames.slice(0, newCycle);
      }

      Store.save();
      toast('Configuración guardada', 'success');
    };

    document.getElementById('cfgSchoolName').addEventListener('change', saveChanges);
    document.getElementById('cfgYear').addEventListener('change', saveChanges);
    document.getElementById('cfgCycleDays').addEventListener('change', saveChanges);

    // Period inputs auto-save
    document.querySelectorAll('.period-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const row = e.target.closest('tr');
        const idx = parseInt(row.dataset.index);
        const field = e.target.dataset.field;
        const data = Store.getData();

        if (data.config.periods && data.config.periods[idx]) {
          if (field === 'isBreak') {
            data.config.periods[idx].isBreak = e.target.checked;
          } else {
            data.config.periods[idx][field] = e.target.value;
          }
          Store.save();
          toast('Franja horaria actualizada', 'success');
        }
      });
    });

    // Remove period
    document.querySelectorAll('.remove-period').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        const data = Store.getData();
        data.config.periods.splice(idx, 1);
        Store.save();
        toast('Franja eliminada', 'success');
        this.render();
      });
    });

    // Add period
    document.getElementById('btnAddPeriod').addEventListener('click', () => {
      const data = Store.getData();
      const count = (data.config.periods || []).length + 1;
      data.config.periods.push({
        id: 'p_' + Date.now(),
        name: `${count}ª Hora`,
        start: '08:00',
        end: '08:45',
        isBreak: false
      });
      Store.save();
      toast('Franja agregada', 'success');
      this.render();
    });
  }
};
