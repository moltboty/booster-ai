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
      className: "voice-demo",
      "aria-label": "عرض المساعد الصوتي",
    });

    const status = el("p", { className: "voice-demo-status", id: "voice-demo-status" }, [
      "عرض حي · محادثة بلهجة سعودية",
    ]);
    const transcript = el(
      "p",
      { className: "voice-demo-transcript", id: "voice-demo-transcript" },
      ["اضغط تحدث وسلّم أو اسأل عن بوستر AI."]
    );
    const reply = el("p", { className: "voice-demo-reply", id: "voice-demo-reply" }, [""]);

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

    const note = el("p", { className: "voice-demo-note" }, [
      "مساعد حي عن بوستر AI. لا نسجّل المكالمات افتراضياً. الأذن = المتصفح، الدماغ = Workers AI، الفم = SILMA.",
    ]);

    root.append(
      el("div", { className: "voice-demo-card" }, [
        el("p", { className: "voice-demo-label" }, ["جرب الحل"]),
        el("h2", { className: "voice-demo-title" }, ["تحدث مع مساعد Booster"]),
        status,
        transcript,
        reply,
        btn,
        note,
        el("a", { className: "voice-demo-mail", href: "mailto:info@boosterai.sa" }, [
          "أو راسلنا: info@boosterai.sa",
        ]),
      ])
    );

    document.body.appendChild(root);
    return { btn, status, transcript, reply };
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  let audioEl = null;
  const history = [];

  function setStatus(ui, text) {
    ui.status.textContent = text;
  }

  async function askBrain(message) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.detail || "chat failed");
    }
    return (data.reply || "").toString().trim();
  }

  async function speak(ui, text, lang) {
    setStatus(ui, lang === "ar" ? "يتكلم…" : "Speaking…");
    const speakText = text.slice(0, 250);
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
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (audioEl) {
          audioEl.pause();
          URL.revokeObjectURL(audioEl.src);
        }
        audioEl = new Audio(url);
        await audioEl.play();
        setStatus(ui, lang === "ar" ? "جاهز" : "Ready");
        return;
      }
    } catch (_) {
      /* fall through */
    }

    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(speakText);
      u.lang = lang === "ar" ? "ar-SA" : "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setStatus(
        ui,
        lang === "ar"
          ? "رد نصي + صوت المتصفح"
          : "Browser voice fallback"
      );
      return;
    }
    setStatus(ui, "Text reply only — voice unavailable");
  }

  function stopListening(ui) {
    listening = false;
    ui.btn.setAttribute("aria-pressed", "false");
    ui.btn.classList.remove("is-listening");
    if (recognition) {
      try {
        recognition.stop();
      } catch (_) {}
    }
  }

  function startListening(ui) {
    if (!SpeechRecognition) {
      setStatus(ui, "Speech recognition needs Chrome/Edge on HTTPS");
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang === "en" ? "en-US" : "ar-SA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      listening = true;
      ui.btn.setAttribute("aria-pressed", "true");
      ui.btn.classList.add("is-listening");
      setStatus(ui, document.documentElement.lang === "en" ? "Listening…" : "أستمع…");
    };

    recognition.onerror = (e) => {
      stopListening(ui);
      setStatus(ui, "Mic error: " + (e.error || "unknown"));
    };

    recognition.onend = () => {
      stopListening(ui);
    };

    recognition.onresult = async (event) => {
      const said = event.results[0][0].transcript.trim();
      const langHint = detectLang(said);
      ui.transcript.textContent =
        (document.documentElement.lang === "en" ? "You said: " : "قلت: ") + said;
      setStatus(ui, document.documentElement.lang === "en" ? "Thinking…" : "يفكر…");
      try {
        const text = await askBrain(said);
        history.push({ role: "user", content: said });
        history.push({ role: "assistant", content: text });
        while (history.length > 8) history.shift();
        ui.reply.textContent = text;
        await speak(ui, text, detectLang(text) || langHint);
      } catch (err) {
        const fail =
          langHint === "ar"
            ? "تعذر الرد الحين. جرّب مرة ثانية أو راسل info@boosterai.sa"
            : "Could not reply. Try again or email info@boosterai.sa";
        ui.reply.textContent = fail;
        setStatus(ui, String(err && err.message ? err.message : err).slice(0, 120));
      }
    };

    recognition.start();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const ui = createWidget();
    ui.btn.addEventListener("click", () => {
      if (listening) {
        stopListening(ui);
        setStatus(ui, document.documentElement.lang === "en" ? "Ready" : "جاهز");
        return;
      }
      startListening(ui);
    });
  });
})();
