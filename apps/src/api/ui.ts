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
      --bg: #0c111b;
      --bg-secondary: #0f1626;
      --panel: rgba(255, 255, 255, 0.04);
      --panel-strong: rgba(255, 255, 255, 0.08);
      --panel-border: rgba(255, 255, 255, 0.08);
      --glow: rgba(103, 215, 255, 0.22);
      --ink: #e8edf7;
      --muted: #9aa7c7;
      --accent: #6ee7ff;
      --accent-strong: #46c2ff;
      --accent-soft: rgba(110, 231, 255, 0.14);
      --warning: #f2c94c;
      --danger: #ff6b6b;
      --card-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Inter", "Fira Sans", "Noto Sans", "DejaVu Sans", sans-serif;
      color: var(--ink);
      background: radial-gradient(circle at 20% 20%, rgba(110, 231, 255, 0.12), transparent 26%),
        radial-gradient(circle at 80% 0%, rgba(70, 194, 255, 0.12), transparent 24%),
        radial-gradient(circle at 50% 80%, rgba(255, 107, 107, 0.08), transparent 30%),
        linear-gradient(145deg, #0b1020 0%, #0f182b 38%, #0a0f1b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(8px, 2vw, 20px);
    }

    .app {
      position: relative;
      width: min(1080px, 100vw);
      height: min(660px, 100vh);
      border-radius: 28px;
      padding: 20px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
      border: 1px solid var(--panel-border);
      box-shadow: var(--card-shadow);
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 16px;
      backdrop-filter: blur(10px);
    }

    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }

    .brand {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .logo-mark {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: radial-gradient(circle at 30% 30%, #c6f6ff, #46c2ff);
      box-shadow: 0 12px 30px var(--glow);
      display: grid;
      place-items: center;
      font-weight: 800;
      color: #0b1020;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .logo {
      font-size: 20px;
      letter-spacing: 0.14em;
      font-weight: 700;
      text-transform: uppercase;
    }

    .subtitle {
      font-size: 13px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 999px;
      background: var(--panel);
      border: 1px solid var(--panel-border);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink);
    }

    .chip .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }

    .chip.listening .dot {
      background: var(--warning);
      box-shadow: 0 0 0 4px rgba(242, 201, 76, 0.2);
    }

    .chip.processing .dot {
      background: var(--accent-strong);
      box-shadow: 0 0 0 4px rgba(70, 194, 255, 0.24);
    }

    .chip.error .dot {
      background: var(--danger);
      box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.24);
    }

    .main {
      display: grid;
      grid-template-columns: minmax(260px, 0.9fr) 1.4fr;
      gap: 16px;
      height: 100%;
    }

    .panel {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: var(--card-shadow);
      min-height: 0;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .panel-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin: 0;
    }

    .ptt-button {
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 18px;
      border: 1px solid var(--panel-border);
      background: radial-gradient(circle at 30% 30%, var(--accent-strong), #145273);
      color: #0b1020;
      font-size: 20px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      touch-action: manipulation;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      box-shadow: 0 14px 40px rgba(70, 194, 255, 0.35);
    }

    .ptt-button.listening {
      animation: pulse 1.1s ease-in-out infinite;
      border-color: rgba(242, 201, 76, 0.6);
    }

    .ptt-button:active {
      transform: translateY(4px) scale(0.99);
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(70, 194, 255, 0.35); }
      70% { box-shadow: 0 0 0 18px rgba(70, 194, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(70, 194, 255, 0); }
    }

    .status-text {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--ink);
    }

    .ptt-hint {
      font-size: 13px;
      color: var(--muted);
    }

    .error {
      display: none;
      margin-top: -6px;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(255, 107, 107, 0.14);
      color: var(--danger);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .error.visible {
      display: block;
    }

    .cards {
      display: grid;
      grid-template-rows: 1fr 1fr;
      gap: 12px;
      height: 100%;
      min-height: 0;
    }

    .card {
      background: var(--panel-strong);
      border-radius: 16px;
      border: 1px solid var(--panel-border);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
      min-height: 0;
    }

    .card h2 {
      margin: 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .card-content {
      font-size: 16px;
      line-height: 1.5;
      color: var(--ink);
      overflow: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
    }

    .card-content::-webkit-scrollbar {
      width: 8px;
    }

    .card-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.25);
      border-radius: 999px;
    }

    @media (max-width: 720px) {
      .app {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
        padding: 12px;
      }

      .logo {
        font-size: 17px;
      }

      .subtitle {
        font-size: 11px;
      }

      .main {
        grid-template-columns: 1fr;
      }

      .ptt-button {
        aspect-ratio: auto;
        min-height: 120px;
      }

      .cards {
        grid-template-rows: repeat(2, minmax(180px, 1fr));
      }
    }

    @media (max-height: 540px) {
      .app {
        height: 100%;
      }

      .main {
        grid-template-columns: 1fr;
      }

      .ptt-button {
        min-height: 110px;
      }
    }
  </style>
</head>
<body data-ptt-mode="${mode}">
  <div class="app">
    <header class="top">
      <div class="brand">
        <div class="logo-mark">AE</div>
        <div class="logo-text">
          <div class="logo">${title}</div>
          <div class="subtitle">Touch Console</div>
        </div>
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
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">Push to talk</h2>
          <div class="chip chip--ghost" id="modeChip">${mode === "toggle" ? "Toggle" : "Hold"}</div>
        </div>
        <button class="ptt-button" id="pttButton" type="button">Hold to Talk</button>
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
      let ignoreClickUntil = 0;

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
        ignoreClickUntil = Date.now() + 500;
        sendStop();
      }

      function onPointerDown(event) {
        if (!startHold(event)) {
          return;
        }
        if (pttButton && typeof pttButton.setPointerCapture === "function") {
          try {
            pttButton.setPointerCapture(event.pointerId);
          } catch {
            // Ignore capture errors on older browsers.
          }
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
        if (mode === "toggle") {
          if (!state.active) {
            sendStart();
            return;
          }
          if (state.listening) {
            sendStop();
          }
          return;
        }
        if (Date.now() < ignoreClickUntil) {
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
        pttButton.addEventListener("pointerdown", onPointerDown, { passive: false });
        pttButton.addEventListener("pointerup", onPointerUp);
        pttButton.addEventListener("pointercancel", onPointerUp);
        pttButton.addEventListener("touchstart", onTouchStart, { passive: false });
        pttButton.addEventListener("touchend", onTouchEnd);
        pttButton.addEventListener("touchcancel", onTouchEnd);
        pttButton.addEventListener("touchmove", (event) => {
          if (mode === "hold") {
            event.preventDefault();
          }
        }, { passive: false });
        pttButton.addEventListener("mousedown", onMouseDown);
        pttButton.addEventListener("mouseup", onMouseUp);
        pttButton.addEventListener("mouseleave", onMouseUp);
        pttButton.addEventListener("contextmenu", (event) => event.preventDefault());
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
