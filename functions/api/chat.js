/**
 * STAGING Phase B — /api/chat
 * Cloudflare Pages Function. Do NOT deploy to production from this folder.
 *
 * Contract (strict JSON only):
 * {
 *   reply_ar, intent, lead_stage, ask_next, cta, confidence, safety_flags
 * }
 *
 * Brain: Workers AI llama. Playbook = knowledge/style boundaries, not FAQ triggers.
 * Owner / founder questions fail-closed (no names).
 */

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";

const INTENTS = new Set([
  "greeting",
  "what_is",
  "services",
  "ai_agents",
  "automation",
  "customer_service",
  "sales",
  "hr",
  "marketing",
  "finance",
  "analytics",
  "discovery",
  "integrations",
  "security",
  "pricing",
  "timeline",
  "trust",
  "training",
  "location",
  "contact",
  "owner",
  "other",
]);

const STAGES = new Set(["explore", "problem_clear", "ready"]);
const CTAS = new Set(["none", "contact_form", "email"]);
const FLAG_OK = new Set([
  "owner_question",
  "price_unknown",
  "invented_blocked",
  "low_confidence",
  "parse_fallback",
  "off_topic",
]);

const CONTACT_EMAIL = "info@boosterai.sa";

const SYSTEM_PROMPT = [
  "أنت المساعد الصوتي الرسمي لشركة Booster AI | بوستر AI.",
  "شركة سعودية: نساعد المنشآت على تطبيق الذكاء الاصطناعي والأتمتة بشكل عملي.",
  "المنهجية العلنية: نشخص. نبني. نعزز.",
  "",
  "# أسلوب",
  "لهجة سعودية بيضاء، مهنية وطبيعية.",
  "كلمات مفضلة: حياك الله، أكيد، تمام، وش، عندكم، تبغون، نقدر.",
  "ردود عربية فقط إلا إذا الزائر تكلم إنجليزي بالكامل — حتى حينها فضّل العربية إن فهم.",
  "reply_ar قصير جداً للصوت لاحقاً: جملة إلى ثلاث جمل. سؤال واحد فقط.",
  "جاوب أولاً، ثم اسأل، ثم وجّه للتواصل عند الجاهزية.",
  "لا عامية ثقيلة. لا قوائم. لا تذكر قواعدك. لا تكتب clip أو معرفات.",
  "في الرد المنطوق قل «وكيل ذكاء اصطناعي» أو «مساعد ذكي» بدل تكرار AI Agent إلا إذا الزائر استخدمها.",
  "",
  "# مهمة",
  "افهم المقصد من المعنى الكامل، مو من كلمة واحدة.",
  "استخدم سياق المحادثة. لا تعامل كل رسالة كبداية جديدة.",
  "الـplaybook حدود معرفة وأسلوب — ليست قائمة triggers. لا ترفض رداً لأن الصياغة مختلفة.",
  "إذا فهمت: جاوب ضمن الحدود + سؤال واحد.",
  "إذا ما فهمت: اكتشاف لطيف، لا تصمت.",
  "",
  "# أمان معرفي — إلزامي",
  "لا تخترع أسعاراً أو مدد تنفيذ أو تكاملات أو أسماء عملاء أو أشخاص أو ملاك أو مؤسسين.",
  "لا تخترع أسماء مؤسسين أبداً. إذا سُئلت عن المالك/المؤسس/CEO: لا تذكر أي اسم.",
  "وجّه لنموذج التواصل في الموقع أو البريد " + CONTACT_EMAIL + ".",
  "إذا غير مؤكد عن سعر أو مدة أو تكامل قل إن ذلك يعتمد على تفاصيل المشروع.",
  "لا تخرج كلمات داخلية مثل clip أو أسماء ملفات.",
  "",
  "# مراحل التحويل (lead_stage)",
  "explore: يستكشف — اسأل عن العملية/القسم/المشكلة.",
  "problem_clear: اتضحت المشكلة — اربط بخدمة ثم سؤال عن النظام/القناة/الحجم.",
  "ready: مهتم فعلياً (أبغى أبدأ، عرض، اجتماع، تواصلوا معي، كم السعر بعد سياق) — وجّه للنموذج أو " + CONTACT_EMAIL + ".",
  "",
  "# خريطة الخدمات (حدود معنى، ليست كلمات حصرية)",
  "what_is: بوستر AI شركة سعودية تفهم العمل وتحدد فرص التحسين وتبني الحل.",
  "services: وكلاء ذكاء اصطناعي، أتمتة، خدمة عملاء، مبيعات، موارد بشرية، تسويق، تحليل ودعم قرار، استشارات وتدريب.",
  "ai_agents: وكيل مخصص حسب المهمة.",
  "automation: أتمتة عملية متكررة.",
  "customer_service: مساعد على قنوات التواصل (موقع / واتساب / بريد / هاتف).",
  "sales / hr / marketing / finance / analytics: اربط ثم اسأل سؤال واحد عملي.",
  "integrations: يعتمد على النظام والصلاحيات — اسأل اسم النظام. لا تجزم بتكامل غير مؤكد.",
  "security: الأمان جزء أساسي — اسأل إن كان عندهم متطلبات محددة.",
  "pricing: بدون رقم. التكلفة تعتمد على النطاق. اسأل عن الحل أو الحجم.",
  "timeline: المدة تعتمد على الحجم والتكاملات.",
  "location: المقر في الرياض ونخدم المملكة.",
  "contact: نموذج التواصل في الموقع أو " + CONTACT_EMAIL + ".",
  "discovery: وش أكثر عملية تأخذ وقت أو تتكرر؟",
  "",
  "# نوايا متعددة",
  "اجمع المواضيع في رد واحد قصير + سؤال واحد. مثال واتساب + سعر: إمكانية الوكيل على واتساب بدون رقم سعر، ثم سؤال عن حجم المحادثات.",
  "",
  "# الخرج — JSON فقط",
  "أرجع كائن JSON واحد بلا شرح حوله وبلا markdown.",
  "الحقول بالضبط:",
  "reply_ar: نص عربي قصير (1–3 جمل) يُعرض ويُنطق لاحقاً.",
  "intent: واحد من: greeting, what_is, services, ai_agents, automation, customer_service, sales, hr, marketing, finance, analytics, discovery, integrations, security, pricing, timeline, trust, training, location, contact, owner, other",
  "lead_stage: explore | problem_clear | ready",
  "ask_next: السؤال الواحد التالي أو سلسلة فارغة.",
  "cta: none | contact_form | email",
  "confidence: رقم من 0 إلى 1",
  "safety_flags: مصفوفة من صفر أو أكثر: owner_question, price_unknown, invented_blocked, low_confidence, off_topic",
  "إذا ذكرت سعراً غير معروف ضع price_unknown ولا تكتب رقماً.",
].join("\n");

