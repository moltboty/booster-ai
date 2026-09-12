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
      { className: "voice-demo-status", id: "voice-demo-status", "aria-live": "polite" },
      ["اضغط للاتصال بالمساعد"]
    );
    const btnLabel = el("span", { className: "voice-demo-btn-label" }, ["ابدأ المكالمة"]);
    const btn = el(
      "button",
      { type: "button", className: "voice-demo-btn", id: "voice-demo-btn", "aria-pressed": "false" },
      [btnLabel]
    );
    root.append(
      el("div", { className: "voice-demo-card" }, [
        el("p", { className: "voice-demo-label" }, ["مكالمة صوتية"]),
        el("h2", { className: "voice-demo-title" }, ["مساعد بوستر"]),
        status,
        btn,
        el("p", { className: "voice-demo-note" }, ["أخضر للاتصال · أحمر للإنهاء"]),
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
  const AUDIO_V = "fasee7lady6";

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
      try { activeSource.stop(); } catch (_) {}
      activeSource = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  async function playTone(kind) {
    const ctx = await ensureAudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    if (kind === "start") {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1175, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.24);
      await new Promise((r) => setTimeout(r, 260));
    } else {
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.3);
      await new Promise((r) => setTimeout(r, 320));
    }
  }

  async function loadShowcase() {
    if (showcase) return showcase;
    try {
      const res = await fetch("/assets/talk/showcase.json", { cache: "no-cache" });
      if (!res.ok) return null;
      showcase = await res.json();
      return showcase;
    } catch (_) { return null; }
  }

  async function loadClipTexts() {
    if (clipTexts) return clipTexts;
    try {
      const res = await fetch("/assets/talk/clips-text.json", { cache: "no-cache" });
      if (!res.ok) return null;
      clipTexts = await res.json();
      return clipTexts;
    } catch (_) { return null; }
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

  function arabicPrefer(text) {
    let t = String(text || "").trim();
    if (!t) return "";
    if (/\[?\s*clip\s*[:\]]/i.test(t)) return "";
    t = t.replace(/\bclip\b/gi, "").replace(/\s+/g, " ").trim();
    return t;
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

  function clipArabicText(id) {
    if (clipTexts && clipTexts[id]) return String(clipTexts[id]);
    return "";
  }

  function matchClipByReply(reply) {
    if (!clipTexts) return null;
    const t = normalizeSaid(reply);
    if (!t || t.length < 12) return null;
    let best = null;
    let bestScore = 0;
    for (const [id, text] of Object.entries(clipTexts)) {
      if (id.startsWith("greeting_")) continue;
      const n = normalizeSaid(text);
      if (!n) continue;
      // require strong overlap — avoid wrong clip
      if (t === n) return { id, audio: "assets/talk/" + id + ".wav" };
      const shorter = t.length < n.length ? t : n;
      const longer = t.length < n.length ? n : t;
      if (longer.includes(shorter) && shorter.length / longer.length > 0.72) {
        const score = shorter.length;
        if (score > bestScore) {
          bestScore = score;
          best = { id, audio: "assets/talk/" + id + ".wav" };
        }
      }
    }
    return best;
  }

  function getClipById(id) {
    if (!id) return null;
    const alias = { fallback_cta: "fallback_discovery", wa_agent_pricing: "wa_agent_pricing" };
    const resolved = alias[id] || id;
    if (showcase && showcase.clips) {
      const hit = showcase.clips.find((c) => c.id === resolved);
      if (hit) return hit;
    }
    return { id: resolved, audio: "assets/talk/" + resolved + ".wav" };
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
      const res = await fetch("/" + clip.audio.replace(/^\//, "") + "?v=" + AUDIO_V, {
        cache: "no-cache",
      });
      if (!res.ok) throw new Error("audio missing");
      const ctx = await ensureAudioCtx();
      buf = await ctx.decodeAudioData((await res.arrayBuffer()).slice(0));
      decodedCache.set(clip.id, buf);
    }
    await playBuffer(buf);
  }

  function pickArabicVoice() {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const ar =
      voices.find((v) => /^ar(-|$)/i.test(v.lang)) ||
      voices.find((v) => /arab/i.test(v.lang + " " + v.name));
    return ar || null;
  }

  async function speakArabicFreestyle(text) {
    const speakText = arabicPrefer(text).slice(0, 320);
    if (!speakText || !("speechSynthesis" in window)) return false;
    // ensure voices loaded
    if (!(window.speechSynthesis.getVoices() || []).length) {
      await new Promise((r) => {
        window.speechSynthesis.onvoiceschanged = () => r();
        setTimeout(r, 400);
      });
    }
    const voice = pickArabicVoice();
    if (!voice) return false; // refuse English voices
    await new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(speakText);
      u.voice = voice;
      u.lang = voice.lang || "ar-SA";
      u.rate = 1.02;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      window.setTimeout(finish, Math.min(16000, 2000 + speakText.length * 90));
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    });
    return true;
  }

  async function askBrain(message) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data.reply) throw new Error(data.error || data.detail || "chat failed");
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

  async function endSession(ui, statusText) {
    sessionActive = false;
    busy = false;
    stopRecognitionOnly();
    stopAudio();
    try { await playTone("end"); } catch (_) {}
    setCallUi(ui, false);
    setStatus(ui, statusText || "انتهت المكالمة");
  }

  async function speakReply(ui, text) {
    setStatus(ui, "يتكلم…");
    const clean = arabicPrefer(text);
    // 1) If LLM reply closely matches a lady script → play lady clip
    const byReply = matchClipByReply(clean);
    if (byReply) {
      try {
        await playShowcaseClip(byReply);
        return clipArabicText(byReply.id) || clean;
      } catch (_) {}
    }
    // 2) Freestyle Arabic via browser ONLY if real Arabic voice exists
    const ok = await speakArabicFreestyle(clean);
    if (ok) return clean;
    // 3) Last resort: discovery lady clip (never English gibberish)
    const fb = getClipById("fallback_discovery") || getClipById("clarify");
    if (fb) {
      await playShowcaseClip(fb);
      return clipArabicText(fb.id) || clean;
    }
    return clean;
  }

  function armListen(ui) {
    if (!sessionActive || busy) return;
    if (!SpeechRecognition) {
      setStatus(ui, "يلزم متصفح يدعم المايك مع اتصال آمن");
      endSession(ui);
      return;
    }
    stopRecognitionOnly();
    recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
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

      try {
        await loadClipTexts();
        await loadShowcase();
        history.push({ role: "user", content: said });

        // Optional fast greetings only — everything else is real LLM
        const greetIds = new Set([
          "greeting_salam", "greeting_ahlan", "greeting_alo", "greeting_sabah", "greeting_masa",
        ]);
        const greet = matchShowcase(said);
        if (greet && greetIds.has(greet.id)) {
          setStatus(ui, "يتكلم…");
          await playShowcaseClip(greet);
          history.push({ role: "assistant", content: clipArabicText(greet.id) || "حياك الله" });
        } else {
          setStatus(ui, "…");
          let text = await askBrain(said);
          text = arabicPrefer(text) || text;
          const spoken = await speakReply(ui, text);
          history.push({ role: "assistant", content: spoken || text || "تمام" });
        }

        while (history.length > 12) history.shift();
        setStatus(ui, "أستمع…");
      } catch (_) {
        setStatus(ui, "تعذر الرد · حاول مرة ثانية");
      } finally {
        busy = false;
        if (sessionActive) armListen(ui);
      }
    };

    try { recognition.start(); }
    catch (_) { window.setTimeout(() => armListen(ui), 260); }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const ui = createWidget();
    setCallUi(ui, false);
    loadShowcase().catch(() => {});
    loadClipTexts().catch(() => {});
    if ("speechSynthesis" in window) {
      // warm voices list
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    ui.btn.addEventListener("click", async () => {
      if (sessionActive) {
        await endSession(ui, "انتهت المكالمة");
        return;
      }
      sessionActive = true;
      history.length = 0;
      await ensureAudioCtx();
      setCallUi(ui, true);
      setStatus(ui, "جاري الاتصال…");
      try { await playTone("start"); } catch (_) {}
      armListen(ui);
    });
  });
})();
