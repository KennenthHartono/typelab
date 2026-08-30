import { TypingEngine } from "./typingEngine.js";
import { liveStats, overallFinalStats, radarValues } from "./statsCalculator.js";
import { drawSpeedTimeline, drawRadar, drawKeyboardHeatmap, drawTrendSparkline } from "./visuals.js";
import { Storage, DEFAULT_SETTINGS } from "./storage.js";
import { ACHIEVEMENTS, evaluateAchievements } from "./achievements.js";
import { reconstructAt } from "./replay.js";

const dom = {};

const state = {
  settings: { ...DEFAULT_SETTINGS },
  mode: "time",
  duration: 15,
  language: "javascript",
  engine: null,
  charSpans: [],
  rafId: null,
  heatmapMetric: "usage",
  tabArmed: false,
  lastResult: null,
  audioCtx: null
};

function query() {
  dom.screens = document.querySelectorAll("[data-screen]");
  dom.navButtons = document.querySelectorAll("[data-nav]");
  dom.modeButtons = document.querySelectorAll("[data-test-mode]");
  dom.durationOptions = document.getElementById("duration-options");
  dom.durationButtons = document.querySelectorAll("[data-duration]");
  dom.languageSelect = document.getElementById("language-select");
  dom.customInput = document.getElementById("custom-text-input");
  dom.typingArea = document.getElementById("typing-area");
  dom.typingText = document.getElementById("typing-text");
  dom.progressFill = document.getElementById("progress-fill");
  dom.postActions = document.getElementById("post-actions");
  dom.btnRestart = document.getElementById("btn-restart");
  dom.btnViewResults = document.getElementById("btn-view-results");
  dom.btnTryAgain = document.getElementById("btn-try-again");

  dom.statTime = document.getElementById("stat-time");
  dom.statWpm = document.getElementById("stat-wpm");
  dom.statRaw = document.getElementById("stat-raw");
  dom.statAccuracy = document.getElementById("stat-accuracy");
  dom.statMistakes = document.getElementById("stat-mistakes");
  dom.statChars = document.getElementById("stat-chars");

  dom.settingsToggle = document.getElementById("settings-toggle");
  dom.settingsClose = document.getElementById("settings-close");
  dom.settingsBackdrop = document.getElementById("settings-backdrop");
  dom.settingTheme = document.getElementById("setting-theme");
  dom.settingSound = document.getElementById("setting-sound");
  dom.settingCaret = document.getElementById("setting-caret");
  dom.settingFontsize = document.getElementById("setting-fontsize");
  dom.settingAnimation = document.getElementById("setting-animation");
  dom.settingColortheme = document.getElementById("setting-colortheme");

  dom.resultsSubtitle = document.getElementById("results-subtitle");
  dom.overallScore = document.getElementById("overall-score");
  dom.statGrid = document.getElementById("stat-grid");
  dom.chartTimeline = document.getElementById("chart-timeline");
  dom.chartRadar = document.getElementById("chart-radar");
  dom.chartHeatmap = document.getElementById("chart-heatmap");
  dom.heatmapButtons = document.querySelectorAll("[data-heatmap]");
  dom.fingerprintList = document.getElementById("fingerprint-list");
  dom.focusList = document.getElementById("focus-list");
  dom.errorLists = document.getElementById("error-lists");
  dom.travelList = document.getElementById("travel-list");
  dom.replayText = document.getElementById("replay-text");
  dom.replayScrubber = document.getElementById("replay-scrubber");
  dom.replayTime = document.getElementById("replay-time");

  dom.leaderboardSummary = document.getElementById("leaderboard-summary");
  dom.chartTrend = document.getElementById("chart-trend");
  dom.resultsTableBody = document.querySelector("#results-table tbody");
  dom.achievementGrid = document.getElementById("achievement-grid");
  dom.toastStack = document.getElementById("toast-stack");
}

/* ---------------- settings ---------------- */

function applySettings() {
  const s = state.settings;
  document.documentElement.setAttribute("data-theme", s.theme);
  document.documentElement.setAttribute("data-color-theme", s.colorTheme);
  document.body.setAttribute("data-caret", s.caretStyle);
  document.body.setAttribute("data-font-size", s.fontSize);
  document.body.setAttribute("data-smooth", String(s.smoothAnimation));

  dom.settingTheme.checked = s.theme === "dark";
  dom.settingSound.checked = s.sound;
  dom.settingCaret.value = s.caretStyle;
  dom.settingFontsize.value = s.fontSize;
  dom.settingAnimation.checked = s.smoothAnimation;
  dom.settingColortheme.value = s.colorTheme;
}

