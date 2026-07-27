/* ============================================================
   EduScheduler Pro — scheduler.js
   Scheduling algorithm: Greedy + Constraint Propagation
   ============================================================ */
'use strict';

const Scheduler = (() => {

  let _progressCallback = null;

  // ─── Main entry point ─────────────────────────────────────────
  function generate(store, onProgress) {
    _progressCallback = onProgress || null;
    const data = store.getData();
    const academicPeriods = Constraints.getAcademicPeriods(data.config);
    const cycleDays = data.config.cycleDays;

    progress(5, 'Analizando restricciones...');

    // Sort assignments by difficulty (most constrained first)
    // Difficulty = fewer possible slots = schedule first
    const sortedAssignments = sortByDifficulty(data.assignments, data, academicPeriods, cycleDays);

    progress(10, 'Iniciando generación...');

    const slots = [];
    const failures = [];

    // Pass 1: Place high-priority / most-constrained assignments first
    let i = 0;
    for (const assignment of sortedAssignments) {
      i++;
      if (i % 5 === 0) {
        const pct = 10 + Math.floor((i / sortedAssignments.length) * 75);
        progress(pct, `Programando asignaciones... (${i}/${sortedAssignments.length})`);
      }

      const placed = placeAssignment(assignment, slots, store, academicPeriods, cycleDays);
      if (placed < assignment.hoursPerWeek) {
        failures.push({
          assignment,
          placed,
          required: assignment.hoursPerWeek
        });
      }
    }

    progress(88, 'Optimizando restricciones blandas...');

    // Pass 2: Local search optimization (simple swap improvement)
    optimizeLocalSearch(slots, store, academicPeriods, cycleDays);

    progress(95, 'Validando horario generado...');

    // Validate and score
    const quality = Constraints.validateSchedule(slots, store);

    progress(100, 'Horario generado exitosamente');

    return {
      slots,
      failures,
      quality
    };
  }

  // ─── Place all required hours for one assignment ─────────────
  function placeAssignment(assignment, slots, store, academicPeriods, cycleDays) {
    let placed = 0;
    const required = assignment.hoursPerWeek;

    // Generate all candidate (day, period) combinations in random order
    const candidates = [];
    for (let d = 0; d < cycleDays; d++) {
      for (const period of academicPeriods) {
        candidates.push({ dayIndex: d, periodId: period.id });
      }
    }

    // Shuffle to avoid systematic bias
    shuffle(candidates);

    // Score and sort candidates
    const scoredCandidates = candidates
      .map(c => ({
        ...c,
        score: Constraints.scoreSlot(c.dayIndex, c.periodId, assignment, slots, store)
      }))
      .sort((a, b) => b.score - a.score);

    for (const candidate of scoredCandidates) {
      if (placed >= required) break;

      const validation = Constraints.isValidPlacement(
        candidate.dayIndex, candidate.periodId, assignment.id, slots, store
      );

      if (validation.valid) {
        const room = Constraints.findAvailableRoom(
          candidate.dayIndex, candidate.periodId, assignment, slots, store
        );

        slots.push({
          id: generateSlotId(),
          dayIndex: candidate.dayIndex,
          periodId: candidate.periodId,
          assignmentId: assignment.id,
          teacherId: assignment.teacherId,
          groupId: assignment.groupId,
          subjectId: assignment.subjectId,
          roomId: room ? room.id : null
        });
        placed++;
      }
    }

    return placed;
  }

  // ─── Local search optimization ──────────────────────────────
  function optimizeLocalSearch(slots, store, academicPeriods, cycleDays) {
    const maxIterations = 50;
    let improved = true;
    let iterations = 0;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      // Try random pairwise swaps
      for (let i = 0; i < Math.min(slots.length, 30); i++) {
        const idxA = Math.floor(Math.random() * slots.length);
        const idxB = Math.floor(Math.random() * slots.length);
        if (idxA === idxB) continue;

        const slotA = slots[idxA];
        const slotB = slots[idxB];

        // Only swap if same assignment (different day/period)
        if (slotA.assignmentId !== slotB.assignmentId) continue;
        if (slotA.dayIndex === slotB.dayIndex && slotA.periodId === slotB.periodId) continue;

        // Compute current score
        const currentScore =
          Constraints.scoreSlot(slotA.dayIndex, slotA.periodId, { id: slotA.assignmentId, ...findAssignment(store, slotA.assignmentId) }, slots, store) +
          Constraints.scoreSlot(slotB.dayIndex, slotB.periodId, { id: slotB.assignmentId, ...findAssignment(store, slotB.assignmentId) }, slots, store);

        // Try swapping day/period
        const tempSlots = [...slots];
        tempSlots[idxA] = { ...slotA, dayIndex: slotB.dayIndex, periodId: slotB.periodId };
        tempSlots[idxB] = { ...slotB, dayIndex: slotA.dayIndex, periodId: slotA.periodId };

        // Validate both new positions
        const tempWithoutA = tempSlots.filter((_, idx) => idx !== idxA);
        const tempWithoutB = tempSlots.filter((_, idx) => idx !== idxB);

        const validA = Constraints.isValidPlacement(slotB.dayIndex, slotB.periodId, slotA.assignmentId, tempWithoutA, store);
        const validB = Constraints.isValidPlacement(slotA.dayIndex, slotA.periodId, slotB.assignmentId, tempWithoutB, store);

        if (!validA.valid || !validB.valid) continue;

        const assignment = findAssignment(store, slotA.assignmentId);
        const newScore =
          Constraints.scoreSlot(slotB.dayIndex, slotB.periodId, assignment, tempWithoutA, store) +
          Constraints.scoreSlot(slotA.dayIndex, slotA.periodId, assignment, tempWithoutB, store);

        if (newScore > currentScore) {
          slots[idxA] = tempSlots[idxA];
          slots[idxB] = tempSlots[idxB];
          improved = true;
        }
      }
    }
  }

  // ─── Sort assignments by difficulty ─────────────────────────
  function sortByDifficulty(assignments, data, academicPeriods, cycleDays) {
    return [...assignments].sort((a, b) => {
      // More hours per week = fewer options = harder
      const hoursScore = b.hoursPerWeek - a.hoursPerWeek;
      if (hoursScore !== 0) return hoursScore;

      // Special room required = harder
      const subA = data.subjects.find(s => s.id === a.subjectId);
      const subB = data.subjects.find(s => s.id === b.subjectId);
      const specialA = (subA && subA.requiresSpecialRoom) ? 1 : 0;
      const specialB = (subB && subB.requiresSpecialRoom) ? 1 : 0;
      if (specialA !== specialB) return specialB - specialA;

      // Teacher with more total assignments = harder
      const teacherLoadA = assignments.filter(x => x.teacherId === a.teacherId)
        .reduce((s, x) => s + x.hoursPerWeek, 0);
      const teacherLoadB = assignments.filter(x => x.teacherId === b.teacherId)
        .reduce((s, x) => s + x.hoursPerWeek, 0);
      return teacherLoadB - teacherLoadA;
    });
  }

  // ─── Utilities ───────────────────────────────────────────────
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function generateSlotId() {
    return 'sl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function findAssignment(store, assignmentId) {
    const data = store.getData();
    return data.assignments.find(a => a.id === assignmentId) || {};
  }

  function progress(pct, msg) {
    if (_progressCallback) {
      _progressCallback(pct, msg);
    }
  }

  return { generate };
})();
