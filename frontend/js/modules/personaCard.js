// Shared persona card + detail drawer.
import { esc, openDrawer } from "../ui.js";

const ATT = { enthusiast: "🚀", curious: "🤔", neutral: "😐", skeptical: "🧐", resistant: "🛑" };

export function personaCard(p, extra = "") {
  return `
  <button class="persona" data-pid="${esc(p.id)}">
    <div class="status" id="status-${esc(p.id)}">${extra}</div>
    <div class="persona-head">
      <div class="avatar">${esc(p.avatar_emoji)}</div>
      <div>
        <h3>${esc(p.name)}</h3>
        <div class="meta">${esc(p.job_title)} · ${esc(p.location)}</div>
      </div>
    </div>
    <div><span class="seg">${esc(p.segment)}</span></div>
    <p class="quote">“${esc(p.signature_quote)}”</p>
    <div class="traits">
      <span class="trait" data-tip="AI literacy">🧠 ${esc(p.ai_literacy)}</span>
      <span class="trait" data-tip="Attitude to AI">${ATT[p.attitude_to_ai] || ""} ${esc(p.attitude_to_ai)}</span>
      <span class="trait" data-tip="Prefers to learn by">📚 ${esc(p.preferred_learning)}</span>
    </div>
  </button>`;
}

const ul = (xs) => `<ul class="bullets">${(xs || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

export function personaDetail(p, actionsHtml = "") {
  return openDrawer(`
    <div class="drawer-head">
      <div class="avatar">${esc(p.avatar_emoji)}</div>
      <div><h3>${esc(p.name)}</h3><div class="muted small">${esc(p.job_title)}, ${esc(p.department)} · ${p.age} · ${esc(p.location)}</div></div>
      <div class="spacer"></div>
      <button class="btn ghost sm" data-close>✕</button>
    </div>
    <div class="drawer-body">
      <div class="row">
        <span class="seg">${esc(p.segment)}</span>
        <span class="trait">🧠 ${esc(p.ai_literacy)}</span>
        <span class="trait">${ATT[p.attitude_to_ai] || ""} ${esc(p.attitude_to_ai)}</span>
        <span class="trait">📚 ${esc(p.preferred_learning)}</span>
        <span class="trait">🗓️ ${p.years_at_company} yrs at company</span>
      </div>
      <p class="quote" style="font-style:italic;color:var(--ink-2)">“${esc(p.signature_quote)}”</p>
      <div class="kv"><h4>Daily work</h4><p>${esc(p.daily_work)}</p></div>
      <div class="kv"><h4>Personality</h4><p>${esc(p.personality)}</p></div>
      <div class="kv"><h4>Goals</h4>${ul(p.goals)}</div>
      <div class="kv"><h4>Frustrations</h4>${ul(p.frustrations)}</div>
      <div class="kv"><h4>Where AI could help</h4>${ul(p.ai_use_cases)}</div>
      <div class="kv"><h4>Concerns about AI</h4>${ul(p.concerns)}</div>
      ${actionsHtml}
    </div>`);
}
