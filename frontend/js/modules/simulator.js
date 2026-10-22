import { api } from "../api.js";
import { gauge, hbars, histogram } from "../charts.js";
import { logActivity, save, state } from "../state.js";
import { $, $$, copy, download, errorBox, esc, sevLabel, toast } from "../ui.js";
import { personaCard, personaDetail } from "./personaCard.js";

const TYPES = ["Feature announcement", "Release notes", "Onboarding email", "Training material",
  "Usage policy / guideline", "In-app help text", "Prompt template"];

const EXAMPLES = {
  A: `📢 New in the AI Assistant: Grounded Answers (RAG)

Our assistant now uses retrieval-augmented generation over 40,000 indexed internal documents. Enable "Grounded mode" in Settings > Advanced to get cited responses with lower hallucination rates. Token limits have increased to 200k, so you can upload large PDFs.`,
  B: `📢 The AI Assistant can now answer from our own documents

Ask a question like "What's the torque spec for the X12 actuator?" and it will find the answer in our specs, SOPs and HR policies, and show you a link to the exact page it used, so you can check it.

✅ Turn it on: click ⚙️ Settings → "Use company documents"
🔒 Your data stays inside the company. You can use it with confidential documents.
🎓 15-minute demo sessions every Tuesday. Book one with your manager.`,
};

export function render(view) {
  view.innerHTML = `
    <div class="page-head">
      <div>
        <div class="jd">Beta testing · Product launches</div>
        <h1>Beta Test Simulator</h1>
        <p>Show a release, feature or message to every digital twin at once. See who adopts, who gets confused,
        which issues to escalate, and which support tickets you'll get, before the real launch.</p>
      </div>
    </div>
    ${state.personas.length ? "" : `<div class="callout" style="margin-bottom:16px"><h3>No twins yet</h3>
      <p class="small">Create them in the <a href="#/personas">Persona Lab</a> first. It takes a few seconds.</p></div>`}
    <div class="card">
      <div class="form">
        <div>
          <div class="tag" style="margin-bottom:8px">What are you testing?</div>
          <div class="chips" id="types">${TYPES.map((t, i) =>
            `<button class="chip" aria-pressed="${i === 0}" data-type="${t}">${t}</button>`).join("")}</div>
        </div>
        <label>Version A <span class="hint">paste the text employees will see</span>
          <textarea id="va" rows="7" placeholder="Paste your announcement, release notes, guide...">${esc(state.lastSimulation?.variant_a || "")}</textarea></label>
        <label class="toggle"><input type="checkbox" id="ab" ${state.lastSimulation?.variant_b ? "checked" : ""}> Compare with a version B (A/B test)</label>
        <label id="vb-wrap" style="display:${state.lastSimulation?.variant_b ? "grid" : "none"}">Version B
          <textarea id="vb" rows="7">${esc(state.lastSimulation?.variant_b || "")}</textarea></label>
        <div class="row">
          <button class="link" id="example">Load example (jargon-heavy vs plain-English launch note)</button>
          <div class="spacer"></div>
          <button class="btn primary" id="run" ${state.personas.length ? "" : "disabled"}>🧪 Run beta test on ${state.personas.length} twins</button>
        </div>
      </div>
    </div>
    <div id="sim-out"></div>`;

  let type = state.lastSimulation?.test_type || TYPES[0];
  const chips = $$("#types .chip", view);
  chips.forEach((c) => {
    c.setAttribute("aria-pressed", c.dataset.type === type);
    c.addEventListener("click", () => {
      type = c.dataset.type;
      chips.forEach((x) => x.setAttribute("aria-pressed", x === c));
    });
  });
  $("#ab", view).addEventListener("change", (e) => ($("#vb-wrap", view).style.display = e.target.checked ? "grid" : "none"));
  $("#example", view).addEventListener("click", () => {
    $("#va", view).value = EXAMPLES.A;
    $("#vb", view).value = EXAMPLES.B;
    $("#ab", view).checked = true;
    $("#vb-wrap", view).style.display = "grid";
  });
  $("#run", view).addEventListener("click", async (e) => {
    const a = $("#va", view).value.trim();
    const b = $("#ab", view).checked ? $("#vb", view).value.trim() : "";
    if (!a) return toast("Paste version A first");
    const btn = e.currentTarget;
    btn.disabled = true;
    await runSimulation($("#sim-out", view), { test_type: type, variant_a: a, variant_b: b || null });
    btn.disabled = false;
  });

  if (state.lastSimulation?.report) renderResults($("#sim-out", view), state.lastSimulation);
}

