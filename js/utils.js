/* ============================================================
   EduScheduler Pro — utils.js
   Toast notifications, Modal helper, color utils, export
   ============================================================ */
'use strict';

// ─── Toast Notifications ────────────────────────────────────────
function toast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;
  container.appendChild(div);

  setTimeout(() => {
    div.classList.add('fade-out');
    setTimeout(() => div.remove(), 250);
  }, duration);
}

// ─── Modal ──────────────────────────────────────────────────────
const Modal = {
  open(title, bodyHTML, footerHTML, options = {}) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML || '';

    const container = document.getElementById('modal-container');
    container.className = 'modal-container' + (options.size ? ` modal-${options.size}` : '');

    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Focus first input
    setTimeout(() => {
      const firstInput = document.querySelector('#modal-body input, #modal-body select, #modal-body textarea');
      if (firstInput) firstInput.focus();
    }, 100);
  },

  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.body.style.overflow = '';
  }
};

function closeModal() { Modal.close(); }

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});

// ─── Loading Overlay ─────────────────────────────────────────────
const Loading = {
  show(text = 'Cargando...') {
    const el = document.getElementById('loading-overlay');
    document.getElementById('loading-text').textContent = text;
    el.classList.remove('hidden');
  },
  hide() {
    document.getElementById('loading-overlay').classList.add('hidden');
  },
  setText(text) {
    document.getElementById('loading-text').textContent = text;
  }
};

// ─── Color Utilities ─────────────────────────────────────────────
const SUBJECT_COLORS = [
  '#6366f1','#f59e0b','#22c55e','#ef4444','#38bdf8','#84cc16',
  '#ec4899','#f97316','#a78bfa','#fb7185','#34d399','#60a5fa',
  '#fbbf24','#4ade80','#c084fc','#f472b6','#67e8f9','#86efac'
];

function getSubjectColor(subjectId, store) {
  const subject = store.findById('subjects', subjectId);
  if (subject && subject.color) return subject.color;
  // Fallback deterministic color
  let hash = 0;
  for (const c of (subjectId || '')) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function hexToRgba(hex, alpha = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(100,100,100,${alpha})`;
  return `rgba(${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)},${alpha})`;
}

function lightenColor(hex, amount = 20) {
  // Simple lightening
  let r = parseInt(hex.slice(1,3), 16);
  let g = parseInt(hex.slice(3,5), 16);
  let b = parseInt(hex.slice(5,7), 16);
  r = Math.min(255, r + amount);
  g = Math.min(255, g + amount);
  b = Math.min(255, b + amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ─── ID Generator ────────────────────────────────────────────────
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
}

// ─── Format Utilities ────────────────────────────────────────────
function formatHours(h) {
  return `${h}h`;
}

function levelColor(level) {
  const map = {
    'Preescolar': '#38bdf8',
    'Primaria':   '#22c55e',
    'Secundaria': '#6366f1',
    'Media':      '#f59e0b'
  };
  return map[level] || '#94a3b8';
}

function levelBadgeClass(level) {
  const map = {
    'Preescolar': 'badge-info',
    'Primaria':   'badge-success',
    'Secundaria': 'badge-accent',
    'Media':      'badge-warning'
  };
  return map[level] || 'badge-neutral';
}

// ─── Theme ────────────────────────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('edusched_theme', next);

  const darkIcon = document.getElementById('themeIconDark');
  const lightIcon = document.getElementById('themeIconLight');
  if (next === 'light') {
    if (darkIcon)  darkIcon.style.display  = 'none';
    if (lightIcon) lightIcon.style.display = 'block';
  } else {
    if (darkIcon)  darkIcon.style.display  = 'block';
    if (lightIcon) lightIcon.style.display = 'none';
  }
}

// Init theme from localStorage
(function() {
  const saved = localStorage.getItem('edusched_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    if (saved === 'light') {
      const darkIcon = document.getElementById('themeIconDark');
      const lightIcon = document.getElementById('themeIconLight');
      if (darkIcon)  darkIcon.style.display  = 'none';
      if (lightIcon) lightIcon.style.display = 'block';
    }
  }
})();

// ─── Print / Export ───────────────────────────────────────────────
function printTimetable(targetGroupId) {
  window.print();
}

// ─── Confirmation Dialog ─────────────────────────────────────────
function confirmAction(msg, onConfirm) {
  Modal.open(
    '¿Confirmar acción?',
    `<div class="alert alert-warning"><span class="alert-icon">⚠</span><div>${msg}</div></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-danger" id="confirmBtn">Confirmar</button>`
  );
  setTimeout(() => {
    const btn = document.getElementById('confirmBtn');
    if (btn) btn.addEventListener('click', () => { closeModal(); onConfirm(); });
  }, 50);
}

function confirmClear() {
  confirmAction(
    'Se eliminarán todos los datos incluyendo profesores, grupos, asignaturas y el horario generado. ¿Continuar?',
    () => {
      Store.clear();
      App.init();
      toast('Datos eliminados correctamente', 'success');
    }
  );
}

// ─── Workload Analysis ────────────────────────────────────────────
function getTeacherWorkload(teacherId, store) {
  const data = store.getData();
  const total = data.assignments
    .filter(a => a.teacherId === teacherId)
    .reduce((s, a) => s + a.hoursPerWeek, 0);
  const teacher = data.teachers.find(t => t.id === teacherId);
  const max = teacher ? teacher.maxHoursWeek : 25;
  return { total, max, percent: Math.min(100, Math.round((total / max) * 100)) };
}

function getGroupHours(groupId, store) {
  const data = store.getData();
  return data.assignments
    .filter(a => a.groupId === groupId)
    .reduce((s, a) => s + a.hoursPerWeek, 0);
}

// ─── Validate assignments completeness ───────────────────────────
function validateAssignments(store) {
  const data = store.getData();
  const issues = [];
  data.groups.forEach(group => {
    const assigned = data.assignments
      .filter(a => a.groupId === group.id)
      .reduce((s, a) => s + a.hoursPerWeek, 0);
    const target = group.totalHours || 25;
    if (assigned !== target) {
      issues.push({
        group,
        assigned,
        target,
        diff: target - assigned
      });
    }
  });
  return issues;
}

// ─── Day names helper ─────────────────────────────────────────────
function getDayName(dayIndex, store) {
  const data = store.getData();
  return (data.config.dayNames || [])[dayIndex] || `Día ${dayIndex + 1}`;
}

function getPeriodById(periodId, store) {
  const data = store.getData();
  return (data.config.periods || []).find(p => p.id === periodId) || null;
}
