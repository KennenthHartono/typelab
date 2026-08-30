import { ROWS } from "./keyboardLayout.js";
import { typedEntries } from "./statsCalculator.js";

function themeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function prepareCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

function drawSpeedTimeline(canvas, timeline) {
  const { ctx, width, height } = prepareCanvas(canvas);
  const padding = { top: 16, right: 16, bottom: 24, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const gridColor = themeColor("--border");
  const lineColor = themeColor("--primary");
  const fillColor = themeColor("--primary-soft");
  const textColor = themeColor("--text-muted");

  if (!timeline.length) {
    ctx.fillStyle = textColor;
    ctx.font = "13px var(--font-body)";
    ctx.fillText("Not enough data yet", padding.left, height / 2);
    return;
  }

  const maxWpm = Math.max(...timeline.map(t => t.wpm), 20);
  const stepX = plotW / Math.max(1, timeline.length - 1);

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.font = "11px var(--font-mono)";
  ctx.fillStyle = textColor;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (plotH / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    const value = Math.round(maxWpm - (maxWpm / gridLines) * i);
    ctx.fillText(String(value), 4, y + 4);
  }

  const points = timeline.map((point, index) => ({
    x: padding.left + stepX * index,
    y: padding.top + plotH - (point.wpm / maxWpm) * plotH
  }));

  ctx.beginPath();
  ctx.moveTo(points[0].x, plotH + padding.top);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, plotH + padding.top);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.fillStyle = lineColor;
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawRadar(canvas, values) {
  const { ctx, width, height } = prepareCanvas(canvas);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 30;
  const count = values.length;
  const gridColor = themeColor("--border");
  const primary = themeColor("--secondary");
  const fillColor = themeColor("--secondary-soft");
  const textColor = themeColor("--text-muted");

  const angleFor = i => (Math.PI * 2 * i) / count - Math.PI / 2;

  const rings = 4;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let r = 1; r <= rings; r++) {
    ctx.beginPath();
    for (let i = 0; i <= count; i++) {
      const angle = angleFor(i % count);
      const rr = (radius / rings) * r;
      const x = cx + Math.cos(angle) * rr;
      const y = cy + Math.sin(angle) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.font = "11px var(--font-body)";
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  values.forEach((v, i) => {
    const angle = angleFor(i);
    const x = cx + Math.cos(angle) * (radius + 16);
    const y = cy + Math.sin(angle) * (radius + 16);
    ctx.fillText(v.label, x, y);
  });

  ctx.beginPath();
  values.forEach((v, i) => {
    const angle = angleFor(i);
    const rr = (radius * Math.max(0, Math.min(100, v.value))) / 100;
    const x = cx + Math.cos(angle) * rr;
    const y = cy + Math.sin(angle) * rr;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = primary;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "left";
}

function metricForKey(key, keystrokes, metric) {
  const entries = typedEntries(keystrokes).filter(
    e => (e.correct ? e.typed : e.expected).toLowerCase() === key
  );
  return metric === "mistakes" ? entries.filter(e => !e.correct).length : entries.length;
}

function drawKeyboardHeatmap(canvas, keystrokes, metric = "usage") {
  const { ctx, width, height } = prepareCanvas(canvas);
  const keyW = width / 11.5;
  const keyH = (height - 8) / 4;
  const baseColor = themeColor("--surface-alt");
  const hotColor = metric === "mistakes" ? themeColor("--danger") : themeColor("--secondary");
  const borderColor = themeColor("--border");
  const textColor = themeColor("--text");

  const values = {};
  let maxValue = 1;
  ROWS.forEach(row => {
    row.keys.split("").forEach(key => {
      const v = metricForKey(key, keystrokes, metric);
      values[key] = v;
      if (v > maxValue) maxValue = v;
    });
  });

  ctx.font = "12px var(--font-mono)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ROWS.forEach(row => {
    row.keys.split("").forEach((key, index) => {
      const x = (row.offset + index) * keyW + 4;
      const y = row.y * keyH + 4;
      const intensity = Math.min(1, values[key] / maxValue);
      ctx.fillStyle = intensity === 0 ? baseColor : hotColor;
      ctx.globalAlpha = intensity === 0 ? 1 : 0.25 + intensity * 0.75;
      roundRect(ctx, x, y, keyW - 6, keyH - 6, 5);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, keyW - 6, keyH - 6, 5);
      ctx.stroke();
      ctx.fillStyle = intensity > 0.55 ? "#ffffff" : textColor;
      ctx.fillText(key.toUpperCase(), x + (keyW - 6) / 2, y + (keyH - 6) / 2);
    });
  });
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTrendSparkline(canvas, values) {
  const { ctx, width, height } = prepareCanvas(canvas);
  if (values.length < 2) return;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  ctx.strokeStyle = themeColor("--primary");
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export { drawSpeedTimeline, drawRadar, drawKeyboardHeatmap, drawTrendSparkline };
