/* ============================================================
   EduScheduler Pro — app.js
   Main application controller: routing, navigation, initialization
   ============================================================ */
'use strict';

const App = (() => {

  const VIEWS = {
    dashboard:    { label: 'Dashboard',       view: () => ViewDashboard.render()    },
    config:       { label: 'Configuración',   view: () => ViewConfig.render()       },
    profesores:   { label: 'Profesores',      view: () => ViewProfesores.render()   },
    grupos:       { label: 'Grupos',          view: () => ViewGrupos.render()       },
    asignaturas:  { label: 'Asignaturas',     view: () => ViewAsignaturas.render()  },
    espacios:     { label: 'Espacios',        view: () => ViewEspacios.render()     },
    asignaciones: { label: 'Carga Horaria',   view: () => ViewAsignaciones.render() },
    restricciones:{ label: 'Restricciones',   view: () => ViewRestricciones.render()},
    generador:    { label: 'Generar Horario', view: () => ViewGenerador.render()    },
    horario:      { label: 'Ver Horarios',    view: () => ViewHorario.render()      },
  };

  let _currentView = 'dashboard';

  function navigate(viewName) {
    if (!VIEWS[viewName]) {
      console.warn(`App.navigate: unknown view "${viewName}"`);
      return;
    }
    _currentView = viewName;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Animate view transition
    const container = document.getElementById('view-container');
    container.style.opacity = '0';
    container.style.transform = 'translateY(8px)';

    setTimeout(() => {
      try {
        VIEWS[viewName].view();
      } catch (err) {
        console.error(`Error rendering view "${viewName}":`, err);
        container.innerHTML = `
          <div class="alert alert-danger">
            <span class="alert-icon">✕</span>
            <div>
              <div class="alert-title">Error al cargar la vista</div>
              ${err.message}
            </div>
          </div>
        `;
      }

      container.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';

      // Update badges
      updateBadges();

      // Scroll to top
      document.getElementById('main-content').scrollTop = 0;
    }, 80);
  }

  function updateBadges() {
    const data = Store.getData();
    const badges = {
      'badge-profesores': (data.teachers || []).length,
      'badge-grupos':     (data.groups || []).length,
      'badge-asignaturas':(data.subjects || []).length,
      'badge-espacios':   (data.rooms || []).length,
    };
    Object.entries(badges).forEach(([id, count]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    });
  }

  function init() {
    // Load data from localStorage
    Store.load();

    // Attach nav click handlers
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', () => navigate(item.dataset.view));
    });

    // Demo button
    const demoBtn = document.getElementById('btnLoadDemo');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        confirmAction(
          '¿Cargar los datos de demostración? Esto reemplazará los datos actuales.',
          () => {
            Store.loadDemo();
            navigate(_currentView);
            toast('✅ Datos de demostración cargados — IE La Esperanza (Colombia)', 'success', 5000);
          }
        );
      });
    }

    // Theme button
    const themeBtn = document.getElementById('btnTheme');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
      // Close sidebar when clicking outside on mobile
      document.getElementById('main-content').addEventListener('click', () => {
        if (window.innerWidth <= 900) sidebar.classList.remove('open');
      });
    }

    // Navigate to dashboard
    navigate('dashboard');
  }

  // Expose navigate for use in views
  return { init, navigate, updateBadges };
})();

// ─── Bootstrap ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
