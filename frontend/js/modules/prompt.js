import { api } from "../api.js";
import { gauge, hbars } from "../charts.js";
import { logActivity } from "../state.js";
import { $, copy, errorBox, esc, md, withBusy } from "../ui.js";

const SAMPLES = [
  ["Weak email prompt", "write an email to supplier about late parts", "Get late components delivered this week", "Supply chain planner"],
  ["Vague summary prompt", "summarize this", "Brief my manager on a 60-email customer escalation thread", "Field application engineer"],
  ["Report prompt", "make a failure analysis report from my notes", "Create a customer-ready failure analysis report", "Reliability engineer"],
];

export function render(view) {
  view.innerHTML = `
    <div class="page-head">
      <div>
        <div class="jd">Prompt engineering</div>
        <h1>Prompt Coach</h1>
        <p>Paste a prompt an employee is using. Agni scores it on six criteria, rewrites it, creates a reusable
        team template, and runs both versions so you can show the difference in a workshop.</p>
      </div>
    </div>
    <div class="split">
      <div class="card">
        <div class="form">
          <div class="chips">${SAMPLES.map((s, i) => `<button class="chip" data-s="${i}">${s[0]}</button>`).join("")}</div>
          <label>Prompt <textarea id="p" rows="6">${esc(SAMPLES[0][1])}</textarea></label>
          <label>What are they trying to achieve? <span class="hint">optional</span><input type="text" id="goal" value="${esc(SAMPLES[0][2])}"></label>
          <label>Their role <span class="hint">optional</span><input type="text" id="role" value="${esc(SAMPLES[0][3])}"></label>
          <button class="btn primary" id="go">✍️ Coach this prompt</button>
        </div>
        <div id="err"></div>
      </div>
      <div id="out"><div class="empty"><div class="big">✍️</div>Scores and an improved prompt will appear here.</div></div>
    </div>
    <div id="compare"></div>`;

  view.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => {
    const s = SAMPLES[Number(b.dataset.s)];
    $("#p", view).value = s[1]; $("#goal", view).value = s[2]; $("#role", view).value = s[3];
  }));

  $("#go", view).addEventListener("click", (e) => withBusy(e.currentTarget, "Reviewing…", async () => {
    $("#err", view).innerHTML = "";
    $("#compare", view).innerHTML = "";
    const prompt = $("#p", view).value.trim();
    try {
      const r = await api.coach({ prompt, goal: $("#goal", view).value, user_role: $("#role", view).value });
      logActivity("✍️", `Coached a prompt: ${r.overall_score} → ${r.improved_score}`);
      renderReview(view, prompt, r);
    } catch (err) { $("#err", view).innerHTML = errorBox(err.message); }
  }));
}

function renderReview(view, original, r) {
  $("#out", view).innerHTML = `
    <div class="card fade">
      <div class="row" style="gap:20px">
        ${gauge(r.overall_score, "before")}
        <div style="font-size:28px;color:var(--muted)">→</div>
        ${gauge(r.improved_score, "after")}
        <p style="flex:1;min-width:200px;color:var(--ink-2)">${esc(r.summary)}</p>
      </div>
      <h3 class="mt2">Scorecard</h3><p class="cap">Each criterion out of 10 (hover for the coach's comment)</p>
      ${hbars(r.criteria.map((c) => ({ label: c.criterion, value: c.score * 10, display: `${c.score}/10`, note: c.comment })))}
      <h3 class="mt2">What's holding it back</h3>
      <ul class="bullets mt">${r.problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
    </div>`;

  $("#compare", view).innerHTML = `
    <div class="two mt">
      <div class="card">
        <div class="row"><h3>✨ Improved prompt</h3><div class="spacer"></div><button class="btn sm" id="cp1">📋 Copy</button></div>
        <pre class="code mt">${esc(r.improved_prompt)}</pre>
        <h3 class="mt">Why it's better</h3>
        <ul class="bullets mt">${r.why_it_is_better.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="chips mt">${r.techniques_used.map((t) => `<span class="seg">${esc(t)}</span>`).join("")}</div>
      </div>
      <div class="card">
        <div class="row"><h3>🧩 Reusable team template</h3><div class="spacer"></div><button class="btn sm" id="cp2">📋 Copy</button></div>
        <pre class="code mt">${esc(r.reusable_template)}</pre>
        <div class="callout mt"><h3>See the difference</h3>
          <p class="small">Run both prompts through the AI and compare the answers side by side.</p>
          <button class="btn primary mt" id="run">▶ Run both prompts</button></div>
      </div>
    </div>
    <div class="two mt" id="runs" hidden>
      <div class="card"><span class="tag">Original prompt output</span><div id="o1" class="mt"></div></div>
      <div class="card"><span class="tag" style="color:var(--accent)">Improved prompt output</span><div id="o2" class="mt"></div></div>
    </div>`;

  $("#cp1", view).addEventListener("click", () => copy(r.improved_prompt));
  $("#cp2", view).addEventListener("click", () => copy(r.reusable_template));
  $("#run", view).addEventListener("click", (e) => withBusy(e.currentTarget, "Running…", async () => {
    $("#runs", view).hidden = false;
    const stream = async (prompt, el) => {
      let text = "";
      el.innerHTML = `<span class="spinner"></span>`;
      try {
        await api.runPrompt(prompt, (c) => { text += c; el.innerHTML = md(text); });
      } catch (err) { el.innerHTML = errorBox(err.message); }
    };
    await Promise.all([stream(original, $("#o1", view)), stream(r.improved_prompt, $("#o2", view))]);
  }));
}
