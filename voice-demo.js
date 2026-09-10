(() => {
  const FAQ = [
    {
      keys: ["من أنتم", "من انتم", "وش تسوون", "ماذا تفعلون", "who are you", "what do you do", "booster"],
      ar: "نحن Booster AI. نساعد الفرق السعودية تحوّل الأعمال المتكررة والمعرفة المتفرقة إلى سير عمل ذكاء اصطناعي آمن وبإشراف بشري. منهجيتنا: نشخص، نبني، نعزز.",
      en: "We are Booster AI. We help Saudi teams turn repetitive work and scattered knowledge into secure, supervised AI workflows. Our method: Diagnose, Build, Boost.",
    },
    {
      keys: ["نشخص", "diagnose", "تشخيص"],
      ar: "مرحلة نشخص: نفهم سير العمل الحقيقي، نحدد الأساس، ونختار فرصة واحدة واضحة قابلة للقياس قبل أي بناء كبير.",
      en: "Diagnose: we map the real workflow, set a baseline, and pick one clear measurable opportunity before big builds.",
    },
    {
      keys: ["نبني", "build", "بناء"],
      ar: "مرحلة نبني: نصمم سير عمل محدود مع تكامل آمن وموافقات بشرية للخطوات المهمة، ثم نختبره على حالات حقيقية.",
      en: "Build: we ship one controlled workflow with safe integrations and human approvals for consequential steps.",
    },
    {
      keys: ["نعزز", "boost", "تشغيل"],
      ar: "مرحلة نعزز: نراقب النتائج والاستثناءات والتكلفة، ونحسّن باستمرار، ونرفع تقارير أسبوعية بما تحقق.",
      en: "Boost: we monitor outcomes, exceptions, and cost, improve continuously, and report weekly results.",
    },
    {
      keys: ["صوت", "voice", "اتصال", "phone", "مكالم"],
      ar: "هذا عرض حي لمساعد صوتي بلهجة سعودية على الموقع. لاحقاً يمكن ربطه بهاتف الشركة وبياناتها مع تحويل لممثل بشري.",
      en: "This is a live Saudi-accent voice demo on the website. Later it can connect to your phone line and systems, with human handoff.",
    },
    {
      keys: ["تواصل", "contact", "ايميل", "email", "رقم"],
      ar: "تواصل معنا على info@boosterai.sa أو من صفحة ابدأ محادثة في الموقع.",
      en: "Contact us at info@boosterai.sa or use Start a conversation on the site.",
    },
    {
      keys: ["سعر", "price", "تكلفة", "كم"],
      ar: "نبدأ بتشخيص محدود وطيّار قابل للقياس. السعر يعتمد على سير العمل والمخاطر والتكاملات — بدون وعود عامة.",
      en: "We start with a bounded diagnose and measurable pilot. Pricing depends on workflow, risk, and integrations — no blanket promises.",
    },
  ];

  const fallback = {
    ar: "ما قدرت أحدد طلبك بدقة. اسأل عن منهجية نشخص نبني نعزز، أو المساعد الصوتي، أو راسلنا على info@boosterai.sa.",
    en: "I could not match that yet. Ask about Diagnose–Build–Boost, the voice demo, or email info@boosterai.sa.",
  };

  function detectLang(text) {
    return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
  }

  function answer(text) {
    const q = text.toLowerCase();
    const lang = detectLang(text);
    for (const item of FAQ) {
      if (item.keys.some((k) => q.includes(k.toLowerCase()))) {
        return { text: item[lang], lang };
      }
    }
    return { text: fallback[lang], lang };
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "className") node.className = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    });
    children.forEach((c) => node.append(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  function createWidget() {
    const root = el("aside", {
      className: "voice-demo",
      "aria-label": "عرض المساعد الصوتي",
    });

    const status = el("p", { className: "voice-demo-status", id: "voice-demo-status" }, [
      "عرض حي · مساعد صوتي بلهجة سعودية",
    ]);
    const transcript = el("p", { className: "voice-demo-transcript", id: "voice-demo-transcript" }, [
      "اضغط تحدث واسأل عن Booster AI.",
    ]);
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
      "هذا عرض توضيحي بالذكاء الاصطناعي. لا نسجّل المكالمات افتراضياً. الأذن = متصفح، الدماغ = إجابات معتمدة، الفم = SILMA عند تفعيل المفتاح.",
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

  function setStatus(ui, text) {
    ui.status.textContent = text;
  }

  async function speak(ui, text, lang) {
    setStatus(ui, lang === "ar" ? "يتكلم…" : "Speaking…");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
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
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "ar" ? "ar-SA" : "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setStatus(
        ui,
        lang === "ar"
          ? "رد نصي + صوت المتصفح (فعّل SILMA_API_KEY للصوت السعودي)"
          : "Browser voice fallback (set SILMA_API_KEY for Saudi TTS)"
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
      ui.transcript.textContent =
        (document.documentElement.lang === "en" ? "You said: " : "قلت: ") + said;
      setStatus(ui, document.documentElement.lang === "en" ? "Thinking…" : "يفكر…");
      const { text, lang } = answer(said);
      ui.reply.textContent = text;
      await speak(ui, text, lang);
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
