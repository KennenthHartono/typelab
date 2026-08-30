import { randomWords, randomNumbers, randomQuote, randomSnippet } from "./textData.js";

const TIME_MODE_BUFFER = 40; // words kept ahead of the caret in time mode

class TypingEngine {
  constructor({ mode, duration, language, customText }) {
    this.mode = mode;
    this.duration = duration || 30;
    this.language = language || "javascript";
    this.customText = customText || "";
    this.state = "idle";
    this.startTime = null;
    this.endTime = null;
    this.keystrokes = [];
    this.cursor = 0;
    this.target = this._buildTarget();
    this.createdAt = performance.now();
  }

  _buildTarget() {
    if (this.mode === "time") return randomWords(TIME_MODE_BUFFER).join(" ");
    if (this.mode === "quote") return randomQuote();
    if (this.mode === "numbers") return randomNumbers(60).join(" ");
    if (this.mode === "programming") return randomSnippet(this.language);
    if (this.mode === "custom") return this.customText.trim() || randomWords(30).join(" ");
    return randomWords(30).join(" ");
  }

  _extendIfNeeded() {
    if (this.mode !== "time") return;
    const remaining = this.target.length - this.cursor;
    if (remaining < 60) {
      this.target += " " + randomWords(20).join(" ");
    }
  }

  begin() {
    if (this.state !== "idle") return;
    this.state = "running";
    this.startTime = performance.now();
    this.reactionTime = this.startTime - this.createdAt;
  }

  elapsedMs(now = performance.now()) {
    if (!this.startTime) return 0;
    return (this.endTime || now) - this.startTime;
  }

  remainingSeconds(now = performance.now()) {
    if (this.mode !== "time") return null;
    const elapsed = this.elapsedMs(now) / 1000;
    return Math.max(0, Math.ceil(this.duration - elapsed));
  }

  isTimeExpired(now = performance.now()) {
    if (this.mode !== "time" || this.state !== "running") return false;
    return this.elapsedMs(now) / 1000 >= this.duration;
  }

  isTextComplete() {
    return this.mode !== "time" && this.cursor >= this.target.length;
  }

  typeChar(char) {
    if (this.state === "idle") this.begin();
    if (this.state !== "running") return null;

    const expected = this.target[this.cursor];
    const correct = char === expected;
    const record = {
      expected,
      typed: char,
      correct,
      index: this.cursor,
      time: performance.now() - this.startTime
    };
    this.keystrokes.push(record);
    this.cursor += 1;
    this._extendIfNeeded();

    if (this.isTimeExpired() || this.isTextComplete()) this.finish();
    return record;
  }

  backspace() {
    if (this.state !== "running" || this.cursor === 0) return;
    this.cursor -= 1;
    this.keystrokes.push({
      expected: this.target[this.cursor],
      typed: "\b",
      correct: null,
      time: performance.now() - this.startTime
    });
  }

  finish() {
    if (this.state === "finished") return;
    this.state = "finished";
    this.endTime = performance.now();
  }

  typedSoFar() {
    return this.target.slice(0, this.cursor);
  }
}

export { TypingEngine };
