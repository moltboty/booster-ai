// Staging microphone audio -> Arabic transcription through the existing AI binding.
const respond = (status, data) => Response.json(data, {status, headers:{'Cache-Control':'no-store'}});
export async function onRequestPost({request, env}) {
  if (!env.AI) return respond(503, {error:'transcription unavailable'});
  const type = request.headers.get('content-type') || '';
  if (!/^(audio\/|video\/webm)/i.test(type)) return respond(415, {error:'audio required'});
  const limit = 2 * 1024 * 1024;
  if (Number(request.headers.get('content-length')) > limit) return respond(413, {error:'audio too large'});
  const reader = request.body?.getReader();
  if (!reader) return respond(400, {error:'empty audio'});
  const chunks=[]; let size=0;
  while (true) {
    const {done,value}=await reader.read(); if(done)break;
    size+=value.length;
    if(size>limit){await reader.cancel();return respond(413,{error:'audio too large'});}
    chunks.push(value);
  }
  if(size<44)return respond(400,{error:'empty audio'});
  let binary='';
  for(const chunk of chunks)for(let i=0;i<chunk.length;i+=8192)binary+=String.fromCharCode(...chunk.subarray(i,i+8192));
  try {
    const result=await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
      audio:btoa(binary), language:'ar', task:'transcribe', vad_filter:true,
      condition_on_previous_text:false,
    });
    const text=String(result.text || '').trim().slice(0,1200);
    return respond(200,{text});
  } catch(error) {
    console.error('STT failed:', error?.message || 'unknown');
    return respond(502,{error:'transcription failed'});
  }
}
