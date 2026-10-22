import { api } from "../api.js";
import { logActivity, save, state } from "../state.js";
import { $, $$, download, errorBox, esc, toast, withBusy } from "../ui.js";
import { personaCard, personaDetail } from "./personaCard.js";

export function render(view) {
  const c = state.context;
  view.innerHTML = `
    <div class="page-head">
      <div>
        <div class="jd">Learn the users</div>
        <h1>Persona Lab</h1>
        <p>Describe the organisation and the AI solution being rolled out. Agni creates realistic employee
        “digital twins” with different jobs, AI skills and attitudes. Every other module uses them.</p>
      </div>
    </div>

    <div class="card">
      <div class="form cols">
        <label>Organisation <input type="text" id="org" value="${esc(c.organization)}"></label>
        <label>Departments to include <span class="hint">comma separated</span>
          <input type="text" id="depts" value="${esc(c.departments)}"></label>
        <label class="full">AI solution being rolled out
          <textarea id="solution" rows="3">${esc(c.ai_solution)}</textarea></label>
        <label class="full">Extra notes or real user data <span class="hint">optional: survey answers, interview notes, ticket summaries</span>
          <textarea id="notes" rows="3" placeholder="e.g. Factory operators mostly use shared PCs. Many engineers already use public AI tools.">${esc(c.notes)}</textarea></label>
        <label>Number of twins: <b id="count-val">8</b>
          <input type="range" id="count" min="4" max="16" value="8"></label>
        <div class="row" style="align-self:end;justify-content:flex-end">
          ${state.personas.length ? `<button class="btn" id="export">⬇ Export</button>` : ""}
          <button class="btn primary" id="gen">✨ Generate twins</button>
        </div>
      </div>
      <div id="err"></div>
    </div>

    <div class="row mt2" style="margin-bottom:12px">
      <h3>Your digital twins</h3><span class="muted small">${state.personas.length ? "Click a card for the full profile" : ""}</span>
    </div>
    <div id="list"></div>`;

  const count = $("#count", view);
  count.addEventListener("input", () => ($("#count-val", view).textContent = count.value));

  $("#gen", view).addEventListener("click", (e) => withBusy(e.currentTarget, "Creating twins…", async () => {
    Object.assign(state.context, {
      organization: $("#org", view).value.trim() || "Seagate Technology",
      departments: $("#depts", view).value.trim(),
      ai_solution: $("#solution", view).value.trim(),
      notes: $("#notes", view).value.trim(),
    });
    $("#err", view).innerHTML = "";
    try {
      const { personas } = await api.personas(state.context, Number(count.value));
      state.personas = personas;
      logActivity("👥", `Generated ${personas.length} digital twins`);
      save();
      render(view);
      toast(`${personas.length} twins ready`);
    } catch (err) {
      $("#err", view).innerHTML = errorBox(err.message);
    }
  }));

  $("#export", view)?.addEventListener("click", () =>
    download("agni-personas.json", JSON.stringify(state.personas, null, 2)));

  renderList(view);
}

function renderList(view) {
  const list = $("#list", view);
  if (!state.personas.length) {
    list.innerHTML = `<div class="empty"><div class="big">👥</div>No twins yet. Fill in the form and click <b>Generate twins</b>.</div>`;
    return;
  }
  list.innerHTML = `<div class="grid">${state.personas.map((p) => personaCard(p)).join("")}</div>`;
  $$(".persona", list).forEach((el) => el.addEventListener("click", () => {
    const p = state.personas.find((x) => x.id === el.dataset.pid);
    const d = personaDetail(p, `
      <div class="row mt">
        <a class="btn primary" href="#/support" data-chat="${esc(p.id)}">🎧 Practise support with ${esc(p.name.split(" ")[0])}</a>
      </div>`);
    $("[data-chat]", d).addEventListener("click", () => { sessionStorage.setItem("agni-support-pid", p.id); });
  }));
}
