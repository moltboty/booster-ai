// Contact form delivery: Telegram alert + email to info@boosterai.sa.
// Secrets (Cloudflare Pages env): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SMTP_USER, SMTP_PASS.
// Optional: SMTP_HOST (default smtp.purelymail.com), SMTP_PORT (465), CONTACT_TO (info@boosterai.sa).
import { connect } from "cloudflare:sockets";

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const clean = (v, max) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
  });
  return r.ok;
}

const b64 = (s) => { let out = ""; for (const b of new TextEncoder().encode(s)) out += String.fromCharCode(b); return btoa(out); };

async function sendEmail(env, { subject, body, replyTo }) {
  if (!env.SMTP_USER || !env.SMTP_PASS) return false;
  const host = env.SMTP_HOST || "smtp.purelymail.com";
  const port = Number(env.SMTP_PORT || 465);
  const to = env.CONTACT_TO || "info@boosterai.sa";
  const from = env.SMTP_USER;
  const socket = connect({ hostname: host, port }, { secureTransport: "on", allowHalfOpen: false });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const enc = new TextEncoder(), dec = new TextDecoder();
  let buf = "";
  const readReply = async () => {
    for (;;) {
      const lines = buf.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          const reply = lines.slice(0, i + 1).join("\n");
          buf = lines.slice(i + 1).join("\r\n");
          return { code: Number(lines[i].slice(0, 3)), reply };
        }
      }
      const { value, done } = await reader.read();
      if (done) throw new Error("SMTP closed");
      buf += dec.decode(value, { stream: true });
    }
  };
  const cmd = async (line, ok) => {
    if (line !== null) await writer.write(enc.encode(line + "\r\n"));
    const r = await readReply();
    if (!ok.includes(r.code)) throw new Error(`SMTP ${r.code}`);
    return r;
  };
  try {
    await cmd(null, [220]);
    await cmd("EHLO boosterai.sa", [250]);
    await cmd("AUTH PLAIN " + b64(`\0${env.SMTP_USER}\0${env.SMTP_PASS}`), [235]);
    await cmd(`MAIL FROM:<${from}>`, [250]);
    await cmd(`RCPT TO:<${to}>`, [250, 251]);
    await cmd("DATA", [354]);
    const msg = [
      `From: Booster AI Website <${from}>`,
      `To: <${to}>`,
      replyTo ? `Reply-To: <${replyTo}>` : null,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@boosterai.sa>`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64(body).replace(/.{1,76}/g, "$&\r\n"),
    ].filter((l) => l !== null).join("\r\n");
    await cmd(msg + "\r\n.", [250]);
    await cmd("QUIT", [221]).catch(() => {});
    return true;
  } finally {
    try { await socket.close(); } catch (_) {}
  }
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    const type = request.headers.get("content-type") || "";
    data = type.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
  } catch (_) { return json(400, { ok: false, error: "bad request" }); }

  if (clean(data.website, 200)) return json(200, { ok: true }); // bot trap

  const lead = {
    name: clean(data.name, 120), email: clean(data.email, 160),
    phone: clean(data.phone, 40), organization: clean(data.organization, 160),
    language: clean(data.language, 5) || "ar",
  };
  if (!lead.name || !lead.phone || !lead.organization || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return json(422, { ok: false, error: "missing fields" });
  }

  const when = new Date().toLocaleString("en-GB", { timeZone: "Asia/Riyadh" });
  const body = [
    "New lead from boosterai.sa",
    "",
    `Name: ${lead.name}`,
    `Organization: ${lead.organization}`,
    `Email: ${lead.email}`,
    `Mobile: ${lead.phone}`,
    `Language: ${lead.language}`,
    `Time (Riyadh): ${when}`,
  ].join("\n");

  const results = await Promise.allSettled([
    sendTelegram(env, body),
    sendEmail(env, { subject: `New lead: ${lead.organization} (${lead.name})`, body, replyTo: lead.email }),
  ]);
  const delivered = results.map((r) => r.status === "fulfilled" && r.value === true);
  results.forEach((r, i) => { if (r.status === "rejected") console.error(["telegram", "email"][i], String(r.reason)); });
  if (!delivered.some(Boolean)) return json(502, { ok: false, error: "not delivered" });
  return json(200, { ok: true, telegram: delivered[0], email: delivered[1] });
}

