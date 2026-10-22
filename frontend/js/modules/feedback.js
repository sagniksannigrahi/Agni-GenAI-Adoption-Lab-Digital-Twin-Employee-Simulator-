import { api } from "../api.js";
import { sentimentBar } from "../charts.js";
import { logActivity, save, state } from "../state.js";
import { $, copy, download, errorBox, esc, sevLabel, withBusy } from "../ui.js";

export function render(view) {
  view.innerHTML = `
    <div class="page-head">
      <div>
        <div class="jd">Gather, organise & analyse feedback</div>
        <h1>Feedback Analyzer</h1>
        <p>Paste raw feedback from surveys, Teams chats, tickets or workshop comments (one item per line works best).
        Agni groups it into themes, finds issues, says who to escalate to, and drafts FAQ answers.</p>
      </div>
    </div>
    <div class="card">
      <div class="form">
        <label>Product <input type="text" id="prod" value="Internal AI Assistant"></label>
        <label>Raw feedback <textarea id="fb" rows="9" placeholder="Paste feedback here...">${esc(state.lastFeedbackInput || "")}</textarea></label>
        <div class="row">
          <button class="link" id="sample">Load sample feedback (20 items)</button>
          <label class="link" style="display:inline;cursor:pointer">or upload .txt / .csv<input type="file" id="file" accept=".txt,.csv" hidden></label>
          <div class="spacer"></div>
          <button class="btn primary" id="go">📊 Analyse feedback</button>
        </div>
      </div>
      <div id="err"></div>
    </div>
    <div id="out"></div>`;

  $("#sample", view).addEventListener("click", async () => {
    const { feedback } = await api.feedbackSample();
    $("#fb", view).value = feedback;
  });
  $("#file", view).addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (f) $("#fb", view).value = await f.text();
  });
  $("#go", view).addEventListener("click", (e) => withBusy(e.currentTarget, "Analysing…", async () => {
    $("#err", view).innerHTML = "";
    const text = $("#fb", view).value;
    try {
      const a = await api.feedback(text, $("#prod", view).value);
      state.lastFeedback = a;
      state.lastFeedbackInput = text;
      logActivity("📊", `Analysed ${a.total_items} feedback items · ${a.adoption_health}`);
      save();
      renderAnalysis($("#out", view), a);
    } catch (err) { $("#err", view).innerHTML = errorBox(err.message); }
  }));
  if (state.lastFeedback) renderAnalysis($("#out", view), state.lastFeedback);
}

function renderAnalysis(out, a) {
  const health = { healthy: ["var(--good)", "✅"], "at risk": ["var(--warning)", "⚠️"], critical: ["var(--critical)", "🛑"] }[a.adoption_health];
  const escalations = a.issues.filter((i) => i.escalate_to !== "No escalation");
  out.innerHTML = `
    <div class="tiles mt2 fade">
      <div class="tile"><div class="label">Feedback items</div><div class="value">${a.total_items}</div><div class="sub">analysed</div></div>
      <div class="tile"><div class="label">Adoption health</div><div class="value" style="font-size:22px;padding:6px 0;text-transform:capitalize">${health[1]} ${esc(a.adoption_health)}</div><div class="sub">overall signal</div></div>
      <div class="tile"><div class="label">Issues found</div><div class="value">${a.issues.length}</div><div class="sub">${escalations.length} need escalation</div></div>
      <div class="tile"><div class="label">Themes</div><div class="value">${a.themes.length}</div><div class="sub">recurring topics</div></div>
    </div>

    <div class="card mt">
      <div class="row"><h3>Summary</h3><div class="spacer"></div>
        <button class="btn sm" id="cp">📋 Copy report</button><button class="btn sm" id="dl">⬇ JSON</button></div>
      <p class="mt" style="color:var(--ink-2)">${esc(a.executive_summary)}</p>
      <h3 class="mt2">Sentiment</h3><div class="mt">${sentimentBar(a.positive, a.neutral, a.negative)}</div>
    </div>

    <div class="card mt">
      <h3>Themes</h3><p class="cap">Grouped from what users actually said</p>
      <div class="three">${a.themes.map((t) => `
        <div style="background:var(--surface-2);border-radius:12px;padding:14px;display:grid;gap:6px;align-content:start">
          <div class="row"><b>${esc(t.name)}</b><div class="spacer"></div><span class="seg">${t.count}×</span></div>
          <span class="tag">${esc(t.sentiment)}</span>
          <p class="small" style="color:var(--ink-2)">${esc(t.description)}</p>
          ${t.example_quotes.map((q) => `<p class="small" style="font-style:italic;border-left:2px solid var(--axis);padding-left:8px">“${esc(q)}”</p>`).join("")}
        </div>`).join("")}</div>
    </div>

    <div class="card mt">
      <h3>Issues & escalation</h3><p class="cap">Who should own each problem</p>
      <table class="data"><thead><tr><th>Issue</th><th>Type</th><th>Severity</th><th class="n">Mentions</th><th>Owner</th><th>Next step</th></tr></thead>
      <tbody>${a.issues.map((i) => `<tr><td><b>${esc(i.title)}</b></td><td>${esc(i.category)}</td><td>${sevLabel(i.severity)}</td>
        <td class="n">${i.mentions}</td><td>${i.escalate_to === "No escalation" ? `<span class="muted">Customer Success</span>` : `<b>${esc(i.escalate_to)}</b>`}</td>
        <td class="small">${esc(i.recommended_next_step)}</td></tr>`).join("")}</tbody></table>
    </div>

    <div class="three mt">
      <div class="card"><h3>🚧 Adoption blockers</h3><ul class="bullets mt">${a.adoption_blockers.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="card"><h3>⚡ Quick wins this week</h3><ul class="bullets mt">${a.quick_wins.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="card"><h3>❓ FAQ drafts</h3><ul class="list mt">${a.faq_candidates.map((f) => `<li><b>${esc(f.question)}</b><span class="why">${esc(f.answer)}</span></li>`).join("")}</ul></div>
    </div>`;

  $("#dl", out).addEventListener("click", () => download("feedback-analysis.json", JSON.stringify(a, null, 2)));
  $("#cp", out).addEventListener("click", () => copy([
    `# Feedback analysis (${a.total_items} items, ${a.adoption_health})`, "", a.executive_summary, "",
    "## Themes", ...a.themes.map((t) => `- ${t.name} (${t.count}, ${t.sentiment}): ${t.description}`), "",
    "## Issues", ...a.issues.map((i) => `- [${i.severity}] ${i.title} → ${i.escalate_to}: ${i.recommended_next_step}`), "",
    "## Quick wins", ...a.quick_wins.map((q) => `- ${q}`), "",
    "## FAQ", ...a.faq_candidates.map((f) => `- **${f.question}** ${f.answer}`)].join("\n")));
}
