const KEYS = {
  settings: "typelab.settings",
  results: "typelab.results",
  achievements: "typelab.achievements"
};

const DEFAULT_SETTINGS = {
  theme: "light",
  sound: false,
  caretStyle: "line",
  fontSize: "medium",
  smoothAnimation: true,
  colorTheme: "default"
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable, fail silently */
  }
}

const Storage = {
  getSettings() {
    return { ...DEFAULT_SETTINGS, ...readJSON(KEYS.settings, {}) };
  },
  saveSettings(settings) {
    writeJSON(KEYS.settings, settings);
  },
  getResults() {
    return readJSON(KEYS.results, []);
  },
  addResult(result) {
    const results = this.getResults();
    results.push(result);
    if (results.length > 200) results.shift();
    writeJSON(KEYS.results, results);
    return results;
  },
  getAchievements() {
    return readJSON(KEYS.achievements, []);
  },
  unlockAchievement(id) {
    const list = this.getAchievements();
    if (!list.includes(id)) {
      list.push(id);
      writeJSON(KEYS.achievements, list);
    }
    return list;
  }
};

export { Storage, DEFAULT_SETTINGS };
