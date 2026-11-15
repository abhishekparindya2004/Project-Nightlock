/* Optional dependency-free check of the widget's main interaction logic. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname,'..','widget.js'),'utf8');

class Node {
  constructor(tag='div') {
    this.tagName=tag.toUpperCase();this.children=[];this.events={};this.dataset={};
    this.attrs={};this.hidden=false;this.value='';this.disabled=false;this.textContent='';
  }
  append(...items) {
    for(const child of items){this.children.push(child);if(typeof child!=='string')child.parent=this;}
  }
  replaceChildren(...items){this.children=[];this.append(...items);}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,fn){this.events[k]=fn;}
  focus(){this.focused=true;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
  get childElementCount(){return this.children.length;}
  get offsetWidth(){return 10;}
  get rendered(){return [this.textContent,...this.children.map(x=>typeof x==='string'?x:x.rendered)].join(' ');}
}

function boot(origin, ai=false) {
  const nodes = Object.fromEntries(['.launcher','.panel','.feed','textarea','form','.send','.notice','.prompts','.close','.reset'].map(k=>[k,new Node()]));
  nodes['.panel'].hidden=true;
  class Host extends Node {
    attachShadow(){
      this.shadowRoot=new Node();
      this.shadowRoot.querySelector=k=>nodes[k];
      return this.shadowRoot;
    }
  }
  const body=new Node('body');
  body.append=function(n){Node.prototype.append.call(this,n);n.connectedCallback();};
  const calls=[];
  const constructors={};
  const location=new URL(origin+'/index.html');
  const document={
    currentScript:{src:origin+'/nightlock_ai/widget.js',dataset:{}},baseURI:location.href,body,
    querySelector:k=>k.includes('data-nl-scroll')?{}:null,
    createElement:t=>constructors[t]?new constructors[t]():new Node(t)
  };
  const ctx={document,location,URL,Set,Object,AbortController,HTMLElement:Host,
    customElements:{get:k=>constructors[k],define:(k,c)=>{constructors[k]=c;}},
    setTimeout:()=>1,clearTimeout(){},matchMedia:()=>({matches:false}),console,
    fetch:async (u,o)=>{
      calls.push({u:String(u),method:o.method||'GET',body:o.body&&JSON.parse(o.body)});
      const reply=o.method?{answer:'A model reply',links:['event.html','constructor','https://wrong.example']}: {mode:ai?'ai':'guide'};
      return {ok:true,json:async()=>reply};
    }};
  vm.runInNewContext(src,ctx);
  const host=body.children[0];
  host.shadowRoot.children[0].events.load();
  return {host,nodes,calls};
}
const wait=()=>new Promise(setImmediate);
(async()=>{
  const direct=boot('file:///project');
  assert.equal(direct.host.dataset.scrollButton,'');
  assert.equal(direct.nodes['.launcher'].attrs['data-wave'],'');
  assert.equal(direct.calls.length,0);
  direct.nodes['.launcher'].events.click();
  assert.equal(direct.nodes['.panel'].hidden,false);
  direct.nodes['.prompts'].children[0].events.click();
  await wait();
  assert.match(direct.nodes['.feed'].rendered,/102 infrared/);
  assert.match(direct.nodes['.notice'].textContent,/Quick guide/);
  assert.equal(direct.calls.length,0);
  direct.nodes['.close'].events.click();
  assert.equal(direct.nodes['.panel'].hidden,true);

  const online=boot('http://127.0.0.1:8000',true);
  assert.equal(online.calls.length,0);
  online.nodes['.launcher'].events.click();
  online.nodes.textarea.value='Any upcoming events?';
  online.nodes.form.events.submit({preventDefault(){}});
  await wait();
  assert.equal(online.calls[1].method,'POST');
  assert.equal(online.calls[1].body.message,'Any upcoming events?');
  assert.match(online.nodes['.feed'].rendered,/A model reply/);
  assert.doesNotMatch(online.nodes['.feed'].rendered,/constructor|wrong.example/);
  assert.match(online.nodes['.notice'].textContent,/AI responses/);
  online.nodes['.reset'].events.click();
  assert.doesNotMatch(online.nodes['.feed'].rendered,/A model reply/);
  console.log('Widget smoke checks passed for wave, launcher, local fallback, AI reply, safe links, and reset.');
})().catch(e=>{console.error(e);process.exitCode=1;});
