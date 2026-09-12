import test from 'node:test';
import assert from 'node:assert/strict';


import { onRequestPost as chat, calculate } from '../functions/api/chat.js';
import { onRequestPost as tts } from '../functions/api/tts.js';
import { onRequestPost as stt } from '../functions/api/stt.js';

const pack = {reply_ar:'أكيد، نبدأ بفهم احتياجك.',intent:'other',lead_stage:'problem_clear',ask_next:'',cta:'none',confidence:0.9,safety_flags:[]};
const request = body => new Request('https://test/api', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('calculator handles corrected inputs and rejects executable or invalid expressions', () => {
  assert.equal(calculate('100 * 0.6 * 3 / 60'),3);
  assert.equal(calculate('(240 * 8 * 0.25) / 60'),8);
  assert.equal(calculate('-2 + 3 * (4 + 1)'),13);
  for(const input of ['1/0','process.exit()','2**3','1;alert(1)','(1+2','1..2']) assert.throws(()=>calculate(input));
});

test('chat supplies deterministic arithmetic to the final reply',async()=>{
  let calls=0;
  const result=await chat({request:request({message:'احسب التوفير'}),env:{AI:{run:async(model,input)=>{
    calls++;
    if(calls===1)return {response:{...pack,calculation:{expression:'100*0.6*3/60',unit:'ساعة'}}};
    assert.match(input.messages.at(-1).content,/= 3\./);
    return {response:{...pack,reply_ar:'نوفر ثلاث ساعات يومياً.'}};
  }}}});
  assert.equal(calls,2);assert.equal((await result.json()).reply_ar,'نوفر ثلاث ساعات يومياً.');
});

test('chat accepts structured model objects and preserves conversation context', async () => {
  let input;
  const response = await chat({request:request({message:'كم نوفر؟',history:[{role:'user',content:'عندنا مئة طلب يومياً'}]}),env:{AI:{run:async (model,args)=>{input=args;return {response:pack};}}}});
  assert.equal(response.status,200);
  assert.equal((await response.json()).reply_ar,pack.reply_ar);
  assert.equal(input.messages.filter(m=>m.content==='كم نوفر؟').length,1);
  assert.ok(input.messages.some(m=>m.content==='عندنا مئة طلب يومياً'));
  assert.equal(input.response_format.type,'json_object');
});

test('model outage and malformed output are explicit failures, not canned answers', async () => {
  for (const run of [async()=>{throw Error('offline');},async()=>({response:'{"reply_ar":'})]) {
    const response=await chat({request:request({message:'مرحبا'}),env:{AI:{run}}});
    assert.equal(response.status,502);
    assert.equal((await response.json()).reply_ar,undefined);
  }
});

test('TTS rejects HTML masquerading as a successful upstream response', async () => {
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('<html>offline</html>');
  try { assert.equal((await tts({request:request({text:'مرحبا'}),env:{FASEE7_TTS_URL:'https://voice.test'}})).status,502); }
  finally {globalThis.fetch=original;}
});

test('STT forwards recorded audio as Arabic transcription and rejects non-audio',async()=>{
  let called=0;
  const env={AI:{run:async(model,input)=>{
    called++;assert.equal(model,'@cf/openai/whisper-large-v3-turbo');
    assert.equal(input.language,'ar');assert.equal(input.task,'transcribe');
    assert.equal(input.vad_filter,true);assert.equal(atob(input.audio).length,100);
    return {text:'هلا والله'};
  }}};
  const response=await stt({env,request:new Request('https://test/api/stt',{method:'POST',headers:{'Content-Type':'audio/webm'},body:new Uint8Array(100)})});
  assert.equal(response.status,200);assert.equal((await response.json()).text,'هلا والله');
  assert.equal((await stt({env,request:request({text:'fake audio'})})).status,415);
  assert.equal(called,1);
});


