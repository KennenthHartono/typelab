// Approximate physical position of each key on a staggered QWERTY layout,
// expressed in "key width" units, plus which hand naturally reaches it.
const ROWS = [
  { keys: "1234567890", y: 0, offset: 0 },
  { keys: "qwertyuiop", y: 1, offset: 0.5 },
  { keys: "asdfghjkl", y: 2, offset: 0.75 },
  { keys: "zxcvbnm", y: 3, offset: 1.25 }
];

const LEFT_HAND = new Set("12345qwertasdfgzxcvb".split(""));

const KEY_POSITIONS = {};
ROWS.forEach(row => {
  row.keys.split("").forEach((key, index) => {
    KEY_POSITIONS[key] = {
      x: row.offset + index,
      y: row.y,
      hand: LEFT_HAND.has(key) ? "left" : "right"
    };
  });
});
KEY_POSITIONS[" "] = { x: 5, y: 4, hand: "thumb" };

function keyPosition(char) {
  const key = char.toLowerCase();
  return KEY_POSITIONS[key] || null;
}

function keyDistance(a, b) {
  const posA = keyPosition(a);
  const posB = keyPosition(b);
  if (!posA || !posB) return 0;
  return Math.hypot(posA.x - posB.x, posA.y - posB.y);
}

export { KEY_POSITIONS, ROWS, keyPosition, keyDistance };
