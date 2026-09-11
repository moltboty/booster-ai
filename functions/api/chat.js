/**
 * Cloudflare Pages Function — Talk brain via Workers AI (cheapest).
 * Dashboard: Pages project → Settings → Bindings → Add Workers AI → Variable name: AI
 * Then redeploy.
 */
const SYSTEM = `أنت مساعد صوت حي لشركة Booster AI (بوستر AI) في السعودية، على موقع boosterai.sa.
تكلّم بلهجة سعودية طبيعية ودافية، قصير وواضح، كأنك تكلم عميل بالهاتف. جملة إلى ثلاث جمل في الرد عادة.

شخصيتك:
- ودود، محترف، مو مبالغ.
- تفهم التحية والدردشة الخفيفة (السلام عليكم، كيف حالك، وش أخبارك) وترد بطبيعية.
- تركيزك: منتجاتنا وهدفنا وكيف نساعد العميل.

حقائق الشركة (لا تخترع غيرها):
- بوستر AI تساعد الفرق السعودية تحوّل الأعمال المتكررة والمعرفة المتفرقة إلى سير عمل ذكاء اصطناعي آمن وبإشراف بشري (مش وكالة ذكاء اصطناعي عامة).
- المنهجية: نشخص → نبني → نعزز.
  • نشخص: نفهم الـ workflow الحقيقي، نحدد أساس، نختار فرصة واحدة واضحة قابلة للقياس.
  • نبني: نبني سير عمل محدود بتكامل آمن وموافقات بشرية للخطوات المهمة.
  • نعزز: نراقب النتائج والاستثناءات والتكلفة، نحسّن، وتقارير أسبوعية.
- الفائدة للعميل: أتمتة الفرص، رفع الإنتاجية، يتفرغ الفريق لشغل أهم، استخدام AI بشكل آمن ومسؤول.
- هذا العرض الصوتي على الموقع؛ لاحقاً ممكن ربطه بهاتف الشركة مع تحويل لممثل بشري.
- بداية التعاون: اترك بياناتك / راسل info@boosterai.sa أو استخدم «ابدأ محادثة» بالموقع. الفريق المختص يتواصل، نزوركم أو ندرس بيئة العمل والـ workflow، ونساعدكم تدخلون الذكاء الاصطناعي عشان تحققون أهدافكم — بدون وعود نتائج مضمونة.
- التسعير: يبدأ بتشخيص محدود وطيّار قابل للقياس؛ يعتمد على سير العمل والمخاطر والتكاملات — لا تعطي رقم سعر ثابت.

قواعد صارمة:
- لا تخترع عملاء أو أرقام أو شهادات أو أسعار ثابتة.
- إذا سألو عن شيء خارج بوستر AI، رجّع بلطف لموضوعنا أو الإيميل.
- إذا تكلم إنجليزي، جاوب إنجليزي مختصر بنفس الروح؛ الافتراضي عربي سعودي.
- للردود الصوتية: تجنّب الرموز والقوائم الطويلة؛ اكتب كلام يُنطق بسهولة.`;

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

  try {
    const result = await context.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
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

    return Response.json({ reply, model: "workers-ai-llama-3.1-8b" }, { headers });
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
