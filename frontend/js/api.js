// All calls to the backend live here.

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

// Streams plain text; calls onChunk with each piece.
async function postStream(url, body, onChunk) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

// Streams newline-delimited JSON events.
async function postNDJSON(url, body, onEvent) {
  let buffer = "";
  await postStream(url, body, (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (line) onEvent(JSON.parse(line));
    }
  });
}

export const api = {
  status: () => fetch("/api/status").then((r) => r.json()),
  personas: (context, count) => postJSON("/api/personas", { context, count }),
  simulate: (body, onEvent) => postNDJSON("/api/simulate", body, onEvent),
  training: (body) => postJSON("/api/training/generate", body),
  translate: (text, audience) => postJSON("/api/training/translate", { text, audience }),
  feedback: (feedback, product) => postJSON("/api/feedback/analyze", { feedback, product }),
  feedbackSample: () => fetch("/api/feedback/sample").then((r) => r.json()),
  coach: (body) => postJSON("/api/prompt/coach", body),
  runPrompt: (prompt, onChunk) => postStream("/api/prompt/run", { prompt }, onChunk),
  chat: (body, onChunk) => postStream("/api/chat", body, onChunk),
  grade: (body) => postJSON("/api/chat/grade", body),
};