// Runs a simulation and renders live progress + results into `out`.
// Reused by the Training Studio ("test this kit on the twins").
export async function runSimulation(out, { test_type, variant_a, variant_b }) {
  const variants = variant_b ? ["A", "B"] : ["A"];
  const sim = { test_type, variant_a, variant_b, reactions: { A: {}, B: {} }, report: null };
  out.innerHTML = `
    <div class="card mt2">
      <div class="row"><span class="spinner"></span><b id="live-text">Showing it to ${state.personas.length} employees…</b>
        <div class="spacer"></div><span class="muted small" id="live-count">0 / ${state.personas.length * variants.length}</span></div>
      <div class="progress mt"><div id="bar"></div></div>
    </div>
    <div class="grid mt">${state.personas.map((p) => personaCard(p, `<span class="spinner"></span>`)).join("")}</div>`;
  $$(".persona", out).forEach((el) => el.classList.add("thinking"));

  let done = 0, total = state.personas.length * variants.length;
  const errors = [];
  try {
    await api.simulate({ context: state.context, personas: state.personas, test_type, variant_a, variant_b }, (ev) => {
      if (ev.type === "start") total = ev.total;
      if (ev.type === "reaction" || ev.type === "reaction_error") {
        done++;
        $("#bar", out).style.width = `${(done / total) * 100}%`;
        $("#live-count", out).textContent = `${done} / ${total}`;
        if (ev.type === "reaction_error") errors.push(ev.error);
        else sim.reactions[ev.variant][ev.persona_id] = ev.reaction;
        const card = $(`.persona[data-pid="${ev.persona_id}"]`, out);
        const pills = variants.map((v) => {
          const r = sim.reactions[v][ev.persona_id];
          return r ? `<span class="pill ${v.toLowerCase()}" data-tip="Version ${v}: ${r.adoption_likelihood}% likely to adopt · ${esc(r.emotional_state)}">${variant_b ? v + " " : ""}${r.adoption_likelihood}%</span>` : "";
        }).join("");
        const allIn = variants.every((v) => sim.reactions[v][ev.persona_id]);
        $(`#status-${ev.persona_id}`, out).innerHTML = pills + (allIn ? "" : `<span class="spinner"></span>`);
        if (allIn) card.classList.remove("thinking");
      }
      if (ev.type === "analyzing") $("#live-text", out).textContent = "Writing the launch-readiness report…";
      if (ev.type === "report") sim.report = ev.report;
      if (ev.type === "error") throw new Error(ev.error);
    });
  } catch (err) {
    out.insertAdjacentHTML("afterbegin", errorBox(err.message));
    return null;
  }
  if (!sim.report) { out.insertAdjacentHTML("afterbegin", errorBox(errors[0] || "No report was produced.")); return null; }

  state.lastSimulation = sim;
  logActivity("🧪", `Beta test: ${test_type} · readiness ${sim.report.readiness_score}/100`);
  save();
  renderResults(out, sim);
  out.scrollIntoView({ behavior: "smooth", block: "start" });
  return sim;
}

