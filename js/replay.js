function reconstructAt(target, keystrokes, index) {
  const states = new Array(target.length).fill("pending");
  let cursor = 0;

  for (let i = 0; i <= index && i < keystrokes.length; i++) {
    const stroke = keystrokes[i];
    if (stroke.typed === "\b") {
      cursor = Math.max(0, cursor - 1);
      states[cursor] = "pending";
    } else {
      states[cursor] = stroke.correct ? "correct" : "incorrect";
      cursor = Math.min(target.length, cursor + 1);
    }
  }

  const time = keystrokes[Math.min(index, keystrokes.length - 1)]?.time ?? 0;
  return { states, cursor, time };
}

export { reconstructAt };
