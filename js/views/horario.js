/* ============================================================
   EduScheduler Pro — views/horario.js
   Timetable visualization: by group, by teacher, by room
   ============================================================ */
'use strict';

const ViewHorario = (() => {

  let _currentView = 'grupo';
  let _selectedId  = null;
  let _dragSlot    = null;

  function render() {
    const data = Store.getData();
    if (!data.timetable || !data.timetable.slots || data.timetable.slots.length === 0) {
      renderNoSchedule();
      return;
    }
    renderSchedule(data);
  }

  function renderNoSchedule() {
    document.getElementById('view-container').innerHTML = `
      <div class="page-header">
        <h1 class="page-title">📊 Horarios</h1>
      </div>
      <div class="empty-state" style="padding:80px">
        <div class="empty-icon" style="font-size:48px">📅</div>
        <div class="empty-title">No hay horario generado</div>
        <div class="empty-desc">Primero genera el horario en la sección "Generar Horario".</div>
        <button class="btn btn-primary mt-4" onclick="App.navigate('generador')">Ir al Generador</button>
      </div>
    `;
  }

  function renderSchedule(data) {
    const slots       = data.timetable.slots;
    const academicPeriods = Constraints.getAcademicPeriods(data.config);
    const days        = data.config.cycleDays;
    const dayNames    = data.config.dayNames || [];
    const allPeriods  = data.config.periods || [];

    // Default selected
    if (!_selectedId) {
      if (_currentView === 'grupo' && data.groups.length > 0) _selectedId = data.groups[0].id;
      else if (_currentView === 'profesor' && data.teachers.length > 0) _selectedId = data.teachers[0].id;
      else if (_currentView === 'aula' && data.rooms.length > 0) _selectedId = data.rooms[0].id;
    }

    const entities = _currentView === 'grupo' ? data.groups :
                     _currentView === 'profesor' ? data.teachers : data.rooms;

    // Build subject color map
    const colorMap = {};
    (data.subjects || []).forEach(s => { colorMap[s.id] = s.color || '#6366f1'; });

    document.getElementById('view-container').innerHTML = `
      <div class="page-header no-print">
        <div class="page-header-top">
          <div>
            <h1 class="page-title">📊 Visualización de Horarios</h1>
            <p class="page-subtitle">${data.config.schoolName} · Año ${data.config.year} · Jornada ${data.config.jornada}</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-ghost" onclick="window.print()" title="Imprimir">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Imprimir
            </button>
          </div>
        </div>
      </div>

      <!-- View selector tabs -->
      <div class="timetable-view-tabs no-print">
        <button class="timetable-view-tab ${_currentView==='grupo' ? 'active' : ''}" id="tabGrupo">👥 Por Grupo</button>
        <button class="timetable-view-tab ${_currentView==='profesor' ? 'active' : ''}" id="tabProfesor">👨‍🏫 Por Docente</button>
        <button class="timetable-view-tab ${_currentView==='aula' ? 'active' : ''}" id="tabAula">🏛️ Por Espacio</button>
        <button class="timetable-view-tab ${_currentView==='heatmap' ? 'active' : ''}" id="tabHeatmap">🌡️ Mapa de Calor</button>
      </div>

      <!-- Entity selector -->
      <div class="timetable-filters no-print" id="entityFilter" ${_currentView==='heatmap' ? 'style="display:none"' : ''}>
        <div style="font-size:13px; font-weight:600; color:var(--text-secondary); white-space:nowrap">
          ${_currentView === 'grupo' ? 'Seleccionar Grupo:' : _currentView === 'profesor' ? 'Seleccionar Docente:' : 'Seleccionar Espacio:'}
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:6px">
          ${entities.map(e => `
            <button class="btn btn-sm ${_selectedId === e.id ? 'btn-primary' : 'btn-secondary'} entity-btn" data-id="${e.id}">
              ${e.name}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Timetable Grid -->
      <div id="timetableOutput">
        ${_currentView === 'heatmap' ? renderHeatmap(slots, data, academicPeriods, days, dayNames, colorMap) : renderGrid(slots, data, academicPeriods, allPeriods, days, dayNames, colorMap)}
      </div>

      <!-- Legend -->
      <div class="timetable-legend no-print" id="legendBox">
        ${buildLegend(slots, data, colorMap)}
      </div>

      <!-- Workload summary -->
      ${_currentView === 'profesor' ? renderTeacherWorkloadSummary(slots, data) : ''}
    `;

    // Tab events
    document.getElementById('tabGrupo').addEventListener('click', () => { _currentView='grupo'; _selectedId=null; render(); });
    document.getElementById('tabProfesor').addEventListener('click', () => { _currentView='profesor'; _selectedId=null; render(); });
    document.getElementById('tabAula').addEventListener('click', () => { _currentView='aula'; _selectedId=null; render(); });
    document.getElementById('tabHeatmap').addEventListener('click', () => { _currentView='heatmap'; render(); });

    // Entity selector
    document.querySelectorAll('.entity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _selectedId = btn.dataset.id;
        document.getElementById('timetableOutput').innerHTML =
          renderGrid(slots, data, academicPeriods, allPeriods, days, dayNames, colorMap);
        document.querySelectorAll('.entity-btn').forEach(b => b.className = `btn btn-sm ${b.dataset.id===_selectedId ? 'btn-primary' : 'btn-secondary'} entity-btn`);
        document.getElementById('legendBox').innerHTML = buildLegend(slots, data, colorMap);
        initDragDrop(slots, data, academicPeriods, days, colorMap);
      });
    });

    initDragDrop(slots, data, academicPeriods, days, colorMap);
  }

  // ─── Render Grid ─────────────────────────────────────────────
  function renderGrid(slots, data, academicPeriods, allPeriods, days, dayNames, colorMap) {
    if (!_selectedId) return '<div class="empty-state"><div class="empty-title">Selecciona una entidad</div></div>';

    // Filter slots based on view type
    const filteredSlots = slots.filter(s => {
      if (_currentView === 'grupo')    return s.groupId   === _selectedId;
      if (_currentView === 'profesor') return s.teacherId === _selectedId;
      if (_currentView === 'aula')     return s.roomId    === _selectedId;
      return true;
    });

    const entityName = (() => {
      if (_currentView === 'grupo')    return Store.findById('groups',   _selectedId)?.name || '';
      if (_currentView === 'profesor') return Store.findById('teachers', _selectedId)?.name || '';
      if (_currentView === 'aula')     return Store.findById('rooms',    _selectedId)?.name || '';
      return '';
    })();

    // Build slot map: [day][periodId] = slot
    const slotMap = {};
    filteredSlots.forEach(s => {
      if (!slotMap[s.dayIndex]) slotMap[s.dayIndex] = {};
      slotMap[s.dayIndex][s.periodId] = s;
    });

    // Hard constraint markers
    const hcBlocked = {};
    const hcMeetings = {};
    (data.hardConstraints || []).forEach(hc => {
      if (hc.type === 'blocked_period') {
        const key = `${hc.dayIndex}_${hc.periodId}`;
        hcBlocked[key] = hc.name;
      }
      if (hc.type === 'meeting') {
        const key = `${hc.dayIndex}_${hc.periodId}`;
        if (!_selectedId || (_currentView === 'profesor' && hc.teacherIds && hc.teacherIds.includes(_selectedId))) {
          hcMeetings[key] = hc.name;
        }
      }
    });

    let html = `
      <div style="margin-bottom:8px; font-size:15px; font-weight:700; color:var(--text-primary)">
        ${entityName}
      </div>
      <div class="timetable-wrapper">
        <table class="timetable" style="--day-count:${days}">
          <thead>
            <tr>
              <th>Hora</th>
              ${Array.from({length: days}, (_,i) => `<th>${dayNames[i]||'Día '+(i+1)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    allPeriods.forEach(period => {
      if (period.isBreak) {
        html += `
          <tr class="break-row">
            <td class="period-label">
              <div class="break-label">${period.name}</div>
              <div class="period-label-time">${period.start}–${period.end}</div>
            </td>
            ${Array.from({length: days}, () => `<td class="schedule-cell"></td>`).join('')}
          </tr>
        `;
        return;
      }

      html += `<tr>
        <td class="period-label">
          <div class="period-label-name">${period.name}</div>
          <div class="period-label-time">${period.start}–${period.end}</div>
        </td>
      `;

      for (let d = 0; d < days; d++) {
        const key = `${d}_${period.id}`;
        const slot = slotMap[d] && slotMap[d][period.id];
        const isBlocked = hcBlocked[key];
        const isMeeting = hcMeetings[key];
        const cellClass = isBlocked ? 'blocked-cell' : isMeeting ? 'meeting-cell' : '';

        html += `<td class="schedule-cell ${cellClass}" data-day="${d}" data-period="${period.id}" data-drop-target>`;

        if (slot) {
          const subject = Store.findById('subjects', slot.subjectId);
          const teacher = Store.findById('teachers', slot.teacherId);
          const group   = Store.findById('groups',   slot.groupId);
          const room    = Store.findById('rooms',     slot.roomId);
          const color   = colorMap[slot.subjectId] || '#6366f1';

          html += `
            <div class="class-block" 
                 style="background: linear-gradient(135deg, ${color}, ${lightenColor(color, 15)}); border-color: ${color}40;"
                 draggable="true"
                 data-slot-id="${slot.id}"
                 title="${subject?.name || ''} · ${teacher?.name || ''} · ${room?.name || ''}">
              <div class="class-block-subject">${subject?.name || '?'}</div>
              <div class="class-block-meta">
                <span class="class-block-teacher">
                  ${_currentView === 'grupo' ? (teacher?.name?.split(' ')[0] || '') :
                    _currentView === 'profesor' ? (group?.name || '') :
                    (group?.name || '')}
                </span>
                <span class="class-block-room">${room?.name ? '🏛' + room.name.replace('Aula ','') : ''}</span>
              </div>
            </div>
          `;
        } else if (isBlocked) {
          html += `<div style="padding:4px; font-size:10px; color:var(--danger); text-align:center">🚫 ${isBlocked}</div>`;
        } else if (isMeeting) {
          html += `<div style="padding:4px; font-size:10px; color:var(--warning); text-align:center">📋 ${isMeeting}</div>`;
        } else {
          html += `<div class="cell-empty">+</div>`;
        }

        html += `</td>`;
      }

      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    return html;
  }

  // ─── Heatmap View ─────────────────────────────────────────────
  function renderHeatmap(slots, data, academicPeriods, days, dayNames, colorMap) {
    const heatData = {};
    for (let d = 0; d < days; d++) {
      heatData[d] = {};
      academicPeriods.forEach(p => { heatData[d][p.id] = 0; });
    }
    slots.forEach(s => {
      if (heatData[s.dayIndex] !== undefined && heatData[s.dayIndex][s.periodId] !== undefined) {
        heatData[s.dayIndex][s.periodId]++;
      }
    });
    const maxVal = Math.max(1, ...Object.values(heatData).flatMap(d => Object.values(d)));

    let html = `
      <div style="margin-bottom:12px; font-size:15px; font-weight:700">Mapa de Calor de Ocupación</div>
      <div class="timetable-wrapper">
        <table class="timetable" style="--day-count:${days}">
          <thead>
            <tr>
              <th>Hora</th>
              ${Array.from({length: days}, (_,i) => `<th>${dayNames[i]||'Día '+(i+1)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    academicPeriods.forEach(period => {
      html += `<tr>
        <td class="period-label">
          <div class="period-label-name">${period.name}</div>
          <div class="period-label-time">${period.start}–${period.end}</div>
        </td>
      `;
      for (let d = 0; d < days; d++) {
        const val = heatData[d][period.id] || 0;
        const pct = val / maxVal;
        const alpha = 0.15 + pct * 0.75;
        const r = Math.round(99 + pct * 130);
        const g = Math.round(102 - pct * 60);
        const b = Math.round(241 - pct * 200);
        html += `
          <td class="schedule-cell heatmap-cell" style="background:rgba(${r},${g},${b},${alpha}); text-align:center; vertical-align:middle">
            <div style="font-size:18px; font-weight:800; color:${pct > 0.5 ? 'white' : 'var(--text-primary)'}">${val}</div>
            <div style="font-size:10px; color:${pct > 0.5 ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'}">clase${val !== 1 ? 's' : ''}</div>
          </td>
        `;
      }
      html += `</tr>`;
    });

    html += `</tbody></table></div>
      <div style="display:flex; align-items:center; gap:12px; margin-top:12px; font-size:12px; color:var(--text-muted)">
        <span>Menor ocupación</span>
        <div style="display:flex; gap:4px">
          ${[0,0.25,0.5,0.75,1].map(v => {
            const r = Math.round(99 + v * 130);
            const g = Math.round(102 - v * 60);
            const b = Math.round(241 - v * 200);
            return `<div style="width:24px; height:16px; border-radius:3px; background:rgba(${r},${g},${b},${0.15+v*0.75})"></div>`;
          }).join('')}
        </div>
        <span>Mayor ocupación</span>
      </div>
    `;
    return html;
  }

  // ─── Legend ───────────────────────────────────────────────────
  function buildLegend(slots, data, colorMap) {
    const usedSubjectIds = [...new Set(slots.map(s => s.subjectId))];
    return usedSubjectIds.map(sid => {
      const sub = Store.findById('subjects', sid);
      const color = colorMap[sid] || '#6366f1';
      return `
        <div class="legend-item">
          <div class="legend-dot" style="background:${color}"></div>
          <span>${sub ? sub.name : sid}</span>
        </div>
      `;
    }).join('');
  }

  // ─── Teacher Workload Summary ─────────────────────────────────
  function renderTeacherWorkloadSummary(slots, data) {
    return `
      <div class="card mt-4 no-print">
        <div class="card-header"><div class="card-title">📊 Resumen de Carga Docente</div></div>
        <div class="card-body">
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap:12px">
            ${(data.teachers || []).map(teacher => {
              const wl = getTeacherWorkload(teacher.id, Store);
              const cls = wl.percent > 100 ? 'workload-over' : wl.percent > 90 ? 'workload-warn' : wl.percent > 50 ? 'workload-ok' : 'workload-under';
              return `
                <div style="display:flex; flex-direction:column; gap:6px">
                  <div style="display:flex; align-items:center; gap:8px">
                    <span class="color-dot" style="background:${teacher.color}; width:10px; height:10px; border-radius:50%; flex-shrink:0"></span>
                    <span style="font-size:13px; font-weight:500; flex:1">${teacher.name}</span>
                    <span style="font-size:12px; font-weight:700; color:var(--text-primary)">${wl.total}/${wl.max}h</span>
                  </div>
                  <div class="workload-bar">
                    <div class="workload-fill ${cls}" style="width:${wl.percent}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ─── Drag & Drop ─────────────────────────────────────────────
  function initDragDrop(slots, data, academicPeriods, days, colorMap) {
    const blocks = document.querySelectorAll('.class-block[draggable]');
    const dropTargets = document.querySelectorAll('[data-drop-target]');

    blocks.forEach(block => {
      block.addEventListener('dragstart', e => {
        _dragSlot = block.dataset.slotId;
        block.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      block.addEventListener('dragend', () => {
        block.classList.remove('dragging');
        _dragSlot = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
    });

    dropTargets.forEach(cell => {
      cell.addEventListener('dragover', e => {
        e.preventDefault();
        cell.classList.add('drag-over');
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
      cell.addEventListener('drop', e => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        if (!_dragSlot) return;

        const toDayIndex  = parseInt(cell.dataset.day);
        const toPeriodId  = cell.dataset.period;
        const timetable   = Store.get('timetable');
        const slotIdx     = timetable.slots.findIndex(s => s.id === _dragSlot);
        if (slotIdx === -1) return;

        const slot = timetable.slots[slotIdx];
        const slotsWithout = timetable.slots.filter((_, i) => i !== slotIdx);
        const assignment = (data.assignments || []).find(a => a.id === slot.assignmentId);
        if (!assignment) return;

        const validation = Constraints.isValidPlacement(toDayIndex, toPeriodId, slot.assignmentId, slotsWithout, Store);
        if (!validation.valid) {
          toast(`No se puede mover: ${validation.reason}`, 'warning');
          return;
        }

        timetable.slots[slotIdx] = { ...slot, dayIndex: toDayIndex, periodId: toPeriodId };
        const newQuality = Constraints.validateSchedule(timetable.slots, Store);
        timetable.quality = newQuality;
        Store.set('timetable', timetable);
        toast('Clase movida correctamente', 'success');
        render();
      });
    });
  }

  return { render };
})();
