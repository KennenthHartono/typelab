import { keyDistance, keyPosition } from "./keyboardLayout.js";

function typedEntries(keystrokes) {
  return keystrokes.filter(k => k.typed !== "\b");
}

function liveStats(engine) {
  const now = performance.now();
  const entries = typedEntries(engine.keystrokes);
  const minutes = Math.max(engine.elapsedMs(now) / 60000, 1 / 600);
  const correct = entries.filter(k => k.correct).length;
  const total = entries.length;
  return {
    wpm: Math.round((correct / 5) / minutes),
    rawWpm: Math.round((total / 5) / minutes),
    accuracy: total ? Math.round((correct / total) * 100) : 100,
    mistakes: total - correct,
    characters: total,
    elapsedSeconds: Math.floor(engine.elapsedMs(now) / 1000)
  };
}

function speedTimeline(keystrokes, totalDurationMs, bucketMs = 1000) {
  const entries = typedEntries(keystrokes);
  if (!entries.length) return [];
  const duration = totalDurationMs || entries[entries.length - 1].time;
  const bucketCount = Math.max(1, Math.ceil(duration / bucketMs));
  const buckets = new Array(bucketCount).fill(0);
  entries.forEach(entry => {
    const index = Math.min(bucketCount - 1, Math.floor(entry.time / bucketMs));
    if (entry.correct) buckets[index] += 1;
  });
  return buckets.map((chars, index) => ({
    second: index + 1,
    wpm: Math.round((chars / 5) * (60000 / bucketMs))
  }));
}

function consistencyScore(timeline) {
  if (timeline.length < 2) return 100;
  const values = timeline.map(t => t.wpm);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 100;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  const coefficientOfVariation = stddev / mean;
  return Math.max(0, Math.round(100 - coefficientOfVariation * 100));
}

function focusAnalysis(keystrokes) {
  const entries = typedEntries(keystrokes);
  if (entries.length < 2) return { longestPause: 0, averagePause: 0, focusScore: 100, pauseCount: 0 };

  const gaps = [];
  for (let i = 1; i < entries.length; i++) {
    gaps.push(entries[i].time - entries[i - 1].time);
  }
  const pauses = gaps.filter(g => g > 1000);
  const totalElapsed = entries[entries.length - 1].time - entries[0].time || 1;
  const totalPauseTime = pauses.reduce((a, b) => a + b, 0);
  const longestPause = pauses.length ? Math.max(...pauses) : 0;
  const averagePause = pauses.length ? totalPauseTime / pauses.length : 0;
  const focusScore = Math.max(0, Math.round(100 * (1 - totalPauseTime / totalElapsed)));

  return {
    longestPause: Math.round(longestPause),
    averagePause: Math.round(averagePause),
    focusScore,
    pauseCount: pauses.length
  };
}

function wordIndexAtEachPosition(targetText) {
  const map = new Array(targetText.length).fill(-1);
  const words = [];
  const matches = targetText.matchAll(/\S+/g);
  let wordIdx = 0;
  for (const match of matches) {
    words.push(match[0]);
    for (let i = match.index; i < match.index + match[0].length; i++) map[i] = wordIdx;
    wordIdx += 1;
  }
  return { map, words };
}

function errorAnalysis(keystrokes, targetText) {
  // Only count each target position's most recent attempt, so a corrected
  // mistake (typed wrong, then backspaced and retyped) doesn't linger.
  const latestByPosition = new Map();
  typedEntries(keystrokes).forEach(entry => latestByPosition.set(entry.index, entry));
  const entries = [...latestByPosition.values()];

  const keyMistakes = {};
  entries.forEach(entry => {
    if (!entry.correct) {
      const key = entry.expected || "?";
      keyMistakes[key] = (keyMistakes[key] || 0) + 1;
    }
  });

  const { map: wordIndexMap, words } = wordIndexAtEachPosition(targetText);
  const wordHasError = new Set();
  entries.forEach(entry => {
    if (!entry.correct && wordIndexMap[entry.index] !== -1) {
      wordHasError.add(wordIndexMap[entry.index]);
    }
  });
  const wordMistakes = {};
  wordHasError.forEach(idx => {
    const word = words[idx];
    if (word) wordMistakes[word] = (wordMistakes[word] || 0) + 1;
  });

  const topKeys = Object.entries(keyMistakes).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topWords = Object.entries(wordMistakes).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalMistakes = entries.filter(e => !e.correct).length;

  return {
    topKeys,
    topWords,
    totalMistakes,
    errorRate: entries.length ? Math.round((totalMistakes / entries.length) * 100) : 0
  };
}

