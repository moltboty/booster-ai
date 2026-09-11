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
      "جلسة حية · اضغط تحدث وخلّ المايك شغّال",
    ]);
    const transcript = el(
      "p",
      { className: "voice-demo-transcript", id: "voice-demo-transcript" },
      ["اضغط تحدث للمكالمة، واضغط مرة ثانية لإنهاء الجلسة."]
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
      "جلسة مستمرة أثناء فتح المايك. للتفاصيل أو الزيارة: الفورم أو info@boosterai.sa",
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
  let sessionActive = false;
  let busy = false;
  let audioEl = null;
  const history = [];

  function setStatus(ui, text) {
    ui.status.textContent = text;
  }

  function setListeningUi(ui, on) {
    ui.btn.setAttribute("aria-pressed", on ? "true" : "false");
    ui.btn.classList.toggle("is-listening", on);
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
    if (audioEl) {
      try {
        audioEl.pause();
      } catch (_) {}
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setListeningUi(ui, false);
    setStatus(ui, statusText || (document.documentElement.lang === "en" ? "Session ended" : "انتهت الجلسة"));
  }

  function armListen(ui) {
    if (!sessionActive || busy) return;
    if (!SpeechRecognition) {
      setStatus(ui, "Speech recognition needs Chrome/Edge on HTTPS");
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
      setStatus(ui, document.documentElement.lang === "en" ? "Listening…" : "أستمع… الجلسة شغّالة");
    };

    recognition.onerror = (e) => {
      const err = e.error || "unknown";
      if (!sessionActive) return;
      if (err === "aborted" || err === "no-speech") {
        window.setTimeout(() => armListen(ui), 200);
        return;
      }
      setStatus(ui, "Mic error: " + err);
      if (err === "not-allowed") endSession(ui, "Mic blocked");
      else window.setTimeout(() => armListen(ui), 400);
    };

    recognition.onend = () => {
      if (sessionActive && !busy) {
        window.setTimeout(() => armListen(ui), 180);
      }
    };

    recognition.onresult = async (event) => {
      if (!sessionActive || busy) return;
      const said = event.results[0][0].transcript.trim();
      if (!said) return;
      busy = true;
      stopRecognitionOnly();

      const langHint = detectLang(said);
      ui.transcript.textContent =
        (document.documentElement.lang === "en" ? "You said: " : "قلت: ") + said;
      setStatus(ui, document.documentElement.lang === "en" ? "Thinking…" : "يفكر…");
      setListeningUi(ui, false);

      try {
        const text = await askBrain(said);
        history.push({ role: "user", content: said });
        history.push({ role: "assistant", content: text });
        while (history.length > 4) history.shift();
        ui.reply.textContent = text;
        await speak(ui, text, detectLang(text) || langHint);
      } catch (err) {
        const fail =
          langHint === "ar"
            ? "تعذر الرد. عبّ الفورم أو راسل info@boosterai.sa"
            : "Could not reply. Use the form or email info@boosterai.sa";
        ui.reply.textContent = fail;
        setStatus(ui, String(err && err.message ? err.message : err).slice(0, 120));
      } finally {
        busy = false;
        if (sessionActive) armListen(ui);
      }
    };

    try {
      recognition.start();
    } catch (_) {
      window.setTimeout(() => armListen(ui), 300);
    }
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
        await new Promise((resolve) => {
          audioEl.onended = resolve;
          audioEl.onerror = resolve;
          audioEl.play().catch(resolve);
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
    setStatus(ui, "Text only");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const ui = createWidget();
    ui.btn.addEventListener("click", () => {
      if (sessionActive) {
        endSession(ui, document.documentElement.lang === "en" ? "Session ended" : "انتهت الجلسة · اضغط تحدث للبداية");
        return;
      }
      sessionActive = true;
      history.length = 0;
      ui.reply.textContent = "";
      setStatus(ui, document.documentElement.lang === "en" ? "Session on" : "الجلسة شغّالة");
      armListen(ui);
    });
  });
})();
