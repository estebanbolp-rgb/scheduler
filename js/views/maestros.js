/* ============================================================
   EduScheduler Pro — views/maestros.js
   Master Data Views: Profesores, Grupos, Asignaturas, Espacios
   ============================================================ */
'use strict';

// ─── PROFESORES ────────────────────────────────────────────────
const ViewProfesores = {
  render: function() {
    const teachers = Store.get('teachers') || [];
    const badge = document.getElementById('badge-profesores');
    if (badge) badge.textContent = teachers.length;

    const html = `
      <div class="page-header">
        <div class="page-header-top">
          <div>
            <h1 class="page-title">👨‍🏫 Profesores</h1>
            <p class="page-subtitle">Gestión del personal docente y su disponibilidad</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="btnAddTeacher">+ Agregar Docente</button>
          </div>
        </div>
      </div>

      <div class="search-bar">
        <div class="search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="searchTeacher" class="search-input" placeholder="Buscar docente por nombre o área...">
        </div>
      </div>

      <div class="card table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Color</th>
              <th>Nombre</th>
              <th>Área</th>
              <th>Max h/día</th>
              <th>Max h/sem</th>
              <th>Carga Actual</th>
              <th>Preferencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="teachersTbody">
            ${this.generateRows(teachers)}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('view-container').innerHTML = html;
    this.initEvents();
  },

  generateRows: function(teachers, filter = '') {
    const filtered = teachers.filter(t => 
      (t.name || '').toLowerCase().includes(filter.toLowerCase()) ||
      (t.area || '').toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      return `<tr><td colspan="8" class="empty-state" style="padding:40px"><div class="empty-icon">👥</div><div class="empty-title">Sin profesores registrados</div></td></tr>`;
    }

    return filtered.map(t => {
      const wl = getTeacherWorkload(t.id, Store);
      return `
        <tr>
          <td><span class="color-dot" style="background:${t.color || '#6366f1'}"></span></td>
          <td class="font-semibold">${t.name}</td>
          <td>${t.area || '-'}</td>
          <td>${t.maxHoursDay || 6}h</td>
          <td>${t.maxHoursWeek || 25}h</td>
          <td>
            <span class="badge ${wl.percent > 100 ? 'badge-danger' : wl.percent >= 90 ? 'badge-warning' : 'badge-success'}">
              ${wl.total}h / ${wl.max}h
            </span>
          </td>
          <td><span class="badge badge-neutral">${t.preferredTime || 'cualquiera'}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-icon-sm btn-ghost edit-teacher" data-id="${t.id}" title="Editar">✏️</button>
              <button class="btn btn-icon-sm btn-danger delete-teacher" data-id="${t.id}" title="Eliminar">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  initEvents: function() {
    document.getElementById('searchTeacher').addEventListener('input', (e) => {
      const teachers = Store.get('teachers') || [];
      document.getElementById('teachersTbody').innerHTML = this.generateRows(teachers, e.target.value);
      this.attachRowEvents();
    });

    document.getElementById('btnAddTeacher').addEventListener('click', () => this.openModal());
    this.attachRowEvents();
  },

  attachRowEvents: function() {
    document.querySelectorAll('.edit-teacher').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const teacher = Store.findById('teachers', id);
        if (teacher) this.openModal(teacher);
      });
    });

    document.querySelectorAll('.delete-teacher').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        confirmAction('¿Está seguro de eliminar este profesor?', () => {
          Store.deleteItem('teachers', id);
          toast('Profesor eliminado', 'success');
          this.render();
        });
      });
    });
  },

  openModal: function(teacher = null) {
    const isEdit = !!teacher;
    const days = Store.get('config')?.dayNames || ['Lunes','Martes','Miércoles','Jueves','Viernes'];
    const periods = (Store.get('config')?.periods || []).filter(p => !p.isBreak);

    let avail = teacher && teacher.availability ? teacher.availability : null;

    let availGrid = `
      <div style="max-height:180px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--r-md); padding:8px;">
        <table class="table" style="font-size:11px; text-align:center;">
          <thead>
            <tr>
              <th>Franja</th>
              ${days.map(d => `<th>${d}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    periods.forEach((p, pIdx) => {
      availGrid += `<tr><td style="font-weight:600">${p.name}</td>`;
      days.forEach((_, dIdx) => {
        const checked = (!avail || !avail[dIdx] || avail[dIdx][pIdx] !== false) ? 'checked' : '';
        availGrid += `
          <td>
            <input type="checkbox" class="avail-cb" data-day="${dIdx}" data-period="${pIdx}" ${checked}>
          </td>
        `;
      });
      availGrid += `</tr>`;
    });

    availGrid += `</tbody></table></div>`;

    const body = `
      <div class="form-group">
        <label class="form-label">Nombre Completo <span class="required">*</span></label>
        <input type="text" id="tName" class="form-control" placeholder="Ej: Ana García" value="${teacher ? teacher.name : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Área / Especialidad</label>
        <input type="text" id="tArea" class="form-control" placeholder="Ej: Matemáticas" value="${teacher ? (teacher.area || '') : ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Máx. Horas / Día</label>
          <input type="number" id="tMaxDay" class="form-control" min="1" max="8" value="${teacher ? (teacher.maxHoursDay || 6) : 6}">
        </div>
        <div class="form-group">
          <label class="form-label">Máx. Horas / Semana</label>
          <input type="number" id="tMaxWeek" class="form-control" min="10" max="40" value="${teacher ? (teacher.maxHoursWeek || 25) : 25}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Turno Preferido</label>
          <select id="tPref" class="form-control">
            <option value="cualquiera" ${teacher && teacher.preferredTime === 'cualquiera' ? 'selected' : ''}>Cualquiera</option>
            <option value="mañana" ${teacher && teacher.preferredTime === 'mañana' ? 'selected' : ''}>Mañana</option>
            <option value="tarde" ${teacher && teacher.preferredTime === 'tarde' ? 'selected' : ''}>Tarde</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Color Distintivo</label>
          <input type="color" id="tColor" class="form-control" style="height:38px; padding:2px" value="${teacher ? (teacher.color || '#6366f1') : '#6366f1'}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Disponibilidad (Franjas permitidas)</label>
        ${availGrid}
      </div>
    `;

    const footer = `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btnSaveTeacher">Guardar</button>
    `;

    Modal.open(isEdit ? 'Editar Docente' : 'Agregar Docente', body, footer);

    document.getElementById('btnSaveTeacher').addEventListener('click', () => {
      const name = document.getElementById('tName').value.trim();
      if (!name) { toast('El nombre es requerido', 'error'); return; }

      const area = document.getElementById('tArea').value.trim();
      const maxHoursDay = parseInt(document.getElementById('tMaxDay').value) || 6;
      const maxHoursWeek = parseInt(document.getElementById('tMaxWeek').value) || 25;
      const preferredTime = document.getElementById('tPref').value;
      const color = document.getElementById('tColor').value;

      const availability = {};
      days.forEach((_, dIdx) => { availability[dIdx] = []; });
      document.querySelectorAll('.avail-cb').forEach(cb => {
        const d = parseInt(cb.dataset.day);
        const p = parseInt(cb.dataset.period);
        availability[d][p] = cb.checked;
      });

      const data = { name, area, maxHoursDay, maxHoursWeek, preferredTime, color, availability };

      if (isEdit) {
        Store.updateItem('teachers', teacher.id, data);
        toast('Docente actualizado', 'success');
      } else {
        Store.addItem('teachers', data);
        toast('Docente agregado', 'success');
      }

      closeModal();
      this.render();
    });
  }
};

