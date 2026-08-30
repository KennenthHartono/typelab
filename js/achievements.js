const ACHIEVEMENTS = [
  {
    id: "speed-100",
    title: "Triple Digits",
    description: "Reach 100 WPM in a single test.",
    check: stats => stats.wpm >= 100
  },
  {
    id: "perfect-accuracy",
    title: "Perfect Accuracy",
    description: "Finish a test with 100% accuracy.",
    check: stats => stats.accuracy === 100
  },
  {
    id: "no-backspace",
    title: "No Backspace",
    description: "Complete a test without pressing backspace.",
    check: (stats, keystrokes) => !keystrokes.some(k => k.typed === "\b")
  },
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Finish a test between midnight and 4am.",
    check: () => {
      const hour = new Date().getHours();
      return hour >= 0 && hour < 4;
    }
  },
  {
    id: "speed-demon",
    title: "Speed Demon",
    description: "Reach 130 WPM in a single test.",
    check: stats => stats.wpm >= 130
  },
  {
    id: "focused-mind",
    title: "Focused Mind",
    description: "Score above 90 on focus in a test lasting 60s or longer.",
    check: stats => stats.focus.focusScore >= 90 && stats.durationSeconds >= 60
  },
  {
    id: "consistent",
    title: "Metronome",
    description: "Score above 90 on consistency.",
    check: stats => stats.consistency >= 90
  }
];

function evaluateAchievements(stats, keystrokes) {
  return ACHIEVEMENTS.filter(a => {
    try {
      return a.check(stats, keystrokes);
    } catch {
      return false;
    }
  });
}

export { ACHIEVEMENTS, evaluateAchievements };
