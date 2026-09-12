/**
 * STAGING Talk widget — unified LLM + Fasee7 Lady TTS
 * mic/typed → /api/chat → speakReply → /api/tts (Fasee7 Lady WAV)
 * No speechSynthesis. No SILMA. No greeting-clip FAQ router.
 */
(() => {
  const STATES = Object.freeze({
    IDLE: "IDLE",
    LISTENING: "LISTENING",
    TRANSCRIBING: "TRANSCRIBING",
    THINKING: "THINKING",
    SPEAKING: "SPEAKING",
    ERROR: "ERROR",
  });

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const DEBUG = new URLSearchParams(window.location.search).get("debug") === "1";
  const THINKING_MS = 20000;
  const HISTORY_MAX = 12;

  const STATUS_AR = {
    IDLE: "اضغط للاتصال أو اكتب رسالة",
    LISTENING: "أستمع… أو اكتب",
    TRANSCRIBING: "جارٍ تحويل الكلام…",
    THINKING: "أفكر…",
    SPEAKING: "تتحدث…",
    ERROR: "تعذر الرد · حاول مرة ثانية",
  };

  const session = {
    state: STATES.IDLE,
    active: false,
    busy: false,
    leadStage: "explore",
    history: [],
    recognition: null,
    thinkingTimer: 0,
    turnId: 0,
    controller: null,
    listenTimer: 0,
    recoveryMessage: "",
  };

  const debug = {
    transcript: "",
    llmJson: null,
    latencyMs: null,
    errors: [],
    lastTurnAt: null,
  };

  let ui = null;

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "className") node.className = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k.startsWith("on") && typeof v === "function")
        node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === false || v === null || v === undefined) return;
      else if (v === true) node.setAttribute(k, "");
      else node.setAttribute(k, v);
    });
    children.forEach((c) =>
      node.append(typeof c === "string" ? document.createTextNode(c) : c)
    );
    return node;
  }


  function injectStagingCss() {
    if (document.getElementById("voice-demo-staging-css")) return;
    const style = document.createElement("style");
    style.id = "voice-demo-staging-css";
    style.textContent = '/* STAGING Phase B — Talk widget + debug panel. Not for production. */\n\n.voice-demo {\n  position: fixed;\n  inset-inline-end: 1.1rem;\n  inset-block-end: 1.1rem;\n  z-index: 40;\n  width: min(24rem, calc(100vw - 1.5rem));\n  font-family: inherit;\n}\n\n.voice-demo-card {\n  background: rgba(7, 23, 71, 0.94);\n  color: #f4f7ff;\n  border: 1px solid rgba(16, 201, 154, 0.35);\n  border-radius: 1.25rem;\n  padding: 1rem 1.1rem 1.15rem;\n  box-shadow: 0 18px 50px rgba(3, 10, 35, 0.45);\n  backdrop-filter: blur(10px);\n}\n\n.voice-demo-label {\n  margin: 0 0 0.25rem;\n  font-size: 0.75rem;\n  letter-spacing: 0.04em;\n  color: #10c99a;\n  text-transform: uppercase;\n}\n\n.voice-demo-title {\n  margin: 0 0 0.55rem;\n  font-size: 1.15rem;\n  line-height: 1.35;\n  font-weight: 700;\n}\n\n.voice-demo-status,\n.voice-demo-transcript,\n.voice-demo-reply,\n.voice-demo-note {\n  margin: 0 0 0.45rem;\n  font-size: 0.86rem;\n  line-height: 1.45;\n  color: rgba(244, 247, 255, 0.88);\n}\n\n.voice-demo-transcript {\n  min-height: 1.3rem;\n  color: #9ef0d3;\n}\n\n.voice-demo-reply {\n  min-height: 2.6rem;\n  color: #fff;\n}\n\n.voice-demo-note {\n  font-size: 0.72rem;\n  color: rgba(244, 247, 255, 0.62);\n}\n\n.voice-demo-btn {\n  width: 100%;\n  margin: 0.35rem 0 0.55rem;\n  border: 0;\n  border-radius: 999px;\n  padding: 0.85rem 1rem;\n  background: #10c99a;\n  color: #052033;\n  font-weight: 700;\n  cursor: pointer;\n}\n\n.voice-demo-btn.is-in-call,\n.voice-demo-btn.is-listening {\n  background: #e11d48;\n  color: #fff;\n}\n\n.voice-demo[data-state="THINKING"] .voice-demo-status,\n.voice-demo[data-state="TRANSCRIBING"] .voice-demo-status {\n  color: #fde68a;\n}\n\n.voice-demo[data-state="ERROR"] .voice-demo-status {\n  color: #fda4af;\n}\n\n.voice-demo[data-state="SPEAKING"] .voice-demo-reply {\n  outline: 1px solid rgba(16, 201, 154, 0.45);\n  border-radius: 0.5rem;\n  padding: 0.35rem 0.45rem;\n}\n\n.voice-demo-form {\n  display: flex;\n  gap: 0.4rem;\n  margin: 0.2rem 0 0.5rem;\n}\n\n.voice-demo-input {\n  flex: 1;\n  min-width: 0;\n  border: 1px solid rgba(244, 247, 255, 0.18);\n  border-radius: 0.7rem;\n  background: rgba(255, 255, 255, 0.06);\n  color: #fff;\n  padding: 0.55rem 0.7rem;\n}\n\n.voice-demo-input::placeholder {\n  color: rgba(244, 247, 255, 0.45);\n}\n\n.voice-demo-send {\n  border: 0;\n  border-radius: 0.7rem;\n  padding: 0.55rem 0.8rem;\n  background: #0a2357;\n  color: #c9f7e8;\n  cursor: pointer;\n  font-weight: 700;\n}\n\n.voice-demo-debug {\n  margin-top: 0.65rem;\n  max-height: min(42vh, 22rem);\n  overflow: auto;\n  background: #07101f;\n  color: #d1fae5;\n  border: 1px solid rgba(16, 201, 154, 0.28);\n  border-radius: 0.85rem;\n  padding: 0.65rem 0.75rem;\n  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n  font-size: 0.68rem;\n  line-height: 1.4;\n  direction: ltr;\n  text-align: left;\n}\n\n.voice-demo-debug h3 {\n  margin: 0 0 0.4rem;\n  font-size: 0.72rem;\n  color: #10c99a;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n}\n\n.voice-demo-debug-body {\n  margin: 0;\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n@media (max-width: 640px) {\n  .voice-demo { inset-inline: 0.75rem; width: auto; }\n}\n';
    document.head.appendChild(style);
  }

  function createWidget() {
    const status = el(
      "p",
      { className: "voice-demo-status", id: "voice-demo-status", "aria-live": "polite" },
      [STATUS_AR.IDLE]
    );
    const transcript = el("p", { className: "voice-demo-transcript", id: "voice-demo-transcript" }, [
      "",
    ]);
    const reply = el("p", { className: "voice-demo-reply", id: "voice-demo-reply" }, [""]);
    const btnLabel = el("span", { className: "voice-demo-btn-label" }, ["ابدأ المكالمة"]);
    const btn = el(
      "button",
      { type: "button", className: "voice-demo-btn", id: "voice-demo-btn", "aria-pressed": "false" },
      [btnLabel]
    );
    const input = el("input", {
      type: "text",
      className: "voice-demo-input",
      id: "voice-demo-input",
      placeholder: "اكتب رسالتك هنا…",
      autocomplete: "off",
      "aria-label": "رسالة نصية",
    });
    const send = el(
      "button",
      { type: "submit", className: "voice-demo-send", id: "voice-demo-send" },
      ["إرسال"]
    );
    const form = el("form", { className: "voice-demo-form", id: "voice-demo-form" }, [input, send]);

    const root = el(
      "aside",
      {
        className: "voice-demo voice-demo--staging" + (DEBUG ? " voice-demo--debug" : ""),
        "aria-label": "مساعد بوستر — staging",
        dataset: { state: STATES.IDLE },
      },
      [
        el("div", { className: "voice-demo-card" }, [
          el("p", { className: "voice-demo-label" }, ["Staging · Lady TTS"]),
          el("h2", { className: "voice-demo-title" }, ["مساعد بوستر"]),
          status,
          transcript,
          reply,
          btn,
          form,
          el("p", { className: "voice-demo-note" }, [
            "تحدث أو اكتب، وسأرد عليك بالصوت والنص.",
          ]),
        ]),
      ]
    );

    let debugPanel = null;
    if (DEBUG) {
      debugPanel = el("div", {
        className: "voice-demo-debug",
        id: "voice-demo-debug",
        dir: "ltr",
      });
      debugPanel.innerHTML =
        "<h3>debug=1</h3><pre class=\"voice-demo-debug-body\" id=\"voice-demo-debug-body\"></pre>";
      root.append(debugPanel);
    }

    document.body.appendChild(root);
    return { root, btn, btnLabel, status, transcript, reply, form, input, send, debugPanel };
  }

  function renderDebug() {
    if (!DEBUG || !ui || !ui.debugPanel) return;
    const body = ui.debugPanel.querySelector("#voice-demo-debug-body");
    if (!body) return;
    const payload = {
      state: session.state,
      lead_stage: session.leadStage,
      session_active: session.active,
      transcript: debug.transcript,
      latency_ms: debug.latencyMs,
      errors: debug.errors.slice(-6),
      llm_json: debug.llmJson,
      last_turn_at: debug.lastTurnAt,
    };
    body.textContent = JSON.stringify(payload, null, 2);
  }

  function setStatus(text) {
    if (ui) ui.status.textContent = text;
  }

  function setState(next, statusText) {
    session.state = STATES[next] || next;
    if (ui) {
      ui.root.dataset.state = session.state;
      ui.root.classList.toggle("is-busy", session.busy);
      ui.root.classList.toggle("is-in-session", session.active);
      ui.send.disabled = session.busy;
    }
    setStatus(statusText || STATUS_AR[session.state] || session.state);
    renderDebug();
  }

  function setCallUi(on) {
    ui.btn.setAttribute("aria-pressed", on ? "true" : "false");
    ui.btn.classList.toggle("is-in-call", on);
    ui.btn.classList.toggle("is-listening", on && session.state === STATES.LISTENING);
    ui.btnLabel.textContent = on ? "إنهاء المكالمة" : "ابدأ المكالمة";
  }

  function pushError(msg) {
    debug.errors.push({ t: new Date().toISOString(), message: String(msg).slice(0, 240) });
    renderDebug();
  }

  function clearThinkingTimer() {
    if (session.thinkingTimer) {
      window.clearTimeout(session.thinkingTimer);
      session.thinkingTimer = 0;
    }
  }

  /**
   * Single output hook.
   * Phase B: text-only stub (no audio).
   * Phase C: replace the body with fetch("/api/tts") → Fasee7 Lady WAV.
   * Never call speechSynthesis. Never play greeting clips.
   */
  let activeAudio = null;

  async function speakReply(text, signal) {
    const clean = String(text || "").trim();
    if (ui) ui.reply.textContent = clean;
    if (!clean) return;
    const controller = session.controller;
    const timeout = window.setTimeout(() => controller.abort(), 150000);
    try {
      const res = await fetch("/api/tts", {
        signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) throw new Error("tts " + res.status);
      const blob = await res.blob();
      signal.throwIfAborted();
      if (!blob.size || !blob.type.startsWith("audio/")) throw new Error("Invalid audio response");
      setStatus("تتحدث…");
      const url = URL.createObjectURL(blob);
      await new Promise((resolve, reject) => {
        const audio = new Audio(url);
        activeAudio = audio;
        let done = false;
        const finish = (error) => {
          if (done) return;
          done = true;
          signal.removeEventListener("abort", cancel);
          audio.onended = null;
          audio.onerror = null;
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          URL.revokeObjectURL(url);
          if (activeAudio === audio) activeAudio = null;
          if (error) reject(error);
          else resolve();
        };
        const cancel = () => finish(new Error("Audio cancelled"));
        signal.addEventListener("abort", cancel, { once: true });
        audio.onended = () => finish();
        audio.onerror = () => finish(new Error("Audio playback failed"));
        if (signal.aborted) { cancel(); return; }
        try { Promise.resolve(audio.play()).catch(finish); }
        catch (error) { finish(error); }
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function askBrain(message, signal) {
    const t0 = performance.now();
    const res = await fetch("/api/chat", {
      signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: session.history,
        lead_stage: session.leadStage,
      }),
    });
    const data = await res.json().catch(() => ({}));
    debug.latencyMs = Math.round(performance.now() - t0);
    debug.llmJson = data;
    debug.lastTurnAt = new Date().toISOString();
    renderDebug();
    if (!res.ok) {
      throw new Error(data.error || data.detail || "chat failed (" + res.status + ")");
    }
    if (!data.reply_ar) throw new Error("chat response missing reply_ar");
    return data;
  }

  function stopRecognitionOnly() {
    window.clearTimeout(session.listenTimer);
    session.listenTimer = 0;
    const rec = session.recognition;
    if (!rec) return;
    try {
      rec.onend = null;
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.stop();
    } catch (_) {}
    session.recognition = null;
  }

  function scheduleListen(delay = 300) {
    window.clearTimeout(session.listenTimer);
    if (!session.active || session.busy) return;
    session.listenTimer = window.setTimeout(() => {
      session.listenTimer = 0;
      armListen();
    }, delay);
  }

  function armListen() {
    if (!session.active || session.busy) return;
    if (!SpeechRecognition) {
      setState(STATES.LISTENING, "اكتب رسالتك — المتصفح لا يدعم المايك");
      return;
    }
    stopRecognitionOnly();
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!session.active || session.busy || session.recognition !== recognition) return;
      setCallUi(true);
      setState(STATES.LISTENING, session.recoveryMessage);
    };
    recognition.onerror = (e) => {
      const err = e.error || "unknown";
      if (!session.active || session.recognition !== recognition) return;
      if (err === "aborted" || err === "no-speech") {
        return;
      }
      if (err === "not-allowed") {
        stopRecognitionOnly();
        pushError("mic not-allowed");
        setState(STATES.LISTENING, "المايك محظور — استخدم الكتابة");
        return;
      }
      pushError("stt:" + err);
      setStatus("تعذر سماعك — أحاول تشغيل المايك من جديد…");
    };
    recognition.onend = () => {
      if (session.recognition !== recognition) return;
      session.recognition = null;
      scheduleListen();
    };
    recognition.onresult = (event) => {
      if (session.recognition !== recognition || session.busy || !session.active) return;
      const said = event.results[0][0].transcript.trim();
      if (!said) return;
      runTurn(said, { fromStt: true });
    };

    session.recognition = recognition;
    try {
      recognition.start();
    } catch (error) {
      stopRecognitionOnly();
      pushError("mic start: " + error.message);
      scheduleListen(1000);
    }
  }

  async function runTurn(said, opts) {
    const fromStt = !!(opts && opts.fromStt);
    if (!said || session.busy) return;
    if (!session.active) startSession({ skipListen: true });

    session.busy = true;
    session.recoveryMessage = "";
    const turnId = ++session.turnId;
    const controller = new AbortController();
    session.controller = controller;
    stopRecognitionOnly();
    debug.transcript = said;
    debug.llmJson = null;
    debug.latencyMs = null;
    if (ui) ui.transcript.textContent = "أنت: " + said;
    if (ui) ui.reply.textContent = "";
    renderDebug();

    if (fromStt) setState(STATES.TRANSCRIBING);
    else setState(STATES.THINKING);

    try {
      if (fromStt) setState(STATES.THINKING);
      clearThinkingTimer();
      session.thinkingTimer = window.setTimeout(() => {
        controller.abort();
      }, THINKING_MS);

      const pack = await askBrain(said, controller.signal);
      if (turnId !== session.turnId) return;
      clearThinkingTimer();

      session.history.push({ role: "user", content: said });
      session.history.push({ role: "assistant", content: pack.reply_ar });
      while (session.history.length > HISTORY_MAX) session.history.shift();
      if (pack.lead_stage) session.leadStage = pack.lead_stage;
      setState(STATES.SPEAKING, "أجهز الرد الصوتي…");
      await speakReply(pack.reply_ar, controller.signal);
      if (turnId !== session.turnId) return;

      session.busy = false;
      if (session.active) {
        setState(STATES.LISTENING);
        armListen();
      } else {
        setState(STATES.IDLE);
      }
    } catch (err) {
      if (turnId !== session.turnId) return;
      clearThinkingTimer();
      pushError(err && err.message ? err.message : err);
      session.busy = false;
      session.recoveryMessage = ui.reply.textContent
        ? "تعذر تشغيل الصوت. الرد مكتوب هنا — تقدر تتكلم أو تكتب من جديد."
        : "تعذر الاتصال بالمساعد — تقدر تتكلم أو تكتب من جديد.";
      setState(STATES.ERROR, session.recoveryMessage);
      if (SpeechRecognition) scheduleListen(500);
    }
  }

  function startSession(opts) {
    const skipListen = !!(opts && opts.skipListen);
    session.active = true;
    session.busy = false;
    session.leadStage = "explore";
    session.history.length = 0;
    session.recoveryMessage = "";
    debug.transcript = "";
    debug.llmJson = null;
    debug.latencyMs = null;
    debug.errors = [];
    if (ui) {
      ui.transcript.textContent = "";
      ui.reply.textContent = "";
    }
    setCallUi(true);
    setState(STATES.LISTENING);
    if (!skipListen) armListen();
  }

  function endSession(statusText) {
    session.turnId++;
    if (session.controller) session.controller.abort();
    session.controller = null;
    session.active = false;
    session.busy = false;
    clearThinkingTimer();
    stopRecognitionOnly();
    setCallUi(false);
    setState(STATES.IDLE, statusText || "انتهت المكالمة");
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStagingCss();
    ui = createWidget();
    setCallUi(false);
    setState(STATES.IDLE);
    renderDebug();

    ui.btn.addEventListener("click", () => {
      if (session.active) endSession("انتهت المكالمة");
      else startSession();
    });

    ui.form.addEventListener("submit", (e) => {
      e.preventDefault();
      const said = String(ui.input.value || "").trim();
      if (!said || session.busy) return;
      ui.input.value = "";
      runTurn(said, { fromStt: false });
    });

    document.querySelectorAll("[data-voice-demo-open]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (ui && ui.root) {
          ui.root.classList.add("is-open");
          ui.root.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        if (!session.active) startSession();
      });
    });
  });
})();