const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export function renderResults(out, sim) {
  const r = sim.report;
  const hasB = !!sim.variant_b && Object.keys(sim.reactions.B || {}).length > 0;
  const best = r.winning_variant === "B" ? "B" : "A";
  const vals = (v, f) => Object.values(sim.reactions[v] || {}).map((x) => x[f]);
  const verdictColor = { ready: "var(--good)", "needs work": "var(--warning)", "not ready": "var(--critical)" }[r.verdict];

  out.innerHTML = `
    <div class="card mt2" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
      ${gauge(r.readiness_score, "readiness")}
      <div style="flex:1;min-width:260px">
        <div class="row"><span class="tag">Verdict</span>
          <span class="badge" style="font-weight:700;text-transform:capitalize"><span style="width:8px;height:8px;border-radius:50%;background:${verdictColor}"></span>${esc(r.verdict)}</span>
          ${hasB && r.winning_variant !== "n/a" ? `<span class="badge">🏆 Winner: ${r.winning_variant === "tie" ? "Tie" : "Version " + r.winning_variant}</span>` : ""}
        </div>
        <h2 style="font-size:22px;margin-top:8px">${esc(r.headline)}</h2>
        <p style="color:var(--ink-2);margin-top:6px">${esc(r.executive_summary)}</p>
        ${r.variant_comparison ? `<p class="small mt"><b>A vs B:</b> ${esc(r.variant_comparison)}</p>` : ""}
      </div>
      <div class="row" style="align-self:flex-start">
        <button class="btn sm" id="copy-md">📋 Copy summary</button>
        <button class="btn sm" id="dl">⬇ JSON</button>
      </div>
    </div>

    <div class="tiles mt">
      ${tile("Likely to adopt", avg(vals(best, "adoption_likelihood")) + "%", hasB ? `A ${avg(vals("A", "adoption_likelihood"))}% · B ${avg(vals("B", "adoption_likelihood"))}%` : "average across twins")}
      ${tile("Understood it", avg(vals(best, "clarity")) + "%", "average clarity")}
      ${tile("Confident to use", avg(vals(best, "confidence_to_use")) + "%", "without help")}
      ${tile("Would recommend", Math.round(100 * vals(best, "would_recommend").filter(Boolean).length / Math.max(1, vals(best, "would_recommend").length)) + "%", "to a colleague")}
    </div>

    <div class="two">
      <div class="card mt">
        <h3>How likely are they to adopt?</h3>
        <p class="cap">Number of employees per adoption-likelihood band</p>
        ${histogram(hasB ? [{ name: "Version A", cls: "a", values: vals("A", "adoption_likelihood") }, { name: "Version B", cls: "b", values: vals("B", "adoption_likelihood") }]
          : [{ name: "Version A", cls: "a", values: vals("A", "adoption_likelihood") }])}
      </div>
      <div class="card mt">
        <h3>Adoption by segment</h3>
        <p class="cap">Average likelihood${hasB ? `, version ${best}` : ""}</p>
        ${hbars(r.segment_insights.map((s) => ({ label: s.segment, value: s.avg_adoption, note: s.summary })))}
      </div>
    </div>

    <div class="card mt">
      <h3>Issue log</h3>
      <p class="cap">Problems found, routed to the team that should fix them</p>
      <table class="data">
        <thead><tr><th>Issue</th><th>Type</th><th>Severity</th><th>Escalate to</th><th>Affected</th></tr></thead>
        <tbody>${r.issue_log.map((i) => `<tr>
          <td><b>${esc(i.title)}</b><div class="muted small">${esc(i.evidence)}</div></td>
          <td>${esc(i.category)}</td><td>${sevLabel(i.severity)}</td>
          <td>${i.escalate_to === "No escalation" ? `<span class="muted">Handle in CS</span>` : `<b>${esc(i.escalate_to)}</b>`}</td>
          <td class="small">${i.affected_segments.map(esc).join(", ")}</td></tr>`).join("")}</tbody>
      </table>
    </div>

    <div class="two">
      <div class="card mt">
        <h3>🎫 Predicted support tickets</h3>
        <p class="cap">Prepare these answers before launch</p>
        <ul class="list">${r.predicted_tickets.map((t) => `<li><b>${esc(t.question)}</b>
          <span class="why">${esc(t.suggested_answer)}</span><span class="tag">From: ${esc(t.likely_from)}</span></li>`).join("")}</ul>
      </div>
      <div class="card mt">
        <h3>🎓 Recommended training actions</h3>
        <p class="cap">Ordered by impact</p>
        <ul class="list">${r.training_actions.map((t) => `<li><div class="row"><b>${esc(t.action)}</b><div class="spacer"></div>${sevLabel(t.impact)}</div>
          <span class="why">${esc(t.audience)} · ${esc(t.format)}</span></li>`).join("")}</ul>
        <h3 class="mt">💪 Strengths</h3>
        <ul class="bullets mt">${r.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      </div>
    </div>

    <div class="callout mt"><h3>💡 Surprising insight</h3><p>${esc(r.surprising_insight)}</p></div>

    <div class="row mt2" style="margin-bottom:10px"><h3>What each employee said</h3><span class="muted small">Click a card for the profile, or chat with them</span></div>
    <div class="stack" id="voices">${state.personas.map((p) => voice(p, sim, hasB)).join("")}</div>`;

  $("#dl", out).addEventListener("click", () => download("agni-beta-test.json", JSON.stringify(sim, null, 2)));
  $("#copy-md", out).addEventListener("click", () => copy(summaryMarkdown(sim)));
  $$("[data-voice]", out).forEach((el) => el.addEventListener("click", () => {
    const p = state.personas.find((x) => x.id === el.dataset.voice);
    const d = personaDetail(p, `<a class="btn primary mt" href="#/support" id="go-chat">🎧 Practise support with ${esc(p.name.split(" ")[0])}</a>`);
    $("#go-chat", d).addEventListener("click", () => sessionStorage.setItem("agni-support-pid", p.id));
  }));
}

