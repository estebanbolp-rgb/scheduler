/* ============================================================
   EduScheduler Pro — views/asignaciones.js
   Assignments management view: Grupo × Asignatura → Profesor + Horas/sem
   ============================================================ */
'use strict';

const ViewAsignaciones = {
  currentGroupFilter: '',

  render: function() {
    const data = Store.getData();
    const assignments = data.assignments || [];
    const groups      = data.groups || [];
    const teachers    = data.teachers || [];
    const subjects    = data.subjects || [];

    const issues = validateAssignments(Store);

    const html = `
      <div class="page-header">
        <div class="page-header-top">
          <div>
            <h1 class="page-title">📋 Carga Horaria</h1>
            <p class="page-subtitle">Asignación de profesores y materias por grupo</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="btnAddAssignment">+ Agregar Asignación</button>
          </div>
        </div>
      </div>

      <!-- Alert for validation status -->
      ${issues.length === 0 ? `
        <div class="alert alert-success mb-4">
          <span class="alert-icon">✓</span>
          <div>
            <div class="alert-title">Carga Horaria Completa</div>
            Todos los grupos tienen su intensidad horaria semanal completa.
          </div>
        </div>
      ` : `
        <div class="alert alert-warning mb-4">
          <span class="alert-icon">⚠</span>
          <div>
            <div class="alert-title">Horas Incompletas o Sobrantes</div>
            ${issues.map(i => `<div>${i.group.name}: ${i.assigned}h / ${i.target}h target (${i.diff > 0 ? 'faltan ' + i.diff + 'h' : 'sobran ' + Math.abs(i.diff) + 'h'})</div>`).join('')}
          </div>
        </div>
      `}

      <!-- Teacher Workload Summary Bars -->
      <div class="card mb-4">
        <div class="card-header">
          <div class="card-title">👨‍🏫 Carga de Trabajo por Docente</div>
        </div>
        <div class="card-body">
          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:12px">
            ${teachers.map(teacher => {
              const wl = getTeacherWorkload(teacher.id, Store);
              const cls = wl.percent > 100 ? 'workload-over' : wl.percent >= 90 ? 'workload-warn' : wl.percent >= 50 ? 'workload-ok' : 'workload-under';
              return `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px">
                    <span>
                      <span class="color-dot" style="background:${teacher.color || '#6366f1'}; display:inline-block; margin-right:4px"></span>
                      <strong>${teacher.name}</strong>
                    </span>
                    <span class="text-muted">${wl.total}h / ${wl.max}h</span>
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

      <!-- Filter + Table Card -->
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap; gap:12px">
          <div class="card-title">Lista de Asignaciones (${assignments.length})</div>
          <div style="min-width:200px">
            <select class="form-control" id="filterGroupSelect">
              <option value="">Todos los Grupos</option>
              ${groups.map(g => `<option value="${g.id}" ${this.currentGroupFilter === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Asignatura</th>
                  <th>Docente</th>
                  <th>Horas / Semana</th>
                  <th>% del Grupo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${this.generateRows(assignments, groups, teachers, subjects)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('view-container').innerHTML = html;
    this.initEvents();
  },

  generateRows: function(assignments, groups, teachers, subjects) {
    let filtered = assignments;
    if (this.currentGroupFilter) {
      filtered = assignments.filter(a => a.groupId === this.currentGroupFilter);
    }

    if (filtered.length === 0) {
      return `<tr><td colspan="6" class="empty-state" style="padding:40px"><div class="empty-icon">📋</div><div class="empty-title">Sin asignaciones registradas</div></td></tr>`;
    }

    return filtered.map(a => {
      const group   = groups.find(g => g.id === a.groupId);
      const subject = subjects.find(s => s.id === a.subjectId);
      const teacher = teachers.find(t => t.id === a.teacherId);

      const target = group ? (group.totalHours || 25) : 25;
      const pct = Math.round((a.hoursPerWeek / target) * 100);

      return `
        <tr>
          <td class="font-semibold">${group ? group.name : 'Desconocido'}</td>
          <td>
            <span class="color-dot" style="background:${subject ? (subject.color || '#6366f1') : '#ccc'}; display:inline-block; margin-right:4px"></span>
            ${subject ? subject.name : 'Desconocida'}
          </td>
          <td>
            <span class="color-dot" style="background:${teacher ? (teacher.color || '#6366f1') : '#ccc'}; display:inline-block; margin-right:4px"></span>
            ${teacher ? teacher.name : 'Desconocido'}
          </td>
          <td class="font-semibold">${a.hoursPerWeek}h / sem</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px">
              <div class="progress-bar" style="width:60px; height:6px">
                <div class="progress-fill" style="width:${pct}%"></div>
              </div>
              <span class="text-sm text-muted">${pct}%</span>
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-icon-sm btn-ghost edit-assignment" data-id="${a.id}" title="Editar">✏️</button>
              <button class="btn btn-icon-sm btn-danger delete-assignment" data-id="${a.id}" title="Eliminar">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  initEvents: function() {
    const filterSelect = document.getElementById('filterGroupSelect');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.currentGroupFilter = e.target.value;
        this.render();
      });
    }

    const btnAdd = document.getElementById('btnAddAssignment');
    if (btnAdd) btnAdd.addEventListener('click', () => this.openModal());

    document.querySelectorAll('.edit-assignment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const assignment = Store.findById('assignments', id);
        if (assignment) this.openModal(assignment);
      });
    });

    document.querySelectorAll('.delete-assignment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        confirmAction('¿Está seguro de eliminar esta asignación horaria?', () => {
          Store.deleteItem('assignments', id);
          toast('Asignación eliminada', 'success');
          this.render();
        });
      });
    });
  },

  openModal: function(assignment = null) {
    const isEdit = !!assignment;
    const data = Store.getData();
    const groups   = data.groups || [];
    const subjects = data.subjects || [];
    const teachers = data.teachers || [];

    if (groups.length === 0 || subjects.length === 0 || teachers.length === 0) {
      toast('Debes tener creados grupos, asignaturas y docentes antes de crear asignaciones.', 'warning');
      return;
    }

    const body = `
      <div class="form-group">
        <label class="form-label">Grupo <span class="required">*</span></label>
        <select id="asgGroup" class="form-control">
          ${groups.map(g => `<option value="${g.id}" ${assignment && assignment.groupId === g.id ? 'selected' : ''}>${g.name} (${g.level})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Asignatura <span class="required">*</span></label>
        <select id="asgSubject" class="form-control">
          ${subjects.map(s => `<option value="${s.id}" ${assignment && assignment.subjectId === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Profesor Asignado <span class="required">*</span></label>
        <select id="asgTeacher" class="form-control">
          ${teachers.map(t => `<option value="${t.id}" ${assignment && assignment.teacherId === t.id ? 'selected' : ''}>${t.name} (${t.area || 'Sin área'})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Horas Semanales <span class="required">*</span></label>
        <input type="number" id="asgHours" class="form-control" min="1" max="15" value="${assignment ? (assignment.hoursPerWeek || 2) : 2}">
      </div>
    `;

    const footer = `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btnSaveAssignment">Guardar</button>
    `;

    Modal.open(isEdit ? 'Editar Asignación' : 'Nueva Asignación Horaria', body, footer);

    document.getElementById('btnSaveAssignment').addEventListener('click', () => {
      const groupId = document.getElementById('asgGroup').value;
      const subjectId = document.getElementById('asgSubject').value;
      const teacherId = document.getElementById('asgTeacher').value;
      const hoursPerWeek = parseInt(document.getElementById('asgHours').value) || 1;

      if (!groupId || !subjectId || !teacherId) {
        toast('Todos los campos son obligatorios', 'error');
        return;
      }

      const payload = { groupId, subjectId, teacherId, hoursPerWeek };

      if (isEdit) {
        Store.updateItem('assignments', assignment.id, payload);
        toast('Asignación actualizada', 'success');
      } else {
        Store.addItem('assignments', payload);
        toast('Asignación agregada', 'success');
      }

      closeModal();
      this.render();
    });
  }
};