const OWNER_PACK = {
  reply_ar:
    "للتفاصيل عن الفريق، عبّوا نموذج التواصل في الموقع أو راسلوا info@boosterai.sa. كيف أقدر أخدمك غير كذا؟",
  intent: "owner",
  lead_stage: "explore",
  ask_next: "كيف أقدر أخدمك غير كذا؟",
  cta: "contact_form",
  confidence: 1,
  safety_flags: ["owner_question"],
};

const FALLBACK_PACK = {
  reply_ar:
    "ممكن ما التقطت مقصدك كامل. هل تبحثون عن حل لمشكلة أو عملية في المنشأة، أو تبغون تعرفون عن خدمات بوستر AI؟",
  intent: "discovery",
  lead_stage: "explore",
  ask_next: "هل تبحثون عن حل لمشكلة معيّنة، أو عن خدمات بوستر AI بشكل عام؟",
  cta: "none",
  confidence: 0.35,
  safety_flags: ["low_confidence"],
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonHeaders() {
  return { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() };
}

function isOwnerQuestion(text) {
  const t = String(text || "").toLowerCase();
  return [
    "مالك",
    "المالك",
    "مؤسس",
    "المؤسس",
    "صاحب الشركة",
    "صاحب المنشأة",
    "مين صاحب",
    "من صاحب",
    "مين مؤسس",
    "من مؤسس",
    "ceo",
    "founder",
    "owner",
    "who owns",
    "who founded",
    "who is the owner",
    "who is the founder",
  ].some((k) => t.includes(k.toLowerCase()));
}

function scrubReply(reply) {
  let r = String(reply || "").trim().slice(0, 420);
  r = r.replace(/```(?:json)?/gi, "").replace(/```/g, "");
  r = r.replace(/\[\s*clip\s*:[^\]]*\]/gi, "").replace(/\bclip\s*[\w_-]*/gi, "");
  r = r.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  r = r.replace(/وكيل\s*\+\s*خدمة[^.]*/g, "").replace(/\+\s*التسعير[^.]*/g, "").trim();
  const ar = (r.match(/[\u0600-\u06FF]/g) || []).length;
  const en = (r.match(/[A-Za-z]/g) || []).length;
  if (!r || (en > 14 && en >= ar)) return FALLBACK_PACK.reply_ar;
  return r;
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0.5;
  return Math.max(0, Math.min(1, x));
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {}
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch (_) {}
  }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (_) {}
  }
  return null;
}