function tile(label, value, sub) {
  return `<div class="tile"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
}

function voice(p, sim, hasB) {
  const rows = (hasB ? ["A", "B"] : ["A"]).map((v) => {
    const r = sim.reactions[v]?.[p.id];
    if (!r) return "";
    return `<div style="display:grid;gap:6px">
      <div class="row">${hasB ? `<span class="pill ${v.toLowerCase()}">Version ${v}</span>` : ""}
        <span class="trait">${esc(r.emotional_state)}</span>
        <span class="muted small">Adopt ${r.adoption_likelihood}% · Clarity ${r.clarity}% · Sentiment ${r.sentiment > 0 ? "+" : ""}${r.sentiment}</span></div>
      <p style="color:var(--ink-2)">“${esc(r.first_impression)}”</p>
      ${r.confusion_points.length ? `<p class="small"><b>Confused by:</b> ${r.confusion_points.map(esc).join(" · ")}</p>` : ""}
      ${r.questions_they_would_ask.length ? `<p class="small"><b>Would ask:</b> ${r.questions_they_would_ask.map(esc).join(" · ")}</p>` : ""}
      <p class="small"><b>What would help:</b> ${esc(r.what_would_help)}</p>
    </div>`;
  }).join("");
  return `<div class="card" style="display:grid;grid-template-columns:44px 1fr;gap:14px;cursor:pointer" data-voice="${esc(p.id)}">
    <div class="avatar">${esc(p.avatar_emoji)}</div>
    <div style="display:grid;gap:10px"><div><b>${esc(p.name)}</b> <span class="muted small">· ${esc(p.job_title)} · ${esc(p.segment)}</span></div>${rows}</div>
  </div>`;
}

function summaryMarkdown(sim) {
  const r = sim.report;
  return [`# Beta test: ${sim.test_type}`, ``, `**Verdict:** ${r.verdict} (${r.readiness_score}/100)`,
    r.winning_variant !== "n/a" ? `**Winner:** ${r.winning_variant}. ${r.variant_comparison}` : "", ``, r.executive_summary, ``,
    `## Issues`, ...r.issue_log.map((i) => `- [${i.severity}] ${i.title} → ${i.escalate_to}`), ``,
    `## Predicted tickets`, ...r.predicted_tickets.map((t) => `- **${t.question}** ${t.suggested_answer}`), ``,
    `## Training actions`, ...r.training_actions.map((t) => `- ${t.action} (${t.audience}, ${t.format})`), ``,
    `**Insight:** ${r.surprising_insight}`].join("\n");
}
