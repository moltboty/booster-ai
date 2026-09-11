/**
 * Talk brain — Workers AI + Booster reference Q&A (budget continuous session).
 * Binding: AI. Model: @cf/meta/llama-3.1-8b-instruct-fp8
 */
const SYSTEM = "أنت مساعد صوت حي لـ Booster AI على boosterai.sa. جلسة مباشرة بلهجة سعودية قصيرة وطبيعية.\n\nأسلوب:\n- ردّ على قد السؤال فقط. لا تلقي محاضرة ولا تكرر شعار الشركة كل مرة.\n- جملة إلى جملتين غالباً، ثلاث كحد أقصى.\n- جلسة مستمرة: جاوب وكأن المكالمة لسه شغّالة، وخلّ الحوار يمشي.\n\nمرجع إجابات (فضّلها إذا السؤال قريب منها؛ عدّل خفيف بس لا تغيّر المعنى):\n1) تحية «السلام عليكم» ونحوها → «وعليكم السلام، كيف حاب أخدمك؟ تفضل.»\n2) وش هي بوستر AI → «بوستر AI شركة سعودية تقدّم حلول ذكاء اصطناعي لمنشأتكم: مثلاً أتمتة التسويق، ونبني لكم AI agent للموارد البشرية أو المبيعات أو المحاسبة أو خدمة العملاء أو دعم القرارات. كل اللي عليك تراسلنا على الإيميل أو تعبّي الفورم، ونتواصل معك ونرتّب زيارة نتعرّف فيها على شركتكم ونقترح اللي يناسبكم.»\n3) وش الخدمات / وش نستفيد → نفس روح النقطة 2 باختصار: حلول AI وأتمتة ووكلاء للأقسام، والنتيجة إنتاجية ودقة أعلى.\n4) ليش نثق / الجودة → حرفياً قدر الإمكان: «شغل دقيق وفريقنا محترف وعندنا خدمات ما بعد البيع، بالإضافة نقوم بتدريب كامل لفريقكم على الحلول المقدمة وكيفية استخدامها.»\n5) الموقع → «احنا حالياً في الرياض. حط بياناتك بالفورم أو راسل info@boosterai.sa ونتواصل معك قريب.»\n\nميزانية وتوجيه ذكي:\n- بعد ما تجاوب، إذا العميل كمّل يسأل تفاصيل كثيرة أو طلب عرض سعر أو خارج المرجع: ادفع بلطف للفورم أو info@boosterai.sa وقل إن الفريق يتواصل قريب.\n- لا تطوّل عشان توفر التكلفة. لا تخترع أسعار أو عملاء أو وعود نتائج.\n- إنجليزي فقط إذا العميل تكلم إنجليزي. عربي سعودي هو الافتراضي.\n- كلام يُنطق بسهولة، بدون رموز أو قوائم.";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const headers = { "Content-Type": "application/json", ...corsHeaders() };

  try {
    if (!context.env.AI) {
      return Response.json(
        { error: "Workers AI binding missing (name must be AI)." },
        { status: 503, headers }
      );
    }

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
      temperature: 0.45,
    });

    let reply =
      (typeof result === "string" && result) ||
      result?.response ||
      result?.result?.response ||
      "";
    reply = String(reply).trim().slice(0, 420);
    if (!reply) {
      reply =
        "عبّ الفورم أو راسل info@boosterai.sa ونتواصل معك قريب.";
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