function typingFingerprint(keystrokes) {
  const entries = typedEntries(keystrokes);
  if (entries.length < 3) {
    return { uniqueness: 0, style: "Insufficient data", avgInterval: 0, fastestBurst: 0, slowestBurst: 0 };
  }
  const intervals = [];
  for (let i = 1; i < entries.length; i++) {
    const gap = entries[i].time - entries[i - 1].time;
    if (gap < 1500) intervals.push(gap);
  }
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, v) => sum + (v - avgInterval) ** 2, 0) / intervals.length;
  const stddev = Math.sqrt(variance);
  const cv = avgInterval ? stddev / avgInterval : 0;

  let style = "Rhythmic";
  if (cv < 0.35) style = "Steady";
  else if (cv > 0.65) style = "Bursty";

  const uniqueness = Math.max(0, Math.min(100, Math.round(40 + cv * 90)));
  const fastestBurst = Math.round(Math.min(...intervals));
  const slowestBurst = Math.round(Math.max(...intervals));

  return { uniqueness, style, avgInterval: Math.round(avgInterval), fastestBurst, slowestBurst };
}

function fingerTravel(keystrokes) {
  const entries = typedEntries(keystrokes).filter(e => e.typed !== " ");
  const KEY_UNIT_MM = 19;
  let left = 0;
  let right = 0;

  for (let i = 1; i < entries.length; i++) {
    const prev = keyPosition(entries[i - 1].typed);
    const cur = keyPosition(entries[i].typed);
    if (!prev || !cur || prev.hand !== cur.hand) continue;
    const distance = keyDistance(entries[i - 1].typed, entries[i].typed) * KEY_UNIT_MM;
    if (cur.hand === "left") left += distance; else right += distance;
  }

  return {
    leftHandCm: Math.round(left / 10),
    rightHandCm: Math.round(right / 10),
    totalCm: Math.round((left + right) / 10)
  };
}

function overallFinalStats(engine) {
  const entries = typedEntries(engine.keystrokes);
  const minutes = Math.max(engine.elapsedMs(engine.endTime) / 60000, 1 / 600);
  const correct = entries.filter(k => k.correct).length;
  const total = entries.length;
  const wpm = Math.round((correct / 5) / minutes);
  const rawWpm = Math.round((total / 5) / minutes);
  const accuracy = total ? Math.round((correct / total) * 100) : 100;

  const timeline = speedTimeline(engine.keystrokes, engine.elapsedMs(engine.endTime));
  const consistency = consistencyScore(timeline);
  const focus = focusAnalysis(engine.keystrokes);
  const errors = errorAnalysis(engine.keystrokes, engine.target);
  const fingerprint = typingFingerprint(engine.keystrokes);
  const travel = fingerTravel(engine.keystrokes);
  const reactionTime = Math.round(engine.reactionTime || 0);
  const recovery = Math.max(0, Math.min(100, 100 - errors.errorRate * 2));

  const overallScore = Math.round(
    wpm * 0.4 + accuracy * 0.3 + consistency * 0.15 + focus.focusScore * 0.15
  );

  return {
    wpm, rawWpm, accuracy, consistency, focus, errors, fingerprint, travel,
    reactionTime, recovery, overallScore, timeline,
    typingStyle: fingerprint.style,
    durationSeconds: Math.round(engine.elapsedMs(engine.endTime) / 1000),
    mode: engine.mode
  };
}

function radarValues(finalStats) {
  return [
    { label: "Speed", value: Math.min(100, Math.round((finalStats.wpm / 120) * 100)) },
    { label: "Accuracy", value: finalStats.accuracy },
    { label: "Consistency", value: finalStats.consistency },
    { label: "Focus", value: finalStats.focus.focusScore },
    { label: "Reaction", value: Math.max(0, 100 - Math.round(finalStats.reactionTime / 15)) },
    { label: "Recovery", value: finalStats.recovery }
  ];
}

export {
  liveStats, speedTimeline, consistencyScore, focusAnalysis, errorAnalysis,
  typingFingerprint, fingerTravel, overallFinalStats, radarValues, typedEntries
};
