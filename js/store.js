/* ============================================================
   EduScheduler Pro — store.js
   State management, localStorage persistence, demo data
   ============================================================ */
'use strict';

const Store = (() => {
  const STORAGE_KEY = 'edusched_v1';

  // ── Default empty state ──────────────────────────────────────
  function defaultState() {
    return {
      config: {
        schoolName: 'Mi Institución Educativa',
        year: '2026',
        jornada: 'única',
        cycleDays: 5,
        dayNames: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
        periods: [
          { id: 'p1', name: '1ª Hora',  start: '07:00', end: '07:45', isBreak: false },
          { id: 'p2', name: '2ª Hora',  start: '07:45', end: '08:30', isBreak: false },
          { id: 'p3', name: '3ª Hora',  start: '08:30', end: '09:15', isBreak: false },
          { id: 'b1', name: 'Recreo',   start: '09:15', end: '09:45', isBreak: true  },
          { id: 'p4', name: '4ª Hora',  start: '09:45', end: '10:30', isBreak: false },
          { id: 'p5', name: '5ª Hora',  start: '10:30', end: '11:15', isBreak: false },
          { id: 'p6', name: '6ª Hora',  start: '11:15', end: '12:00', isBreak: false },
          { id: 'b2', name: 'Almuerzo', start: '12:00', end: '12:30', isBreak: true  },
          { id: 'p7', name: '7ª Hora',  start: '12:30', end: '13:15', isBreak: false },
          { id: 'p8', name: '8ª Hora',  start: '13:15', end: '14:00', isBreak: false },
        ]
      },
      teachers: [],
      groups: [],
      subjects: [],
      rooms: [],
      assignments: [],
      hardConstraints: [],
      softConstraints: [],
      timetable: null
    };
  }

  // ── Colombia Demo Data ───────────────────────────────────────
  function demoData() {
    return {
      config: {
        schoolName: 'I.E. La Esperanza',
        year: '2026',
        jornada: 'única',
        cycleDays: 5,
        dayNames: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
        periods: [
          { id: 'p1', name: '1ª Hora',  start: '07:00', end: '07:45', isBreak: false },
          { id: 'p2', name: '2ª Hora',  start: '07:45', end: '08:30', isBreak: false },
          { id: 'p3', name: '3ª Hora',  start: '08:30', end: '09:15', isBreak: false },
          { id: 'b1', name: 'Recreo',   start: '09:15', end: '09:45', isBreak: true  },
          { id: 'p4', name: '4ª Hora',  start: '09:45', end: '10:30', isBreak: false },
          { id: 'p5', name: '5ª Hora',  start: '10:30', end: '11:15', isBreak: false },
          { id: 'p6', name: '6ª Hora',  start: '11:15', end: '12:00', isBreak: false },
          { id: 'b2', name: 'Almuerzo', start: '12:00', end: '12:30', isBreak: true  },
          { id: 'p7', name: '7ª Hora',  start: '12:30', end: '13:15', isBreak: false },
          { id: 'p8', name: '8ª Hora',  start: '13:15', end: '14:00', isBreak: false },
        ]
      },
      teachers: [
        { id: 't1', name: 'Ana García',      area: 'Matemáticas',      color: '#6366f1', maxHoursDay: 6, maxHoursWeek: 25, preferredTime: 'mañana',  availability: null },
        { id: 't2', name: 'Carlos Rodríguez',area: 'Lenguaje',          color: '#f59e0b', maxHoursDay: 6, maxHoursWeek: 25, preferredTime: 'mañana',  availability: null },
        { id: 't3', name: 'María López',     area: 'Ciencias Naturales',color: '#22c55e', maxHoursDay: 6, maxHoursWeek: 25, preferredTime: 'mañana',  availability: null },
        { id: 't4', name: 'Juan Martínez',   area: 'Ciencias Sociales', color: '#ef4444', maxHoursDay: 6, maxHoursWeek: 25, preferredTime: 'tarde',   availability: null },
        { id: 't5', name: 'Laura Torres',    area: 'Inglés',            color: '#38bdf8', maxHoursDay: 6, maxHoursWeek: 25, preferredTime: 'mañana',  availability: null },
        { id: 't6', name: 'Pedro Jiménez',   area: 'Educación Física',  color: '#84cc16', maxHoursDay: 5, maxHoursWeek: 25, preferredTime: 'mañana',  availability: null },
        { id: 't7', name: 'Sandra Morales',  area: 'Artística / Ética', color: '#ec4899', maxHoursDay: 5, maxHoursWeek: 20, preferredTime: 'tarde',   availability: null },
        { id: 't8', name: 'Diego Herrera',   area: 'Tecnología',        color: '#a78bfa', maxHoursDay: 5, maxHoursWeek: 20, preferredTime: 'tarde',   availability: null },
      ],
      groups: [
        { id: 'g1', name: '1° A',   level: 'Primaria',   capacity: 30, totalHours: 25 },
        { id: 'g2', name: '3° A',   level: 'Primaria',   capacity: 32, totalHours: 25 },
        { id: 'g3', name: '5° A',   level: 'Primaria',   capacity: 29, totalHours: 25 },
        { id: 'g4', name: '6° A',   level: 'Secundaria', capacity: 35, totalHours: 30 },
        { id: 'g5', name: '8° A',   level: 'Secundaria', capacity: 31, totalHours: 30 },
        { id: 'g6', name: '10° A',  level: 'Media',      capacity: 28, totalHours: 30 },
      ],
      subjects: [
        { id: 's1',  name: 'Matemáticas',        area: 'Ciencias', color: '#6366f1', requiresSpecialRoom: false, roomType: 'aula' },
        { id: 's2',  name: 'Lenguaje',            area: 'Humanidades', color: '#f59e0b', requiresSpecialRoom: false, roomType: 'aula' },
        { id: 's3',  name: 'Ciencias Naturales',  area: 'Ciencias', color: '#22c55e', requiresSpecialRoom: false, roomType: 'aula' },
        { id: 's4',  name: 'Ciencias Sociales',   area: 'Humanidades', color: '#ef4444', requiresSpecialRoom: false, roomType: 'aula' },
        { id: 's5',  name: 'Inglés',              area: 'Humanidades', color: '#38bdf8', requiresSpecialRoom: false, roomType: 'aula' },
        { id: 's6',  name: 'Educación Física',    area: 'Deportes', color: '#84cc16', requiresSpecialRoom: true,  roomType: 'cancha' },
        { id: 's7',  name: 'Artística',           area: 'Artes', color: '#ec4899', requiresSpecialRoom: false, roomType: 'aula' },
        { id: 's8',  name: 'Ética',               area: 'Humanidades', color: '#f97316', requiresSpecialRoom: false, roomType: 'aula' },
        { id: 's9',  name: 'Tecnología e Informática', area: 'Tecnología', color: '#a78bfa', requiresSpecialRoom: true, roomType: 'sala_sistemas' },
        { id: 's10', name: 'Religión',            area: 'Humanidades', color: '#fb7185', requiresSpecialRoom: false, roomType: 'aula' },
        { id: 's11', name: 'Biología',            area: 'Ciencias', color: '#34d399', requiresSpecialRoom: false, roomType: 'aula' },
        { id: 's12', name: 'Química',             area: 'Ciencias', color: '#60a5fa', requiresSpecialRoom: true,  roomType: 'laboratorio' },
      ],
      rooms: [
        { id: 'r1', name: 'Aula 101', capacity: 40, type: 'aula' },
        { id: 'r2', name: 'Aula 102', capacity: 40, type: 'aula' },
        { id: 'r3', name: 'Aula 103', capacity: 40, type: 'aula' },
        { id: 'r4', name: 'Aula 201', capacity: 40, type: 'aula' },
        { id: 'r5', name: 'Aula 202', capacity: 40, type: 'aula' },
        { id: 'r6', name: 'Aula 203', capacity: 40, type: 'aula' },
        { id: 'r7', name: 'Sala de Sistemas A', capacity: 35, type: 'sala_sistemas' },
        { id: 'r8', name: 'Laboratorio Ciencias', capacity: 30, type: 'laboratorio' },
        { id: 'r9', name: 'Cancha Deportiva', capacity: 200, type: 'cancha' },
      ],
      // Assignments: Grupo × Asignatura → Profesor + Horas/semana
      assignments: [
        // Grupo 1°A (Primaria - 25h/sem)
        { id: 'a01', groupId: 'g1', subjectId: 's1',  teacherId: 't1', hoursPerWeek: 5 },
        { id: 'a02', groupId: 'g1', subjectId: 's2',  teacherId: 't2', hoursPerWeek: 5 },
        { id: 'a03', groupId: 'g1', subjectId: 's3',  teacherId: 't3', hoursPerWeek: 3 },
        { id: 'a04', groupId: 'g1', subjectId: 's4',  teacherId: 't4', hoursPerWeek: 3 },
        { id: 'a05', groupId: 'g1', subjectId: 's5',  teacherId: 't5', hoursPerWeek: 2 },
        { id: 'a06', groupId: 'g1', subjectId: 's6',  teacherId: 't6', hoursPerWeek: 2 },
        { id: 'a07', groupId: 'g1', subjectId: 's7',  teacherId: 't7', hoursPerWeek: 2 },
        { id: 'a08', groupId: 'g1', subjectId: 's8',  teacherId: 't7', hoursPerWeek: 1 },
        { id: 'a09', groupId: 'g1', subjectId: 's9',  teacherId: 't8', hoursPerWeek: 2 },
        // Grupo 3°A (Primaria - 25h/sem)
        { id: 'a10', groupId: 'g2', subjectId: 's1',  teacherId: 't1', hoursPerWeek: 5 },
        { id: 'a11', groupId: 'g2', subjectId: 's2',  teacherId: 't2', hoursPerWeek: 5 },
        { id: 'a12', groupId: 'g2', subjectId: 's3',  teacherId: 't3', hoursPerWeek: 3 },
        { id: 'a13', groupId: 'g2', subjectId: 's4',  teacherId: 't4', hoursPerWeek: 3 },
        { id: 'a14', groupId: 'g2', subjectId: 's5',  teacherId: 't5', hoursPerWeek: 2 },
        { id: 'a15', groupId: 'g2', subjectId: 's6',  teacherId: 't6', hoursPerWeek: 2 },
        { id: 'a16', groupId: 'g2', subjectId: 's7',  teacherId: 't7', hoursPerWeek: 2 },
        { id: 'a17', groupId: 'g2', subjectId: 's8',  teacherId: 't7', hoursPerWeek: 1 },
        { id: 'a18', groupId: 'g2', subjectId: 's9',  teacherId: 't8', hoursPerWeek: 2 },
        // Grupo 5°A (Primaria - 25h/sem)
        { id: 'a19', groupId: 'g3', subjectId: 's1',  teacherId: 't1', hoursPerWeek: 5 },
        { id: 'a20', groupId: 'g3', subjectId: 's2',  teacherId: 't2', hoursPerWeek: 5 },
        { id: 'a21', groupId: 'g3', subjectId: 's3',  teacherId: 't3', hoursPerWeek: 3 },
        { id: 'a22', groupId: 'g3', subjectId: 's4',  teacherId: 't4', hoursPerWeek: 3 },
        { id: 'a23', groupId: 'g3', subjectId: 's5',  teacherId: 't5', hoursPerWeek: 2 },
        { id: 'a24', groupId: 'g3', subjectId: 's6',  teacherId: 't6', hoursPerWeek: 2 },
        { id: 'a25', groupId: 'g3', subjectId: 's7',  teacherId: 't7', hoursPerWeek: 2 },
        { id: 'a26', groupId: 'g3', subjectId: 's8',  teacherId: 't7', hoursPerWeek: 1 },
        { id: 'a27', groupId: 'g3', subjectId: 's9',  teacherId: 't8', hoursPerWeek: 2 },
        // Grupo 6°A (Secundaria - 30h/sem)
        { id: 'a28', groupId: 'g4', subjectId: 's1',  teacherId: 't1', hoursPerWeek: 5 },
        { id: 'a29', groupId: 'g4', subjectId: 's2',  teacherId: 't2', hoursPerWeek: 5 },
        { id: 'a30', groupId: 'g4', subjectId: 's3',  teacherId: 't3', hoursPerWeek: 4 },
        { id: 'a31', groupId: 'g4', subjectId: 's4',  teacherId: 't4', hoursPerWeek: 4 },
        { id: 'a32', groupId: 'g4', subjectId: 's5',  teacherId: 't5', hoursPerWeek: 3 },
        { id: 'a33', groupId: 'g4', subjectId: 's6',  teacherId: 't6', hoursPerWeek: 2 },
        { id: 'a34', groupId: 'g4', subjectId: 's7',  teacherId: 't7', hoursPerWeek: 2 },
        { id: 'a35', groupId: 'g4', subjectId: 's8',  teacherId: 't7', hoursPerWeek: 1 },
        { id: 'a36', groupId: 'g4', subjectId: 's9',  teacherId: 't8', hoursPerWeek: 2 },
        { id: 'a37', groupId: 'g4', subjectId: 's10', teacherId: 't4', hoursPerWeek: 2 },
        // Grupo 8°A (Secundaria - 30h/sem)
        { id: 'a38', groupId: 'g5', subjectId: 's1',  teacherId: 't1', hoursPerWeek: 5 },
        { id: 'a39', groupId: 'g5', subjectId: 's2',  teacherId: 't2', hoursPerWeek: 5 },
        { id: 'a40', groupId: 'g5', subjectId: 's3',  teacherId: 't3', hoursPerWeek: 4 },
        { id: 'a41', groupId: 'g5', subjectId: 's4',  teacherId: 't4', hoursPerWeek: 4 },
        { id: 'a42', groupId: 'g5', subjectId: 's5',  teacherId: 't5', hoursPerWeek: 3 },
        { id: 'a43', groupId: 'g5', subjectId: 's6',  teacherId: 't6', hoursPerWeek: 2 },
        { id: 'a44', groupId: 'g5', subjectId: 's7',  teacherId: 't7', hoursPerWeek: 2 },
        { id: 'a45', groupId: 'g5', subjectId: 's8',  teacherId: 't7', hoursPerWeek: 1 },
        { id: 'a46', groupId: 'g5', subjectId: 's9',  teacherId: 't8', hoursPerWeek: 2 },
        { id: 'a47', groupId: 'g5', subjectId: 's10', teacherId: 't4', hoursPerWeek: 2 },
        // Grupo 10°A (Media - 30h/sem)
        { id: 'a48', groupId: 'g6', subjectId: 's1',  teacherId: 't1', hoursPerWeek: 5 },
        { id: 'a49', groupId: 'g6', subjectId: 's2',  teacherId: 't2', hoursPerWeek: 4 },
        { id: 'a50', groupId: 'g6', subjectId: 's11', teacherId: 't3', hoursPerWeek: 3 },
        { id: 'a51', groupId: 'g6', subjectId: 's12', teacherId: 't3', hoursPerWeek: 3 },
        { id: 'a52', groupId: 'g6', subjectId: 's4',  teacherId: 't4', hoursPerWeek: 3 },
        { id: 'a53', groupId: 'g6', subjectId: 's5',  teacherId: 't5', hoursPerWeek: 4 },
        { id: 'a54', groupId: 'g6', subjectId: 's6',  teacherId: 't6', hoursPerWeek: 2 },
        { id: 'a55', groupId: 'g6', subjectId: 's7',  teacherId: 't7', hoursPerWeek: 2 },
        { id: 'a56', groupId: 'g6', subjectId: 's8',  teacherId: 't7', hoursPerWeek: 1 },
        { id: 'a57', groupId: 'g6', subjectId: 's9',  teacherId: 't8', hoursPerWeek: 3 },
      ],
      hardConstraints: [
        // Reunión docentes - Martes última hora
        { id: 'hc1', type: 'meeting', name: 'Reunión Docentes',
          description: 'Reunión de área los martes a última hora',
          dayIndex: 1, periodId: 'p8',
          teacherIds: ['t1','t2','t3','t4','t5','t6','t7','t8'] },
        // Bloqueo: Ed. Física no en 1ª hora (llegada de estudiantes)
        { id: 'hc2', type: 'no_subject_period', name: 'Ed. Física no en 1ª hora',
          description: 'Educación Física no debe ser la 1ª clase del día',
          subjectId: 's6', periodId: 'p1', scope: 'all' },
        // Bloqueo: Ética siempre tarde (política institucional)
        { id: 'hc3', type: 'subject_time_range', name: 'Ética en tarde',
          description: 'Ética debe ser en la tarde (7ª u 8ª hora)',
          subjectId: 's8', allowedPeriodIds: ['p7','p8'] },
      ],
      softConstraints: [
        { id: 'sc1', type: 'distribute_evenly',     weight: 10, name: 'Distribuir carga por semana',    description: 'Repartir horas de cada materia uniformemente en los 5 días' },
        { id: 'sc2', type: 'no_gaps_teacher',        weight: 8,  name: 'Sin ventanas para docentes',    description: 'Evitar horas libres entre clases del mismo docente' },
        { id: 'sc3', type: 'max_consecutive_same',   weight: 7,  name: 'Max 2h seguidas de la misma',   description: 'No más de 2 horas seguidas de la misma asignatura por grupo' },
        { id: 'sc4', type: 'teacher_pref_time',      weight: 6,  name: 'Respetar preferencia horaria',  description: 'Ubicar docentes en su turno preferido (mañana/tarde)' },
        { id: 'sc5', type: 'no_heavy_last',          weight: 5,  name: 'No Matemáticas en última hora',  description: 'Evitar Matemáticas o Ciencias en la última hora del día' },
        { id: 'sc6', type: 'efis_no_hot_hours',      weight: 4,  name: 'Ed. Física no en hora de calor', description: 'Preferir Ed. Física en primeras horas (menor calor)' },
        { id: 'sc7', type: 'same_day_spread',        weight: 3,  name: 'Pocas horas del mismo grupo/día', description: 'No sobrecargar un día con muchas horas del mismo grupo' },
      ],
      timetable: null
    };
  }

  // ── Public API ───────────────────────────────────────────────
  let _state = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        _state = JSON.parse(raw);
      } else {
        _state = defaultState();
      }
    } catch (e) {
      console.warn('Store: failed to load from localStorage', e);
      _state = defaultState();
    }
    return _state;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (e) {
      console.warn('Store: failed to save to localStorage', e);
    }
  }

  function getData() {
    if (!_state) load();
    return _state;
  }

  function setData(newState) {
    _state = newState;
    save();
  }

  function get(key) {
    if (!_state) load();
    return _state[key];
  }

  function set(key, value) {
    if (!_state) load();
    _state[key] = value;
    save();
  }

  function loadDemo() {
    _state = demoData();
    save();
    return _state;
  }

  function clear() {
    _state = defaultState();
    save();
    return _state;
  }

  function generateId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // CRUD helpers
  function addItem(collection, item) {
    if (!_state) load();
    if (!item.id) item.id = generateId(collection[0]);
    _state[collection].push(item);
    save();
    return item;
  }

  function updateItem(collection, id, updates) {
    if (!_state) load();
    const idx = _state[collection].findIndex(i => i.id === id);
    if (idx === -1) return null;
    _state[collection][idx] = { ..._state[collection][idx], ...updates };
    save();
    return _state[collection][idx];
  }

  function deleteItem(collection, id) {
    if (!_state) load();
    const idx = _state[collection].findIndex(i => i.id === id);
    if (idx === -1) return false;
    _state[collection].splice(idx, 1);
    save();
    return true;
  }

  function findById(collection, id) {
    if (!_state) load();
    return (_state[collection] || []).find(i => i.id === id) || null;
  }

  // Stats helper
  function getStats() {
    if (!_state) load();
    const academicPeriods = _state.config.periods.filter(p => !p.isBreak);
    const totalSlots = _state.config.cycleDays * academicPeriods.length * _state.groups.length;
    const placedSlots = _state.timetable ? _state.timetable.slots.length : 0;
    const totalAssignmentHours = _state.assignments.reduce((s, a) => s + a.hoursPerWeek, 0);
    return {
      teachers:   _state.teachers.length,
      groups:     _state.groups.length,
      subjects:   _state.subjects.length,
      rooms:      _state.rooms.length,
      assignments: _state.assignments.length,
      totalAssignmentHours,
      totalSlots,
      placedSlots,
      scheduleReady: _state.timetable !== null,
      quality: _state.timetable ? _state.timetable.quality : null
    };
  }

  return { load, save, getData, setData, get, set, loadDemo, clear, generateId, addItem, updateItem, deleteItem, findById, getStats };
})();
