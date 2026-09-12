import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// The microphone widget was replaced by the prepared company guide.
// Fail on any attempt to make a network request or access a microphone.
function guide() {
  class Element {
    constructor(){this.children=[];this.listeners={};this.attrs={};this.hidden=false;this.textContent='';this.nodes={};}
    append(el){this.children.push(el);}
    setAttribute(k,v){this.attrs[k]=v;}
    addEventListener(k,v){this.listeners[k]=v;}
    querySelector(s){return this.nodes[s]??=(new Element());}
    focus(){}
  }
  const document={head:new Element(),body:new Element(),readyState:'complete',getElementById:()=>null,createElement:()=>new Element(),addEventListener(){}};
  let audio;
  class Audio {
    constructor(){audio=this;this.listeners={};this.paused=true;this.calls=0;}
    addEventListener(k,v){this.listeners[k]=v;}
    play(){this.paused=false;this.calls++;return Promise.resolve();}
    pause(){this.paused=true;}
  }
  vm.runInNewContext(fs.readFileSync(new URL('../voice-demo.js',import.meta.url),'utf8'),{document,Audio});
  return {root:document.body.children[0],audio};
}

test('all six answers play embedded audio without live services',async()=>{
  const {root,audio}=guide();
  const questions=root.querySelector('.bv-questions').children;
  assert.equal(questions.length,6);
  const sources=new Set();
  for(const question of questions){
    await question.listeners.click();
    assert.match(audio.src,/^data:audio\/mpeg;base64,/);
    assert.ok(Buffer.from(audio.src.split(',')[1],'base64').length>10000);
    sources.add(audio.src);
    assert.equal(root.querySelector('.bv-status').textContent,'تستمع الآن');
  }
  assert.equal(sources.size,6);
});

test('stop and close halt the recording and allow another answer',async()=>{
  const {root,audio}=guide();
  const questions=root.querySelector('.bv-questions').children;
  await questions[0].listeners.click();
  root.querySelector('.bv-control').listeners.click();
  assert.equal(audio.paused,true);
  await questions[1].listeners.click();
  assert.equal(audio.paused,false);
  root.querySelector('.bv-close').listeners.click();
  assert.equal(audio.paused,true);
  assert.equal(root.querySelector('.bv-panel').hidden,true);
});