function persistSettings() {
  Storage.saveSettings(state.settings);
  applySettings();
}

function initSettings() {
  state.settings = Storage.getSettings();
  applySettings();

  dom.settingsToggle.addEventListener("click", () => (dom.settingsBackdrop.hidden = false));
  dom.settingsClose.addEventListener("click", () => (dom.settingsBackdrop.hidden = true));
  dom.settingsBackdrop.addEventListener("click", e => {
    if (e.target === dom.settingsBackdrop) dom.settingsBackdrop.hidden = true;
  });

  dom.settingTheme.addEventListener("change", () => {
    state.settings.theme = dom.settingTheme.checked ? "dark" : "light";
    persistSettings();
  });
  dom.settingSound.addEventListener("change", () => {
    state.settings.sound = dom.settingSound.checked;
    persistSettings();
  });
  dom.settingCaret.addEventListener("change", () => {
    state.settings.caretStyle = dom.settingCaret.value;
    persistSettings();
  });
  dom.settingFontsize.addEventListener("change", () => {
    state.settings.fontSize = dom.settingFontsize.value;
    persistSettings();
  });
  dom.settingAnimation.addEventListener("change", () => {
    state.settings.smoothAnimation = dom.settingAnimation.checked;
    persistSettings();
  });
  dom.settingColortheme.addEventListener("change", () => {
    state.settings.colorTheme = dom.settingColortheme.value;
    persistSettings();
  });
}

/* ---------------- navigation ---------------- */

function showScreen(name) {
  dom.screens.forEach(screen => screen.classList.toggle("is-active", screen.dataset.screen === name));
  dom.navButtons.forEach(btn => {
    if (btn.classList.contains("mainnav__link")) {
      btn.classList.toggle("is-active", btn.dataset.nav === name);
    }
  });
  if (name === "leaderboard") renderLeaderboard();
  if (name === "achievements") renderAchievements();
}

function initNav() {
  dom.navButtons.forEach(btn => {
    btn.addEventListener("click", () => showScreen(btn.dataset.nav));
  });
}

/* ---------------- mode controls ---------------- */

function initModeControls() {
  dom.modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      dom.modeButtons.forEach(b => b.classList.toggle("is-active", b === btn));
      state.mode = btn.dataset.testMode;
      dom.durationOptions.hidden = state.mode !== "time";
      dom.languageSelect.hidden = state.mode !== "programming";
      dom.customInput.hidden = state.mode !== "custom";
      startNewTest();
    });
  });

  dom.durationButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      dom.durationButtons.forEach(b => b.classList.toggle("is-active", b === btn));
      state.duration = Number(btn.dataset.duration);
      startNewTest();
    });
  });

  dom.languageSelect.addEventListener("change", () => {
    state.language = dom.languageSelect.value;
    startNewTest();
  });

  dom.customInput.addEventListener("change", startNewTest);

  dom.btnRestart.addEventListener("click", startNewTest);
  dom.btnTryAgain.addEventListener("click", () => {
    showScreen("home");
    startNewTest();
  });
  dom.btnViewResults.addEventListener("click", () => showScreen("results"));
}

/* ---------------- typing test ---------------- */

function startNewTest() {
  cancelAnimationFrame(state.rafId);
  dom.postActions.hidden = true;

  state.engine = new TypingEngine({
    mode: state.mode,
    duration: state.duration,
    language: state.language,
    customText: dom.customInput.value
  });

  renderTypingText(state.engine.target);
  dom.statTime.textContent = state.mode === "time" ? state.duration : "0";
  dom.statWpm.textContent = "0";
  dom.statRaw.textContent = "0";
  dom.statAccuracy.textContent = "100%";
  dom.statMistakes.textContent = "0";
  dom.statChars.textContent = "0";
  dom.progressFill.style.width = "0%";
  dom.typingArea.focus();
}

function renderTypingText(target) {
  dom.typingText.innerHTML = "";
  state.charSpans = [];
  appendSpansFrom(0, target);
  if (state.charSpans.length) state.charSpans[0].classList.add("char--current");
}