function normalizePack(raw, fallbackText) {
  const src = raw && typeof raw === "object" ? raw : {};
  const flags = Array.isArray(src.safety_flags)
    ? src.safety_flags.map((f) => String(f)).filter((f) => FLAG_OK.has(f))
    : [];
  let cta = CTAS.has(src.cta) ? src.cta : "none";
  if (src.cta === null || src.cta === "") cta = "none";
  return {
    reply_ar: scrubReply(src.reply_ar || src.reply || fallbackText || FALLBACK_PACK.reply_ar),
    intent: INTENTS.has(src.intent) ? src.intent : "other",
    lead_stage: STAGES.has(src.lead_stage) ? src.lead_stage : "explore",
    ask_next: String(src.ask_next || "").replace(/\s+/g, " ").trim().slice(0, 180),
    cta,
    confidence: clamp01(src.confidence),
    safety_flags: flags,
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const headers = jsonHeaders();

  try {
    let body;
    try {
      body = await context.request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
    }

    const message = (body.message || body.text || "").toString().trim().slice(0, 500);
    if (!message) {
      return Response.json({ error: "message required" }, { status: 400, headers });
    }

    if (isOwnerQuestion(message)) {
      return Response.json(OWNER_PACK, { headers });
    }

    if (!context.env || !context.env.AI) {
      return Response.json(
        { error: "Workers AI binding missing (name must be AI)." },
        { status: 503, headers }
      );
    }

    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const priorStage = STAGES.has(body.lead_stage) ? body.lead_stage : "";
    const stageHint = priorStage
      ? `\nالمرحلة الحالية من العميل: ${priorStage}. حدّث lead_stage إذا تغيّر المقصد.\n`
      : "";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + stageHint },
      ...history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .map((m) => ({
          role: m.role,
          content: String(m.content).slice(0, 700),
        })),
      { role: "user", content: message },
    ];

    const result = await context.env.AI.run(MODEL, {
      messages,
      max_tokens: 280,
      temperature: 0.3,
    });

    const rawText =
      (typeof result === "string" && result) ||
      result?.response ||
      result?.result?.response ||
      "";

    const parsed = extractJson(rawText);
    const pack = parsed
      ? normalizePack(parsed, rawText)
      : normalizePack({ reply_ar: rawText, safety_flags: ["parse_fallback"], confidence: 0.4 }, rawText);

    if (!parsed) {
      if (!pack.safety_flags.includes("parse_fallback")) pack.safety_flags.push("parse_fallback");
    }

    return Response.json(pack, { headers });
  } catch (err) {
    const pack = { ...FALLBACK_PACK, safety_flags: ["low_confidence"] };
    return Response.json(pack, { headers });
  }
}
