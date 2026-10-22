import { api } from "../api.js";
import { logActivity, save, state } from "../state.js";
import { $, $$, copy, download, errorBox, esc, md, toast, withBusy } from "../ui.js";
import { runSimulation } from "./simulator.js";

const FORMATS = ["Live workshop", "Quick-start guide", "Lunch & learn", "Video script", "Cheat sheet"];

export function render(view) {
  view.innerHTML = `
    <div class="page-head">
      <div>
        <div class="jd">Training materials · Enablement</div>
        <h1>Training Studio</h1>
        <p>Generate a complete training kit (agenda, speaker notes, exercises, quiz, glossary), then test it on your
        digital twins to see who it lands with. Use the jargon translator to turn technical text into plain English.</p>
      </div>
    </div>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="true" data-tab="kit">🎓 Training kit</button>
      <button role="tab" aria-selected="false" data-tab="translate">🗣️ Jargon translator</button>
    </div>
    <div id="tab-kit"></div>
    <div id="tab-translate" hidden></div>`;

  $$(".tabs button", view).forEach((b) => b.addEventListener("click", () => {
    $$(".tabs button", view).forEach((x) => x.setAttribute("aria-selected", x === b));
    $("#tab-kit", view).hidden = b.dataset.tab !== "kit";
    $("#tab-translate", view).hidden = b.dataset.tab !== "translate";
  }));
  renderKitTab($("#tab-kit", view));
  renderTranslateTab($("#tab-translate", view));
}

function renderKitTab(root) {
  const segs = [...new Set(state.personas.map((p) => p.segment))];
  root.innerHTML = `
    <div class="split">
      <div class="card">
        <div class="form">
          <label>Topic <input type="text" id="topic" value="Getting started with the AI Assistant: prompts that work"></label>
          <label>Audience
            <input type="text" id="aud" list="aud-list" value="${esc(segs[0] || "Factory operations supervisors")}">
            <datalist id="aud-list">${segs.map((s) => `<option value="${esc(s)}">`).join("")}</datalist></label>
          <label>Format <select id="fmt">${FORMATS.map((f) => `<option>${f}</option>`).join("")}</select></label>
          <div class="form cols">
            <label>Minutes <input type="number" id="mins" value="45" min="10" max="180"></label>
            <label>AI literacy <select id="lit"><option>beginner</option><option>intermediate</option><option>advanced</option></select></label>
          </div>
          <button class="btn primary" id="gen">✨ Generate training kit</button>
        </div>
        <div id="err"></div>
      </div>
      <div id="kit">${state.lastTraining ? "" : `<div class="empty"><div class="big">🎓</div>Your training kit will appear here.</div>`}</div>
    </div>
    <div id="kit-sim"></div>`;

  $("#gen", root).addEventListener("click", (e) => withBusy(e.currentTarget, "Designing…", async () => {
    $("#err", root).innerHTML = "";
    try {
      const kit = await api.training({
        context: state.context, topic: $("#topic", root).value, audience: $("#aud", root).value,
        format: $("#fmt", root).value, minutes: Number($("#mins", root).value), ai_literacy: $("#lit", root).value,
      });
      state.lastTraining = kit;
      logActivity("🎓", `Training kit: ${kit.title}`);
      save();
      renderKit(root, kit);
    } catch (err) { $("#err", root).innerHTML = errorBox(err.message); }
  }));
  if (state.lastTraining) renderKit(root, state.lastTraining);
}

function kitToText(k) {
  return [`# ${k.title}`, `Audience: ${k.audience} · ${k.format} · ${k.total_minutes} min`, ``,
    `## Learning objectives`, ...k.learning_objectives.map((o) => `- ${o}`), ``,
    ...k.sections.flatMap((s) => [`## ${s.heading} (${s.minutes} min)`, s.content, ``, `> Speaker notes: ${s.speaker_notes}`, ``]),
    `## Hands-on exercises`, ...k.hands_on_exercises.flatMap((x) => [`### ${x.title}`, "```", x.prompt_to_try, "```", `Expected: ${x.expected_outcome}`, ``]),
    `## Quiz`, ...k.quiz.flatMap((q, i) => [`${i + 1}. ${q.question}`, ...q.options.map((o, j) => `   ${"abcd"[j]}) ${o}`), `   Answer: ${q.options[q.answer_index]}. ${q.explanation}`]), ``,
    `## Glossary`, ...k.glossary.map((g) => `- **${g.term}**: ${g.plain_english}`), ``,
    `## Do's and don'ts`, ...k.do_and_dont.map((d) => `- ${d}`)].join("\n");
}

