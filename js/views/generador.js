/* ============================================================
   EduScheduler Pro — views/generador.js
   Schedule generator view with progress, quality display
   ============================================================ */
'use strict';

const ViewGenerador = (() => {

  let _generating = false;

  function render() {
    const data = Store.getData();
    const hasAssignments = (data.assignments || []).length > 0;
    const hasGroups      = (data.groups || []).length > 0;
    const hasTeachers    = (data.teachers || []).length > 0;
    const timetable      = data.timetable;
    const quality        = timetable ? timetable.quality : null;

    // Pre-checks
    const checks = [
      { label: 'Profesores configurados',   ok: hasTeachers,    value: `${data.teachers.length}` },
      { label: 'Grupos configurados',       ok: hasGroups,      value: `${data.groups.length}` },
      { label: 'Asignaturas configuradas',  ok: (data.subjects||[]).length > 0, value: `${data.subjects.length}` },
      { label: 'Espacios configurados',     ok: (data.rooms||[]).length > 0,    value: `${data.rooms.length}` },
      { label: 'Carga horaria asignada',   ok: hasAssignments,  value: `${data.assignments.length} asignaciones` },
    ];
    const allOk = checks.every(c => c.ok);

    // Validate assignments completeness
    const assignIssues = validateAssignments(Store);

    document.getElementById('view-container').innerHTML = `
      <div class="page-header">
        <div class="page-header-top">
          <div>
            <h1 class="page-title">⚡ Generador de Horario</h1>
            <p class="page-subtitle">Algoritmo de programación con restricciones</p>
          </div>
          ${timetable ? `
            <div class="page-actions no-print">
              <button class="btn btn-ghost" id="btnClearSchedule">🗑 Limpiar horario</button>
              <button class="btn btn-primary" id="btnViewSchedule">📊 Ver Horarios</button>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="grid-2" style="gap:24px; align-items:start">
        <!-- Left: Pre-checks + Generate -->
        <div>
          <!-- Pre-requisites -->
          <div class="card mb-4">
            <div class="card-header">
              <div class="card-title">✅ Verificación Pre-generación</div>
            </div>
            <div class="card-body">
              ${checks.map(c => `
                <div style="display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid var(--border)">
                  <span style="font-size:16px">${c.ok ? '✅' : '❌'}</span>
                  <span style="flex:1; font-size:13px; color:${c.ok ? 'var(--text-primary)' : 'var(--text-muted)'}">${c.label}</span>
                  <span class="badge ${c.ok ? 'badge-success' : 'badge-danger'}">${c.value}</span>
                </div>
              `).join('')}

              ${assignIssues.length > 0 ? `
                <div class="alert alert-warning mt-2">
                  <span class="alert-icon">⚠</span>
                  <div>
                    <div class="alert-title">Grupos con horas incompletas</div>
                    ${assignIssues.map(i => `
                      <div style="font-size:12px">${i.group.name}: ${i.assigned}h de ${i.target}h (${i.diff > 0 ? 'faltan ' + i.diff + 'h' : 'sobran ' + Math.abs(i.diff) + 'h'})</div>
                    `).join('')}
                  </div>
                </div>
              ` : allOk ? `<div class="alert alert-success mt-2"><span class="alert-icon">✓</span><div>Todo listo para generar</div></div>` : ''}
            </div>
          </div>

          <!-- Generate Button -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">🤖 Motor de Generación</div>
            </div>
            <div class="card-body">
              <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px; line-height:1.7">
                El algoritmo utiliza <strong>búsqueda greedy con propagación de restricciones</strong> 
                seguida de <strong>búsqueda local iterativa</strong> para maximizar el cumplimiento 
                de las restricciones blandas mientras garantiza las duras.
              </p>

              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:16px">
                <div style="text-align:center; padding:12px; background:var(--bg-elevated); border-radius:8px">
                  <div style="font-size:20px; font-weight:700; color:var(--accent)">${(data.assignments||[]).length}</div>
                  <div style="font-size:11px; color:var(--text-muted)">Asignaciones</div>
                </div>
                <div style="text-align:center; padding:12px; background:var(--bg-elevated); border-radius:8px">
                  <div style="font-size:20px; font-weight:700; color:var(--accent)">${(data.assignments||[]).reduce((s,a) => s+a.hoursPerWeek,0)}</div>
                  <div style="font-size:11px; color:var(--text-muted)">Horas totales</div>
                </div>
                <div style="text-align:center; padding:12px; background:var(--bg-elevated); border-radius:8px">
                  <div style="font-size:20px; font-weight:700; color:var(--accent)">${data.config.cycleDays * (data.config.periods||[]).filter(p=>!p.isBreak).length}</div>
                  <div style="font-size:11px; color:var(--text-muted)">Slots/grupo</div>
                </div>
              </div>

              <!-- Progress Bar (hidden by default) -->
              <div id="generatorProgress" style="display:none; margin-bottom:16px">
                <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-muted); margin-bottom:4px">
                  <span id="progressMsg">Iniciando...</span>
                  <span id="progressPct">0%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" id="progressFill" style="width:0%"></div>
                </div>
              </div>

              <button class="btn btn-primary btn-full btn-lg" id="btnGenerate" ${!allOk ? 'disabled' : ''}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                ${timetable ? 'Regenerar Horario' : 'Generar Horario'}
              </button>
              ${!allOk ? '<div class="form-hint text-danger" style="text-align:center; margin-top:8px">Completa todos los datos antes de generar</div>' : ''}
            </div>
          </div>
        </div>

        <!-- Right: Results -->
        <div>
          ${timetable ? renderResults(timetable, data) : renderNoResults()}
        </div>
      </div>

      <!-- Failures panel -->
      ${timetable && timetable.failures && timetable.failures.length > 0 ? `
        <div class="card mt-4">
          <div class="card-header">
            <div class="card-title">⚠️ Asignaciones no colocadas</div>
          </div>
          <div class="card-body">
            ${timetable.failures.map(f => {
              const assignment = (data.assignments||[]).find(a => a.id === f.assignment.id) || f.assignment;
              const group = Store.findById('groups', assignment.groupId);
              const subject = Store.findById('subjects', assignment.subjectId);
              const teacher = Store.findById('teachers', assignment.teacherId);
              return `
                <div class="conflict-item conflict-hard">
                  <span>⚠</span>
                  <span><strong>${group ? group.name : '?'}</strong> · ${subject ? subject.name : '?'} (${teacher ? teacher.name : '?'}): 
                  colocadas ${f.placed}/${f.required} horas</span>
                </div>
              `;
            }).join('')}
            <p style="font-size:12px; color:var(--text-muted); margin-top:8px">
              💡 Revisa las restricciones o la disponibilidad de docentes y vuelve a generar.
            </p>
          </div>
        </div>
      ` : ''}
    `;

    // Events
    document.getElementById('btnGenerate').addEventListener('click', runGenerator);
    const clearBtn = document.getElementById('btnClearSchedule');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      confirmAction('¿Limpiar el horario generado?', () => {
        Store.set('timetable', null);
        render();
        toast('Horario eliminado', 'success');
      });
    });
    const viewBtn = document.getElementById('btnViewSchedule');
    if (viewBtn) viewBtn.addEventListener('click', () => App.navigate('horario'));
  }

  function renderNoResults() {
    return `
      <div class="card">
        <div class="card-body">
          <div class="empty-state" style="padding:60px 20px">
            <div class="empty-icon" style="font-size:40px">📅</div>
            <div class="empty-title">Sin horario generado</div>
            <div class="empty-desc">Configura todos los datos y presiona "Generar Horario" para crear el horario automáticamente.</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderResults(timetable, data) {
    const q = timetable.quality;
    const score = q ? q.overallScore : 0;
    const scoreColor = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)';
    const circumference = 2 * Math.PI * 42;
    const offset = circumference - (score / 100) * circumference;

    return `
      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">📊 Calidad del Horario</div>
        </div>
        <div class="card-body">
          <div style="display:flex; align-items:center; gap:24px">
            <!-- Score Ring -->
            <div class="quality-ring">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle class="quality-ring-bg" cx="50" cy="50" r="42"/>
                <circle class="quality-ring-fill" cx="50" cy="50" r="42"
                  stroke="${scoreColor}"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${offset}"/>
              </svg>
              <div class="quality-ring-text">
                <span class="quality-ring-value" style="color:${scoreColor}">${score}</span>
                <span class="quality-ring-label">/ 100</span>
              </div>
            </div>
            <!-- Stats -->
            <div style="flex:1">
              <div style="display:grid; gap:8px">
                <div style="display:flex; justify-content:space-between; font-size:13px">
                  <span style="color:var(--text-secondary)">Restricciones duras</span>
                  <span class="badge ${q && q.violations.length === 0 ? 'badge-success' : 'badge-danger'}">
                    ${q && q.violations.length === 0 ? '✓ Sin conflictos' : `${q.violations.length} conflicto(s)`}
                  </span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px">
                  <span style="color:var(--text-secondary)">Score duro</span>
                  <span style="font-weight:600; color:var(--text-primary)">${q ? q.hardScore : 0}%</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px">
                  <span style="color:var(--text-secondary)">Score blando</span>
                  <span style="font-weight:600; color:var(--text-primary)">${q ? q.softScore : 0}%</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px">
                  <span style="color:var(--text-secondary)">Clases colocadas</span>
                  <span style="font-weight:600; color:var(--accent)">${timetable.slots.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Violations -->
      ${q && (q.violations.length > 0 || q.warnings.length > 0) ? `
        <div class="card">
          <div class="card-header">
            <div class="card-title">🔍 Detalles de Calidad</div>
          </div>
          <div class="card-body" style="max-height:300px; overflow-y:auto">
            ${q.violations.map(v => `
              <div class="conflict-item conflict-hard">
                <span>🔴</span>
                <span>${v.msg}</span>
              </div>
            `).join('')}
            ${q.warnings.slice(0, 10).map(w => `
              <div class="conflict-item conflict-soft">
                <span>${w.type === 'incomplete' ? '📋' : '🟡'}</span>
                <span>${w.msg}</span>
              </div>
            `).join('')}
            ${q.warnings.length > 10 ? `<div style="font-size:12px; color:var(--text-muted); padding:8px">...y ${q.warnings.length - 10} más</div>` : ''}
          </div>
        </div>
      ` : `
        <div class="alert alert-success">
          <span class="alert-icon">✓</span>
          <div>
            <div class="alert-title">¡Horario perfecto!</div>
            Sin conflictos ni advertencias detectados.
          </div>
        </div>
      `}
    `;
  }

  function runGenerator() {
    if (_generating) return;
    _generating = true;

    const btn = document.getElementById('btnGenerate');
    const progressEl = document.getElementById('generatorProgress');
    if (btn) btn.disabled = true;
    if (progressEl) progressEl.style.display = 'block';

    // Run async with small delay to allow UI update
    setTimeout(() => {
      try {
        const result = Scheduler.generate(Store, (pct, msg) => {
          const fill = document.getElementById('progressFill');
          const pctEl = document.getElementById('progressPct');
          const msgEl = document.getElementById('progressMsg');
          if (fill) fill.style.width = pct + '%';
          if (pctEl) pctEl.textContent = pct + '%';
          if (msgEl) msgEl.textContent = msg;
        });

        Store.set('timetable', result);
        toast(`Horario generado. Calidad: ${result.quality.overallScore}/100`, 'success');
      } catch (err) {
        console.error('Scheduler error:', err);
        toast('Error al generar el horario: ' + err.message, 'error');
      } finally {
        _generating = false;
        render();
      }
    }, 50);
  }

  return { render };
})();
