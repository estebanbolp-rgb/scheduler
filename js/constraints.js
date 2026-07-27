/* ============================================================
   EduScheduler Pro — constraints.js
   Hard and soft constraint engine
   ============================================================ */
'use strict';

const Constraints = (() => {

  // ─── Helpers ─────────────────────────────────────────────────
  function getAcademicPeriods(config) {
    return config.periods.filter(p => !p.isBreak);
  }

  function getPeriodIndex(config, periodId) {
    return getAcademicPeriods(config).findIndex(p => p.id === periodId);
  }

  // ─── HARD CONSTRAINT VALIDATION ─────────────────────────────
  /**
   * Validate if placing an assignment in a given slot is valid (hard constraints only).
   * Returns { valid: true } or { valid: false, reason: string }
   */
  function isValidPlacement(dayIndex, periodId, assignmentId, currentSlots, store) {
    const data = store.getData();
    const assignment = data.assignments.find(a => a.id === assignmentId);
    if (!assignment) return { valid: false, reason: 'Asignación no encontrada' };

    const academicPeriods = getAcademicPeriods(data.config);
    const periodIdx = academicPeriods.findIndex(p => p.id === periodId);

    // 1. Teacher double-booking
    const teacherBusy = currentSlots.some(s =>
      s.dayIndex === dayIndex && s.periodId === periodId && s.teacherId === assignment.teacherId
    );
    if (teacherBusy) return { valid: false, reason: `Docente ${assignment.teacherId} ya tiene clase` };

    // 2. Group double-booking
    const groupBusy = currentSlots.some(s =>
      s.dayIndex === dayIndex && s.periodId === periodId && s.groupId === assignment.groupId
    );
    if (groupBusy) return { valid: false, reason: `Grupo ${assignment.groupId} ya tiene clase` };

    // 3. Teacher availability (if set)
    const teacher = data.teachers.find(t => t.id === assignment.teacherId);
    if (teacher && teacher.availability && teacher.availability[dayIndex]) {
      const avail = teacher.availability[dayIndex][periodIdx];
      if (avail === false) {
        return { valid: false, reason: `Docente ${teacher.name} no disponible en esta franja` };
      }
    }

    // 4. Max daily hours per teacher
    if (teacher) {
      const teacherTodayCount = currentSlots.filter(s =>
        s.dayIndex === dayIndex && s.teacherId === assignment.teacherId
      ).length;
      if (teacherTodayCount >= (teacher.maxHoursDay || 6)) {
        return { valid: false, reason: `Docente ${teacher.name} alcanzó máximo de horas diarias` };
      }
    }

    // 5. Hard constraints from store
    const hardConstraints = data.hardConstraints || [];

    for (const hc of hardConstraints) {
      if (hc.type === 'meeting') {
        // Meeting: specified teachers cannot be scheduled in this slot
        if (hc.dayIndex === dayIndex && hc.periodId === periodId) {
          if (hc.teacherIds && hc.teacherIds.includes(assignment.teacherId)) {
            return { valid: false, reason: `Reunión docente: ${hc.name}` };
          }
        }
      }
      if (hc.type === 'no_subject_period') {
        // Subject not allowed in a specific period
        if (hc.subjectId === assignment.subjectId && hc.periodId === periodId) {
          return { valid: false, reason: `${hc.name}` };
        }
      }
      if (hc.type === 'subject_time_range') {
        // Subject only allowed in specific periods
        if (hc.subjectId === assignment.subjectId) {
          if (hc.allowedPeriodIds && !hc.allowedPeriodIds.includes(periodId)) {
            return { valid: false, reason: `${hc.name}` };
          }
        }
      }
      if (hc.type === 'blocked_period') {
        // Period blocked for a group or all
        if (hc.dayIndex === dayIndex && hc.periodId === periodId) {
          if (hc.scope === 'all' ||
              (hc.groupId && hc.groupId === assignment.groupId) ||
              (hc.teacherId && hc.teacherId === assignment.teacherId)) {
            return { valid: false, reason: `Franja bloqueada: ${hc.name}` };
          }
        }
      }
      if (hc.type === 'max_consecutive_same') {
        // No more than N consecutive hours of the same subject
        const maxConsec = hc.maxConsecutive || 2;
        const sameSubjectToday = currentSlots.filter(s =>
          s.dayIndex === dayIndex && s.groupId === assignment.groupId && s.subjectId === assignment.subjectId
        );
        if (sameSubjectToday.length >= maxConsec) {
          return { valid: false, reason: `Max ${maxConsec} horas de la misma materia por día` };
        }
      }
    }

    // 6. Default: max 2 instances of same subject per day for a group (built-in hard rule)
    const sameSubjectToday = currentSlots.filter(s =>
      s.dayIndex === dayIndex && s.groupId === assignment.groupId && s.subjectId === assignment.subjectId
    ).length;
    if (sameSubjectToday >= 2) {
      return { valid: false, reason: 'Máximo 2 horas de la misma materia por día' };
    }

    return { valid: true };
  }

  // ─── ROOM FINDING ────────────────────────────────────────────
  /**
   * Find an available room for the given assignment, day, period.
   */
  function findAvailableRoom(dayIndex, periodId, assignment, currentSlots, store) {
    const data = store.getData();
    const subject = data.subjects.find(s => s.id === assignment.subjectId);
    const group = data.groups.find(g => g.id === assignment.groupId);
    const roomType = (subject && subject.requiresSpecialRoom) ? subject.roomType : null;

    // Rooms already occupied in this slot
    const occupiedRooms = new Set(
      currentSlots
        .filter(s => s.dayIndex === dayIndex && s.periodId === periodId)
        .map(s => s.roomId)
    );

    // Filter suitable rooms
    const candidates = data.rooms.filter(room => {
      if (occupiedRooms.has(room.id)) return false;
      if (roomType && room.type !== roomType) return false;
      if (!roomType && (room.type === 'cancha' || room.type === 'laboratorio' || room.type === 'sala_sistemas')) return false;
      if (group && room.capacity < (group.capacity || 0)) return false;
      return true;
    });

    // Prefer rooms of exact type, then general
    if (candidates.length === 0) {
      // Fallback: any available room with capacity
      const fallback = data.rooms.filter(room => {
        if (occupiedRooms.has(room.id)) return false;
        return true;
      });
      return fallback[0] || null;
    }
    return candidates[0];
  }

  // ─── SOFT CONSTRAINT SCORING ─────────────────────────────────
  /**
   * Score a potential slot placement. Higher = better.
   * This is used to rank available slots.
   */
  function scoreSlot(dayIndex, periodId, assignment, currentSlots, store) {
    const data = store.getData();
    const academicPeriods = getAcademicPeriods(data.config);
    const periodIdx = academicPeriods.findIndex(p => p.id === periodId);
    const totalPeriods = academicPeriods.length;
    const softConstraints = data.softConstraints || [];
    const teacher = data.teachers.find(t => t.id === assignment.teacherId);
    const subject = data.subjects.find(s => s.id === assignment.subjectId);

    let score = 0;

    // SC1: Distribute evenly across days
    const groupSlotsThisDay = currentSlots.filter(s =>
      s.dayIndex === dayIndex && s.groupId === assignment.groupId
    ).length;
    const groupSlotsPerDay = currentSlots.filter(s => s.groupId === assignment.groupId);
    const avgPerDay = groupSlotsPerDay.length / data.config.cycleDays;
    if (groupSlotsThisDay <= avgPerDay) score += 10;
    else score -= (groupSlotsThisDay - avgPerDay) * 5;

    // SC2: Teacher preference time
    if (teacher && teacher.preferredTime) {
      const isAM = periodIdx < totalPeriods / 2;
      if ((teacher.preferredTime === 'mañana' && isAM) ||
          (teacher.preferredTime === 'tarde'  && !isAM)) {
        score += 8;
      }
    }

    // SC3: No gaps in teacher schedule — prefer adjacent periods
    const teacherSlotsToday = currentSlots
      .filter(s => s.dayIndex === dayIndex && s.teacherId === assignment.teacherId)
      .map(s => academicPeriods.findIndex(p => p.id === s.periodId))
      .sort((a, b) => a - b);

    if (teacherSlotsToday.length > 0) {
      const lastTeacherPeriod = teacherSlotsToday[teacherSlotsToday.length - 1];
      const firstTeacherPeriod = teacherSlotsToday[0];
      if (periodIdx === lastTeacherPeriod + 1) score += 6; // Adjacent after last
      else if (periodIdx === firstTeacherPeriod - 1) score += 4; // Adjacent before first
      else if (periodIdx > firstTeacherPeriod && periodIdx < lastTeacherPeriod) score -= 8; // Gap
    }

    // SC4: No heavy subjects last period
    if (subject && (subject.area === 'Ciencias' || subject.name === 'Matemáticas')) {
      if (periodIdx === totalPeriods - 1) score -= 5;
    }

    // SC5: Ed. Física not in hot hours (periods 4-5 = 09:45-11:15)
    if (subject && subject.name === 'Educación Física') {
      if (periodIdx >= 3 && periodIdx <= 4) score -= 4;
      if (periodIdx <= 2) score += 4;
    }

    // SC6: Same assignment not on consecutive days (spread across week)
    const assignmentDays = currentSlots
      .filter(s => s.assignmentId === assignment.id)
      .map(s => s.dayIndex);
    if (assignmentDays.includes(dayIndex)) {
      score -= 8; // Penalize same day for same assignment
    }
    if (assignmentDays.includes(dayIndex - 1) || assignmentDays.includes(dayIndex + 1)) {
      score += 2; // Slightly prefer adjacent days for continuity
    }

    // SC7: Don't overload teacher on a day
    const teacherTodayCount = currentSlots.filter(s =>
      s.dayIndex === dayIndex && s.teacherId === assignment.teacherId
    ).length;
    if (teacherTodayCount >= 4) score -= teacherTodayCount * 2;

    return score;
  }

  // ─── FULL SCHEDULE VALIDATION ────────────────────────────────
  /**
   * Validate an entire schedule and return a quality report.
   */
  function validateSchedule(timetableSlots, store) {
    const data = store.getData();
    const violations = [];
    const warnings = [];

    // Check for double bookings
    const slotMap = {};
    timetableSlots.forEach(slot => {
      const key = `${slot.dayIndex}_${slot.periodId}`;
      if (!slotMap[key]) slotMap[key] = [];
      slotMap[key].push(slot);
    });

    Object.entries(slotMap).forEach(([key, slots]) => {
      // Teacher conflicts
      const teachers = slots.map(s => s.teacherId);
      const dupeTeachers = teachers.filter((t, i) => teachers.indexOf(t) !== i);
      dupeTeachers.forEach(t => {
        const teacher = data.teachers.find(x => x.id === t);
        violations.push({ type: 'hard', msg: `Conflicto de docente: ${teacher ? teacher.name : t} tiene 2 clases al mismo tiempo (${key})` });
      });

      // Group conflicts
      const groups = slots.map(s => s.groupId);
      const dupeGroups = groups.filter((g, i) => groups.indexOf(g) !== i);
      dupeGroups.forEach(g => {
        const group = data.groups.find(x => x.id === g);
        violations.push({ type: 'hard', msg: `Conflicto de grupo: ${group ? group.name : g} tiene 2 clases al mismo tiempo` });
      });

      // Room conflicts
      const rooms = slots.filter(s => s.roomId).map(s => s.roomId);
      const dupeRooms = rooms.filter((r, i) => rooms.indexOf(r) !== i);
      dupeRooms.forEach(r => {
        const room = data.rooms.find(x => x.id === r);
        violations.push({ type: 'hard', msg: `Conflicto de espacio: ${room ? room.name : r} está doble asignado` });
      });
    });

    // Check hours coverage
    data.assignments.forEach(a => {
      const placed = timetableSlots.filter(s => s.assignmentId === a.id).length;
      if (placed < a.hoursPerWeek) {
        const group = data.groups.find(g => g.id === a.groupId);
        const subject = data.subjects.find(s => s.id === a.subjectId);
        warnings.push({
          type: 'incomplete',
          msg: `${group ? group.name : a.groupId} — ${subject ? subject.name : a.subjectId}: faltan ${a.hoursPerWeek - placed}h (${placed}/${a.hoursPerWeek})`
        });
      }
    });

    // Check hard constraints
    data.hardConstraints.forEach(hc => {
      if (hc.type === 'meeting') {
        timetableSlots.forEach(slot => {
          if (slot.dayIndex === hc.dayIndex && slot.periodId === hc.periodId &&
              hc.teacherIds && hc.teacherIds.includes(slot.teacherId)) {
            const teacher = data.teachers.find(t => t.id === slot.teacherId);
            violations.push({ type: 'hard', msg: `Reunión violada: ${teacher ? teacher.name : slot.teacherId} tiene clase durante "${hc.name}"` });
          }
        });
      }
    });

    // Soft constraint soft scoring
    let softScore = 100;
    const softChecks = checkSoftConstraints(timetableSlots, store);
    softChecks.forEach(sc => {
      softScore -= sc.penalty;
      if (sc.penalty > 0) warnings.push({ type: 'soft', msg: sc.msg, penalty: sc.penalty });
    });
    softScore = Math.max(0, softScore);

    const hardScore = violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 15);
    const overallScore = Math.round((hardScore * 0.6) + (softScore * 0.4));

    return {
      violations,
      warnings,
      hardScore,
      softScore,
      overallScore,
      isValid: violations.length === 0
    };
  }

  function checkSoftConstraints(slots, store) {
    const data = store.getData();
    const results = [];
    const academicPeriods = getAcademicPeriods(data.config);

    // SC: Teacher gaps per day
    data.teachers.forEach(teacher => {
      for (let d = 0; d < data.config.cycleDays; d++) {
        const daySlots = slots
          .filter(s => s.dayIndex === d && s.teacherId === teacher.id)
          .map(s => academicPeriods.findIndex(p => p.id === s.periodId))
          .sort((a, b) => a - b);

        if (daySlots.length >= 2) {
          for (let i = 1; i < daySlots.length; i++) {
            if (daySlots[i] - daySlots[i - 1] > 1) {
              results.push({ msg: `Ventana libre: ${teacher.name} tiene hueco el día ${data.config.dayNames[d]}`, penalty: 3 });
            }
          }
        }
      }
    });

    // SC: Heavy subjects in last period
    const lastPeriodId = academicPeriods[academicPeriods.length - 1].id;
    slots.forEach(slot => {
      const subject = data.subjects.find(s => s.id === slot.subjectId);
      if (subject && subject.area === 'Ciencias' && slot.periodId === lastPeriodId) {
        results.push({ msg: `${subject.name} en última hora`, penalty: 2 });
      }
    });

    return results;
  }

  return { isValidPlacement, findAvailableRoom, scoreSlot, validateSchedule, getAcademicPeriods };
})();
