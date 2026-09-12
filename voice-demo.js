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
      ["اضغط للاتصال بالمساعد"]
    );

    const btnLabel = el("span", { className: "voice-demo-btn-label" }, [
      "ابدأ المكالمة",
    ]);
    const btn = el(
      "button",
      {
        type: "button",
        className: "voice-demo-btn",
        id: "voice-demo-btn",
        "aria-pressed": "false",
      },
      [btnLabel]
    );

    root.append(
      el("div", { className: "voice-demo-card" }, [
        el("p", { className: "voice-demo-label" }, ["مكالمة صوتية"]),
        el("h2", { className: "voice-demo-title" }, ["مساعد Booster"]),
        status,
        btn,
        el("p", { className: "voice-demo-note" }, [
          "أخضر = اتصال · أحمر = إنهاء · لهجة سعودية",
        ]),
      ])
    );

    document.body.appendChild(root);
    return { btn, btnLabel, status };
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let sessionActive = false;
  let busy = false;
  let audioCtx = null;
  let activeSource = null;
  let showcase = null;
  let clipTexts = null;
  const decodedCache = new Map();
  const history = [];
  const AUDIO_V = "fasee7lady2";

  function setStatus(ui, text) {
    ui.status.textContent = text;
  }

  function setCallUi(ui, on) {
    ui.btn.setAttribute("aria-pressed", on ? "true" : "false");
    ui.btn.classList.toggle("is-in-call", on);
    ui.btn.classList.toggle("is-listening", on);
    ui.btnLabel.textContent = on ? "إنهاء المكالمة" : "ابدأ المكالمة";
  }

  function ensureAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") return audioCtx.resume().then(() => audioCtx);
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

  async function loadShowcase() {
    if (showcase) return showcase;
    try {
      const res = await fetch("/assets/talk/showcase.json", { cache: "no-cache" });
      if (!res.ok) return null;
      showcase = await res.json();
      return showcase;
    } catch (_) {
      return null;
    }
  }

  async function loadClipTexts() {
    if (clipTexts) return clipTexts;
    try {
      const res = await fetch("/assets/talk/clips-text.json", { cache: "no-cache" });
      if (!res.ok) return null;
      clipTexts = await res.json();
      return clipTexts;
    } catch (_) {
      return null;
    }
  }

  function normalizeSaid(said) {
    return String(said || "")
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ًٌٍَُِّْ]/g, "")
      .replace(/[?!؟.,،:;]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function matchShowcase(said) {
    if (!showcase || !showcase.clips) return null;
    const t = normalizeSaid(said);
    for (const clip of showcase.clips) {
      const triggers = clip.triggers || [];
      if (!triggers.length) continue;
      if (triggers.some((k) => t.includes(normalizeSaid(k)))) return clip;
    }
    return null;
  }

  function matchClipByReply(reply) {
    if (!clipTexts || !showcase || !showcase.clips) return null;
    const t = normalizeSaid(reply);
    if (!t) return null;
    let best = null;
    let bestLen = 0;
    for (const [id, text] of Object.entries(clipTexts)) {
      const n = normalizeSaid(text);
      if (!n) continue;
      if (t === n || t.includes(n) || n.includes(t)) {
        if (n.length > bestLen) {
          bestLen = n.length;
          best = showcase.clips.find((c) => c.id === id) || { id, audio: "assets/talk/" + id + ".wav" };
        }
      }
    }
    return best;
  }

  async function playBuffer(buffer) {
    const ctx = await ensureAudioCtx();
    stopAudio();
    await new Promise((resolve) => {
      const src = ctx.createBufferSource();
      activeSource = src;
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.onended = () => {
        if (activeSource === src) activeSource = null;
        resolve();
      };
      src.start(0);
    });
  }

  async function playShowcaseClip(clip) {
    let buf = decodedCache.get(clip.id);
    if (!buf) {
      const res = await fetch(
        "/" + clip.audio.replace(/^\//, "") + "?v=" + AUDIO_V,
        { cache: "no-cache" }
      );
      if (!res.ok) throw new Error("showcase audio missing");
      const ctx = await ensureAudioCtx();
      buf = await ctx.decodeAudioData((await res.arrayBuffer()).slice(0));
      decodedCache.set(clip.id, buf);
    }
    await playBuffer(buf);
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
    setCallUi(ui, false);
    setStatus(ui, statusText || "انتهت المكالمة");
  }

  async function speakBrowser(text, lang) {
    if (!("speechSynthesis" in window)) return;
    const speakText = String(text || "").slice(0, 280);
    await new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(speakText);
      u.lang = lang === "ar" ? "ar-SA" : "en-US";
      u.onend = resolve;
      u.onerror = resolve;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
  }

  async function speakReply(ui, text, langHint) {
    const lang = detectLang(text) || langHint || "ar";
    setStatus(ui, "يتكلم…");
    const byReply = matchClipByReply(text);
    if (byReply) {
      try {
        await playShowcaseClip(byReply);
        return;
      } catch (_) {}
    }
    // No SILMA — temporary browser voice for freestyle LLM lines
    await speakBrowser(text, lang);
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
      setCallUi(ui, true);
      setStatus(ui, "أستمع…");
    };

    recognition.onerror = (e) => {
      const err = e.error || "unknown";
      if (!sessionActive) return;
      if (err === "aborted" || err === "no-speech") {
        window.setTimeout(() => armListen(ui), 140);
        return;
      }
      if (err === "not-allowed") endSession(ui, "المايك محظور");
      else window.setTimeout(() => armListen(ui), 300);
    };

    recognition.onend = () => {
      if (sessionActive && !busy) window.setTimeout(() => armListen(ui), 120);
    };

    recognition.onresult = async (event) => {
      if (!sessionActive || busy) return;
      const said = event.results[0][0].transcript.trim();
      if (!said) return;
      busy = true;
      stopRecognitionOnly();
      setCallUi(ui, true);

      const langHint = detectLang(said);
      try {
        // Fast path: known FAQ triggers → lady clip
        const clip = matchShowcase(said);
        if (clip) {
          setStatus(ui, "يتكلم…");
          await playShowcaseClip(clip);
          history.push({ role: "user", content: said });
          history.push({ role: "assistant", content: "[clip:" + clip.id + "]" });
        } else {
          setStatus(ui, "…");
          const text = await askBrain(said);
          history.push({ role: "user", content: said });
          history.push({ role: "assistant", content: text });
          await speakReply(ui, text, langHint);
        }
        while (history.length > 8) history.shift();
        setStatus(ui, "أستمع…");
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
      window.setTimeout(() => armListen(ui), 260);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const ui = createWidget();
    setCallUi(ui, false);
    loadShowcase().catch(() => {});
    loadClipTexts().catch(() => {});
    ui.btn.addEventListener("click", () => {
      if (sessionActive) {
        endSession(ui, "انتهت المكالمة");
        return;
      }
      sessionActive = true;
      history.length = 0;
      ensureAudioCtx();
      setCallUi(ui, true);
      setStatus(ui, "جاري الاتصال…");
      armListen(ui);
    });
  });
})();
