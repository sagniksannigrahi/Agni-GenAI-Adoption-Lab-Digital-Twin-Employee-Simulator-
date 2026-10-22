// Lightweight HTML charts. Every mark has a hover tooltip (data-tip).
import { esc } from "./ui.js";

const BINS = ["0–20", "21–40", "41–60", "61–80", "81–100"];

function binCounts(values) {
  const c = [0, 0, 0, 0, 0];
  values.forEach((v) => c[Math.min(4, Math.floor(Math.max(0, v - 1) / 20))]++);
  return c;
}

// Grouped histogram of 0-100 scores; series = [{name, cls, values}]
export function histogram(series, unit = "employees") {
  const counts = series.map((s) => binCounts(s.values));
  const max = Math.max(1, ...counts.flat());
  const step = max <= 4 ? 1 : Math.ceil(max / 4);
  const top = Math.ceil(max / step) * step;
  let grid = "";
  for (let v = step; v <= top; v += step) grid += `<div class="gl" style="bottom:${(v / top) * 100}%"><span>${v}</span></div>`;
  const cols = BINS.map((label, i) => `<div class="hist-col">${series.map((s, k) =>
    `<div class="bar ${s.cls}" style="height:${(counts[k][i] / top) * 100}%" data-tip="${esc(s.name)} · ${label}%: ${counts[k][i]} ${unit}"></div>`
  ).join("")}</div>`).join("");
  const legend = series.length > 1
    ? `<div class="legend">${series.map((s) => `<span><i class="bar ${s.cls}" style="height:10px;max-width:10px"></i>${esc(s.name)}</span>`).join("")}</div>` : "";
  return `${legend}<div class="chart-wrap"><div class="hist">${grid}${cols}</div><div class="hist-axis">${BINS.map((b) => `<span>${b}%</span>`).join("")}</div></div>`;
}

// Horizontal bars: rows = [{label, value}] with value 0-100
export function hbars(rows, suffix = "%") {
  if (!rows.length) return `<p class="muted small">No data.</p>`;
  return `<div class="hbars">${rows.map((r) => `
    <div class="hbar-row">
      <span class="hbar-label" title="${esc(r.label)}">${esc(r.label)}</span>
      <div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(1, r.value)}%" data-tip="${esc(r.label)}: ${esc(r.display ?? r.value + suffix)}${r.note ? " · " + esc(r.note) : ""}"></div></div>
      <span class="hbar-val">${esc(r.display ?? r.value + suffix)}</span>
    </div>`).join("")}</div>`;
}

// Radial gauge for a 0-100 score
export function gauge(value, label = "score") {
  const r = 52, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return `<div class="gauge" data-tip="${esc(label)}: ${v}/100">
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--grid)" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${(v / 100) * c} ${c}"/>
    </svg>
    <div class="num"><div>${v}<small>${esc(label)}</small></div></div>
  </div>`;
}

// Positive / neutral / negative split
export function sentimentBar(pos, neu, neg) {
  const t = Math.max(1, pos + neu + neg);
  const seg = (n, color, name) => n ? `<div style="width:${(n / t) * 100}%;background:${color}" data-tip="${name}: ${n} (${Math.round((n / t) * 100)}%)"></div>` : "";
  return `<div class="stack-bar">${seg(pos, "var(--series-3)", "Positive")}${seg(neu, "var(--axis)", "Neutral")}${seg(neg, "var(--series-2)", "Negative")}</div>
    <div class="legend" style="margin-top:8px">
      <span><i style="background:var(--series-3)"></i>Positive ${pos}</span>
      <span><i style="background:var(--axis)"></i>Neutral ${neu}</span>
      <span><i style="background:var(--series-2)"></i>Negative ${neg}</span>
    </div>`;
}
