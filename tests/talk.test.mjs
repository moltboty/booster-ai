import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
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

function widget(fetchImpl, SpeechRecognition) {
  const timers=new Map(); let timerId=0;
  const ui={root:{dataset:{},classList:{toggle(){}}},btn:{setAttribute(){},classList:{toggle(){}}},btnLabel:{},send:{},status:{},transcript:{},reply:{textContent:''}};
  const sounds=[]; let revoked=0;
  class Audio {
    constructor(){sounds.push(this);}
    play(){return Promise.resolve();}
    pause(){this.paused=true;}
    removeAttribute(){}
    load(){}
  }
  const context=vm.createContext({window:{SpeechRecognition,location:{search:''},setTimeout:(f,ms)=>{timers.set(++timerId,{f,ms});return timerId;},clearTimeout:id=>timers.delete(id)},document:{addEventListener(){}},URLSearchParams,AbortController,performance,fetch:fetchImpl,Audio,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){revoked++;}},console});
  let source=fs.readFileSync(new URL('../voice-demo.js',import.meta.url),'utf8');
  // Isolate the conversation lifecycle from the microphone adapter in these tests.
  source=source.replace(/const SpeechRecognition = window.MediaRecorder[\s\S]*?RecordedSpeechRecognition : null;/,'const SpeechRecognition = window.SpeechRecognition;');
  source=source.replace(/\}\)\(\);\s*$/, 'globalThis.api={session,runTurn,endSession,startSession,setUi(value){ui=value;}};})();');
  vm.runInContext(source,context);
  context.api.setUi(ui);
  return {...context.api,ui,timers,sounds,get revoked(){return revoked;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('no-speech plus onend schedules one microphone restart; hangup cancels it',()=>{
  const instances=[];
  class Recognition { constructor(){instances.push(this);} start(){this.onstart?.();} stop(){} }
  const w=widget(async()=>Response.json(pack),Recognition);
  w.startSession();
  instances[0].onerror({error:'no-speech'});
  instances[0].onend();
  assert.equal(w.timers.size,1);
  const [id,timer]=[...w.timers][0];w.timers.delete(id);timer.f();
  assert.equal(instances.length,2);
  assert.equal(w.timers.size,0);
  instances[1].onend();
  w.endSession();
  assert.equal(w.timers.size,0);
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

test('failed audio reopens microphone and accepts a subsequent spoken turn',async()=>{
  const instances=[];let chats=0;
  class Recognition { constructor(){instances.push(this);} start(){this.onstart?.();} stop(){} }
  const w=widget(async url=>url==='/api/chat'?(chats++,Response.json(pack)):new Response('',{status:503}),Recognition);
  await w.runTurn('مرحبا');
  const entry=[...w.timers].find(([,t])=>t.ms===500);
  assert.ok(entry);w.timers.delete(entry[0]);entry[1].f();
  assert.equal(w.session.state,'LISTENING');
  assert.match(w.ui.status.textContent,/تعذر تشغيل الصوت/);
  instances.at(-1).onresult({results:[[{transcript:'وش خدماتكم'}]]});
  for(let i=0;i<10;i++)await tick();
  assert.equal(chats,2);assert.equal(w.session.busy,false);
});

test('ending a pending call prevents a late response from speaking or altering a new call',async()=>{
  let resolveChat; let ttsCalls=0;
  const w=widget(async url=>url==='/api/chat'?new Promise(r=>resolveChat=r):(ttsCalls++,new Response('audio')));
  const turn=w.runTurn('مرحبا');
  w.endSession();w.startSession({skipListen:true});
  resolveChat(Response.json(pack));await turn;
  assert.equal(ttsCalls,0);assert.equal(w.session.history.length,0);assert.equal(w.session.state,'LISTENING');
});

test('voice failure stays visible and releases controls for another message',async()=>{
  const w=widget(async url=>url==='/api/chat'?Response.json(pack):Response.json({error:'offline'},{status:503}));
  await w.runTurn('مرحبا');
  assert.equal(w.session.state,'ERROR');assert.equal(w.session.busy,false);assert.equal(w.ui.send.disabled,false);
  assert.equal(w.ui.reply.textContent,pack.reply_ar);assert.match(w.ui.status.textContent,/تعذر تشغيل الصوت/);
});

test('chat timeout aborts the request and lets the user retry',async()=>{
  const w=widget(async (url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')))));
  const turn=w.runTurn('مرحبا');
  [...w.timers.values()].find(t=>t.ms===20000).f();await turn;
  assert.equal(w.session.busy,false);assert.equal(w.session.state,'ERROR');
});

test('hangup stops active audio and revokes its object URL',async()=>{
  const w=widget(async url=>url==='/api/chat'?Response.json(pack):new Response(new Blob(['wav'],{type:'audio/wav'})));
  const turn=w.runTurn('مرحبا');
  for(let i=0;i<30 && !w.sounds.length;i++) await tick();
  assert.equal(w.sounds.length,1);
  w.endSession();await turn;
  assert.equal(w.sounds[0].paused,true);assert.equal(w.revoked,1);assert.equal(w.session.state,'IDLE');
});
