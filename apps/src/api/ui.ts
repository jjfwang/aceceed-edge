import type { FastifyInstance } from "fastify";
import type { AppConfig } from "@aceceed/shared";

const defaultTitle = "Aceceed Edge";

type UiMode = "hold" | "toggle";

function resolveUiMode(config: AppConfig): UiMode {
  const mode = config.runtime.ui?.mode;
  return mode === "toggle" ? "toggle" : "hold";
}

function resolveTitle(config: AppConfig): string {
  const title = config.runtime.ui?.title;
  return title && title.trim().length > 0 ? title.trim() : defaultTitle;
}

function buildUiHtml(config: AppConfig): string {
  const mode = resolveUiMode(config);
  const title = resolveTitle(config);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      --bg: #f7f1e0;
      --bg-ink: #151515;
      --panel: #fff7e8;
      --panel-shadow: rgba(17, 17, 17, 0.15);
      --accent: #ef8c2f;
      --accent-dark: #d46a1f;
      --accent-soft: #f7c48c;
      --teal: #1b8e8a;
      --teal-dark: #136d69;
      --danger: #d04d33;
      --muted: #5f6068;
      --line: rgba(21, 21, 21, 0.1);
      --ring: rgba(239, 140, 47, 0.35);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Fira Sans", "Noto Sans", "DejaVu Sans", "Liberation Sans", sans-serif;
      color: var(--bg-ink);
      background: radial-gradient(circle at top left, #fff8ef 0%, #f7f1e0 55%, #f2e2c5 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(6px, 2vw, 16px);
      overflow: hidden;
    }

    body::before,
    body::after {
      content: "";
      position: absolute;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(27, 142, 138, 0.12), transparent 70%);
      z-index: 0;
    }

    body::before {
      top: -120px;
      left: -80px;
    }

    body::after {
      bottom: -160px;
      right: -120px;
      background: radial-gradient(circle, rgba(239, 140, 47, 0.15), transparent 70%);
    }

    .app {
      position: relative;
      z-index: 1;
      width: min(960px, 100vw);
      height: min(560px, 100vh);
      background: var(--panel);
      border-radius: 28px;
      padding: 20px 22px 22px;
      box-shadow: 0 18px 40px var(--panel-shadow);
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 18px;
      animation: rise 0.6s ease-out;
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .logo {
      font-size: 20px;
      letter-spacing: 0.18em;
      font-weight: 700;
      text-transform: uppercase;
    }

    .subtitle {
      font-size: 13px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: #fff2df;
      border: 1px solid var(--line);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .chip--ghost {
      background: transparent;
      color: var(--muted);
    }

    .chip .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--teal);
      box-shadow: 0 0 0 3px rgba(27, 142, 138, 0.2);
    }

    .chip.listening .dot {
      background: var(--accent);
      box-shadow: 0 0 0 4px var(--ring);
    }

    .chip.processing .dot {
      background: #e9b34f;
      box-shadow: 0 0 0 4px rgba(233, 179, 79, 0.25);
    }

    .chip.error .dot {
      background: var(--danger);
      box-shadow: 0 0 0 4px rgba(208, 77, 51, 0.2);
    }

    .main {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 18px;
      height: 100%;
    }

    .ptt-panel {
      background: #fffaf1;
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
    }

    .ptt-button {
      width: min(220px, 80%);
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      border: none;
      background: radial-gradient(circle at top, var(--accent-soft), var(--accent));
      color: #2b1e14;
      font-size: 22px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      box-shadow: 0 12px 30px rgba(239, 140, 47, 0.35);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      touch-action: none;
    }

    .ptt-button:active,
    .ptt-button.listening {
      transform: translateY(4px) scale(0.98);
      box-shadow: 0 6px 18px rgba(239, 140, 47, 0.3);
    }

    .ptt-button.listening {
      animation: pulse 1.1s ease-in-out infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 140, 47, 0.35); }
      70% { box-shadow: 0 0 0 18px rgba(239, 140, 47, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 140, 47, 0); }
    }

    .ptt-hint {
      text-align: center;
      font-size: 13px;
      color: var(--muted);
    }

    .status-text {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--teal-dark);
    }

    .cards {
      display: grid;
      grid-template-rows: 1fr 1fr;
      gap: 14px;
      height: 100%;
    }

    .card {
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid var(--line);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 8px 16px rgba(17, 17, 17, 0.08);
      min-height: 0;
    }

    .card h2 {
      margin: 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .card-content {
      font-size: 16px;
      line-height: 1.4;
      overflow: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(21, 21, 21, 0.2) transparent;
    }

    .card-content::-webkit-scrollbar {
      width: 6px;
    }

    .card-content::-webkit-scrollbar-thumb {
      background: rgba(21, 21, 21, 0.2);
      border-radius: 999px;
    }

    .error {
      display: none;
      margin-top: 6px;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(208, 77, 51, 0.12);
      color: var(--danger);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .error.visible {
      display: block;
    }

    @media (max-width: 520px), (max-height: 420px) {
      body::before,
      body::after {
        opacity: 0.4;
      }

      .app {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
        padding: 12px;
        gap: 12px;
      }

      .logo {
        font-size: 16px;
        letter-spacing: 0.12em;
      }

      .subtitle {
        font-size: 11px;
      }

      .chip {
        padding: 6px 10px;
        font-size: 10px;
      }

      .main {
        gap: 12px;
      }

      .ptt-panel {
        padding: 12px;
      }

      .ptt-button {
        width: min(160px, 70%);
        font-size: 16px;
      }

      .card-content {
        font-size: 14px;
      }
    }

    @media (max-width: 420px) {
      .app {
        height: 100%;
        border-radius: 20px;
      }

      .main {
        grid-template-columns: 1fr;
      }

      .ptt-panel {
        padding: 14px;
      }

      .ptt-button {
        width: min(180px, 70%);
        font-size: 18px;
      }
    }

    @media (max-height: 360px) {
      .main {
        grid-template-columns: 1fr 1.1fr;
      }

      .ptt-hint {
        display: none;
      }
    }
  </style>
</head>
<body data-ptt-mode="${mode}">
  <div class="app">
    <header class="top">
      <div class="brand">
        <div class="logo">${title}</div>
        <div class="subtitle">Touch PTT Console</div>
      </div>
      <div class="status-row">
        <div class="chip" id="statusChip">
          <span class="dot"></span>
          <span id="statusLabel">Idle</span>
        </div>
        <div class="chip chip--ghost" id="connection">Offline</div>
      </div>
    </header>
    <section class="main">
      <div class="ptt-panel">
        <button class="ptt-button" id="pttButton">Hold to Talk</button>
        <div class="status-text" id="statusText">Ready</div>
        <div class="ptt-hint" id="pttHint">Press and hold, release to send.</div>
        <div class="error" id="errorBox"></div>
      </div>
      <div class="cards">
        <div class="card">
          <h2>Heard</h2>
          <div class="card-content" id="transcript">Waiting for audio...</div>
        </div>
        <div class="card">
          <h2>Response</h2>
          <div class="card-content" id="response">Responses will appear here.</div>
        </div>
      </div>
    </section>
  </div>

  <script>
    (function () {
      const mode = document.body.dataset.pttMode === "toggle" ? "toggle" : "hold";
      const pttButton = document.getElementById("pttButton");
      const statusLabel = document.getElementById("statusLabel");
      const statusText = document.getElementById("statusText");
      const transcript = document.getElementById("transcript");
      const responseEl = document.getElementById("response");
      const errorBox = document.getElementById("errorBox");
      const statusChip = document.getElementById("statusChip");
      const connection = document.getElementById("connection");
      const hint = document.getElementById("pttHint");

      const state = {
        active: false,
        listening: false,
        status: "idle"
      };

      function setError(message) {
        if (!message) {
          errorBox.classList.remove("visible");
          errorBox.textContent = "";
          return;
        }
        errorBox.textContent = message;
        errorBox.classList.add("visible");
      }

      function setStatus(next, label) {
        state.status = next;
        statusLabel.textContent = label;
        statusText.textContent = label;
        statusChip.classList.remove("listening", "processing", "error");
        pttButton.classList.remove("listening");

        if (next === "listening") {
          statusChip.classList.add("listening");
          pttButton.classList.add("listening");
        }
        if (next === "processing") {
          statusChip.classList.add("processing");
        }
        if (next === "error") {
          statusChip.classList.add("error");
        }
      }

      function setConnection(online) {
        connection.textContent = online ? "Online" : "Offline";
        connection.style.color = online ? "var(--teal-dark)" : "var(--muted)";
      }

      function markListening() {
        state.active = true;
        state.listening = true;
        setStatus("listening", "Listening");
      }

      function markProcessing() {
        state.active = true;
        state.listening = false;
        setStatus("processing", "Processing");
      }

      function markIdle() {
        state.active = false;
        state.listening = false;
        setStatus("idle", "Ready");
      }

      async function sendStart() {
        if (state.active) {
          return;
        }
        setError("");
        markListening();
        try {
          const result = await fetch("/v1/ptt/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
          });
          if (!result.ok) {
            const payload = await result.json().catch(() => ({}));
            throw new Error(payload.message || "PTT failed");
          }
          const payload = await result.json();
          if (payload.transcript) {
            transcript.textContent = payload.transcript;
          }
          if (payload.response) {
            responseEl.textContent = payload.response;
          }
          markIdle();
        } catch (err) {
          setError(err && err.message ? err.message : "PTT failed");
          setStatus("error", "Error");
          state.active = false;
          state.listening = false;
        }
      }

      async function sendStop() {
        if (!state.active || !state.listening) {
          return;
        }
        markProcessing();
        try {
          await fetch("/v1/ptt/stop", { method: "POST" });
        } catch (err) {
          setError("Stop failed");
          setStatus("error", "Error");
          state.active = false;
          state.listening = false;
        }
      }

      let holdActive = false;

      function startHold(event) {
        if (mode !== "hold" || state.active || holdActive) {
          return false;
        }
        holdActive = true;
        if (event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }
        sendStart();
        return true;
      }

      function endHold() {
        if (mode !== "hold" || !holdActive) {
          return;
        }
        holdActive = false;
        sendStop();
      }

      function onPointerDown(event) {
        if (!startHold(event)) {
          return;
        }
        window.addEventListener("pointerup", onPointerUp, { once: true });
        window.addEventListener("pointercancel", onPointerUp, { once: true });
      }

      function onPointerUp() {
        endHold();
      }

      function onTouchStart(event) {
        if (!startHold(event)) {
          return;
        }
        window.addEventListener("touchend", onTouchEnd, { once: true });
        window.addEventListener("touchcancel", onTouchEnd, { once: true });
      }

      function onTouchEnd() {
        endHold();
      }

      function onMouseDown(event) {
        if (event.button !== 0) {
          return;
        }
        if (!startHold(event)) {
          return;
        }
        window.addEventListener("mouseup", onMouseUp, { once: true });
      }

      function onMouseUp() {
        endHold();
      }

      function onClick() {
        if (mode !== "toggle") {
          return;
        }
        if (!state.active) {
          sendStart();
          return;
        }
        if (state.listening) {
          sendStop();
        }
      }

      function attachEvents() {
        pttButton.addEventListener("pointerdown", onPointerDown);
        pttButton.addEventListener("touchstart", onTouchStart, { passive: false });
        pttButton.addEventListener("mousedown", onMouseDown);
        pttButton.addEventListener("click", onClick);
      }

      function updateHint() {
        if (mode === "toggle") {
          pttButton.textContent = "Tap to Talk";
          hint.textContent = "Tap once to start, tap again to stop.";
        } else {
          pttButton.textContent = "Hold to Talk";
          hint.textContent = "Press and hold, release to send.";
        }
      }

      function connectEvents() {
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const socket = new WebSocket(protocol + "//" + location.host + "/v1/events");

        socket.addEventListener("open", function () {
          setConnection(true);
        });

        socket.addEventListener("close", function () {
          setConnection(false);
          setTimeout(connectEvents, 2000);
        });

        socket.addEventListener("message", function (event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "ptt:start") {
              markListening();
              return;
            }
            if (data.type === "ptt:stop") {
              markProcessing();
              return;
            }
            if (data.type === "ptt:transcript") {
              transcript.textContent = data.text || "";
              return;
            }
            if (data.type === "agent:response") {
              responseEl.textContent = data.text || "";
              return;
            }
            if (data.type === "tts:spoken") {
              responseEl.textContent = data.text || "";
              markIdle();
              return;
            }
            if (data.type === "error") {
              setError(data.message || "PTT failed");
              setStatus("error", "Error");
            }
          } catch (err) {
            setError("Event parse error");
          }
        });
      }

      updateHint();
      attachEvents();
      connectEvents();
      markIdle();
    })();
  </script>
</body>
</html>`;
}

export function registerUiRoutes(server: FastifyInstance, config: AppConfig) {
  const html = buildUiHtml(config);

  server.get("/", async (_req, reply) => {
    reply.type("text/html").send(html);
  });

  server.get("/ui", async (_req, reply) => {
    reply.type("text/html").send(html);
  });
}
