/**
 * Talk brain — Workers AI + Booster reference Q&A (budget continuous session).
 * Binding: AI. Model: @cf/meta/llama-3.1-8b-instruct-fp8
 * Never invent people/owners; ownership questions bypass the model → CTA.
 */
const SYSTEM = "أنت مساعد صوت حي لـ Booster AI على boosterai.sa. جلسة مباشرة بلهجة سعودية قصيرة وطبيعية.\n\nأسلوب:\n- ردّ على قد السؤال فقط. لا تلقي محاضرة ولا تكرر شعار الشركة كل مرة.\n- جملة إلى جملتين غالباً، ثلاث كحد أقصى.\n- جلسة مستمرة: جاوب وكأن المكالمة لسه شغّالة.\n\nمرجع إجابات (فضّلها إذا السؤال قريب؛ لا تخترع غيرها):\n1) تحية «السلام عليكم» ونحوها → «وعليكم السلام، كيف حاب أخدمك؟ تفضل.»\n2) وش هي بوستر AI → «بوستر AI شركة سعودية تقدّم حلول ذكاء اصطناعي لمنشأتكم: مثلاً أتمتة التسويق، ونبني لكم AI agent للموارد البشرية أو المبيعات أو المحاسبة أو خدمة العملاء أو دعم القرارات. كل اللي عليك تراسلنا على الإيميل أو تعبّي الفورم، ونتواصل معك ونرتّب زيارة نتعرّف فيها على شركتكم ونقترح اللي يناسبكم.»\n3) وش الخدمات / وش نستفيد → نفس روح النقطة 2 باختصار.\n4) الجودة / ليش نثق → «شغل دقيق وفريقنا محترف وعندنا خدمات ما بعد البيع، بالإضافة نقوم بتدريب كامل لفريقكم على الحلول المقدمة وكيفية استخدامها.»\n5) الموقع → «احنا حالياً في الرياض. حط بياناتك بالفورم أو راسل info@boosterai.sa ونتواصل معك قريب.»\n\nقواعد صارمة ضد الاختلاق:\n- لا تخترع أسماء أشخاص أو ملاك أو مؤسسين أو موظفين أو عملاء أو شركاء أو أرقام أو أسعار أو شهادات.\n- لا تذكر أي اسم شخص أبداً.\n- أي معلومة مو موجودة في المرجع أعلاه: لا تخمّن. ادفع بلطف للفورم أو info@boosterai.sa.\n\nميزانية:\n- بعد جواب أساسي، إذا صار كلام طويل أو طلب تسعير/عقد: ادفع للتواصل.\n- عربي سعودي افتراضي؛ إنجليزي فقط إذا العميل تكلم إنجليزي.\n- كلام يُنطق بسهولة، بدون رموز أو قوائم.";
const OWNER_REPLY = "هالتفاصيل عبر التواصل المباشر. عبّ الفورم أو راسل info@boosterai.sa ونتواصل معك قريب.";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function isOwnerQuestion(text) {
  const t = text.toLowerCase();
  const keys = [
    "مالك",
    "المالك",
    "مؤسس",
    "المؤسس",
    "صاحب",
    "مين ادهم",
    "مين أدهم",
    "ceo",
    "founder",
    "owner",
    "who owns",
    "who founded",
    "who's the owner",
    "who is the owner",
    "مين صاحب",
    "من صاحب",
    "مين مؤسس",
    "من مؤسس",
    "إدارة الشركة",
    "الادارة",
  ];
  return keys.some((k) => t.includes(k.toLowerCase()));
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const headers = { "Content-Type": "application/json", ...corsHeaders() };

  try {
    let body;
    try {
      body = await context.request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
    }

    const message = (body.message || body.text || "").toString().trim().slice(0, 400);
    if (!message) {
      return Response.json({ error: "message required" }, { status: 400, headers });
    }

    // Hard guard: never let the model invent owners/founders.
    if (isOwnerQuestion(message)) {
      return Response.json(
        { reply: OWNER_REPLY, model: "reference-cta" },
        { headers }
      );
    }

    if (!context.env.AI) {
      return Response.json(
        { error: "Workers AI binding missing (name must be AI)." },
        { status: 503, headers }
      );
    }

    const history = Array.isArray(body.history) ? body.history.slice(-4) : [];
    const messages = [
      { role: "system", content: SYSTEM },
      ...history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .map((m) => ({
          role: m.role,
          content: String(m.content).slice(0, 500),
        })),
      { role: "user", content: message },
    ];

    const result = await context.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
      messages,
      max_tokens: 120,
      temperature: 0.35,
    });

    let reply =
      (typeof result === "string" && result) ||
      result?.response ||
      result?.result?.response ||
      "";
    reply = String(reply).trim().slice(0, 420);
    if (!reply) {
      reply = "عبّ الفورم أو راسل info@boosterai.sa ونتواصل معك قريب.";
    }

    return Response.json({ reply, model: "workers-ai-llama-3.1-8b-fp8" }, { headers });
  } catch (err) {
    return Response.json(
      {
        error: "Workers AI request failed",
        detail: String(err && err.message ? err.message : err).slice(0, 300),
      },
      { status: 502, headers }
    );
  }
}
