/**
 * Cloudflare Pages Function — proxies SILMA Saudi TTS.
 * Set SILMA_API_KEY in Cloudflare Pages → Settings → Environment variables.
 */
function float32ToWav(float32Array, sampleRate = 24000) {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + float32Array.length * bytesPerSample);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + float32Array.length * bytesPerSample, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, float32Array.length * bytesPerSample, true);
  let offset = 44;
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

function peakSafe(float32, targetPeak = 0.89) {
  let peak = 0;
  for (let i = 0; i < float32.length; i++) {
    const a = Math.abs(float32[i]);
    if (a > peak) peak = a;
  }
  if (peak < 1e-6) return float32;
  // Only turn DOWN if clipping risk — never boost (boost caused harsh clipping).
  const scale = peak > targetPeak ? targetPeak / peak : 1;
  if (scale === 1) return float32;
  const out = new Float32Array(float32.length);
  for (let i = 0; i < float32.length; i++) out[i] = float32[i] * scale;
  return out;
}

export async function onRequestPost(context) {
  const key = context.env.SILMA_API_KEY;
  if (!key) {
    return Response.json(
      { error: "SILMA_API_KEY is not set on Cloudflare Pages yet." },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body.text || "").toString().trim().slice(0, 250);
  if (!text) {
    return Response.json({ error: "text required" }, { status: 400 });
  }

  const voice_id = body.voice_id || "salma";
  const model_id = body.model_id || "silma-tts-v2-ksa";

  const upstream = await fetch("https://api.silma.ai/tts/v2/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apiKey: key,
    },
    body: JSON.stringify({
      model_id,
      text,
      voice_id,
      creativity: 0.15,
      speed: 0.25,
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text();
    return Response.json(
      { error: "SILMA request failed", detail: detail.slice(0, 500) },
      { status: 502 }
    );
  }

  const ab = await upstream.arrayBuffer();
  const float32 = peakSafe(new Float32Array(ab), 0.89);
  // Minimal pad so players don't chop the first phoneme — keep it short.
  const padSamples = Math.floor(0.02 * 24000);
  const padded = new Float32Array(padSamples + float32.length);
  padded.set(float32, padSamples);
  const wav = float32ToWav(padded, 24000);
  return new Response(wav, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
  });
}
