(() => {
  function detectLang(text) {
    return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "className") node.className = v;
      else if (k.startsWith("on") && typeof v === "function")
        node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    });
    children.forEach((c) =>
      node.append(typeof c === "string" ? document.createTextNode(c) : c)
    );
    return node;
  }

  function createWidget() {
    const root = el("aside", {
      className: "voice-demo voice-demo--audio-only",
      "aria-label": "مساعد صوتي",
    });

    const status = el(
      "p",
      {
        className: "voice-demo-status",
        id: "voice-demo-status",
        "aria-live": "polite",
      },
      ["اضغط تحدث للجلسة الصوتية"]
    );

    const btn = el(
      "button",
      {
        type: "button",
        className: "voice-demo-btn",
        id: "voice-demo-btn",
        "aria-pressed": "false",
      },
      [el("span", { className: "voice-demo-btn-label" }, ["تحدث / Talk"])]
    );

    root.append(
      el("div", { className: "voice-demo-card" }, [
        el("p", { className: "voice-demo-label" }, ["جلسة صوتية"]),
        el("h2", { className: "voice-demo-title" }, ["مساعد Booster"]),
        status,
        btn,
        el("p", { className: "voice-demo-note" }, [
          "صوت فقط · اضغط مرة للبدء ومرة للإنهاء",
        ]),
      ])
    );

    document.body.appendChild(root);
    return { btn, status };
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let sessionActive = false;
  let busy = false;
  let audioCtx = null;
  let activeSource = null;
  const history = [];

  function setStatus(ui, text) {
    ui.status.textContent = text;
  }

  function setListeningUi(ui, on) {
    ui.btn.setAttribute("aria-pressed", on ? "true" : "false");
    ui.btn.classList.toggle("is-listening", on);
  }

  function ensureAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") {
      return audioCtx.resume().then(() => audioCtx);
    }
    return Promise.resolve(audioCtx);
  }

  function stopAudio() {
    if (activeSource) {
      try {
        activeSource.stop();
      } catch (_) {}
      activeSource = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  async function askBrain(message) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.detail || "chat failed");
    return (data.reply || "").toString().trim();
  }

  function stopRecognitionOnly() {
    if (!recognition) return;
    try {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.stop();
    } catch (_) {}
    recognition = null;
  }

  function endSession(ui, statusText) {
    sessionActive = false;
    busy = false;
    stopRecognitionOnly();
    stopAudio();
    setListeningUi(ui, false);
    setStatus(
      ui,
      statusText ||
        (document.documentElement.lang === "en"
          ? "Session ended"
          : "انتهت الجلسة")
    );
  }

  function armListen(ui) {
    if (!sessionActive || busy) return;
    if (!SpeechRecognition) {
      setStatus(ui, "يلزم Chrome أو Edge مع HTTPS");
      endSession(ui);
      return;
    }

    stopRecognitionOnly();
    recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang === "en" ? "en-US" : "ar-SA";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!sessionActive) return;
      setListeningUi(ui, true);
      setStatus(ui, document.documentElement.lang === "en" ? "Listening…" : "أستمع…");
    };

    recognition.onerror = (e) => {
      const err = e.error || "unknown";
      if (!sessionActive) return;
      if (err === "aborted" || err === "no-speech") {
        window.setTimeout(() => armListen(ui), 160);
        return;
      }
      if (err === "not-allowed") endSession(ui, "المايك محظور");
      else window.setTimeout(() => armListen(ui), 350);
    };

    recognition.onend = () => {
      if (sessionActive && !busy) {
        window.setTimeout(() => armListen(ui), 140);
      }
    };

    recognition.onresult = async (event) => {
      if (!sessionActive || busy) return;
      const said = event.results[0][0].transcript.trim();
      if (!said) return;
      busy = true;
      stopRecognitionOnly();
      setListeningUi(ui, false);
      setStatus(ui, document.documentElement.lang === "en" ? "…" : "…");

      const langHint = detectLang(said);
      try {
        const text = await askBrain(said);
        history.push({ role: "user", content: said });
        history.push({ role: "assistant", content: text });
        while (history.length > 4) history.shift();
        await speak(ui, text, detectLang(text) || langHint);
      } catch (_) {
        setStatus(ui, "تعذر الرد · حاول مرة ثانية");
      } finally {
        busy = false;
        if (sessionActive) armListen(ui);
      }
    };

    try {
      recognition.start();
    } catch (_) {
      window.setTimeout(() => armListen(ui), 280);
    }
  }

  async function speak(ui, text, lang) {
    setStatus(ui, lang === "ar" ? "يتكلم…" : "Speaking…");
    const speakText = text.slice(0, 200);
    stopAudio();

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: speakText,
          voice_id: "salma",
          model_id: "silma-tts-v2-ksa",
        }),
      });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        const ctx = await ensureAudioCtx();
        const decoded = await ctx.decodeAudioData(ab.slice(0));
        await new Promise((resolve) => {
          const src = ctx.createBufferSource();
          activeSource = src;
          src.buffer = decoded;
          src.connect(ctx.destination);
          src.onended = () => {
            if (activeSource === src) activeSource = null;
            resolve();
          };
          src.start(0);
        });
        setStatus(ui, lang === "ar" ? "أستمع…" : "Listening…");
        return;
      }
    } catch (_) {
      /* fall through */
    }

    if ("speechSynthesis" in window) {
      await new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(speakText);
        u.lang = lang === "ar" ? "ar-SA" : "en-US";
        u.onend = resolve;
        u.onerror = resolve;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      });
      setStatus(ui, lang === "ar" ? "أستمع…" : "Listening…");
      return;
    }
    setStatus(ui, "الصوت غير متاح");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const ui = createWidget();
    ui.btn.addEventListener("click", () => {
      if (sessionActive) {
        endSession(
          ui,
          document.documentElement.lang === "en"
            ? "Session ended"
            : "انتهت الجلسة"
        );
        return;
      }
      sessionActive = true;
      history.length = 0;
      ensureAudioCtx();
      setStatus(ui, document.documentElement.lang === "en" ? "Listening…" : "أستمع…");
      armListen(ui);
    });
  });
})();