// ─── GRUPOS ────────────────────────────────────────────────────
const ViewGrupos = {
  render: function() {
    const groups = Store.get('groups') || [];
    const badge = document.getElementById('badge-grupos');
    if (badge) badge.textContent = groups.length;

    const html = `
      <div class="page-header">
        <div class="page-header-top">
          <div>
            <h1 class="page-title">👥 Grupos y Cursos</h1>
            <p class="page-subtitle">Grupos estudiantiles y su intensidad horaria objetivo</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="btnAddGroup">+ Agregar Grupo</button>
          </div>
        </div>
      </div>

      <div class="card table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Nivel</th>
              <th>Capacidad</th>
              <th>Horas Target</th>
              <th>Horas Asignadas</th>
              <th>Diferencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${this.generateRows(groups)}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('view-container').innerHTML = html;
    this.initEvents();
  },

  generateRows: function(groups) {
    if (groups.length === 0) {
      return `<tr><td colspan="7" class="empty-state" style="padding:40px"><div class="empty-icon">🏫</div><div class="empty-title">Sin grupos registrados</div></td></tr>`;
    }

    return groups.map(g => {
      const assigned = getGroupHours(g.id, Store);
      const target = g.totalHours || 25;
      const diff = target - assigned;
      const diffBadge = diff === 0 ? 'badge-success' : diff > 0 ? 'badge-warning' : 'badge-danger';

      return `
        <tr>
          <td class="font-semibold">${g.name}</td>
          <td><span class="badge ${levelBadgeClass(g.level)}">${g.level || 'Primaria'}</span></td>
          <td>${g.capacity || 30} estudiantes</td>
          <td>${target}h / sem</td>
          <td>${assigned}h</td>
          <td><span class="badge ${diffBadge}">${diff === 0 ? '✓ Completo' : diff > 0 ? `Faltan ${diff}h` : `Sobran ${Math.abs(diff)}h`}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-icon-sm btn-ghost edit-group" data-id="${g.id}" title="Editar">✏️</button>
              <button class="btn btn-icon-sm btn-danger delete-group" data-id="${g.id}" title="Eliminar">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  initEvents: function() {
    document.getElementById('btnAddGroup').addEventListener('click', () => this.openModal());

    document.querySelectorAll('.edit-group').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const group = Store.findById('groups', id);
        if (group) this.openModal(group);
      });
    });

    document.querySelectorAll('.delete-group').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        confirmAction('¿Está seguro de eliminar este grupo?', () => {
          Store.deleteItem('groups', id);
          toast('Grupo eliminado', 'success');
          this.render();
        });
      });
    });
  },

  openModal: function(group = null) {
    const isEdit = !!group;

    const body = `
      <div class="form-group">
        <label class="form-label">Nombre del Grupo <span class="required">*</span></label>
        <input type="text" id="gName" class="form-control" placeholder="Ej: 10° A" value="${group ? group.name : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Nivel Educativo</label>
        <select id="gLevel" class="form-control">
          <option value="Preescolar" ${group && group.level === 'Preescolar' ? 'selected' : ''}>Preescolar</option>
          <option value="Primaria" ${group && group.level === 'Primaria' ? 'selected' : ''}>Primaria (25h)</option>
          <option value="Secundaria" ${group && group.level === 'Secundaria' ? 'selected' : ''}>Secundaria (30h)</option>
          <option value="Media" ${group && group.level === 'Media' ? 'selected' : ''}>Media (30h)</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Capacidad de Estudiantes</label>
          <input type="number" id="gCapacity" class="form-control" min="1" value="${group ? (group.capacity || 30) : 30}">
        </div>
        <div class="form-group">
          <label class="form-label">Horas Semanales Target</label>
          <input type="number" id="gTotalHours" class="form-control" min="1" value="${group ? (group.totalHours || 25) : 25}">
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btnSaveGroup">Guardar</button>
    `;

    Modal.open(isEdit ? 'Editar Grupo' : 'Agregar Grupo', body, footer);

    // Auto-update hours on level change if creating new
    if (!isEdit) {
      document.getElementById('gLevel').addEventListener('change', (e) => {
        const hoursEl = document.getElementById('gTotalHours');
        if (e.target.value === 'Primaria') hoursEl.value = 25;
        else if (e.target.value === 'Secundaria' || e.target.value === 'Media') hoursEl.value = 30;
        else if (e.target.value === 'Preescolar') hoursEl.value = 20;
      });
    }

    document.getElementById('btnSaveGroup').addEventListener('click', () => {
      const name = document.getElementById('gName').value.trim();
      if (!name) { toast('El nombre es requerido', 'error'); return; }

      const level = document.getElementById('gLevel').value;
      const capacity = parseInt(document.getElementById('gCapacity').value) || 30;
      const totalHours = parseInt(document.getElementById('gTotalHours').value) || 25;

      const data = { name, level, capacity, totalHours };

      if (isEdit) {
        Store.updateItem('groups', group.id, data);
        toast('Grupo actualizado', 'success');
      } else {
        Store.addItem('groups', data);
        toast('Grupo agregado', 'success');
      }

      closeModal();
      this.render();
    });
  }
};

