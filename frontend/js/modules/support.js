import { api } from "../api.js";
import { gauge, hbars } from "../charts.js";
import { logActivity, state } from "../state.js";
import { $, errorBox, esc, toast, withBusy } from "../ui.js";

const SCENARIOS = [
  "",
  "The assistant gave you a wrong number from an old spec and you almost used it in a customer report.",
  "You can't log in to the AI assistant when working from home on VPN.",
  "You don't know whether you're allowed to upload a customer's confidential document.",
  "Your answers are vague and generic, and you don't know how to get better results.",
  "Uploading a 150-page PDF always fails with a timeout.",
];

export function render(view) {
  if (!state.personas.length) {
    view.innerHTML = `<div class="page-head"><div><div class="jd">User support</div><h1>Support Simulator</h1></div></div>
      <div class="empty"><div class="big">🎧</div>You need digital twins first. Create them in the <a href="#/personas">Persona Lab</a>.</div>`;
    return;
  }
  let pid = sessionStorage.getItem("agni-support-pid") || state.personas[0].id;
  if (!state.personas.some((p) => p.id === pid)) pid = state.personas[0].id;
  let mode = "support";
  let history = [];

  view.innerHTML = `
    <div class="page-head">
      <div>
        <div class="jd">User support · Bridging users and tech teams</div>
        <h1>Support Simulator</h1>
        <p>A digital twin brings you a real problem with the AI tool. Help them in plain language, then get graded
        on empathy, clarity, accuracy and jargon. Switch to <b>Interview</b> mode to run user research instead.</p>
      </div>
    </div>
    <div class="split">
      <div class="card">
        <div class="form">
          <label>Employee <select id="who">${state.personas.map((p) =>
            `<option value="${esc(p.id)}" ${p.id === pid ? "selected" : ""}>${esc(p.avatar_emoji)} ${esc(p.name)} · ${esc(p.job_title)}</option>`).join("")}</select></label>
          <div><div class="tag" style="margin-bottom:8px">Mode</div>
            <div class="chips"><button class="chip" aria-pressed="true" data-mode="support">🎧 Support ticket</button>
            <button class="chip" aria-pressed="false" data-mode="interview">🎙️ User interview</button></div></div>
          <label id="scn-wrap">Problem scenario <select id="scn">${SCENARIOS.map((s) =>
            `<option value="${esc(s)}">${s ? esc(s) : "🎲 Let the employee pick a realistic problem"}</option>`).join("")}</select></label>
          <div id="who-card"></div>
          <div class="row"><button class="btn primary" id="start">▶ Start conversation</button>
            <button class="btn" id="grade" disabled>🏅 Grade my support</button></div>
        </div>
      </div>
      <div class="card" style="display:flex;flex-direction:column">
        <div class="row"><h3 id="chat-title">Conversation</h3><div class="spacer"></div><span class="muted small" id="turns"></span></div>
        <div class="chat mt" id="chat"><div class="empty"><div class="big">💬</div>Press <b>Start conversation</b>.</div></div>
        <div class="composer"><input type="text" id="msg" placeholder="Type your reply…" disabled><button class="btn primary" id="send" disabled>Send</button></div>
        <div id="err"></div>
      </div>
    </div>
    <div id="grade-out"></div>`;

  const persona = () => state.personas.find((p) => p.id === pid);
  const showWho = () => {
    const p = persona();
    $("#who-card", view).innerHTML = `<div style="background:var(--surface-2);border-radius:12px;padding:12px;display:grid;gap:4px">
      <b>${esc(p.avatar_emoji)} ${esc(p.name)}</b><span class="small muted">${esc(p.department)} · AI literacy: ${esc(p.ai_literacy)} · ${esc(p.attitude_to_ai)}</span>
      <span class="small" style="color:var(--ink-2)">Tip: ${p.ai_literacy === "beginner" ? "avoid jargon and give one step at a time." : "they're comfortable with tech, so be precise."}</span></div>`;
  };
  showWho();

  const chatEl = $("#chat", view);
  const draw = () => {
    chatEl.innerHTML = history.map((m) => `<div class="msg ${m.role === "user" ? "me" : "them"}">${esc(m.content)}</div>`).join("");
    chatEl.scrollTop = chatEl.scrollHeight;
    $("#turns", view).textContent = `${history.filter((m) => m.role === "user").length} replies`;
    $("#grade", view).disabled = mode !== "support" || !history.some((m) => m.role === "user");
  };

  const ask = async () => {
    const p = persona();
    const bubble = document.createElement("div");
    bubble.className = "msg them";
    bubble.innerHTML = `<span class="spinner"></span>`;
    chatEl.querySelector(".empty")?.remove();
    chatEl.appendChild(bubble);
    let text = "";
    $("#send", view).disabled = true;
    try {
      await api.chat({ context: state.context, persona: p, mode, scenario: $("#scn", view).value, history }, (c) => {
        text += c; bubble.textContent = text; chatEl.scrollTop = chatEl.scrollHeight;
      });
      history.push({ role: "assistant", content: text.trim() });
    } catch (err) { $("#err", view).innerHTML = errorBox(err.message); bubble.remove(); }
    $("#send", view).disabled = false;
    $("#msg", view).disabled = false;
    $("#msg", view).focus();
    draw();
  };

  const reset = () => {
    history = [];
    $("#grade-out", view).innerHTML = "";
    $("#err", view).innerHTML = "";
    $("#msg", view).disabled = mode === "support";
    $("#send", view).disabled = mode === "support";
    chatEl.innerHTML = `<div class="empty"><div class="big">${mode === "support" ? "🎧" : "🎙️"}</div>${mode === "support"
      ? "Press <b>Start conversation</b>. The employee will describe their problem."
      : "Type your first interview question below."}</div>`;
    $("#chat-title", view).textContent = mode === "support" ? "Support chat" : "User interview";
    $("#start", view).hidden = mode !== "support";
    $("#scn-wrap", view).firstChild.textContent = mode === "support" ? "Problem scenario " : "Interview topic ";
  };

  $("#who", view).addEventListener("change", (e) => { pid = e.target.value; sessionStorage.setItem("agni-support-pid", pid); showWho(); reset(); });
  view.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.mode;
    view.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    reset();
  }));
  $("#start", view).addEventListener("click", () => { reset(); ask(); });

  const send = () => {
    const v = $("#msg", view).value.trim();
    if (!v) return;
    if (mode === "support" && !history.length) return toast("Press Start so the employee can describe the problem");
    history.push({ role: "user", content: v });
    $("#msg", view).value = "";
    draw();
    ask();
  };
  $("#send", view).addEventListener("click", send);
  $("#msg", view).addEventListener("keydown", (e) => e.key === "Enter" && send());

  $("#grade", view).addEventListener("click", (e) => withBusy(e.currentTarget, "Grading…", async () => {
    try {
      // The intern is "user" in our history; the grader sees the full transcript.
      const g = await api.grade({ context: state.context, persona: persona(), scenario: $("#scn", view).value, history });
      logActivity("🏅", `Support practice with ${persona().name}: ${g.overall_score}/100`);
      $("#grade-out", view).innerHTML = `
        <div class="card mt2 fade">
          <div class="row" style="gap:22px;align-items:center">
            ${gauge(g.overall_score, "score")}
            <div style="flex:1;min-width:240px">
              <div class="row"><span class="badge">${g.resolved ? "✅ Resolved" : "⏳ Not resolved yet"}</span>
                ${g.escalation_needed ? `<span class="badge">⬆️ Escalate: ${esc(g.escalation_note)}</span>` : ""}</div>
              <div class="mt">${hbars([{ label: "Empathy", value: g.empathy }, { label: "Clarity", value: g.clarity },
                { label: "Accuracy", value: g.accuracy }, { label: "Jargon-free", value: g.jargon_free }], "")}</div>
            </div>
          </div>
          <div class="two mt">
            <div><h3>👍 What went well</h3><ul class="bullets mt">${g.what_went_well.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
            <div><h3>🎯 What to improve</h3><ul class="bullets mt">${g.what_to_improve.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
          </div>
          <div class="callout mt"><h3>💬 A model reply</h3><p>${esc(g.model_reply)}</p></div>
        </div>`;
    } catch (err) { $("#err", view).innerHTML = errorBox(err.message); }
  }));

  reset();
}
