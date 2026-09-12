import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup({getUserMedia,fetchImpl}={}) {
  const tracks=[{stopped:false,stop(){this.stopped=true;}}];
  const stream={getTracks:()=>tracks};
  const intervals=new Map();let id=0;let now=0;let level=0;
  class Context {
    resume(){return Promise.resolve();}close(){return Promise.resolve();}
    createMediaStreamSource(){return {connect(){}};}
    createAnalyser(){return {fftSize:2048,getFloatTimeDomainData(a){a.fill(level);}};}
  }
  class Recorder {
    static isTypeSupported(){return true;}
    constructor(){this.mimeType='audio/webm';this.state='inactive';}
    start(){this.state='recording';}
    stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['recorded audio'])});this.onstop?.();}
  }
  const window={navigator:{mediaDevices:{getUserMedia:getUserMedia || (async()=>stream)}},MediaRecorder:Recorder,AudioContext:Context,
    location:{search:''},setInterval(f){intervals.set(++id,f);return id;},clearInterval(i){intervals.delete(i);},setTimeout,clearTimeout};
  const scope=vm.createContext({window,document:{addEventListener(){}},AbortController,Blob,Float32Array,URLSearchParams,
    performance:{now:()=>now},fetch:fetchImpl || (async()=>Response.json({text:'مرحبا'}))});
  const source=fs.readFileSync(new URL('../voice-demo.js',import.meta.url),'utf8').replace(/\}\)\(\);\s*$/,'globalThis.Recorder=RecordedSpeechRecognition;})();');
  vm.runInContext(source,scope);
  return {rec:new scope.Recorder(),stream,tracks,intervals,
    advance(ms,sound){now+=ms;level=sound;for(const f of [...intervals.values()])f();}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('direct recorder sends speech after a pause and releases microphone',async()=>{
  let calls=0;let transcript='';
  const w=setup({fetchImpl:async(url,options)=>{
    calls++;assert.equal(url,'/api/stt');assert.equal(options.headers['Content-Type'],'audio/webm');
    assert.ok(options.body.size>0);return Response.json({text:'وش خدماتكم'});
  }});
  w.rec.onresult=e=>transcript=e.results[0][0].transcript;
  await w.rec.start();
  for(let i=0;i<4;i++)w.advance(100,0.05);
  w.advance(1200,0);
  await tick();await tick();
  assert.equal(calls,1);assert.equal(transcript,'وش خدماتكم');
  assert.ok(w.tracks.every(t=>t.stopped));assert.equal(w.intervals.size,0);
});

test('hangup while microphone permission is pending releases eventual stream',async()=>{
  let resolveMic;const w=setup({getUserMedia:()=>new Promise(r=>resolveMic=r)});
  const start=w.rec.start();w.rec.stop();resolveMic(w.stream);await start;
  assert.ok(w.tracks.every(t=>t.stopped));assert.equal(w.intervals.size,0);
});

test('silence never reaches transcription',async()=>{
  let calls=0;let error;
  const w=setup({fetchImpl:async()=>{calls++;return Response.json({text:'bad'});}});
  w.rec.onerror=e=>error=e.error;
  await w.rec.start();w.advance(21000,0);await tick();
  assert.equal(calls,0);assert.equal(error,'no-speech');assert.ok(w.tracks[0].stopped);
});

test('hangup aborts pending transcription and discards its late result',async()=>{
  let resolveText;let signal;let results=0;
  const w=setup({fetchImpl:async(url,options)=>{signal=options.signal;return new Promise(r=>resolveText=r);}});
  w.rec.onresult=()=>results++;
  await w.rec.start();w.rec.finishRecording();w.rec.stop();
  assert.equal(signal.aborted,true);resolveText(Response.json({text:'late'}));await tick();
  assert.equal(results,0);assert.equal(w.intervals.size,0);
});