// ─── ASIGNATURAS ───────────────────────────────────────────────
const ViewAsignaturas = {
  render: function() {
    const subjects = Store.get('subjects') || [];
    const badge = document.getElementById('badge-asignaturas');
    if (badge) badge.textContent = subjects.length;

    const html = `
      <div class="page-header">
        <div class="page-header-top">
          <div>
            <h1 class="page-title">📚 Asignaturas</h1>
            <p class="page-subtitle">Plan de asignaturas del colegio</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="btnAddSubject">+ Agregar Asignatura</button>
          </div>
        </div>
      </div>

      <div class="card table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Color</th>
              <th>Nombre</th>
              <th>Área</th>
              <th>Espacio Especial</th>
              <th>Tipo de Espacio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${this.generateRows(subjects)}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('view-container').innerHTML = html;
    this.initEvents();
  },

  generateRows: function(subjects) {
    if (subjects.length === 0) {
      return `<tr><td colspan="6" class="empty-state" style="padding:40px"><div class="empty-icon">📖</div><div class="empty-title">Sin asignaturas registradas</div></td></tr>`;
    }

    return subjects.map(s => `
      <tr>
        <td><span class="color-dot" style="background:${s.color || '#6366f1'}"></span></td>
        <td class="font-semibold">${s.name}</td>
        <td>${s.area || '-'}</td>
        <td><span class="badge ${s.requiresSpecialRoom ? 'badge-warning' : 'badge-neutral'}">${s.requiresSpecialRoom ? 'Sí' : 'No'}</span></td>
        <td>${s.requiresSpecialRoom ? (s.roomType || '-') : '-'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-icon-sm btn-ghost edit-subject" data-id="${s.id}" title="Editar">✏️</button>
            <button class="btn btn-icon-sm btn-danger delete-subject" data-id="${s.id}" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  initEvents: function() {
    document.getElementById('btnAddSubject').addEventListener('click', () => this.openModal());

    document.querySelectorAll('.edit-subject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const subject = Store.findById('subjects', id);
        if (subject) this.openModal(subject);
      });
    });

    document.querySelectorAll('.delete-subject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        confirmAction('¿Está seguro de eliminar esta asignatura?', () => {
          Store.deleteItem('subjects', id);
          toast('Asignatura eliminada', 'success');
          this.render();
        });
      });
    });
  },

  openModal: function(subject = null) {
    const isEdit = !!subject;

    const body = `
      <div class="form-group">
        <label class="form-label">Nombre de la Asignatura <span class="required">*</span></label>
        <input type="text" id="sName" class="form-control" placeholder="Ej: Matemáticas" value="${subject ? subject.name : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Área Curricular</label>
        <input type="text" id="sArea" class="form-control" placeholder="Ej: Ciencias Exactas" value="${subject ? (subject.area || '') : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Color Distintivo</label>
        <input type="color" id="sColor" class="form-control" style="height:38px; padding:2px" value="${subject ? (subject.color || '#6366f1') : '#6366f1'}">
      </div>
      <div class="form-group">
        <label class="form-check">
          <input type="checkbox" id="sReqRoom" ${subject && subject.requiresSpecialRoom ? 'checked' : ''}>
          <span class="form-check-label">Requiere Espacio Especial (Laboratorio, Cancha, etc.)</span>
        </label>
      </div>
      <div class="form-group" id="sRoomTypeGroup" style="display:${subject && subject.requiresSpecialRoom ? 'block' : 'none'};">
        <label class="form-label">Tipo de Espacio Requerido</label>
        <select id="sRoomType" class="form-control">
          <option value="laboratorio" ${subject && subject.roomType === 'laboratorio' ? 'selected' : ''}>Laboratorio 🔬</option>
          <option value="sala_sistemas" ${subject && subject.roomType === 'sala_sistemas' ? 'selected' : ''}>Sala de Sistemas 💻</option>
          <option value="cancha" ${subject && subject.roomType === 'cancha' ? 'selected' : ''}>Cancha Deportivo ⚽</option>
          <option value="auditorio" ${subject && subject.roomType === 'auditorio' ? 'selected' : ''}>Auditorio 🎭</option>
        </select>
      </div>
    `;

    const footer = `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btnSaveSubject">Guardar</button>
    `;

    Modal.open(isEdit ? 'Editar Asignatura' : 'Agregar Asignatura', body, footer);

    document.getElementById('sReqRoom').addEventListener('change', (e) => {
      document.getElementById('sRoomTypeGroup').style.display = e.target.checked ? 'block' : 'none';
    });

    document.getElementById('btnSaveSubject').addEventListener('click', () => {
      const name = document.getElementById('sName').value.trim();
      if (!name) { toast('El nombre es requerido', 'error'); return; }

      const area = document.getElementById('sArea').value.trim();
      const color = document.getElementById('sColor').value;
      const requiresSpecialRoom = document.getElementById('sReqRoom').checked;
      const roomType = requiresSpecialRoom ? document.getElementById('sRoomType').value : 'aula';

      const data = { name, area, color, requiresSpecialRoom, roomType };

      if (isEdit) {
        Store.updateItem('subjects', subject.id, data);
        toast('Asignatura actualizada', 'success');
      } else {
        Store.addItem('subjects', data);
        toast('Asignatura agregada', 'success');
      }

      closeModal();
      this.render();
    });
  }
};

