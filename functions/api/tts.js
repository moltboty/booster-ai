function float32ToWav(samples, sampleRate = 24000) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
    write(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    write(8, "WAVE");
    write(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);export async function onRequestPost(context) {
        const key = context.env.SILMA_API_KEY;
        if (!key) return Response.json({ error: "SILMA_API_KEY is not set on Cloudflare Pages yet." }, { status: 503 });
        let body;
        try { body = await context.request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
        const text = (body.text || "").toString().trim().slice(0, 250);
        if (!text) return Response.json({ error: "text required" }, { status: 400 });
        const voice_id = body.voice_id || "salma";
        const model_id = body.model_id || "silma-tts-v2-ksa";
        const upstream = await fetch("https://api.silma.ai/tts/v2/stream", {
              method: "POST",
              headers: { "Content-Type": "application/json", apiKey: key },
              body: JSON.stringify({ model_id, text, voice_id, creativity: 0.2, speed: 0.2 }),
        });
        if (!upstream.ok) {
              const detail = await upstream.text();
              return Response.json({ error: "SILMA request failed", detail: detail.slice(0, 500) }, { status: 502 });
        }
        const samples = new Float32Array(await upstream.arrayBuffer());
        const wav = float32ToWav(samples);
        return new Response(wav, { headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
    }
  
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, "data");
    view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
          const s = Math.max(-1, Math.min(1, samples[i]));
          view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
}

