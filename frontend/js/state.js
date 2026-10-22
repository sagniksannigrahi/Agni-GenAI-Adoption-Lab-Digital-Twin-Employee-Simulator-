// Shared app state, saved in the browser so work survives a refresh.

const KEY = "agni-lab-v1";

const defaults = {
  context: {
    organization: "Seagate Technology",
    ai_solution:
      "An internal GenAI assistant that answers questions from company documents (specs, SOPs, HR policies), drafts emails and reports, and summarises long threads, with source links.",
    departments: "Firmware & R&D engineering, manufacturing operations, quality & reliability, supply chain, sales, finance, HR, legal, IT",
    notes: "",
  },
  personas: [],
  lastSimulation: null,
  lastFeedback: null,
  lastTraining: null,
  history: [], // activity log for the dashboard
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : structuredClone(defaults);
  } catch {
    return structuredClone(defaults);
  }
}

export const state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  document.dispatchEvent(new CustomEvent("state:changed"));
}

export function logActivity(icon, text) {
  state.history.unshift({ icon, text, at: Date.now() });
  state.history = state.history.slice(0, 12);
  save();
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  location.reload();
}
