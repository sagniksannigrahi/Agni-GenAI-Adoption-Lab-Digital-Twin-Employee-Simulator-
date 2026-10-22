import { state, resetAll } from "../state.js";
import { $, esc, timeAgo } from "../ui.js";

const MODULES = [
  ["#/personas", "👥", "Persona Lab", "Create digital twins of employees across departments, AI skill levels and attitudes.", "Learn the users"],
  ["#/beta-test", "🧪", "Beta Test Simulator", "Test a release, feature or announcement on the twins. Get issues, escalations and predicted tickets.", "Beta testing & launches"],
  ["#/training", "🎓", "Training Studio", "Generate workshops, guides and quizzes, test them on the twins, and translate jargon into plain English.", "Training & enablement"],
  ["#/prompt-coach", "✍️", "Prompt Coach", "Score any prompt, get a stronger rewrite and a reusable template, then compare the outputs.", "Prompt engineering"],
  ["#/feedback", "📊", "Feedback Analyzer", "Turn raw feedback into themes, issues, escalations and FAQ entries.", "Feedback analysis"],
  ["#/support", "🎧", "Support Simulator", "Practise support chats with a twin who has a real problem, then get coached on your replies.", "User support"],
];

export function render(view) {
  const sim = state.lastSimulation?.report;
  const fb = state.lastFeedback;
  view.innerHTML = `
    <div class="page-head">
      <div>
        <div class="jd">GenAI Customer Success · Adoption Lab</div>
        <h1>Help every employee succeed with GenAI</h1>
        <p>Agni simulates your workforce with AI “digital twins”, so you can test launches, training and support
        before real users see them, then analyse what real users say afterwards.</p>
      </div>
    </div>

    <div class="tiles">
      <div class="tile"><div class="label">Digital twins</div><div class="value">${state.personas.length}</div><div class="sub">${new Set(state.personas.map((p) => p.department)).size} departments</div></div>
      <div class="tile"><div class="label">Last readiness score</div><div class="value">${sim ? sim.readiness_score : "—"}</div><div class="sub">${sim ? esc(sim.verdict) : "Run a beta test"}</div></div>
      <div class="tile"><div class="label">Open issues found</div><div class="value">${(sim?.issue_log?.length || 0) + (fb?.issues?.length || 0)}</div><div class="sub">from simulations + feedback</div></div>
      <div class="tile"><div class="label">Adoption health</div><div class="value" style="font-size:24px;padding:6px 0;text-transform:capitalize">${fb ? esc(fb.adoption_health) : "—"}</div><div class="sub">${fb ? `${fb.total_items} feedback items` : "Analyse feedback"}</div></div>
    </div>

    <h3 class="mt2" style="margin-bottom:12px">Workflow</h3>
    <div class="three">
      ${MODULES.map(([href, ico, name, desc, jd]) => `
        <a class="card" href="${href}" style="text-decoration:none;color:inherit;display:grid;gap:8px">
          <div style="font-size:26px">${ico}</div>
          <h3>${name}</h3>
          <p class="small" style="color:var(--ink-2)">${desc}</p>
          <span class="tag" style="color:var(--accent)">${jd}</span>
        </a>`).join("")}
    </div>

    <div class="two mt2">
      <div class="card">
        <h3>Recent activity</h3>
        <p class="cap">What you've done in this lab</p>
        ${state.history.length ? `<ul class="list">${state.history.map((h) =>
          `<li><span>${h.icon} ${esc(h.text)}</span><span class="why">${timeAgo(h.at)}</span></li>`).join("")}</ul>`
          : `<div class="empty"><div class="big">✨</div>Nothing yet. Start in the <a href="#/personas">Persona Lab</a>.</div>`}
      </div>
      <div class="card">
        <h3>Quick start</h3>
        <p class="cap">A 5-minute demo path</p>
        <ol class="bullets">
          <li><b>Persona Lab</b>: generate 8 employee twins</li>
          <li><b>Beta Test</b>: paste a release announcement, run A vs B</li>
          <li><b>Training Studio</b>: build a workshop, then test it on the twins</li>
          <li><b>Feedback Analyzer</b>: load the sample feedback and analyse</li>
          <li><b>Prompt Coach</b>: improve a weak prompt and compare outputs</li>
          <li><b>Support Simulator</b>: solve a ticket and get graded</li>
        </ol>
        <div class="row mt">
          <a class="btn primary" href="#/personas">Start →</a>
          <div class="spacer"></div>
          <button class="btn ghost sm" id="reset">Reset lab</button>
        </div>
      </div>
    </div>`;
  $("#reset", view).addEventListener("click", () => confirm("Clear all twins and results?") && resetAll());
}