function appendSpansFrom(start, target) {
  const fragment = document.createDocumentFragment();
  for (let i = start; i < target.length; i++) {
    const span = document.createElement("span");
    span.className = "char char--pending";
    span.textContent = target[i];
    fragment.appendChild(span);
    state.charSpans.push(span);
  }
  dom.typingText.appendChild(fragment);
}

function syncExtendedText() {
  const engine = state.engine;
  if (engine.target.length > state.charSpans.length) {
    appendSpansFrom(state.charSpans.length, engine.target);
  }
}

function moveCaretTo(index) {
  state.charSpans.forEach(span => span.classList.remove("char--current"));
  if (state.charSpans[index]) state.charSpans[index].classList.add("char--current");
}

function applyCharResult(index, record) {
  const span = state.charSpans[index];
  if (!span) return;
  span.classList.remove("char--pending", "char--correct", "char--incorrect");
  span.classList.add(record.correct ? "char--correct" : "char--incorrect");
}

function resetCharAt(index) {
  const span = state.charSpans[index];
  if (!span) return;
  span.classList.remove("char--correct", "char--incorrect");
  span.classList.add("char--pending");
}

function playTone(frequency, duration) {
  if (!state.settings.sound) return;
  if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = state.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function handleTypedChar(char) {
  const engine = state.engine;
  if (!engine || engine.state === "finished") return;
  const index = engine.cursor;
  const record = engine.typeChar(char);
  if (!record) return;

  applyCharResult(index, record);
  playTone(record.correct ? 720 : 220, record.correct ? 0.05 : 0.12);
  syncExtendedText();
  moveCaretTo(engine.cursor);

  if (!state.rafId) startLiveLoop();
  if (engine.state === "finished") finalizeTest();
}

function handleBackspace() {
  const engine = state.engine;
  if (!engine || engine.state !== "running" || engine.cursor === 0) return;
  const index = engine.cursor - 1;
  engine.backspace();
  resetCharAt(index);
  moveCaretTo(engine.cursor);
}

function initTypingCapture() {
  dom.typingArea.addEventListener("keydown", e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "Tab") {
      e.preventDefault();
      state.tabArmed = true;
      return;
    }
    if (e.key === "Enter" && state.tabArmed) {
      e.preventDefault();
      startNewTest();
      return;
    }
    state.tabArmed = false;

    if (e.key === "Backspace") {
      e.preventDefault();
      handleBackspace();
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      handleTypedChar(e.key);
    }
  });

  dom.typingArea.addEventListener("click", () => dom.typingArea.focus());
}

function startLiveLoop() {
  const tick = () => {
    const engine = state.engine;
    if (!engine || engine.state === "finished") {
      state.rafId = null;
      return;
    }
    const stats = liveStats(engine);
    dom.statWpm.textContent = stats.wpm;
    dom.statRaw.textContent = stats.rawWpm;
    dom.statAccuracy.textContent = `${stats.accuracy}%`;
    dom.statMistakes.textContent = stats.mistakes;
    dom.statChars.textContent = stats.characters;

    if (engine.mode === "time") {
      const remaining = engine.remainingSeconds();
      dom.statTime.textContent = remaining;
      dom.progressFill.style.width = `${(stats.elapsedSeconds / engine.duration) * 100}%`;
      if (engine.isTimeExpired()) {
        engine.finish();
        finalizeTest();
        return;
      }
    } else {
      dom.statTime.textContent = stats.elapsedSeconds;
      dom.progressFill.style.width = `${(engine.cursor / engine.target.length) * 100}%`;
    }

    state.rafId = requestAnimationFrame(tick);
  };
  state.rafId = requestAnimationFrame(tick);
}

function finalizeTest() {
  cancelAnimationFrame(state.rafId);
  state.rafId = null;

  const finalStats = overallFinalStats(state.engine);
  const previouslyUnlocked = Storage.getAchievements();
  const earned = evaluateAchievements(finalStats, state.engine.keystrokes);
  const freshlyUnlocked = earned.filter(a => !previouslyUnlocked.includes(a.id));
  freshlyUnlocked.forEach(a => {
    Storage.unlockAchievement(a.id);
    showToast(`Achievement unlocked — ${a.title}`);
  });

  Storage.addResult({
    date: Date.now(),
    mode: finalStats.mode,
    duration: finalStats.durationSeconds,
    wpm: finalStats.wpm,
    rawWpm: finalStats.rawWpm,
    accuracy: finalStats.accuracy,
    consistency: finalStats.consistency
  });

  state.lastResult = {
    stats: finalStats,
    keystrokes: state.engine.keystrokes,
    target: state.engine.target
  };

  dom.postActions.hidden = false;
  setTimeout(() => {
    showScreen("results");
    renderResults();
  }, 500);
}

