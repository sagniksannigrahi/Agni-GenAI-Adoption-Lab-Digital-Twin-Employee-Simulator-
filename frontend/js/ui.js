// Small DOM helpers shared by every page.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Tiny, safe Markdown: headings, bold, italics, code, lists, paragraphs.
export function md(text) {
  const lines = esc(text).split("\n");
  let html = "", list = null;
  const inline = (s) => s
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<i>$2</i>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const line of lines) {
    let m;
    if ((m = line.match(/^#{1,4}\s+(.*)/))) { close(); html += `<h3>${inline(m[1])}</h3>`; }
    else if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += `<li>${inline(m[1])}</li>`; }
    else if (line.trim()) { close(); html += `<p>${inline(line)}</p>`; }
    else close();
  }
  close();
  return `<div class="md">${html}</div>`;
}

export function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2400);
}

export function errorBox(msg) {
  return `<div class="error">⚠️ ${esc(msg)}</div>`;
}

export async function withBusy(button, label, fn) {
  const old = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner"></span> ${esc(label)}`;
  try { return await fn(); }
  finally { button.disabled = false; button.innerHTML = old; }
}

// Drawer -------------------------------------------------------------
export function openDrawer(html) {
  const d = $("#drawer");
  d.innerHTML = html;
  d.classList.add("show");
  d.setAttribute("aria-hidden", "false");
  $("#scrim").classList.add("show");
  $("[data-close]", d)?.addEventListener("click", closeDrawer);
  return d;
}
export function closeDrawer() {
  $("#drawer").classList.remove("show");
  $("#drawer").setAttribute("aria-hidden", "true");
  $("#scrim").classList.remove("show");
}

// Tooltips: any element with data-tip ---------------------------------
export function initTooltips() {
  const tip = $("#tip");
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el) return tip.classList.remove("show");
    tip.textContent = el.dataset.tip;
    tip.classList.add("show");
  });
  document.addEventListener("mousemove", (e) => {
    if (!tip.classList.contains("show")) return;
    const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + "px";
    tip.style.top = e.clientY + 14 + "px";
  });
}

export function download(filename, text, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("Copied to clipboard"); }
  catch { toast("Couldn't copy, select the text manually"); }
}

export function sevLabel(level) {
  return `<span class="sev ${esc(level)}">${esc(level)}</span>`;
}

export function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
