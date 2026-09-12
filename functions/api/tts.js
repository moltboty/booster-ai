/**
 * STAGING Phase C — /api/tts
 * Proxies to Fasee7 Lady on RTX 4090 (FASEE7_TTS_URL).
 * Returns audio/wav (~48 kHz). No SILMA. No browser TTS.
 * Do NOT deploy to production until staging passes + explicit approval.
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const base = (env.FASEE7_TTS_URL || "").replace(/\/$/, "");
  const token = env.FASEE7_TTS_TOKEN || "";

  if (!base) {
    return json(503, { error: "FASEE7_TTS_URL not configured" });
  }

  let text = "";
  const ctype = request.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) {
      const body = await request.json();
      text = String(body.text || body.reply_ar || "").trim();
    } else if (ctype.includes("multipart/form-data") || ctype.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      text = String(form.get("text") || "").trim();
    } else {
      text = String(await request.text()).trim();
    }
  } catch {
    return json(400, { error: "bad body" });
  }

  if (!text) return json(400, { error: "text required" });
  if (text.length > 800) text = text.slice(0, 800);

  const form = new FormData();
  form.set("text", text);
  form.set("use_default_ref", "true");

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let upstream;
  try {
    upstream = await fetch(`${base}/tts`, {
      method: "POST",
      headers,
      body: form,
    });
  } catch (e) {
    return json(502, { error: "fasee7 unreachable", detail: String(e && e.message ? e.message : e) });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return json(502, {
      error: "fasee7 tts failed",
      status: upstream.status,
      detail: detail.slice(0, 500),
    });
  }

  const buf = await upstream.arrayBuffer();
  const outType = upstream.headers.get("content-type") || "audio/wav";
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": outType,
      "Cache-Control": "no-store",
      "X-Talk-TTS": "fasee7-lady",
      ...CORS,
    },
  });
}