/* ---------------- results screen ---------------- */

function statCard(label, value) {
  const card = document.createElement("div");
  card.className = "stat-card";
  card.innerHTML = `<span class="stat-card__value">${value}</span><span class="stat-card__label">${label}</span>`;
  return card;
}

function renderResults() {
  const result = state.lastResult;
  if (!result) return;
  const { stats } = result;

  dom.resultsSubtitle.textContent = `${stats.mode} mode · ${stats.durationSeconds}s · ${new Date().toLocaleString()}`;
  dom.overallScore.textContent = stats.overallScore;

  dom.statGrid.innerHTML = "";
  [
    ["wpm", stats.wpm],
    ["raw wpm", stats.rawWpm],
    ["accuracy", `${stats.accuracy}%`],
    ["consistency", `${stats.consistency}%`],
    ["focus score", stats.focus.focusScore],
    ["reaction time", `${stats.reactionTime}ms`],
    ["typing style", stats.typingStyle]
  ].forEach(([label, value]) => dom.statGrid.appendChild(statCard(label, value)));

  drawSpeedTimeline(dom.chartTimeline, stats.timeline);
  drawRadar(dom.chartRadar, radarValues(stats));
  drawKeyboardHeatmap(dom.chartHeatmap, result.keystrokes, state.heatmapMetric);

  dom.fingerprintList.innerHTML = "";
  [
    ["Uniqueness score", stats.fingerprint.uniqueness],
    ["Typing style", stats.fingerprint.style],
    ["Average key interval", `${stats.fingerprint.avgInterval}ms`],
    ["Fastest burst", `${stats.fingerprint.fastestBurst}ms`],
    ["Slowest burst", `${stats.fingerprint.slowestBurst}ms`]
  ].forEach(([label, value]) => appendMetric(dom.fingerprintList, label, value));

  dom.focusList.innerHTML = "";
  [
    ["Longest pause", `${stats.focus.longestPause}ms`],
    ["Average pause", `${stats.focus.averagePause}ms`],
    ["Pause count", stats.focus.pauseCount],
    ["Focus score", stats.focus.focusScore]
  ].forEach(([label, value]) => appendMetric(dom.focusList, label, value));

  dom.travelList.innerHTML = "";
  [
    ["Left hand", `${stats.travel.leftHandCm} cm`],
    ["Right hand", `${stats.travel.rightHandCm} cm`],
    ["Total distance", `${stats.travel.totalCm} cm`]
  ].forEach(([label, value]) => appendMetric(dom.travelList, label, value));

  renderErrorLists(stats.errors);
  renderReplay(result);
}

function appendMetric(list, label, value) {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  list.appendChild(dt);
  list.appendChild(dd);
}

function renderErrorLists(errors) {
  dom.errorLists.innerHTML = "";

  const keysBlock = document.createElement("div");
  keysBlock.className = "error-sublist";
  const keysHeading = document.createElement("h3");
  keysHeading.textContent = "Most mistyped keys";
  keysBlock.appendChild(keysHeading);
  const keyRow = buildChipRow(errors.topKeys, key => (key === " " ? "space" : key));
  keysBlock.appendChild(keyRow);

  const wordsBlock = document.createElement("div");
  wordsBlock.className = "error-sublist";
  const wordsHeading = document.createElement("h3");
  wordsHeading.textContent = "Most mistyped words";
  wordsBlock.appendChild(wordsHeading);
  const wordRow = buildChipRow(errors.topWords, word => word);
  wordsBlock.appendChild(wordRow);

  dom.errorLists.appendChild(keysBlock);
  dom.errorLists.appendChild(wordsBlock);
}

function buildChipRow(entries, labelFor) {
  const row = document.createElement("div");
  row.className = "error-chip-row";
  if (!entries.length) {
    row.textContent = "No mistakes recorded.";
    return row;
  }
  entries.forEach(([key, count]) => {
    const chip = document.createElement("span");
    chip.className = "error-chip";
    chip.append(`${labelFor(key)} `);
    const strong = document.createElement("strong");
    strong.textContent = String(count);
    chip.appendChild(strong);
    row.appendChild(chip);
  });
  return row;
}

