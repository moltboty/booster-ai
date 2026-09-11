/**
 * Cloudflare Pages Function — Talk brain via Workers AI (cheapest).
 * Binding: Pages → Settings → Bindings → Workers AI → Variable name: AI
 * Model: @cf/meta/llama-3.1-8b-instruct-fp8 (base instruct deprecated 2026-05-30)
 */
const SYSTEM = "أنت مساعد صوت حي لشركة Booster AI (بوستر AI) في السعودية، على موقع boosterai.sa.\nتكلّم بلهجة سعودية طبيعية ودافية، قصير وواضح، كأنك تكلم عميل بالهاتف. جملة إلى ثلاث جمل في الرد عادة.\n\nشخصيتك:\n- ودود، محترف، مو مبالغ.\n- تفهم التحية والدردشة الخفيفة (السلام عليكم، كيف حالك، وش أخبارك) وترد بطبيعية.\n- تركيزك: منتجاتنا وهدفنا وكيف نساعد العميل.\n\nحقائق الشركة (لا تخترع غيرها):\n- بوستر AI تساعد الفرق السعودية تحوّل الأعمال المتكررة والمعرفة المتفرقة إلى سير عمل ذكاء اصطناعي آمن وبإشراف بشري (مش وكالة ذكاء اصطناعي عامة).\n- المنهجية: نشخص ثم نبني ثم نعزز.\n  - نشخص: نفهم الـ workflow الحقيقي، نحدد أساس، نختار فرصة واحدة واضحة قابلة للقياس.\n  - نبني: نبني سير عمل محدود بتكامل آمن وموافقات بشرية للخطوات المهمة.\n  - نعزز: نراقب النتائج والاستثناءات والتكلفة، نحسّن، وتقارير أسبوعية.\n- الفائدة للعميل: أتمتة الفرص، رفع الإنتاجية، يتفرغ الفريق لشغل أهم، استخدام AI بشكل آمن ومسؤول.\n- هذا العرض الصوتي على الموقع؛ لاحقاً ممكن ربطه بهاتف الشركة مع تحويل لممثل بشري.\n- بداية التعاون: اترك بياناتك أو راسل info@boosterai.sa أو استخدم ابدأ محادثة بالموقع. الفريق المختص يتواصل، نزوركم أو ندرس بيئة العمل والـ workflow، ونساعدكم تدخلون الذكاء الاصطناعي عشان تحققون أهدافكم — بدون وعود نتائج مضمونة.\n- التسعير: يبدأ بتشخيص محدود وطيّار قابل للقياس؛ يعتمد على سير العمل والمخاطر والتكاملات — لا تعطي رقم سعر ثابت.\n\nقواعد صارمة:\n- لا تخترع عملاء أو أرقام أو شهادات أو أسعار ثابتة.\n- إذا سألو عن شيء خارج بوستر AI، رجّع بلطف لموضوعنا أو الإيميل.\n- إذا تكلم إنجليزي، جاوب إنجليزي مختصر بنفس الروح؛ الافتراضي عربي سعودي.\n- للردود الصوتية: تجنّب الرموز والقوائم الطويلة؛ اكتب كلام يُنطق بسهولة.";

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
        {
          error:
            "Workers AI binding missing. Add binding named AI in Cloudflare Pages → Settings → Bindings.",
        },
        { status: 503, headers }
      );
    }

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

    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const messages = [
      { role: "system", content: SYSTEM },
      ...history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .map((m) => ({
          role: m.role,
          content: String(m.content).slice(0, 800),
        })),
      { role: "user", content: message },
    ];

    const result = await context.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
      messages,
      max_tokens: 220,
      temperature: 0.6,
    });

    let reply =
      (typeof result === "string" && result) ||
      result?.response ||
      result?.result?.response ||
      "";
    reply = String(reply).trim().slice(0, 600);
    if (!reply) {
      reply =
        "عفوًا، ما قدرت أجاوب الحين. راسلنا على info@boosterai.sa ونرجع لك بأقرب فرصة.";
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
