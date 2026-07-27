/* ============================================================
   EduScheduler Pro — views/restricciones.js
   Hard and Soft Constraints management view
   ============================================================ */
'use strict';

const ViewRestricciones = (() => {

  function render() {
    const data = Store.getData();
    const hc = data.hardConstraints || [];
    const sc = data.softConstraints || [];

    document.getElementById('view-container').innerHTML = `
      <div class="page-header">
        <div class="page-header-top">
          <div>
            <h1 class="page-title">Restricciones</h1>
            <p class="page-subtitle">Configura las reglas que gobiernan el horario</p>
          </div>
        </div>
      </div>

      <div class="alert alert-info mb-4">
        <span class="alert-icon">ℹ</span>
        <div>
          <div class="alert-title">Restricciones Duras vs. Blandas</div>
          Las <strong>restricciones duras</strong> son inviolables (el generador las respetará siempre). 
          Las <strong>restricciones blandas</strong> son preferencias que el algoritmo intentará satisfacer, pero que pueden quedar incumplidas si es necesario.
        </div>
      </div>

      <div class="grid-2" style="gap:24px; align-items:start;">
        <!-- Hard Constraints -->
        <div>
          <div class="section-header">
            <div>
              <div class="section-title">🔴 Restricciones Duras</div>
              <div class="section-subtitle">Reglas no negociables</div>
            </div>
            <button class="btn btn-sm btn-danger" id="btnAddHard">+ Agregar</button>
          </div>

          <div id="hardConstraintsList">
            ${hc.length === 0 ? `
              <div class="empty-state" style="padding:40px 20px">
                <div class="empty-icon">🔒</div>
                <div class="empty-title">Sin restricciones duras</div>
                <div class="empty-desc">Agrega reglas como bloques de tiempo, reuniones o restricciones de asignatura</div>
              </div>
            ` : hc.map(c => renderHardConstraint(c, data)).join('')}
          </div>
        </div>

        <!-- Soft Constraints -->
        <div>
          <div class="section-header">
            <div>
              <div class="section-title">🟡 Restricciones Blandas</div>
              <div class="section-subtitle">Preferencias de optimización</div>
            </div>
            <button class="btn btn-sm btn-warning" id="btnAddSoft">+ Agregar</button>
          </div>

          <div id="softConstraintsList">
            ${sc.length === 0 ? `
              <div class="empty-state" style="padding:40px 20px">
                <div class="empty-icon">⚖️</div>
                <div class="empty-title">Sin restricciones blandas</div>
                <div class="empty-desc">Agrega preferencias de horario para mejorar la calidad del horario</div>
              </div>
            ` : sc.map(c => renderSoftConstraint(c)).join('')}
          </div>
        </div>
      </div>

      <!-- Default constraints info -->
      <div class="card mt-4">
        <div class="card-header">
          <div class="card-title">📋 Reglas Incorporadas (siempre activas)</div>
        </div>
        <div class="card-body">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            ${[
              { icon: '🔴', label: 'Docente sin doble asignación simultánea', type: 'hard' },
              { icon: '🔴', label: 'Grupo sin doble clase simultánea', type: 'hard' },
              { icon: '🔴', label: 'Espacio sin doble reserva simultánea', type: 'hard' },
              { icon: '🔴', label: 'Máximo 2 horas de la misma materia por día', type: 'hard' },
              { icon: '🟡', label: 'Distribuir horas uniformemente en la semana', type: 'soft' },
              { icon: '🟡', label: 'Minimizar ventanas libres del docente', type: 'soft' },
            ].map(r => `
              <div class="constraint-card ${r.type}">
                <span class="constraint-icon">${r.icon}</span>
                <div class="constraint-info">
                  <div class="constraint-name">${r.label}</div>
                  <div class="constraint-desc">Regla incorporada – no modificable</div>
                </div>
                <span class="badge badge-neutral" style="font-size:9px">AUTO</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Events
    document.getElementById('btnAddHard').addEventListener('click', () => showHardConstraintModal());
    document.getElementById('btnAddSoft').addEventListener('click', () => showSoftConstraintModal());

    // Delete events
    document.querySelectorAll('[data-del-hard]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delHard;
        confirmAction('¿Eliminar esta restricción dura?', () => {
          Store.deleteItem('hardConstraints', id);
          render();
          toast('Restricción eliminada', 'success');
        });
      });
    });
    document.querySelectorAll('[data-del-soft]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delSoft;
        confirmAction('¿Eliminar esta restricción blanda?', () => {
          Store.deleteItem('softConstraints', id);
          render();
          toast('Restricción eliminada', 'success');
        });
      });
    });
  }

  function renderHardConstraint(c, data) {
    const typeLabels = {
      meeting:             '📅 Reunión',
      blocked_period:      '🚫 Franja bloqueada',
      no_subject_period:   '⛔ Asignatura no en franja',
      subject_time_range:  '⏰ Asignatura sólo en rango',
      max_consecutive_same:'🔁 Máx. consecutivas misma materia'
    };
    let extraInfo = '';
    if (c.type === 'meeting' && c.teacherIds) {
      const names = c.teacherIds.map(tid => {
        const t = (data.teachers || []).find(x => x.id === tid);
        return t ? t.name.split(' ')[0] : tid;
      }).join(', ');
      const day = (data.config.dayNames || [])[c.dayIndex] || '';
      const period = (data.config.periods || []).find(p => p.id === c.periodId);
      extraInfo = `${day} · ${period ? period.start + '-' + period.end : c.periodId} · ${names}`;
    } else if (c.type === 'no_subject_period') {
      const sub = (data.subjects || []).find(s => s.id === c.subjectId);
      const period = (data.config.periods || []).find(p => p.id === c.periodId);
      extraInfo = `${sub ? sub.name : c.subjectId} no en ${period ? period.name : c.periodId}`;
    } else if (c.type === 'subject_time_range') {
      const sub = (data.subjects || []).find(s => s.id === c.subjectId);
      extraInfo = `${sub ? sub.name : c.subjectId} sólo en: ${(c.allowedPeriodIds || []).join(', ')}`;
    }

    return `
      <div class="constraint-card hard" style="margin-bottom:8px">
        <span class="constraint-icon">🔴</span>
        <div class="constraint-info">
          <div class="constraint-name">${c.name || typeLabels[c.type] || c.type}</div>
          <div class="constraint-desc">${c.description || extraInfo}</div>
        </div>
        <button class="btn btn-icon-sm btn-danger" data-del-hard="${c.id}" title="Eliminar">✕</button>
      </div>
    `;
  }

  function renderSoftConstraint(c) {
    const weightBars = '●'.repeat(Math.ceil(c.weight / 2)) + '○'.repeat(5 - Math.ceil(c.weight / 2));
    return `
      <div class="constraint-card soft" style="margin-bottom:8px">
        <span class="constraint-icon">🟡</span>
        <div class="constraint-info">
          <div class="constraint-name">${c.name}</div>
          <div class="constraint-desc">${c.description}</div>
          <div style="font-size:10px; color:var(--warning); margin-top:3px">Peso: ${weightBars} (${c.weight}/10)</div>
        </div>
        <button class="btn btn-icon-sm btn-warning" data-del-soft="${c.id}" title="Eliminar">✕</button>
      </div>
    `;
  }

  // ─── Hard Constraint Modal ────────────────────────────────────
  function showHardConstraintModal(existing = null) {
    const data = Store.getData();
    const days = data.config.dayNames || [];
    const academicPeriods = data.config.periods.filter(p => !p.isBreak);
    const teachers = data.teachers || [];
    const subjects = data.subjects || [];

    const title = existing ? 'Editar Restricción Dura' : 'Nueva Restricción Dura';

    const body = `
      <div class="form-group">
        <label class="form-label">Tipo de Restricción <span class="required">*</span></label>
        <select class="form-control" id="hcType">
          <option value="meeting">Reunión Docente (bloquea docentes en un horario)</option>
          <option value="blocked_period">Franja Bloqueada (nadie puede tener clase)</option>
          <option value="no_subject_period">Asignatura no en Franja Específica</option>
          <option value="subject_time_range">Asignatura Solo en Rango de Horas</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre <span class="required">*</span></label>
        <input type="text" class="form-control" id="hcName" placeholder="Ej: Reunión de Área" value="${existing ? existing.name : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <input type="text" class="form-control" id="hcDesc" placeholder="Descripción opcional" value="${existing ? (existing.description || '') : ''}">
      </div>

      <!-- Meeting fields -->
      <div id="hcMeetingFields">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Día</label>
            <select class="form-control" id="hcDay">
              ${days.map((d,i) => `<option value="${i}">${d}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Franja Horaria</label>
            <select class="form-control" id="hcPeriod">
              ${academicPeriods.map(p => `<option value="${p.id}">${p.name} (${p.start}-${p.end})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Docentes involucrados</label>
          <div style="display:flex; flex-wrap:wrap; gap:8px; padding:12px; background:var(--bg-elevated); border-radius:8px; border:1px solid var(--border)">
            ${teachers.map(t => `
              <label class="form-check" style="min-width:140px">
                <input type="checkbox" class="hcTeacher" value="${t.id}">
                <span class="form-check-label">
                  <span class="color-dot" style="background:${t.color}; display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:4px"></span>
                  ${t.name}
                </span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Subject fields -->
      <div id="hcSubjectFields" style="display:none">
        <div class="form-group">
          <label class="form-label">Asignatura</label>
          <select class="form-control" id="hcSubject">
            ${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="hcPeriodField2">
          <label class="form-label">Franja</label>
          <select class="form-control" id="hcPeriod2">
            ${academicPeriods.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="hcAllowedPeriodsField" style="display:none">
          <label class="form-label">Franjas permitidas</label>
          <div style="display:flex; flex-wrap:wrap; gap:8px; padding:10px; background:var(--bg-elevated); border-radius:8px; border:1px solid var(--border)">
            ${academicPeriods.map(p => `
              <label class="form-check">
                <input type="checkbox" class="hcAllowedPeriod" value="${p.id}">
                <span class="form-check-label">${p.name} (${p.start})</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btnSaveHC">Guardar Restricción</button>
    `;

    Modal.open(title, body, footer);

    const typeSelect = document.getElementById('hcType');
    const meetingFields = document.getElementById('hcMeetingFields');
    const subjectFields = document.getElementById('hcSubjectFields');
    const allowedField = document.getElementById('hcAllowedPeriodsField');
    const periodField2 = document.getElementById('hcPeriodField2');

    function updateFields() {
      const type = typeSelect.value;
      if (type === 'meeting' || type === 'blocked_period') {
        meetingFields.style.display = 'block';
        subjectFields.style.display = 'none';
        // For blocked_period, hide teacher list
        document.querySelectorAll('.hcTeacher').forEach(cb => {
          cb.closest('.form-group') && (cb.closest('div').parentElement.style.display =
            type === 'meeting' ? 'block' : 'none');
        });
      } else {
        meetingFields.style.display = 'none';
        subjectFields.style.display = 'block';
        periodField2.style.display = type === 'no_subject_period' ? 'block' : 'none';
        allowedField.style.display = type === 'subject_time_range' ? 'block' : 'none';
      }
    }
    typeSelect.addEventListener('change', updateFields);

    document.getElementById('btnSaveHC').addEventListener('click', () => {
      const type = typeSelect.value;
      const name = document.getElementById('hcName').value.trim();
      const desc = document.getElementById('hcDesc').value.trim();

      if (!name) { toast('El nombre es obligatorio', 'error'); return; }

      const constraint = { type, name, description: desc };

      if (type === 'meeting' || type === 'blocked_period') {
        constraint.dayIndex = parseInt(document.getElementById('hcDay').value);
        constraint.periodId = document.getElementById('hcPeriod').value;
        if (type === 'meeting') {
          constraint.teacherIds = [...document.querySelectorAll('.hcTeacher:checked')].map(cb => cb.value);
          if (constraint.teacherIds.length === 0) { toast('Selecciona al menos un docente', 'error'); return; }
        } else {
          constraint.scope = 'all';
        }
      } else if (type === 'no_subject_period') {
        constraint.subjectId = document.getElementById('hcSubject').value;
        constraint.periodId = document.getElementById('hcPeriod2').value;
        constraint.scope = 'all';
      } else if (type === 'subject_time_range') {
        constraint.subjectId = document.getElementById('hcSubject').value;
        constraint.allowedPeriodIds = [...document.querySelectorAll('.hcAllowedPeriod:checked')].map(cb => cb.value);
        if (constraint.allowedPeriodIds.length === 0) { toast('Selecciona al menos una franja permitida', 'error'); return; }
      }

      if (existing) {
        Store.updateItem('hardConstraints', existing.id, constraint);
        toast('Restricción actualizada', 'success');
      } else {
        Store.addItem('hardConstraints', constraint);
        toast('Restricción dura agregada', 'success');
      }
      closeModal();
      render();
    });
  }

  // ─── Soft Constraint Modal ────────────────────────────────────
  function showSoftConstraintModal(existing = null) {
    const data = Store.getData();
    const subjects = data.subjects || [];

    const softTypes = [
      { value: 'distribute_evenly',   label: 'Distribuir horas uniformemente en la semana' },
      { value: 'no_gaps_teacher',     label: 'Evitar ventanas libres para docentes' },
      { value: 'max_consecutive_same',label: 'Máximo de horas consecutivas misma materia' },
      { value: 'teacher_pref_time',   label: 'Respetar preferencia de horario del docente' },
      { value: 'no_heavy_last',       label: 'Evitar materias pesadas en última hora' },
      { value: 'efis_no_hot_hours',   label: 'Ed. Física no en horas de calor' },
      { value: 'same_day_spread',     label: 'No sobrecargar un día con muchas horas' },
      { value: 'custom',              label: 'Restricción personalizada (solo descripción)' },
    ];

    const body = `
      <div class="form-group">
        <label class="form-label">Tipo <span class="required">*</span></label>
        <select class="form-control" id="scType">
          ${softTypes.map(t => `<option value="${t.value}" ${existing && existing.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nombre <span class="required">*</span></label>
        <input type="text" class="form-control" id="scName" placeholder="Nombre de la restricción" value="${existing ? existing.name : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <input type="text" class="form-control" id="scDesc" placeholder="Descripción detallada" value="${existing ? (existing.description || '') : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Peso (importancia) <span class="required">*</span></label>
        <div style="display:flex; align-items:center; gap:12px">
          <input type="range" id="scWeight" min="1" max="10" value="${existing ? existing.weight : 5}" style="flex:1; accent-color:var(--accent)">
          <span id="scWeightVal" style="font-weight:700; color:var(--accent); width:24px">${existing ? existing.weight : 5}</span>
        </div>
        <div class="form-hint">1 = baja prioridad · 10 = máxima prioridad</div>
      </div>
    `;

    const footer = `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-warning" id="btnSaveSC">Guardar Preferencia</button>
    `;

    Modal.open('Nueva Restricción Blanda', body, footer);

    document.getElementById('scWeight').addEventListener('input', e => {
      document.getElementById('scWeightVal').textContent = e.target.value;
    });

    document.getElementById('btnSaveSC').addEventListener('click', () => {
      const name = document.getElementById('scName').value.trim();
      const desc = document.getElementById('scDesc').value.trim();
      const type = document.getElementById('scType').value;
      const weight = parseInt(document.getElementById('scWeight').value);

      if (!name) { toast('El nombre es obligatorio', 'error'); return; }

      const constraint = { type, name, description: desc, weight };

      if (existing) {
        Store.updateItem('softConstraints', existing.id, constraint);
        toast('Restricción blanda actualizada', 'success');
      } else {
        Store.addItem('softConstraints', constraint);
        toast('Restricción blanda agregada', 'success');
      }
      closeModal();
      render();
    });
  }

  return { render };
})();