// ─── ESPACIOS / AULAS ──────────────────────────────────────────
const ViewEspacios = {
  render: function() {
    const rooms = Store.get('rooms') || [];
    const badge = document.getElementById('badge-espacios');
    if (badge) badge.textContent = rooms.length;

    const html = `
      <div class="page-header">
        <div class="page-header-top">
          <div>
            <h1 class="page-title">🏛️ Espacios y Aulas</h1>
            <p class="page-subtitle">Infraestructura física disponible para clases</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" id="btnAddRoom">+ Agregar Espacio</button>
          </div>
        </div>
      </div>

      <div class="card table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Capacidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${this.generateRows(rooms)}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('view-container').innerHTML = html;
    this.initEvents();
  },

  getTypeIcon: function(type) {
    const map = {
      aula: '🏫 Aula General',
      laboratorio: '🔬 Laboratorio',
      sala_sistemas: '💻 Sala de Sistemas',
      cancha: '⚽ Cancha Deportiva',
      auditorio: '🎭 Auditorio'
    };
    return map[type] || type;
  },

  generateRows: function(rooms) {
    if (rooms.length === 0) {
      return `<tr><td colspan="4" class="empty-state" style="padding:40px"><div class="empty-icon">🏛️</div><div class="empty-title">Sin espacios registrados</div></td></tr>`;
    }

    return rooms.map(r => `
      <tr>
        <td class="font-semibold">${r.name}</td>
        <td>${this.getTypeIcon(r.type)}</td>
        <td>${r.capacity || 30} personas</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-icon-sm btn-ghost edit-room" data-id="${r.id}" title="Editar">✏️</button>
            <button class="btn btn-icon-sm btn-danger delete-room" data-id="${r.id}" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  initEvents: function() {
    document.getElementById('btnAddRoom').addEventListener('click', () => this.openModal());

    document.querySelectorAll('.edit-room').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const room = Store.findById('rooms', id);
        if (room) this.openModal(room);
      });
    });

    document.querySelectorAll('.delete-room').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        confirmAction('¿Está seguro de eliminar este espacio?', () => {
          Store.deleteItem('rooms', id);
          toast('Espacio eliminado', 'success');
          this.render();
        });
      });
    });
  },

  openModal: function(room = null) {
    const isEdit = !!room;

    const body = `
      <div class="form-group">
        <label class="form-label">Nombre del Espacio <span class="required">*</span></label>
        <input type="text" id="rName" class="form-control" placeholder="Ej: Aula 101" value="${room ? room.name : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Tipo de Espacio</label>
        <select id="rType" class="form-control">
          <option value="aula" ${room && room.type === 'aula' ? 'selected' : ''}>Aula General 🏫</option>
          <option value="laboratorio" ${room && room.type === 'laboratorio' ? 'selected' : ''}>Laboratorio 🔬</option>
          <option value="sala_sistemas" ${room && room.type === 'sala_sistemas' ? 'selected' : ''}>Sala de Sistemas 💻</option>
          <option value="cancha" ${room && room.type === 'cancha' ? 'selected' : ''}>Cancha Deportiva ⚽</option>
          <option value="auditorio" ${room && room.type === 'auditorio' ? 'selected' : ''}>Auditorio 🎭</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Capacidad Física</label>
        <input type="number" id="rCapacity" class="form-control" min="1" value="${room ? (room.capacity || 35) : 35}">
      </div>
    `;

    const footer = `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btnSaveRoom">Guardar</button>
    `;

    Modal.open(isEdit ? 'Editar Espacio' : 'Agregar Espacio', body, footer);

    document.getElementById('btnSaveRoom').addEventListener('click', () => {
      const name = document.getElementById('rName').value.trim();
      if (!name) { toast('El nombre es requerido', 'error'); return; }

      const type = document.getElementById('rType').value;
      const capacity = parseInt(document.getElementById('rCapacity').value) || 35;

      const data = { name, type, capacity };

      if (isEdit) {
        Store.updateItem('rooms', room.id, data);
        toast('Espacio actualizado', 'success');
      } else {
        Store.addItem('rooms', data);
        toast('Espacio agregado', 'success');
      }

      closeModal();
      this.render();
    });
  }
};
