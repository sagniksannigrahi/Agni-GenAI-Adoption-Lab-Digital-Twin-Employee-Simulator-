import { api } from "./api.js";
import { state } from "./state.js";
import { $, $$, closeDrawer, initTooltips } from "./ui.js";
import * as dashboard from "./modules/dashboard.js";
import * as personas from "./modules/personas.js";
import * as simulator from "./modules/simulator.js";
import * as training from "./modules/training.js";
import * as prompt from "./modules/prompt.js";
import * as feedback from "./modules/feedback.js";
import * as support from "./modules/support.js";

const ROUTES = {
  "/": ["dashboard", "Dashboard", dashboard],
  "/personas": ["personas", "Persona Lab", personas],
  "/beta-test": ["simulator", "Beta Test Simulator", simulator],
  "/training": ["training", "Training Studio", training],
  "/prompt-coach": ["prompt", "Prompt Coach", prompt],
  "/feedback": ["feedback", "Feedback Analyzer", feedback],
  "/support": ["support", "Support Simulator", support],
};

function route() {
  const path = location.hash.replace(/^#/, "") || "/";
  const [key, title, mod] = ROUTES[path] || ROUTES["/"];
  $$("#nav a").forEach((a) => a.setAttribute("aria-current", a.dataset.route === key ? "page" : "false"));
  $("#crumb").innerHTML = `Agni / <b>${title}</b>`;
  document.title = `${title} · Agni`;
  closeDrawer();
  $("#sidebar").classList.remove("open");
  const view = $("#view");
  view.innerHTML = "";
  view.classList.remove("fade"); void view.offsetWidth; view.classList.add("fade");
  mod.render(view);
  scrollTo(0, 0);
}

function updateCount() {
  $("#nav-count").textContent = state.personas.length;
}

async function checkEngine() {
  try {
    const s = await api.status();
    const badge = $("#mode-badge");
    if (s.demo) {
      badge.className = "badge demo";
      badge.innerHTML = "● Demo mode";
      badge.dataset.tip = "No API key found: showing realistic sample data. Set ANTHROPIC_API_KEY in .env for live AI results.";
      $("#engine-status").textContent = "Engine: demo data";
    } else {
      badge.className = "badge live";
      badge.innerHTML = `● Live · ${s.model}`;
      $("#engine-status").textContent = `Engine: ${s.model}`;
    }
  } catch {
    $("#engine-status").textContent = "Engine: offline";
  }
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem("agni-theme"); } catch { /* ignore */ }
  if (saved) document.documentElement.dataset.theme = saved;
  $("#theme-btn").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("agni-theme", next); } catch { /* ignore */ }
  });
}

$("#menu-btn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#scrim").addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => e.key === "Escape" && closeDrawer());
document.addEventListener("state:changed", updateCount);
addEventListener("hashchange", route);

initTheme();
initTooltips();
updateCount();
checkEngine();
route();