function renderKit(root, k) {
  $("#kit", root).innerHTML = `
    <div class="card fade">
      <div class="row">
        <div><span class="tag">${esc(k.format)} · ${k.total_minutes} min · ${esc(k.audience)}</span><h2 style="font-size:20px;margin-top:4px">${esc(k.title)}</h2></div>
        <div class="spacer"></div>
        <button class="btn sm" id="copy">📋 Copy</button>
        <button class="btn sm" id="dl">⬇ Markdown</button>
      </div>
      <h3 class="mt">🎯 Learning objectives</h3>
      <ul class="bullets mt">${k.learning_objectives.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>

      <h3 class="mt2">🗂️ Agenda</h3>
      <div class="stack mt">${k.sections.map((s, i) => `
        <details ${i === 0 ? "open" : ""} style="background:var(--surface-2);border-radius:10px;padding:10px 14px">
          <summary style="margin:0;color:var(--ink)"><b>${esc(s.heading)}</b> <span class="muted">· ${s.minutes} min</span></summary>
          ${md(s.content)}
          <p class="small muted mt">🎤 ${esc(s.speaker_notes)}</p>
        </details>`).join("")}</div>

      <h3 class="mt2">🛠️ Hands-on exercises</h3>
      <div class="stack mt">${k.hands_on_exercises.map((x) => `
        <div><b>${esc(x.title)}</b><pre class="code mt">${esc(x.prompt_to_try)}</pre><p class="small muted mt">Expected: ${esc(x.expected_outcome)}</p></div>`).join("")}</div>

      <h3 class="mt2">✅ Knowledge check</h3>
      <div class="stack mt" id="quiz">${k.quiz.map((q, i) => `
        <div data-q="${i}"><b>${i + 1}. ${esc(q.question)}</b>
          <div class="chips mt">${q.options.map((o, j) => `<button class="chip" data-o="${j}">${esc(o)}</button>`).join("")}</div>
          <p class="small mt" hidden data-exp></p></div>`).join("")}</div>

      <div class="two mt2">
        <div><h3>📖 Glossary</h3><ul class="list mt">${k.glossary.map((g) => `<li><b>${esc(g.term)}</b><span class="why">${esc(g.plain_english)}</span></li>`).join("")}</ul></div>
        <div><h3>👍 Do's and don'ts</h3><ul class="bullets mt">${k.do_and_dont.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>
      </div>

      <div class="callout mt2 row">
        <div style="flex:1;min-width:220px"><h3>Will this training land?</h3><p class="small">Show this kit to your ${state.personas.length} digital twins and get a readiness report.</p></div>
        <button class="btn primary" id="test" ${state.personas.length ? "" : "disabled"}>🧪 Test on twins</button>
      </div>
    </div>`;

  $$("#quiz [data-q]", root).forEach((qEl) => {
    const q = k.quiz[Number(qEl.dataset.q)];
    $$(".chip", qEl).forEach((c) => c.addEventListener("click", () => {
      const ok = Number(c.dataset.o) === q.answer_index;
      $$(".chip", qEl).forEach((x) => x.setAttribute("aria-pressed", Number(x.dataset.o) === q.answer_index));
      const exp = $("[data-exp]", qEl);
      exp.hidden = false;
      exp.innerHTML = `${ok ? "✅ Correct." : "❌ Not quite."} ${esc(q.explanation)}`;
    }));
  });
  $("#copy", root).addEventListener("click", () => copy(kitToText(k)));
  $("#dl", root).addEventListener("click", () => download("training-kit.md", kitToText(k), "text/markdown"));
  $("#test", root).addEventListener("click", async (e) => {
    if (!state.personas.length) return toast("Create twins in the Persona Lab first");
    e.currentTarget.disabled = true;
    await runSimulation($("#kit-sim", root), { test_type: "Training material", variant_a: kitToText(k), variant_b: null });
    e.currentTarget.disabled = false;
  });
}

const SAMPLE_JARGON = `The assistant leverages a RAG pipeline: user queries are embedded and matched via vector similarity against chunked document indices, and the top-k results are injected into the LLM context window to ground generation and reduce hallucination. Responses exceeding the 8k-token output limit are truncated.`;

function renderTranslateTab(root) {
  root.innerHTML = `
    <div class="two">
      <div class="card">
        <div class="form">
          <label>Technical text <textarea id="tx" rows="9" placeholder="Paste release notes, an error message, an architecture note...">${esc(SAMPLE_JARGON)}</textarea></label>
          <label>Explain it for <input type="text" id="tx-aud" value="factory supervisors with no AI background"></label>
          <button class="btn primary" id="tx-go">🗣️ Translate to plain English</button>
        </div>
        <div id="tx-err"></div>
      </div>
      <div id="tx-out"><div class="empty"><div class="big">🗣️</div>The plain-English version will appear here.</div></div>
    </div>`;
  $("#tx-go", root).addEventListener("click", (e) => withBusy(e.currentTarget, "Translating…", async () => {
    $("#tx-err", root).innerHTML = "";
    try {
      const t = await api.translate($("#tx", root).value, $("#tx-aud", root).value);
      $("#tx-out", root).innerHTML = `
        <div class="card fade">
          <div class="row"><span class="badge">${esc(t.reading_level_before)}</span> → <span class="badge live">${esc(t.reading_level_after)}</span>
            <div class="spacer"></div><button class="btn sm" id="tx-copy">📋 Copy</button></div>
          <p class="mt" style="font-size:16px">${esc(t.plain_version)}</p>
          <div class="callout mt"><h3>💡 Think of it like this</h3><p>${esc(t.analogy)}</p></div>
          <h3 class="mt2">Glossary</h3>
          <ul class="list mt">${t.glossary.map((g) => `<li><b>${esc(g.term)}</b><span class="why">${esc(g.plain_english)}</span></li>`).join("")}</ul>
        </div>`;
      $("#tx-copy", root).addEventListener("click", () => copy(t.plain_version));
      logActivity("🗣️", "Translated technical text to plain English");
    } catch (err) { $("#tx-err", root).innerHTML = errorBox(err.message); }
  }));
}
