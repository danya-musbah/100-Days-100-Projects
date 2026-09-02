/**
 * Quiz Night — Application Logic
 * Vanilla JavaScript. No frameworks, no build step.
 */

(function () {
  "use strict";

  /* =====================================================================
     Configuration
     ===================================================================== */
  const QUIZ_CONFIG = {
    defaultQuestionCount: 10,
    defaultDifficulty: "medium",
    timerEnabled: true,
    statsStorageKey: "quizNight.stats.v1"
  };

  /* =====================================================================
     Application State
     ===================================================================== */
  const state = {
    allCategories: [],
    category: null,
    difficulty: null,
    questionCount: QUIZ_CONFIG.defaultQuestionCount,
    timerMinutes: 5,
    questions: [],          // active, shuffled question set for this run
    currentQuestion: 0,
    answers: [],             // index selected per question, or null
    score: 0,
    timer: null,             // interval id
    timeRemaining: 0,        // seconds
    timeTaken: 0,             // seconds actually used, for results
    quizStartedAt: null
  };

  /* =====================================================================
     DOM shortcuts
     ===================================================================== */
  const $ = (id) => document.getElementById(id);

  const screens = {
    start: $("screen-start"),
    setup: $("screen-setup"),
    quiz: $("screen-quiz"),
    results: $("screen-results"),
    review: $("screen-review"),
    stats: $("screen-stats")
  };

  /* =====================================================================
     Utility functions
     ===================================================================== */

  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      if (!el) return;
      el.hidden = key !== name;
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showToast(message, type) {
    const region = $("toast-region");
    if (!region) return;
    const toast = document.createElement("div");
    toast.className = "toast" + (type ? ` toast--${type}` : "");
    toast.textContent = message;
    region.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("toast--out");
      setTimeout(() => toast.remove(), 220);
    }, 2200);
  }

  /* =====================================================================
     Data validation
     ===================================================================== */

  function isValidQuestion(q) {
    if (!q || typeof q !== "object") return false;
    if (typeof q.question !== "string" || !q.question.trim()) return false;
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;
    if (q.options.some((o) => typeof o !== "string" || !o.trim())) return false;
    if (typeof q.answer !== "number" || q.answer < 0 || q.answer > 3) return false;
    if (typeof q.category !== "string" || !q.category.trim()) return false;
    if (typeof q.difficulty !== "string" || !["easy", "medium", "hard"].includes(q.difficulty)) return false;
    return true;
  }

  function getValidQuestions() {
    if (typeof QUESTIONS === "undefined" || !Array.isArray(QUESTIONS)) {
      console.error("Quiz Night: question data failed to load.");
      return [];
    }
    return QUESTIONS.filter(isValidQuestion);
  }

  /* =====================================================================
     Initialization
     ===================================================================== */

  function initializeApp() {
    const valid = getValidQuestions();
    if (!valid.length) {
      showToast("Question data could not be loaded. Please refresh.", "error");
    }
    state.allCategories = [...new Set(valid.map((q) => q.category))].sort();
    buildCategoryGrid();
    bindEvents();
    updateSetupHint();
    $("fact-question-count").textContent = `${QUIZ_CONFIG.defaultQuestionCount} Questions`;
    showScreen("start");
  }

  function buildCategoryGrid() {
    const grid = $("category-grid");
    grid.innerHTML = "";
    state.allCategories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.category = cat;
      btn.textContent = cat;
      grid.appendChild(btn);
    });
  }

  /* =====================================================================
     Setup screen logic
     ===================================================================== */

  function countAvailable(category, difficulty) {
    return getValidQuestions().filter(
      (q) => q.category === category && q.difficulty === difficulty
    ).length;
  }

  function updateSetupHint() {
    const hint = $("setup-hint");
    const beginBtn = $("btn-begin");

    if (!state.category || !state.difficulty) {
      hint.textContent = "Pick a category and difficulty to continue.";
      beginBtn.disabled = true;
      return;
    }

    const available = countAvailable(state.category, state.difficulty);

    if (available === 0) {
      hint.textContent = `No ${state.difficulty} questions in ${state.category} yet — try another difficulty.`;
      beginBtn.disabled = true;
      return;
    }

    if (available < state.questionCount) {
      hint.textContent = `Only ${available} question${available === 1 ? "" : "s"} available for this combination — the quiz will use all of them.`;
    } else {
      hint.textContent = `${available} questions available. Ready when you are.`;
    }
    beginBtn.disabled = false;
  }

  function selectChip(groupSelector, target, datasetKey) {
    document.querySelectorAll(groupSelector).forEach((el) => el.classList.remove("chip--active"));
    target.classList.add("chip--active");
  }

  /* =====================================================================
     Quiz lifecycle
     ===================================================================== */

  function loadQuestions(category, difficulty, count) {
    const pool = getValidQuestions().filter(
      (q) => q.category === category && q.difficulty === difficulty
    );
    const shuffled = shuffleQuestions(pool);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    // shuffle each question's options and remap the correct answer index
    return selected.map((q) => {
      const optionOrder = shuffle([0, 1, 2, 3]);
      const options = optionOrder.map((i) => q.options[i]);
      const answer = optionOrder.indexOf(q.answer);
      return { ...q, options, answer };
    });
  }

  function shuffleQuestions(list) {
    return shuffle(list);
  }

  function startQuiz() {
    const questions = loadQuestions(state.category, state.difficulty, state.questionCount);

    if (!questions.length) {
      showToast("No questions available for this selection.", "error");
      return;
    }

    $("loading-overlay").hidden = false;

    setTimeout(() => {
      state.questions = questions;
      state.currentQuestion = 0;
      state.answers = new Array(questions.length).fill(null);
      state.score = 0;
      state.quizStartedAt = Date.now();
      state.timeTaken = 0;

      buildQuestionNav();
      renderQuestion();
      showScreen("quiz");
      $("loading-overlay").hidden = true;

      if (state.timerMinutes > 0) {
        startTimer(state.timerMinutes);
      } else {
        $("quiz-timer").hidden = true;
      }
    }, 350);
  }

  function buildQuestionNav() {
    const nav = $("question-nav");
    nav.innerHTML = "";
    state.questions.forEach((_, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(i + 1);
      btn.setAttribute("aria-label", `Go to question ${i + 1}`);
      btn.addEventListener("click", () => {
        state.currentQuestion = i;
        renderQuestion();
      });
      nav.appendChild(btn);
    });
  }

  function updateQuestionNav() {
    const buttons = $("question-nav").querySelectorAll("button");
    buttons.forEach((btn, i) => {
      btn.removeAttribute("aria-current");
      btn.removeAttribute("data-state");
      if (i === state.currentQuestion) btn.setAttribute("aria-current", "true");
      else if (state.answers[i] !== null) btn.setAttribute("data-state", "answered");
    });
  }

  function renderQuestion() {
    const q = state.questions[state.currentQuestion];
    const total = state.questions.length;
    const idx = state.currentQuestion;

    const questionTextEl = $("question-text");
    questionTextEl.textContent = q.question;
    questionTextEl.classList.remove("question-block-enter");
    void questionTextEl.offsetWidth; // restart animation
    questionTextEl.classList.add("question-block-enter");

    const list = $("answers-list");
    list.innerHTML = "";
    const letters = ["A", "B", "C", "D"];
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer-option";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", state.answers[idx] === i ? "true" : "false");
      btn.dataset.index = String(i);

      const letterSpan = document.createElement("span");
      letterSpan.className = "answer-option__letter";
      letterSpan.textContent = letters[i];
      letterSpan.setAttribute("aria-hidden", "true");

      const textSpan = document.createElement("span");
      textSpan.textContent = opt; // textContent only — never innerHTML with data

      btn.appendChild(letterSpan);
      btn.appendChild(textSpan);
      btn.addEventListener("click", () => selectAnswer(i));
      list.appendChild(btn);
    });

    $("quiz-counter").textContent = `${String(idx + 1).padStart(2, "0")} / ${total}`;
    updateProgress();
    updateQuestionNav();

    $("btn-prev").disabled = idx === 0;
    const isLast = idx === total - 1;
    $("btn-next").textContent = isLast ? "Finish Quiz" : "Next Question →";
    $("btn-next").disabled = state.answers[idx] === null;

    $("question-live").textContent = `Question ${idx + 1} of ${total}: ${q.question}`;
  }

  function updateProgress() {
    const total = state.questions.length;
    const pct = Math.round(((state.currentQuestion + 1) / total) * 100);
    $("progress-fill").style.width = `${pct}%`;
    const track = document.querySelector(".progress-track");
    track.setAttribute("aria-valuenow", String(pct));
  }

  function selectAnswer(optionIndex) {
    const idx = state.currentQuestion;
    state.answers[idx] = optionIndex;

    $("answers-list").querySelectorAll(".answer-option").forEach((btn, i) => {
      btn.setAttribute("aria-checked", i === optionIndex ? "true" : "false");
    });

    $("btn-next").disabled = false;
    updateQuestionNav();
  }

  function saveAnswer(index, optionIndex) {
    state.answers[index] = optionIndex;
  }

  function nextQuestion() {
    const idx = state.currentQuestion;
    const q = state.questions[idx];
    const chosen = state.answers[idx];

    if (chosen === null) return; // guarded by disabled button too

    if (chosen === q.answer) {
      showToast("Correct! Great job.", "success");
    } else {
      showToast(`Not quite. The correct answer is: ${q.options[q.answer]}`, "error");
    }

    if (idx < state.questions.length - 1) {
      state.currentQuestion += 1;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }

  function previousQuestion() {
    if (state.currentQuestion === 0) return;
    state.currentQuestion -= 1;
    renderQuestion();
  }

  /* =====================================================================
     Timer
     ===================================================================== */

  function startTimer(minutes) {
    stopTimer();
    state.timeRemaining = minutes * 60;
    const pill = $("quiz-timer");
    pill.hidden = false;
    updateTimerDisplay();

    state.timer = setInterval(() => {
      state.timeRemaining -= 1;
      updateTimerDisplay();
      if (state.timeRemaining <= 0) {
        stopTimer();
        showToast("Time's up!", "error");
        finishQuiz();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  function updateTimerDisplay() {
    const pill = $("quiz-timer");
    const display = $("timer-display");
    const t = Math.max(0, state.timeRemaining);
    display.textContent = formatTime(t);
    pill.classList.remove("timer-pill--warning", "timer-pill--danger");
    if (t <= 30) pill.classList.add("timer-pill--danger");
    else if (t <= 60) pill.classList.add("timer-pill--warning");
  }

  /* =====================================================================
     Scoring / Results
     ===================================================================== */

  function calculateScore() {
    let correct = 0;
    state.questions.forEach((q, i) => {
      if (state.answers[i] === q.answer) correct += 1;
    });
    return correct;
  }

  function finishQuiz() {
    stopTimer();
    state.score = calculateScore();

    if (state.timerMinutes > 0) {
      state.timeTaken = state.timerMinutes * 60 - Math.max(0, state.timeRemaining);
    } else {
      state.timeTaken = Math.round((Date.now() - state.quizStartedAt) / 1000);
    }

    saveStatistics();
    showResults();
  }

  function scoreMessage(pct) {
    if (pct >= 90) return { title: "Excellent!", body: "You really know your stuff." };
    if (pct >= 70) return { title: "Great Job!", body: "You have a strong understanding." };
    if (pct >= 50) return { title: "Good Effort!", body: "There is room to improve." };
    return { title: "Keep Practicing!", body: "Try again and improve your score." };
  }

  function showResults() {
    const total = state.questions.length;
    const correct = state.score;
    const incorrect = total - correct;
    const pct = total ? Math.round((correct / total) * 100) : 0;

    $("score-percent").textContent = `${pct}%`;
    $("score-fraction").textContent = `${correct} / ${total}`;
    $("stat-correct").textContent = String(correct);
    $("stat-incorrect").textContent = String(incorrect);
    $("stat-accuracy").textContent = `${pct}%`;
    $("stat-time").textContent = formatTime(state.timeTaken);

    const msg = scoreMessage(pct);
    $("score-message-title").textContent = msg.title;
    $("score-message-body").textContent = msg.body;

    const circumference = 440;
    const offset = circumference - (circumference * pct) / 100;
    const ring = $("score-ring__value");
    ring.style.strokeDashoffset = String(circumference);
    // force reflow then animate to target for a smooth reveal
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ring.style.strokeDashoffset = String(offset);
      });
    });

    showScreen("results");
  }

  /* =====================================================================
     Review
     ===================================================================== */

  function reviewAnswers() {
    const list = $("review-list");
    list.innerHTML = "";

    state.questions.forEach((q, i) => {
      const chosen = state.answers[i];
      const isCorrect = chosen === q.answer;

      const item = document.createElement("article");
      item.className = "review-item" + (isCorrect ? "" : " review-item--incorrect");

      const qRow = document.createElement("div");
      qRow.className = "review-item__q";
      const qText = document.createElement("p");
      qText.textContent = `${i + 1}. ${q.question}`;
      const badge = document.createElement("span");
      badge.className = "review-item__badge";
      badge.textContent = isCorrect ? "✓ Correct" : "✕ Incorrect";
      qRow.appendChild(qText);
      qRow.appendChild(badge);

      const answersGrid = document.createElement("dl");
      answersGrid.className = "review-item__answers";
      const yourDt = document.createElement("dt");
      yourDt.textContent = "Your answer";
      const yourDd = document.createElement("dd");
      yourDd.textContent = chosen === null ? "No answer" : q.options[chosen];
      const correctDt = document.createElement("dt");
      correctDt.textContent = "Correct answer";
      const correctDd = document.createElement("dd");
      correctDd.textContent = q.options[q.answer];
      answersGrid.append(yourDt, yourDd, correctDt, correctDd);

      item.appendChild(qRow);
      item.appendChild(answersGrid);

      if (q.explanation) {
        const explain = document.createElement("div");
        explain.className = "review-item__explain";
        const strong = document.createElement("strong");
        strong.textContent = "Why?";
        const text = document.createElement("span");
        text.textContent = q.explanation;
        explain.appendChild(strong);
        explain.appendChild(text);
        item.appendChild(explain);
      }

      list.appendChild(item);
    });

    showScreen("review");
  }

  /* =====================================================================
     Restart / Change quiz
     ===================================================================== */

  function restartQuiz() {
    startQuiz();
  }

  function resetQuiz() {
    stopTimer();
    state.questions = [];
    state.currentQuestion = 0;
    state.answers = [];
    state.score = 0;
    state.timeRemaining = 0;
  }

  function changeQuiz() {
    resetQuiz();
    showScreen("setup");
  }

  /* =====================================================================
     Statistics (localStorage)
     ===================================================================== */

  function loadStatistics() {
    try {
      const raw = localStorage.getItem(QUIZ_CONFIG.statsStorageKey);
      if (!raw) return { completed: 0, bestScore: 0, totalScorePct: 0, questionsAnswered: 0 };
      const parsed = JSON.parse(raw);
      return {
        completed: Number(parsed.completed) || 0,
        bestScore: Number(parsed.bestScore) || 0,
        totalScorePct: Number(parsed.totalScorePct) || 0,
        questionsAnswered: Number(parsed.questionsAnswered) || 0
      };
    } catch (err) {
      console.warn("Quiz Night: could not read saved statistics.", err);
      return { completed: 0, bestScore: 0, totalScorePct: 0, questionsAnswered: 0 };
    }
  }

  function saveStatistics() {
    const total = state.questions.length;
    const pct = total ? Math.round((state.score / total) * 100) : 0;

    try {
      const current = loadStatistics();
      const updated = {
        completed: current.completed + 1,
        bestScore: Math.max(current.bestScore, pct),
        totalScorePct: current.totalScorePct + pct,
        questionsAnswered: current.questionsAnswered + total
      };
      localStorage.setItem(QUIZ_CONFIG.statsStorageKey, JSON.stringify(updated));
      showToast("Score saved", "success");
    } catch (err) {
      console.warn("Quiz Night: could not save statistics.", err);
      showToast("Could not save your score locally.", "error");
    }
  }

  function renderStatistics() {
    const stats = loadStatistics();
    const avg = stats.completed ? Math.round(stats.totalScorePct / stats.completed) : 0;
    $("stats-completed").textContent = String(stats.completed);
    $("stats-best").textContent = `${stats.bestScore}%`;
    $("stats-average").textContent = `${avg}%`;
    $("stats-answered").textContent = String(stats.questionsAnswered);
  }

  function resetStatistics() {
    try {
      localStorage.removeItem(QUIZ_CONFIG.statsStorageKey);
      showToast("Statistics reset", "success");
    } catch (err) {
      console.warn("Quiz Night: could not reset statistics.", err);
      showToast("Could not reset statistics.", "error");
    }
    renderStatistics();
  }

  /* =====================================================================
     Dialog
     ===================================================================== */

  function openDialog() {
    $("confirm-dialog").hidden = false;
    $("btn-dialog-cancel").focus();
  }
  function closeDialog() {
    $("confirm-dialog").hidden = true;
  }

  /* =====================================================================
     Event binding
     ===================================================================== */

  function bindEvents() {
    $("btn-start").addEventListener("click", () => showScreen("setup"));
    $("btn-setup-back").addEventListener("click", () => showScreen("start"));
    $("btn-view-stats").addEventListener("click", () => {
      renderStatistics();
      showScreen("stats");
    });
    $("btn-stats-back").addEventListener("click", () => showScreen("start"));

    $("category-grid").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-category]");
      if (!btn) return;
      state.category = btn.dataset.category;
      selectChip("#category-grid .chip", btn);
      updateSetupHint();
    });

    $("difficulty-grid").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-difficulty]");
      if (!btn) return;
      state.difficulty = btn.dataset.difficulty;
      selectChip("#difficulty-grid .chip", btn);
      updateSetupHint();
    });

    $("count-grid").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-count]");
      if (!btn) return;
      state.questionCount = Number(btn.dataset.count);
      selectChip("#count-grid .chip", btn);
      updateSetupHint();
    });

    $("timer-grid").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-timer]");
      if (!btn) return;
      state.timerMinutes = Number(btn.dataset.timer);
      selectChip("#timer-grid .chip", btn);
    });

    $("btn-begin").addEventListener("click", startQuiz);

    $("btn-prev").addEventListener("click", previousQuestion);
    $("btn-next").addEventListener("click", nextQuestion);

    $("btn-review").addEventListener("click", reviewAnswers);
    $("btn-review-back").addEventListener("click", () => showScreen("results"));
    $("btn-restart").addEventListener("click", restartQuiz);
    $("btn-review-restart").addEventListener("click", restartQuiz);
    $("btn-change-quiz").addEventListener("click", changeQuiz);

    $("btn-reset-stats").addEventListener("click", openDialog);
    $("btn-dialog-cancel").addEventListener("click", closeDialog);
    $("btn-dialog-confirm").addEventListener("click", () => {
      resetStatistics();
      closeDialog();
    });
    $("confirm-dialog").addEventListener("click", (e) => {
      if (e.target === $("confirm-dialog")) closeDialog();
    });

    document.addEventListener("keydown", handleKeydown);
  }

  function handleKeydown(e) {
    if (!$("confirm-dialog").hidden) {
      if (e.key === "Escape") closeDialog();
      return;
    }

    if (screens.quiz.hidden) return;

    if (["1", "2", "3", "4"].includes(e.key)) {
      const i = Number(e.key) - 1;
      const options = $("answers-list").querySelectorAll(".answer-option");
      if (options[i]) {
        e.preventDefault();
        options[i].click();
        options[i].focus();
      }
    } else if (e.key === "Enter") {
      if (!$("btn-next").disabled && document.activeElement.tagName !== "BUTTON") {
        e.preventDefault();
        nextQuestion();
      }
    }
  }

  /* =====================================================================
     Boot
     ===================================================================== */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
  } else {
    initializeApp();
  }
})();
