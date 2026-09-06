/* =========================================================
   HabitFlow — application logic
   Vanilla JS, ES6+. All data persisted to localStorage.
   ========================================================= */

(function () {
  'use strict';

  /* ============ Constants ============ */

  const STORAGE_KEY_HABITS = 'habitTracker_habits';
  const STORAGE_KEY_META = 'habitTracker_meta';

  const CATEGORIES = ['Health', 'Fitness', 'Learning', 'Productivity', 'Mindfulness', 'Personal', 'Finance', 'Social', 'Other'];

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_LABELS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const MILESTONES = [7, 14, 30, 50, 100];

  const ICONS = {
    book: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M4 5c2-1.2 5-1.2 7 0v14c-2-1.2-5-1.2-7 0V5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M20 5c-2-1.2-5-1.2-7 0v14c2-1.2 5-1.2 7 0V5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    water: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M12 3c3 4.5 6 8 6 11.5A6 6 0 016 14.5C6 11 9 7.5 12 3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    exercise: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M6 8v8M18 8v8M2 11v2M22 11v2M6 12h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    meditation: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><circle cx="12" cy="6" r="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M4 18c1-3 4-5 8-5s7 2 8 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    sleep: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M20 13.5A8 8 0 1110.5 4a6.3 6.3 0 009.5 9.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    food: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M12 8c-4 0-6 3-6 6.5A5.5 5.5 0 0012 20a5.5 5.5 0 006-5.5C18 11 16 8 12 8z" stroke="currentColor" stroke-width="1.6"/><path d="M12 8V4M9.5 5.5C10 4.5 11 4 12 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    work: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><rect x="3" y="8" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="1.6"/></svg>',
    study: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M4 6l8-3 8 3-8 3-8-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 10.5V16c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-5.5" stroke="currentColor" stroke-width="1.6"/></svg>',
    money: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/><path d="M12 8v8M9.5 10a2 2 0 012-1.5h1a1.8 1.8 0 010 3.6h-1a1.8 1.8 0 000 3.6h1a2 2 0 002-1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    walking: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><circle cx="14" cy="5" r="1.8" fill="currentColor"/><path d="M12 8l-2 5 3 1 1 6M13 9l3 2-1 4-4 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M12 20s-7-4.5-9-9.5C1.5 6.5 4 4 7 4c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3 0 5.5 2.5 4 6.5C19 15.5 12 20 12 20z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    music: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M9 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM19 16a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" stroke-width="1.6"/><path d="M11.5 18V6.5L21.5 4v9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    code: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 5l-2 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    writing: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M4 20l1-4 11-11 3 3-11 11-4 1z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    other: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M12 3l2.4 5.8L20 9l-4.4 4 1.3 6-4.9-3.4L7.1 19l1.3-6L4 9l5.6-.2L12 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'
  };
  const ICON_ORDER = ['book','water','exercise','meditation','sleep','food','work','study','money','walking','heart','music','code','writing','other'];

  const PALETTE_COLORS = ['#FA6B40', '#B0C228', '#535B1C', '#4D1027', '#FAFCD9'];

  const SMALL_ICONS = {
    check: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none"><path d="M4 10l4 4 8-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M4 16l1-3.5L13 4.5l2.5 2.5L7.5 15 4 16z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M5 6h10M8 6V4.5h4V6M6 6l.7 10a1 1 0 001 .9h4.6a1 1 0 001-.9L14 6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    archive: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><rect x="3" y="4" width="14" height="3.5" rx="1" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 8v6.5a1 1 0 001 1h9a1 1 0 001-1V8M8 11h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    restore: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M3 10a7 7 0 1113-4M3 10V5m0 5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fire: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none"><path d="M10 2c-1.3 2.5-3.3 4-3.3 6.7A3.3 3.3 0 0010 12.7a3.3 3.3 0 003.3-3.4C13.3 6.5 11.3 4.7 10 2z" stroke="currentColor" stroke-width="1.4"/><path d="M7 12c0 2.5 1.6 4.2 3 4.2s3-1.7 3-4.2" stroke="currentColor" stroke-width="1.3"/></svg>',
    trophy: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M6 4h8v4a4 4 0 01-8 0V4z" stroke="currentColor" stroke-width="1.4"/><path d="M6 5H3.5A2.5 2.5 0 006 8M14 5h2.5A2.5 2.5 0 0114 8" stroke="currentColor" stroke-width="1.3"/><path d="M9 12v2M8 17h4M9 14h2v3H9v-3z" stroke="currentColor" stroke-width="1.3"/></svg>'
  };

  /* ============ State ============ */

  let state = {
    habits: [],
    currentDate: new Date(),
    calendarMonth: new Date(),
    selectedDate: null,
    currentView: 'dashboard',
    searchQuery: '',
    activeFilter: 'all',
    categoryFilter: 'all',
    sortBy: 'default',
    editingHabitId: null,
    formIcon: 'book',
    formColor: PALETTE_COLORS[0],
    formFrequency: 'daily',
    formSelectedDays: [],
    todayKey: null
  };

  let meta = {
    milestonesShown: {},
    perfectDayShown: {}
  };

  let confirmCallback = null;

  /* ============ Utility: dates ============ */

  function getDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function keyToDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function getMonday(date) {
    const d = startOfDay(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    return addDays(d, diff);
  }

  function formatLongDate(date) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }

  /* ============ Persistence ============ */

  function loadHabits() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HABITS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(h => h && typeof h === 'object' && typeof h.id === 'string' && typeof h.name === 'string')
        .map(sanitizeHabit);
    } catch (e) {
      console.error('Failed to load habits, resetting.', e);
      return [];
    }
  }

  function sanitizeHabit(h) {
    return {
      id: h.id,
      name: String(h.name || 'Untitled habit').slice(0, 60),
      description: String(h.description || '').slice(0, 200),
      category: CATEGORIES.includes(h.category) ? h.category : 'Other',
      icon: ICONS[h.icon] ? h.icon : 'book',
      color: typeof h.color === 'string' ? h.color : PALETTE_COLORS[0],
      frequency: ['daily', 'weekly', 'custom'].includes(h.frequency) ? h.frequency : 'daily',
      selectedDays: Array.isArray(h.selectedDays) ? h.selectedDays.filter(n => Number.isInteger(n) && n >= 0 && n <= 6) : [],
      goal: Number.isFinite(h.goal) && h.goal > 0 ? h.goal : 1,
      completions: (h.completions && typeof h.completions === 'object') ? h.completions : {},
      archived: !!h.archived,
      archivedAt: h.archivedAt || null,
      createdAt: h.createdAt || new Date().toISOString()
    };
  }

  function saveHabits() {
    try {
      localStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(state.habits));
      return true;
    } catch (e) {
      console.error('Save failed', e);
      showToast('Unable to save your changes. Please check your browser storage settings and try again.', 'error');
      return false;
    }
  }

  function loadMeta() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_META);
      if (!raw) return { milestonesShown: {}, perfectDayShown: {} };
      const parsed = JSON.parse(raw);
      return {
        milestonesShown: parsed.milestonesShown || {},
        perfectDayShown: parsed.perfectDayShown || {}
      };
    } catch (e) {
      return { milestonesShown: {}, perfectDayShown: {} };
    }
  }

  function saveMeta() {
    try {
      localStorage.setItem(STORAGE_KEY_META, JSON.stringify(meta));
    } catch (e) { /* non critical */ }
  }

  /* ============ Habit helpers ============ */

  function generateHabitId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'h_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function getHabitById(id) {
    return state.habits.find(h => h.id === id);
  }

  function activeHabits() {
    return state.habits.filter(h => !h.archived);
  }

  function archivedHabits() {
    return state.habits.filter(h => h.archived);
  }

  function isHabitScheduled(habit, date) {
    if (habit.frequency === 'custom') {
      return habit.selectedDays.includes(date.getDay());
    }
    return true; // daily & weekly are eligible every day
  }

  function isHabitCompletedOn(habit, date) {
    return !!habit.completions[getDateKey(date)];
  }

  /* ============ CRUD ============ */

  function validateHabitForm(data) {
    const errors = {};
    if (!data.name || !data.name.trim()) {
      errors.name = 'Please give your habit a name.';
    } else if (data.name.trim().length > 60) {
      errors.name = 'Name must be 60 characters or fewer.';
    }
    if (data.frequency === 'custom' && data.selectedDays.length === 0) {
      errors.days = 'Select at least one day.';
    }
    if (!(data.goal > 0)) {
      errors.goal = 'Goal must be at least 1.';
    }
    return errors;
  }

  function createHabit(data) {
    const habit = {
      id: generateHabitId(),
      name: data.name.trim(),
      description: (data.description || '').trim(),
      category: data.category,
      icon: data.icon,
      color: data.color,
      frequency: data.frequency,
      selectedDays: data.frequency === 'custom' ? data.selectedDays.slice() : [],
      goal: data.goal,
      completions: {},
      archived: false,
      archivedAt: null,
      createdAt: new Date().toISOString()
    };
    state.habits.push(habit);
    saveHabits();
    return habit;
  }

  function updateHabit(id, data) {
    const habit = getHabitById(id);
    if (!habit) return null;
    habit.name = data.name.trim();
    habit.description = (data.description || '').trim();
    habit.category = data.category;
    habit.icon = data.icon;
    habit.color = data.color;
    habit.frequency = data.frequency;
    habit.selectedDays = data.frequency === 'custom' ? data.selectedDays.slice() : [];
    habit.goal = data.goal;
    // completions & createdAt & id intentionally preserved
    saveHabits();
    return habit;
  }

  function deleteHabit(id) {
    state.habits = state.habits.filter(h => h.id !== id);
    saveHabits();
  }

  function archiveHabit(id) {
    const habit = getHabitById(id);
    if (!habit) return;
    habit.archived = true;
    habit.archivedAt = new Date().toISOString();
    saveHabits();
  }

  function restoreHabit(id) {
    const habit = getHabitById(id);
    if (!habit) return;
    habit.archived = false;
    habit.archivedAt = null;
    saveHabits();
  }

  function completeHabit(id) {
    const habit = getHabitById(id);
    if (!habit) return;
    const key = getDateKey(new Date());
    if (habit.completions[key]) return;
    habit.completions[key] = true;
    if (!saveHabits()) return;
    showToast('✓ Habit completed');
    announce(`${habit.name} marked complete for today`);
    checkMilestones(habit);
    checkPerfectDay();
  }

  function uncompleteHabit(id) {
    const habit = getHabitById(id);
    if (!habit) return;
    const key = getDateKey(new Date());
    if (!habit.completions[key]) return;
    delete habit.completions[key];
    saveHabits();
    announce(`${habit.name} marked incomplete for today`);
  }

  /* ============ Streak & stats calculations ============ */

  function calculateCurrentStreak(habit) {
    const today = startOfDay(new Date());
    const createdDate = startOfDay(new Date(habit.createdAt));
    let cursor = new Date(today);
    const todayKey = getDateKey(cursor);

    if (isHabitScheduled(habit, cursor) && !habit.completions[todayKey]) {
      cursor = addDays(cursor, -1);
    }

    let streak = 0;
    let safety = 0;
    while (cursor >= createdDate && safety < 4000) {
      safety++;
      if (isHabitScheduled(habit, cursor)) {
        const key = getDateKey(cursor);
        if (habit.completions[key]) {
          streak++;
        } else {
          break;
        }
      }
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function calculateBestStreak(habit) {
    const start = startOfDay(new Date(habit.createdAt));
    const end = startOfDay(new Date());
    let best = 0;
    let current = 0;
    let cursor = new Date(start);
    let safety = 0;
    while (cursor <= end && safety < 4000) {
      safety++;
      if (isHabitScheduled(habit, cursor)) {
        const key = getDateKey(cursor);
        if (habit.completions[key]) {
          current++;
          if (current > best) best = current;
        } else {
          current = 0;
        }
      }
      cursor = addDays(cursor, 1);
    }
    return best;
  }

  function calculateCompletionRate(habit) {
    const start = startOfDay(new Date(habit.createdAt));
    const end = startOfDay(new Date());
    let scheduled = 0;
    let completed = 0;
    let cursor = new Date(start);
    let safety = 0;
    while (cursor <= end && safety < 4000) {
      safety++;
      if (isHabitScheduled(habit, cursor)) {
        scheduled++;
        if (habit.completions[getDateKey(cursor)]) completed++;
      }
      cursor = addDays(cursor, 1);
    }
    if (scheduled === 0) return 0;
    return Math.round((completed / scheduled) * 100);
  }

  function calculateWeeklyProgress(habit, referenceDate) {
    const monday = getMonday(referenceDate || new Date());
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

    if (habit.frequency === 'weekly') {
      const completed = weekDates.filter(d => isHabitCompletedOn(habit, d)).length;
      return { completed, total: habit.goal };
    }
    const scheduledDates = weekDates.filter(d => isHabitScheduled(habit, d));
    const completed = scheduledDates.filter(d => isHabitCompletedOn(habit, d)).length;
    return { completed, total: scheduledDates.length || weekDates.length };
  }

  function calculateMonthlyProgress(habit, year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let scheduled = 0, completed = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (date > startOfDay(new Date())) continue;
      if (isHabitScheduled(habit, date)) {
        scheduled++;
        if (isHabitCompletedOn(habit, date)) completed++;
      }
    }
    return { completed, total: scheduled };
  }

  function calculateDailyProgress() {
    const today = new Date();
    const scheduled = activeHabits().filter(h => isHabitScheduled(h, today));
    const completed = scheduled.filter(h => isHabitCompletedOn(h, today));
    return { completed: completed.length, total: scheduled.length };
  }

  function totalCompletions(habit) {
    return Object.values(habit.completions).filter(Boolean).length;
  }

  function calculateStatistics() {
    const active = activeHabits();
    const today = new Date();
    const completedToday = active.filter(h => isHabitScheduled(h, today) && isHabitCompletedOn(h, today));
    const rates = active.map(h => ({ habit: h, rate: calculateCompletionRate(h) }));
    const bestOverall = active.reduce((max, h) => Math.max(max, calculateCurrentStreak(h)), 0);
    let mostConsistent = null;
    if (rates.length) {
      mostConsistent = rates.reduce((best, cur) => (cur.rate > best.rate ? cur : best), rates[0]);
    }
    const catCounts = {};
    active.forEach(h => {
      catCounts[h.category] = (catCounts[h.category] || 0) + totalCompletions(h);
    });
    let mostCompletedCategory = null;
    let topCount = -1;
    Object.entries(catCounts).forEach(([cat, count]) => {
      if (count > topCount) { topCount = count; mostCompletedCategory = cat; }
    });
    const allScheduled = active.reduce((sum, h) => {
      const start = startOfDay(new Date(h.createdAt));
      const end = startOfDay(new Date());
      let s = 0;
      let cursor = new Date(start);
      let safety = 0;
      while (cursor <= end && safety < 4000) {
        safety++;
        if (isHabitScheduled(h, cursor)) s++;
        cursor = addDays(cursor, 1);
      }
      return sum + s;
    }, 0);
    const allCompleted = active.reduce((sum, h) => sum + totalCompletions(h), 0);
    const overallRate = allScheduled === 0 ? 0 : Math.round((allCompleted / allScheduled) * 100);

    return {
      totalHabits: state.habits.length,
      activeHabits: active.length,
      completedToday: completedToday.length,
      overallCompletionRate: overallRate,
      bestCurrentStreak: bestOverall,
      mostConsistent: mostConsistent && mostConsistent.habit ? mostConsistent.habit.name : '—',
      mostCompletedCategory: mostCompletedCategory || '—'
    };
  }

  function calculateCategoryBreakdown() {
    const active = activeHabits();
    const counts = {};
    CATEGORIES.forEach(c => counts[c] = 0);
    active.forEach(h => counts[h.category] = (counts[h.category] || 0) + 1);
    return counts;
  }

  function checkMilestones(habit) {
    const streak = calculateCurrentStreak(habit);
    if (!meta.milestonesShown[habit.id]) meta.milestonesShown[habit.id] = [];
    const shown = meta.milestonesShown[habit.id];
    const hit = MILESTONES.find(m => m === streak && !shown.includes(m));
    if (hit) {
      shown.push(hit);
      saveMeta();
      showMilestoneBanner(hit, habit);
    }
  }

  function checkPerfectDay() {
    const { completed, total } = calculateDailyProgress();
    const key = getDateKey(new Date());
    if (total > 0 && completed === total && !meta.perfectDayShown[key]) {
      meta.perfectDayShown[key] = true;
      saveMeta();
    }
  }

  /* ============ Achievements ============ */

  function getAchievements() {
    const active = activeHabits();
    const totalComp = state.habits.reduce((s, h) => s + totalCompletions(h), 0);
    const bestStreakAny = state.habits.reduce((m, h) => Math.max(m, calculateBestStreak(h)), 0);
    const { completed, total } = calculateDailyProgress();
    const perfectToday = total > 0 && completed === total;

    return [
      { id: 'first_step', title: 'First Step', desc: 'Complete your first habit.', unlocked: totalComp >= 1 },
      { id: 'streak_7', title: '7-Day Streak', desc: 'Maintain a 7-day streak.', unlocked: bestStreakAny >= 7 },
      { id: 'streak_30', title: '30-Day Streak', desc: 'Maintain a 30-day streak.', unlocked: bestStreakAny >= 30 },
      { id: 'perfect_day', title: 'Perfect Day', desc: 'Complete all scheduled habits today.', unlocked: perfectToday },
      { id: 'completions_100', title: '100 Completions', desc: 'Reach 100 total habit completions.', unlocked: totalComp >= 100 }
    ];
  }

  /* ============ Filtering / sorting ============ */

  function filterAndSortHabits(list) {
    let result = list.slice();
    const q = state.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        h.category.toLowerCase().includes(q)
      );
    }
    const today = new Date();
    if (state.activeFilter === 'completed-today') {
      result = result.filter(h => isHabitCompletedOn(h, today));
    } else if (state.activeFilter === 'incomplete-today') {
      result = result.filter(h => isHabitScheduled(h, today) && !isHabitCompletedOn(h, today));
    }
    if (state.categoryFilter !== 'all') {
      result = result.filter(h => h.category === state.categoryFilter);
    }
    switch (state.sortBy) {
      case 'name-asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name-desc': result.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'oldest': result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'streak-desc': result.sort((a, b) => calculateCurrentStreak(b) - calculateCurrentStreak(a)); break;
      case 'streak-asc': result.sort((a, b) => calculateCurrentStreak(a) - calculateCurrentStreak(b)); break;
      case 'rate-desc': result.sort((a, b) => calculateCompletionRate(b) - calculateCompletionRate(a)); break;
      default: result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return result;
  }

  /* ============ Rendering ============ */

  function iconColorFor(hex) {
    const c = hex.replace('#', '');
    if (c.length !== 6) return '#4D1027';
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#4D1027' : '#FFFDF3';
  }

  function renderStatCards(container, cards) {
    container.innerHTML = cards.map(c => `
      <div class="stat-card">
        <span class="stat-icon">${c.icon || ''}</span>
        <div class="stat-label">${c.label}</div>
        <div class="stat-value">${c.value}</div>
      </div>
    `).join('');
  }

  function renderDashboardStats() {
    const active = activeHabits();
    const today = new Date();
    const scheduledToday = active.filter(h => isHabitScheduled(h, today));
    const completedToday = scheduledToday.filter(h => isHabitCompletedOn(h, today));
    const bestCurrent = active.reduce((m, h) => Math.max(m, calculateCurrentStreak(h)), 0);
    const bestEver = active.reduce((m, h) => Math.max(m, calculateBestStreak(h)), 0);

    renderStatCards(document.getElementById('stat-row'), [
      { label: "Today's Habits", value: scheduledToday.length, icon: SMALL_ICONS.check },
      { label: 'Completed', value: completedToday.length, icon: SMALL_ICONS.check },
      { label: 'Current Streak', value: `${bestCurrent} day${bestCurrent === 1 ? '' : 's'}`, icon: SMALL_ICONS.fire },
      { label: 'Best Streak', value: `${bestEver} day${bestEver === 1 ? '' : 's'}`, icon: SMALL_ICONS.trophy }
    ]);

    const { completed, total } = calculateDailyProgress();
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    document.getElementById('progress-count').textContent = `${completed} / ${total} habits completed`;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-bar-wrap').setAttribute('aria-valuenow', pct);
    document.getElementById('progress-pct').textContent = `${pct}% complete`;
    document.getElementById('perfect-day-msg').hidden = !(total > 0 && completed === total);
  }

  function renderWeeklyOverview() {
    const monday = getMonday(new Date());
    const today = startOfDay(new Date());
    const active = activeHabits();
    const el = document.getElementById('weekly-overview');
    let html = '';
    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const label = DAY_LABELS_MON_FIRST[i];
      const isToday = startOfDay(date).getTime() === today.getTime();
      let markClass = 'upcoming';
      let markContent = '';
      if (date <= today) {
        const scheduled = active.filter(h => isHabitScheduled(h, date));
        if (scheduled.length > 0) {
          const allDone = scheduled.every(h => isHabitCompletedOn(h, date));
          if (allDone) { markClass = 'done'; markContent = '✓'; }
          else { markClass = 'missed'; markContent = '✕'; }
        }
      }
      html += `
        <div class="weekly-day ${isToday ? 'is-today' : ''}">
          <div class="wd-mark ${markClass}">${markContent}</div>
          <div class="wd-label">${label}</div>
        </div>`;
    }
    el.innerHTML = html;
  }

  function habitCardHTML(habit, opts) {
    opts = opts || {};
    const today = new Date();
    const scheduled = isHabitScheduled(habit, today);
    const done = isHabitCompletedOn(habit, today);
    const streak = calculateCurrentStreak(habit);
    const week = calculateWeeklyProgress(habit);
    const weekPct = week.total === 0 ? 0 : Math.min(100, Math.round((week.completed / week.total) * 100));
    const iconColor = iconColorFor(habit.color);

    let completeBtn;
    if (habit.archived) {
      completeBtn = `<span class="archived-tag">Archived ${habit.archivedAt ? 'on ' + formatShortDate(new Date(habit.archivedAt)) : ''}</span>`;
    } else if (!scheduled) {
      completeBtn = `<button class="habit-complete-btn" disabled aria-disabled="true"><span class="check-box"></span> Not scheduled today</button>`;
    } else {
      completeBtn = `
        <button class="habit-complete-btn ${done ? 'is-done' : ''}" data-action="toggle-complete" data-id="${habit.id}"
          aria-pressed="${done}">
          <span class="check-box">${done ? SMALL_ICONS.check : ''}</span>
          ${done ? '✓ Completed' : 'Complete'}
        </button>`;
    }

    const menu = habit.archived ? `
      <div class="habit-card-menu">
        <button class="icon-btn" data-action="restore" data-id="${habit.id}" aria-label="Restore ${habit.name}">${SMALL_ICONS.restore}</button>
        <button class="icon-btn" data-action="delete-permanent" data-id="${habit.id}" aria-label="Permanently delete ${habit.name}">${SMALL_ICONS.trash}</button>
      </div>` : `
      <div class="habit-card-menu">
        <button class="icon-btn" data-action="edit" data-id="${habit.id}" aria-label="Edit ${habit.name}">${SMALL_ICONS.edit}</button>
        <button class="icon-btn" data-action="archive" data-id="${habit.id}" aria-label="Archive ${habit.name}">${SMALL_ICONS.archive}</button>
        <button class="icon-btn" data-action="delete" data-id="${habit.id}" aria-label="Delete ${habit.name}">${SMALL_ICONS.trash}</button>
      </div>`;

    return `
      <div class="habit-card ${done ? 'is-done' : ''}" data-habit-id="${habit.id}">
        <div class="habit-card-top">
          <button class="habit-icon-wrap" style="background:${habit.color};color:${iconColor}" data-action="detail" data-id="${habit.id}" aria-label="View ${habit.name} details">
            ${ICONS[habit.icon] || ICONS.other}
          </button>
          <div class="habit-card-info">
            <div class="habit-name">${escapeHTML(habit.name)}</div>
            <div class="habit-category">${escapeHTML(habit.category)}</div>
          </div>
          ${menu}
        </div>
        <div class="habit-streak">${SMALL_ICONS.fire} Current streak: ${streak} day${streak === 1 ? '' : 's'}</div>
        <div class="habit-week-progress">
          <div class="hw-track"><div class="hw-fill" style="width:${weekPct}%"></div></div>
          <div class="hw-label">This Week · ${week.completed} / ${week.total} completed</div>
        </div>
        ${completeBtn}
      </div>`;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderHabitGrid(containerId, emptyStateId, list, opts) {
    const container = document.getElementById(containerId);
    const emptyEl = document.getElementById(emptyStateId);
    if (list.length === 0) {
      container.innerHTML = '';
      emptyEl.hidden = false;
      if (opts && opts.emptyKind === 'search') {
        emptyEl.innerHTML = `<h3>No habits found</h3><p>Try another search or change your filters.</p>`;
      } else if (opts && opts.emptyKind === 'archived') {
        emptyEl.innerHTML = `<h3>No archived habits</h3><p>Habits you archive will show up here.</p>`;
      } else {
        emptyEl.innerHTML = `<h3>No habits yet</h3><p>Create your first habit and start building a better routine today.</p>
          <button class="btn btn--primary" data-action="open-new-habit">+ Create Habit</button>`;
      }
      return;
    }
    emptyEl.hidden = true;
    container.innerHTML = list.map(h => habitCardHTML(h)).join('');
  }

  function renderDashboardHabits() {
    const active = activeHabits();
    const filtered = filterAndSortHabits(active);
    const kind = active.length === 0 ? 'default' : (filtered.length === 0 ? 'search' : 'default');
    renderHabitGrid('habit-grid', 'empty-state-habits', filtered, { emptyKind: kind });
  }

  function renderHabitsView() {
    const active = activeHabits();
    const filtered = filterAndSortHabits(active);
    const kind = active.length === 0 ? 'default' : (filtered.length === 0 ? 'search' : 'default');
    renderHabitGrid('habit-grid-2', 'empty-state-habits-2', filtered, { emptyKind: kind });

    const statusWrap = document.getElementById('filter-status-2');
    const options = [
      ['all', 'All'], ['active', 'Active'], ['completed-today', 'Completed Today'],
      ['incomplete-today', 'Incomplete Today']
    ];
    statusWrap.innerHTML = options.map(([v, l]) =>
      `<button class="chip ${state.activeFilter === v ? 'is-active' : ''}" data-value="${v}">${l}</button>`).join('');
  }

  function renderArchivedView() {
    const archived = archivedHabits();
    renderHabitGrid('archived-grid', 'empty-state-archived', archived, { emptyKind: 'archived' });
  }

  function renderCategoryBreakdown(containerId) {
    const counts = calculateCategoryBreakdown();
    const max = Math.max(1, ...Object.values(counts));
    const el = document.getElementById(containerId);
    if (!el) return;
    const rows = Object.entries(counts).filter(([, c]) => c > 0);
    if (rows.length === 0) {
      el.innerHTML = `<p style="color:var(--text-secondary);margin:0;">Add habits to see your category breakdown.</p>`;
      return;
    }
    el.innerHTML = rows.map(([cat, count]) => `
      <div class="cat-row">
        <span class="cat-name">${cat}</span>
        <span class="cat-bar-track"><span class="cat-bar-fill" style="width:${(count / max) * 100}%"></span></span>
        <span class="cat-count">${count}</span>
      </div>`).join('');
  }

  /* ---------- Calendar ---------- */

  function dayHeatLevel(habits, date) {
    const scheduled = habits.filter(h => isHabitScheduled(h, date) && startOfDay(new Date(h.createdAt)) <= startOfDay(date));
    if (scheduled.length === 0) return -1;
    const completed = scheduled.filter(h => isHabitCompletedOn(h, date)).length;
    const ratio = completed / scheduled.length;
    if (ratio === 0) return 0;
    if (ratio < 0.5) return 1;
    if (ratio < 1) return 2;
    return 3;
  }

  function renderCalendarGrid(containerId, year, month, opts) {
    opts = opts || {};
    const el = document.getElementById(containerId);
    if (!el) return;
    const active = activeHabits();
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Monday-first offset
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = startOfDay(new Date());

    let html = DAY_LABELS_MON_FIRST.map(d => `<div class="cal-weekday">${d}</div>`).join('');
    for (let i = 0; i < startWeekday; i++) html += `<div class="cal-cell cal-cell--empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isToday = startOfDay(date).getTime() === today.getTime();
      const isFuture = date > today;
      let heatClass = 'heat-0';
      if (!isFuture) {
        const level = dayHeatLevel(active, date);
        heatClass = level === -1 ? '' : `heat-${level}`;
      }
      html += `<button type="button" class="cal-cell ${isToday ? 'cal-cell--today' : ''} ${heatClass}" data-date="${getDateKey(date)}">
        <span>${d}</span>
      </button>`;
    }
    el.innerHTML = html;

    if (!opts.mini) {
      document.getElementById('cal-title').textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(first);
    }
  }

  function renderMiniCalendar() {
    const now = new Date();
    renderCalendarGrid('calendar-mini', now.getFullYear(), now.getMonth(), { mini: true });
  }

  function renderFullCalendar() {
    renderCalendarGrid('calendar-grid-full', state.calendarMonth.getFullYear(), state.calendarMonth.getMonth(), {});
  }

  function showDayDetail(dateKey) {
    const date = keyToDate(dateKey);
    const panel = document.getElementById('day-detail-panel');
    const active = activeHabits().filter(h => isHabitScheduled(h, date) && startOfDay(new Date(h.createdAt)) <= startOfDay(date));
    const completed = active.filter(h => isHabitCompletedOn(h, date));
    const missed = active.filter(h => !isHabitCompletedOn(h, date));
    panel.hidden = false;
    panel.innerHTML = `
      <h2 class="panel-title">${new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(date)}</h2>
      ${active.length === 0 ? '<p style="color:var(--text-secondary)">No habits were scheduled on this day.</p>' : ''}
      ${completed.length ? `<div class="day-detail-list">${completed.map(h => `<div class="day-detail-item done">${SMALL_ICONS.check} ${escapeHTML(h.name)}</div>`).join('')}</div>` : ''}
      ${missed.length ? `<div class="day-detail-list">${missed.map(h => `<div class="day-detail-item missed">✕ ${escapeHTML(h.name)}</div>`).join('')}</div>` : ''}
    `;
  }

  /* ---------- Statistics ---------- */

  function renderStatisticsView() {
    const stats = calculateStatistics();
    renderStatCards(document.getElementById('stat-row-2'), [
      { label: 'Total Habits', value: stats.totalHabits },
      { label: 'Active Habits', value: stats.activeHabits },
      { label: 'Completed Today', value: stats.completedToday },
      { label: 'Overall Completion Rate', value: stats.overallCompletionRate + '%' },
      { label: 'Current Best Streak', value: stats.bestCurrentStreak + ' days', icon: SMALL_ICONS.fire },
      { label: 'Most Consistent Habit', value: stats.mostConsistent },
      { label: 'Most Completed Category', value: stats.mostCompletedCategory }
    ]);

    const active = activeHabits();
    const perf = active.map(h => ({ h, rate: calculateCompletionRate(h) })).sort((a, b) => b.rate - a.rate);
    document.getElementById('performance-list').innerHTML = perf.length ? perf.map(p => `
      <div class="cat-row">
        <span class="cat-name">${escapeHTML(p.h.name)}</span>
        <span class="cat-bar-track"><span class="cat-bar-fill" style="width:${p.rate}%"></span></span>
        <span class="cat-count">${p.rate}%</span>
      </div>`).join('') : '<p style="color:var(--text-secondary);margin:0;">No habits yet.</p>';

    const leaderboard = active.map(h => ({ h, best: calculateBestStreak(h) })).sort((a, b) => b.best - a.best).slice(0, 10);
    document.getElementById('leaderboard-list').innerHTML = leaderboard.length ? leaderboard.map((item, i) => `
      <div class="cat-row">
        <span class="cat-name">${String(i + 1).padStart(2, '0')}  ${escapeHTML(item.h.name)}</span>
        <span class="cat-bar-track"><span class="cat-bar-fill" style="width:${Math.min(100, item.best)}%"></span></span>
        <span class="cat-count">${item.best}d</span>
      </div>`).join('') : '<p style="color:var(--text-secondary);margin:0;">No habits yet.</p>';

    renderCategoryBreakdown('category-breakdown-2');

    const achievements = getAchievements();
    document.getElementById('achievements-list').innerHTML = achievements.map(a => `
      <div class="cat-row" style="opacity:${a.unlocked ? 1 : 0.45}">
        <span class="cat-name" style="width:auto;flex:1;">${a.unlocked ? SMALL_ICONS.trophy : ''} ${a.title}</span>
        <span class="cat-count" style="width:auto;font-weight:600;font-size:0.78rem;color:var(--text-secondary)">${a.unlocked ? 'Unlocked' : 'Locked'}</span>
      </div>
      <p style="margin:-6px 0 10px;font-size:0.8rem;color:var(--text-secondary);">${a.desc}</p>
    `).join('');
  }

  /* ============ Habit detail modal ============ */

  function openHabitDetail(id) {
    const habit = getHabitById(id);
    if (!habit) return;
    document.getElementById('detail-title').textContent = habit.name;
    const streak = calculateCurrentStreak(habit);
    const best = calculateBestStreak(habit);
    const rate = calculateCompletionRate(habit);
    const week = calculateWeeklyProgress(habit);
    const now = new Date();
    const month = calculateMonthlyProgress(habit, now.getFullYear(), now.getMonth());

    const historyCells = [];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const scheduled = isHabitScheduled(habit, date) && startOfDay(date) >= startOfDay(new Date(habit.createdAt));
      const future = date > startOfDay(now);
      let mark = '·';
      let bg = 'var(--surface-sunken)';
      if (!future && scheduled) {
        if (isHabitCompletedOn(habit, date)) { mark = '✓'; bg = 'var(--lime-moss)'; }
        else { mark = '✕'; bg = 'var(--peach-tint)'; }
      } else if (!scheduled) {
        mark = '-';
      }
      historyCells.push(`<div class="detail-history-cell" style="background:${bg}" title="${getDateKey(date)}">${mark}</div>`);
    }

    document.getElementById('detail-body').innerHTML = `
      <div class="detail-header">
        <div class="habit-icon-wrap" style="background:${habit.color};color:${iconColorFor(habit.color)};width:52px;height:52px;">${ICONS[habit.icon]}</div>
        <div>
          <div class="habit-category">${habit.category}</div>
          ${habit.description ? `<p style="margin:4px 0 0;color:var(--text-secondary);font-size:0.9rem;">${escapeHTML(habit.description)}</p>` : ''}
        </div>
      </div>
      <div class="detail-stats">
        <div class="detail-stat"><div class="ds-label">Current Streak</div><div class="ds-value">${streak} days</div></div>
        <div class="detail-stat"><div class="ds-label">Best Streak</div><div class="ds-value">${best} days</div></div>
        <div class="detail-stat"><div class="ds-label">Completion Rate</div><div class="ds-value">${rate}%</div></div>
        <div class="detail-stat"><div class="ds-label">This Week</div><div class="ds-value">${week.completed} / ${week.total}</div></div>
      </div>
      <div>
        <div class="panel-title" style="font-size:0.95rem;">This Month — ${month.completed} / ${month.total}</div>
        <div class="detail-history-grid">${historyCells.join('')}</div>
      </div>
    `;
    document.getElementById('modal-habit-detail').hidden = false;
  }

  /* ============ Form modal ============ */

  function buildIconPicker() {
    const el = document.getElementById('icon-picker');
    el.innerHTML = ICON_ORDER.map(key => `
      <button type="button" class="icon-choice ${state.formIcon === key ? 'is-active' : ''}" data-icon="${key}" aria-label="${key} icon" aria-pressed="${state.formIcon === key}">
        ${ICONS[key]}
      </button>`).join('');
  }

  function buildColorPicker() {
    const el = document.getElementById('color-picker');
    el.innerHTML = PALETTE_COLORS.map(c => `
      <button type="button" class="color-choice ${state.formColor === c ? 'is-active' : ''}" style="background:${c}" data-color="${c}" aria-label="Color ${c}" aria-pressed="${state.formColor === c}"></button>`).join('');
  }

  function resetForm() {
    document.getElementById('habit-form').reset();
    document.getElementById('habit-id').value = '';
    document.getElementById('err-habit-name').textContent = '';
    state.editingHabitId = null;
    state.formIcon = 'book';
    state.formColor = PALETTE_COLORS[0];
    state.formFrequency = 'daily';
    state.formSelectedDays = [];
    document.getElementById('habit-goal').value = 1;
    document.querySelectorAll('#frequency-segmented .segmented-btn').forEach(btn => {
      const active = btn.dataset.value === 'daily';
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', active);
    });
    document.querySelectorAll('#day-picker .day-btn').forEach(btn => btn.classList.remove('is-active'));
    document.getElementById('custom-days-field').hidden = true;
    buildIconPicker();
    buildColorPicker();
  }

  function openAddHabitModal() {
    resetForm();
    document.getElementById('habit-form-title').textContent = 'New Habit';
    document.getElementById('btn-submit-form').textContent = 'Create Habit';
    document.getElementById('modal-habit-form').hidden = false;
    setTimeout(() => document.getElementById('habit-name').focus(), 50);
  }

  function openEditHabitModal(id) {
    const habit = getHabitById(id);
    if (!habit) return;
    resetForm();
    state.editingHabitId = id;
    document.getElementById('habit-form-title').textContent = 'Edit Habit';
    document.getElementById('btn-submit-form').textContent = 'Save Changes';
    document.getElementById('habit-id').value = id;
    document.getElementById('habit-name').value = habit.name;
    document.getElementById('habit-desc').value = habit.description;
    document.getElementById('habit-category').value = habit.category;
    document.getElementById('habit-goal').value = habit.goal;

    state.formFrequency = habit.frequency;
    document.querySelectorAll('#frequency-segmented .segmented-btn').forEach(btn => {
      const active = btn.dataset.value === habit.frequency;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', active);
    });
    document.getElementById('custom-days-field').hidden = habit.frequency !== 'custom';
    state.formSelectedDays = habit.selectedDays.slice();
    document.querySelectorAll('#day-picker .day-btn').forEach(btn => {
      btn.classList.toggle('is-active', state.formSelectedDays.includes(Number(btn.dataset.day)));
    });

    state.formIcon = habit.icon;
    state.formColor = habit.color;
    buildIconPicker();
    buildColorPicker();

    document.getElementById('modal-habit-form').hidden = false;
    setTimeout(() => document.getElementById('habit-name').focus(), 50);
  }

  function closeFormModal() {
    document.getElementById('modal-habit-form').hidden = true;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById('habit-name').value,
      description: document.getElementById('habit-desc').value,
      category: document.getElementById('habit-category').value,
      goal: Number(document.getElementById('habit-goal').value),
      frequency: state.formFrequency,
      selectedDays: state.formSelectedDays,
      icon: state.formIcon,
      color: state.formColor
    };
    const errors = validateHabitForm(data);
    document.getElementById('err-habit-name').textContent = errors.name || '';
    if (Object.keys(errors).length) {
      if (errors.days) showToast(errors.days, 'error');
      return;
    }

    if (state.editingHabitId) {
      updateHabit(state.editingHabitId, data);
      showToast('✓ Habit updated');
    } else {
      createHabit(data);
      showToast('✓ Habit created successfully');
    }
    closeFormModal();
    updateUI();
  }

  /* ============ Toasts & confirmation ============ */

  function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    toast.textContent = message;
    container.appendChild(toast);
    announce(message);
    setTimeout(() => {
      toast.classList.add('toast--out');
      setTimeout(() => toast.remove(), 220);
    }, 3200);
  }

  function announce(msg) {
    const el = document.getElementById('sr-status');
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = msg; });
  }

  function showConfirmation(title, body, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-body').textContent = body;
    confirmCallback = onConfirm;
    document.getElementById('modal-confirm').hidden = false;
    setTimeout(() => document.getElementById('btn-confirm-ok').focus(), 50);
  }

  function showMilestoneBanner(days, habit) {
    const banner = document.getElementById('milestone-banner');
    document.getElementById('milestone-title').textContent = `${days}-Day Streak!`;
    document.getElementById('milestone-text').textContent = `You've completed "${habit.name}" for ${days} consecutive scheduled days.`;
    banner.hidden = false;
    announce(`Milestone reached: ${days} day streak for ${habit.name}`);
    setTimeout(() => { banner.hidden = true; }, 5000);
  }

  /* ============ Export / Import ============ */

  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      habits: state.habits,
      meta
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habit-tracker-backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('✓ Backup downloaded');
  }

  let pendingImportData = null;

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.habits)) throw new Error('Invalid structure');
        const valid = parsed.habits.every(h => h && typeof h.id === 'string' && typeof h.name === 'string' && CATEGORIES.includes ? true : true);
        if (!valid) throw new Error('Invalid habit data');
        pendingImportData = parsed;
        document.getElementById('modal-import').hidden = false;
      } catch (err) {
        showToast('! Something went wrong reading that file', 'error');
      }
    };
    reader.onerror = () => showToast('! Something went wrong reading that file', 'error');
    reader.readAsText(file);
  }

  function finalizeImport(mode) {
    if (!pendingImportData) return;
    const incoming = pendingImportData.habits.map(sanitizeHabit);
    if (mode === 'replace') {
      state.habits = incoming;
    } else {
      const existingIds = new Set(state.habits.map(h => h.id));
      incoming.forEach(h => {
        if (!existingIds.has(h.id)) state.habits.push(h);
      });
    }
    if (pendingImportData.meta) {
      meta = {
        milestonesShown: pendingImportData.meta.milestonesShown || {},
        perfectDayShown: pendingImportData.meta.perfectDayShown || {}
      };
      saveMeta();
    }
    saveHabits();
    pendingImportData = null;
    document.getElementById('modal-import').hidden = true;
    showToast('✓ Data imported');
    updateUI();
  }

  function clearAllData() {
    state.habits = [];
    meta = { milestonesShown: {}, perfectDayShown: {} };
    saveHabits();
    saveMeta();
    showToast('✓ All data cleared');
    updateUI();
  }

  /* ============ View navigation ============ */

  function switchView(view) {
    state.currentView = view;
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
    document.querySelectorAll('.nav-link').forEach(b => {
      const active = b.dataset.nav === view;
      b.classList.toggle('is-active', active);
      if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('.mobile-nav-link').forEach(b => b.classList.toggle('is-active', b.dataset.nav === view));
    closeMobileMenu();
    renderView(view);
    document.getElementById('main-content').focus?.();
  }

  function renderView(view) {
    if (view === 'dashboard') {
      document.getElementById('hero-date').textContent = formatLongDate(new Date());
      renderDashboardStats();
      renderWeeklyOverview();
      renderDashboardHabits();
      renderMiniCalendar();
      renderCategoryBreakdown('category-breakdown');
      populateCategoryFilterChips();
    } else if (view === 'habits') {
      renderHabitsView();
    } else if (view === 'calendar') {
      renderFullCalendar();
      document.getElementById('day-detail-panel').hidden = true;
    } else if (view === 'statistics') {
      renderStatisticsView();
    } else if (view === 'archived') {
      renderArchivedView();
    }
  }

  function updateUI() {
    renderView(state.currentView);
  }

  function populateCategoryFilterChips() {
    const el = document.getElementById('filter-category');
    el.innerHTML = `<button class="chip ${state.categoryFilter === 'all' ? 'is-active' : ''}" data-value="all">All</button>` +
      CATEGORIES.map(c => `<button class="chip ${state.categoryFilter === c ? 'is-active' : ''}" data-value="${c}">${c}</button>`).join('');
  }

  /* ============ Mobile menu ============ */

  function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('btn-menu-toggle');
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    menu.dataset.open = String(willOpen);
    menu.style.display = willOpen ? 'flex' : 'none';
    btn.setAttribute('aria-expanded', String(willOpen));
  }

  function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.hidden = true;
    menu.style.display = 'none';
    document.getElementById('btn-menu-toggle').setAttribute('aria-expanded', 'false');
  }

  /* ============ Event wiring ============ */

  function wireEvents() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => switchView(el.dataset.nav));
    });

    document.getElementById('btn-menu-toggle').addEventListener('click', toggleMobileMenu);

    document.getElementById('btn-new-habit').addEventListener('click', openAddHabitModal);
    document.getElementById('btn-fab-new').addEventListener('click', openAddHabitModal);
    document.getElementById('btn-close-form').addEventListener('click', closeFormModal);
    document.getElementById('btn-cancel-form').addEventListener('click', closeFormModal);
    document.getElementById('habit-form').addEventListener('submit', handleFormSubmit);

    document.getElementById('modal-habit-form').addEventListener('click', (e) => {
      if (e.target.id === 'modal-habit-form') closeFormModal();
    });
    document.getElementById('btn-close-detail').addEventListener('click', () => {
      document.getElementById('modal-habit-detail').hidden = true;
    });
    document.getElementById('modal-habit-detail').addEventListener('click', (e) => {
      if (e.target.id === 'modal-habit-detail') document.getElementById('modal-habit-detail').hidden = true;
    });

    document.getElementById('frequency-segmented').addEventListener('click', (e) => {
      const btn = e.target.closest('.segmented-btn');
      if (!btn) return;
      state.formFrequency = btn.dataset.value;
      document.querySelectorAll('#frequency-segmented .segmented-btn').forEach(b => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-checked', active);
      });
      document.getElementById('custom-days-field').hidden = state.formFrequency !== 'custom';
    });

    document.getElementById('day-picker').addEventListener('click', (e) => {
      const btn = e.target.closest('.day-btn');
      if (!btn) return;
      const day = Number(btn.dataset.day);
      const idx = state.formSelectedDays.indexOf(day);
      if (idx >= 0) state.formSelectedDays.splice(idx, 1); else state.formSelectedDays.push(day);
      btn.classList.toggle('is-active');
    });

    document.getElementById('icon-picker').addEventListener('click', (e) => {
      const btn = e.target.closest('.icon-choice');
      if (!btn) return;
      state.formIcon = btn.dataset.icon;
      buildIconPicker();
    });
    document.getElementById('color-picker').addEventListener('click', (e) => {
      const btn = e.target.closest('.color-choice');
      if (!btn) return;
      state.formColor = btn.dataset.color;
      buildColorPicker();
    });

    // Delegated habit card actions (works across all grids)
    document.body.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      const id = actionEl.dataset.id;
      if (action === 'toggle-complete') {
        const habit = getHabitById(id);
        if (!habit) return;
        if (isHabitCompletedOn(habit, new Date())) uncompleteHabit(id); else completeHabit(id);
        updateUI();
      } else if (action === 'edit') {
        openEditHabitModal(id);
      } else if (action === 'detail') {
        openHabitDetail(id);
      } else if (action === 'archive') {
        const habit = getHabitById(id);
        showConfirmation('Archive habit?', `"${habit.name}" will be hidden from your active list, but its history is preserved and it can be restored anytime.`, () => {
          archiveHabit(id);
          showToast('✓ Habit archived');
          updateUI();
        });
      } else if (action === 'restore') {
        restoreHabit(id);
        showToast('✓ Habit restored');
        updateUI();
      } else if (action === 'delete') {
        const habit = getHabitById(id);
        showConfirmation('Delete habit?', `Are you sure you want to delete "${habit.name}"? This will permanently remove the habit and its completion history.`, () => {
          deleteHabit(id);
          showToast('✓ Habit deleted');
          updateUI();
        });
      } else if (action === 'delete-permanent') {
        const habit = getHabitById(id);
        showConfirmation('Permanently delete?', `"${habit.name}" and all of its history will be permanently deleted. This cannot be undone.`, () => {
          deleteHabit(id);
          showToast('✓ Habit deleted');
          updateUI();
        });
      } else if (action === 'open-new-habit') {
        openAddHabitModal();
      }
    });

    // Confirm dialog
    document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
      document.getElementById('modal-confirm').hidden = true;
      confirmCallback = null;
    });
    document.getElementById('btn-confirm-ok').addEventListener('click', () => {
      document.getElementById('modal-confirm').hidden = true;
      if (confirmCallback) confirmCallback();
      confirmCallback = null;
    });

    // Search & filters (dashboard)
    document.getElementById('search-input').addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderDashboardHabits();
    });
    document.getElementById('search-input-2').addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderHabitsView();
    });
    document.getElementById('btn-toggle-filters').addEventListener('click', () => {
      const panel = document.getElementById('filter-panel');
      const btn = document.getElementById('btn-toggle-filters');
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', String(!panel.hidden));
    });
    document.getElementById('filter-status').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.activeFilter = chip.dataset.value;
      document.querySelectorAll('#filter-status .chip').forEach(c => c.classList.toggle('is-active', c === chip));
      renderDashboardHabits();
    });
    document.getElementById('filter-category').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.categoryFilter = chip.dataset.value;
      document.querySelectorAll('#filter-category .chip').forEach(c => c.classList.toggle('is-active', c === chip));
      renderDashboardHabits();
    });
    document.getElementById('filter-status-2').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.activeFilter = chip.dataset.value;
      renderHabitsView();
    });
    document.getElementById('sort-select').addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderDashboardHabits();
    });

    // Calendar
    document.getElementById('cal-prev').addEventListener('click', () => {
      state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
      renderFullCalendar();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
      renderFullCalendar();
    });
    document.getElementById('cal-today').addEventListener('click', () => {
      state.calendarMonth = new Date();
      renderFullCalendar();
    });
    document.getElementById('calendar-grid-full').addEventListener('click', (e) => {
      const cell = e.target.closest('.cal-cell:not(.cal-cell--empty)');
      if (!cell) return;
      showDayDetail(cell.dataset.date);
    });
    document.getElementById('calendar-mini').addEventListener('click', (e) => {
      const cell = e.target.closest('.cal-cell:not(.cal-cell--empty)');
      if (!cell) return;
      state.calendarMonth = new Date();
      switchView('calendar');
      setTimeout(() => showDayDetail(cell.dataset.date), 0);
    });

    // Footer data actions
    document.getElementById('btn-export').addEventListener('click', exportData);
    document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file-input').click());
    document.getElementById('import-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) importData(file);
      e.target.value = '';
    });
    document.getElementById('btn-import-merge').addEventListener('click', () => finalizeImport('merge'));
    document.getElementById('btn-import-replace').addEventListener('click', () => {
      showConfirmation('Replace all data?', 'This will overwrite your current habits with the imported backup. This cannot be undone.', () => finalizeImport('replace'));
      document.getElementById('modal-import').hidden = true;
    });
    document.getElementById('btn-import-cancel').addEventListener('click', () => {
      pendingImportData = null;
      document.getElementById('modal-import').hidden = true;
    });
    document.getElementById('btn-clear-data').addEventListener('click', () => {
      showConfirmation('Clear all habit data?', 'This will permanently delete all habits, completion history, and statistics. This action cannot be undone.', clearAllData);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openAddHabitModal();
      } else if (e.key === 'Escape') {
        let closedSomething = false;
        ['modal-habit-form', 'modal-habit-detail', 'modal-confirm', 'modal-import'].forEach(id => {
          const el = document.getElementById(id);
          if (!el.hidden) { el.hidden = true; closedSomething = true; }
        });
        if (!closedSomething) {
          const menu = document.getElementById('mobile-menu');
          if (!menu.hidden) closeMobileMenu();
        }
      }
    });
  }

  /* ============ Daily reset watcher ============ */

  function watchForNewDay() {
    setInterval(() => {
      const key = getDateKey(new Date());
      if (key !== state.todayKey) {
        state.todayKey = key;
        updateUI();
      }
    }, 30000);
  }

  /* ============ Init ============ */

  function initializeApp() {
    state.habits = loadHabits();
    meta = loadMeta();
    state.todayKey = getDateKey(new Date());
    wireEvents();
    switchView('dashboard');
    watchForNewDay();
  }

  document.addEventListener('DOMContentLoaded', initializeApp);
})();