function renderReplay(result) {
  const { keystrokes, target } = result;
  dom.replayScrubber.max = Math.max(0, keystrokes.length - 1);
  dom.replayScrubber.value = keystrokes.length - 1;
  renderReplayFrame(target, keystrokes, keystrokes.length - 1);

  dom.replayScrubber.oninput = () => {
    renderReplayFrame(target, keystrokes, Number(dom.replayScrubber.value));
  };
}

function renderReplayFrame(target, keystrokes, index) {
  if (!keystrokes.length) {
    dom.replayText.textContent = target;
    return;
  }
  const { states, cursor, time } = reconstructAt(target, keystrokes, index);
  dom.replayText.innerHTML = "";
  const fragment = document.createDocumentFragment();
  target.split("").forEach((char, i) => {
    const span = document.createElement("span");
    span.textContent = char;
    if (i === cursor) span.className = "char char--current";
    else if (states[i] === "correct") span.className = "char char--correct";
    else if (states[i] === "incorrect") span.className = "char char--incorrect";
    else span.className = "char char--pending";
    fragment.appendChild(span);
  });
  dom.replayText.appendChild(fragment);
  dom.replayTime.textContent = `${(time / 1000).toFixed(1)}s`;
}

function initHeatmapToggle() {
  dom.heatmapButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      dom.heatmapButtons.forEach(b => b.classList.toggle("is-active", b === btn));
      state.heatmapMetric = btn.dataset.heatmap;
      if (state.lastResult) drawKeyboardHeatmap(dom.chartHeatmap, state.lastResult.keystrokes, state.heatmapMetric);
    });
  });
}

/* ---------------- leaderboard ---------------- */

function renderLeaderboard() {
  const results = Storage.getResults();
  dom.leaderboardSummary.innerHTML = "";

  if (!results.length) {
    dom.leaderboardSummary.appendChild(statCard("personal best", "—"));
    dom.leaderboardSummary.appendChild(statCard("tests completed", 0));
    drawTrendSparkline(dom.chartTrend, []);
    dom.resultsTableBody.innerHTML = "";
    return;
  }

  const avg = list => list.reduce((a, r) => a + r.wpm, 0) / list.length;
  const personalBest = Math.max(...results.map(r => r.wpm));
  const averageWpm = Math.round(avg(results));
  const half = Math.max(1, Math.floor(results.length / 2));
  const earlyAvg = avg(results.slice(0, half));
  const recentAvg = avg(results.slice(-half));
  const improvement = Math.round(recentAvg - earlyAvg);

  dom.leaderboardSummary.appendChild(statCard("personal best", `${personalBest} wpm`));
  dom.leaderboardSummary.appendChild(statCard("average wpm", `${averageWpm} wpm`));
  dom.leaderboardSummary.appendChild(statCard("tests completed", results.length));
  dom.leaderboardSummary.appendChild(
    statCard("avg. improvement", `${improvement >= 0 ? "+" : ""}${improvement} wpm`)
  );

  drawTrendSparkline(dom.chartTrend, results.slice(-30).map(r => r.wpm));

  dom.resultsTableBody.innerHTML = "";
  results
    .slice()
    .reverse()
    .slice(0, 40)
    .forEach(r => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(r.date).toLocaleDateString()}</td>
        <td>${r.mode}</td>
        <td>${r.wpm}</td>
        <td>${r.rawWpm}</td>
        <td>${r.accuracy}%</td>
        <td>${r.consistency}%</td>`;
      dom.resultsTableBody.appendChild(row);
    });
}

/* ---------------- achievements ---------------- */

function renderAchievements() {
  const unlocked = Storage.getAchievements();
  dom.achievementGrid.innerHTML = "";
  ACHIEVEMENTS.forEach(a => {
    const isUnlocked = unlocked.includes(a.id);
    const card = document.createElement("article");
    card.className = `achievement-card${isUnlocked ? " is-unlocked" : ""}`;
    card.innerHTML = `
      <div class="achievement-card__title">${a.title}</div>
      <div class="achievement-card__desc">${a.description}</div>
      <span class="achievement-card__badge">${isUnlocked ? "Unlocked" : "Locked"}</span>`;
    dom.achievementGrid.appendChild(card);
  });
}

/* ---------------- toasts ---------------- */

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  dom.toastStack.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ---------------- init ---------------- */

function init() {
  query();
  initSettings();
  initNav();
  initModeControls();
  initTypingCapture();
  initHeatmapToggle();
  startNewTest();
}

export { init };
