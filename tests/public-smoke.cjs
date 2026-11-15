/* Run with node tests/public-smoke.cjs. No DOM packages are needed. */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'js/nightlock-features.js'),'utf8');
const seed=JSON.parse(fs.readFileSync(path.join(root,'backend/data/site.json'),'utf8'));
class El {
  constructor(tag='div',cls='',text=''){this.tagName=tag.toUpperCase();this.className=cls;this.textContent=text;this.dataset={};this.attrs={};this.handlers={};this.children=[];this.look={};this.hidden=false;this.style={setProperty(k,v){this[k]=v}};}
  append(...xs){for(const x of xs){x.remove();this.children.push(x);x.parentElement=this;}}
  prepend(...xs){for(const x of xs.reverse()){x.remove();this.children.unshift(x);x.parentElement=this;}}
  before(x){const p=this.parentElement;if(p){x.remove();p.children.splice(p.children.indexOf(this),0,x);x.parentElement=p;}}
  remove(){if(this.parentElement){const p=this.parentElement;p.children=p.children.filter(x=>x!==this);delete this.parentElement;}}
  replaceChildren(...xs){for(const x of this.children)delete x.parentElement;this.children=[];this.append(...xs);}
  querySelector(q){return this.querySelectorAll(q)[0]||null;}
  querySelectorAll(q){if(this.look[q])return this.look[q].filter(x=>!x._gone);return this.all.slice(1).filter(n=>q.split(',').some(sel=>n.matches(sel.trim())));}
  matches(q){if(/^\[[\w-]+\]$/.test(q)){const name=q.slice(1,-1);return this.hasAttribute(name)||name.startsWith('data-')&&name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()) in this.dataset;}if(q.startsWith('.'))return this.classList.contains(q.slice(1));return /^[a-z0-9-]+$/i.test(q)&&this.tagName===q.toUpperCase();}
  closest(q){let n=this;while(n){if(q.split(',').some(x=>n.matches(x.trim())))return n;n=n.parentElement;}return null;}
  addEventListener(q,f){this.handlers[q]=f;}
  get classList(){return {contains:n=>this.className.split(/\s+/).includes(n),add:n=>{if(!this.classList.contains(n))this.className+=' '+n;},remove:(...n)=>{this.className=this.className.split(' ').filter(c=>!n.includes(c)).join(' ');},toggle:(n,on)=>on?this.classList.add(n):this.classList.remove(n)};}
  setAttribute(q,v){this.attrs[q]=v;if(q==='hidden')this.hidden=true;}
  hasAttribute(q){return q in this.attrs;}
  removeAttribute(q){delete this.attrs[q];}
  getAttribute(q){return this.attrs[q]??(q==='href'?this.href:null);}
  focus(){}
  get firstElementChild(){return this.children[0]||null;}
  get parentNode(){return this.parentElement;}
  get all(){return [this,...this.children.flatMap(x=>x.all)];}
  get text(){return this.all.map(n=>n.textContent).join(' ');}
  cloneNode(deep=false){
    const n=new El(this.tagName,this.className,this.textContent);
    n.dataset={...this.dataset};n.attrs={...this.attrs};
    if(deep)n.append(...this.children.map(x=>x.cloneNode(true)));
    return n;
  }
}
function app(page,search,{nodes={},templates={},content=seed,popup=false}={}){
  const body=new El('body');body.dataset.nlPage=page;
  const doc={body,title:'NightLock',readyState:'complete',hidden:false,createElement:t=>new El(t),getElementById:id=>templates[id]??null,
    querySelectorAll:q=>nodes[q]||[],querySelector:q=>(nodes[q]||[])[0]||null,addEventListener(){}};
  vm.runInNewContext(script,{document:doc,window:{NightLockContent:content,jQuery:popup?{magnificPopup:{open:opts=>doc.opened=opts}}:undefined},location:{href:'file:///nightlock/'+page+'.html'+search,protocol:'file:',search},history:{},URL,URLSearchParams,Intl,Date,matchMedia:()=>({matches:true}),addEventListener(){},clearTimeout(){},setTimeout(){}});
  return doc;
}
const row=new El('li','tribe-events-calendar-list__event-row');
const title=new El('a');const dateLabel=new El('time','tribe-events-calendar-list__event-datetime');
const eventRoot=new El('ul');const viewMonth=new El('a'),viewDay=new El('a');
viewMonth.dataset.nlView='month';viewDay.dataset.nlView='day';
row.append(dateLabel);
row.cloneNode=()=>{const n=new El('li');n.look['.tribe-events-calendar-list__event-title a']=[new El('a')];n.append(n.look['.tribe-events-calendar-list__event-title a'][0],dateLabel.cloneNode());return n;};
app('event','?view=list',{
  nodes:{'[data-nl-events]':[eventRoot],'[data-nl-view]':[viewMonth,viewDay]},
  templates:{'nl-event-template':{content:{firstElementChild:row}}}
});
assert.match(eventRoot.text,/SPHEREx QR3 Data Release/);
viewMonth.handlers.click({preventDefault(){},stopImmediatePropagation(){}});
assert.ok(eventRoot.all.some(n=>n.className==='nl-month-grid'));
eventRoot.all.find(n=>n.tagName==='BUTTON').onclick();
assert.ok(!eventRoot.all.some(n=>n.className==='nl-month-grid'));
const gallery=new El('div','nl-album-grid');
app('gallery','',{nodes:{'.nl-album-grid':[gallery]}});
assert.equal(gallery.children.length,6);
assert.equal(gallery.all.filter(n=>n.tagName==='IMG').length,6);
const profile=new El('article'),logos=new El('div'),bio=new El('div'),head=new El('div'),h=new El('h2','team_member_title');
profile.look['[data-nl-institutes]']=[logos];profile.look['[data-nl-bio]']=[bio];profile.append(head,h,logos,bio);head.className='team_member_description';
app('team-member','?member=abhishek-parindya',{nodes:{'[data-nl-profile]':[profile]}});
assert.equal(h.textContent,'Abhishek Parindya');assert.equal(logos.all.filter(n=>n.tagName==='FIGURE').length,3);assert.match(bio.text,/Speech Olympics/);
const details=new El('div'), article=new El('article'), h1=new El('h1'), entry=new El('div');
details.look['.post_header_single .post_title']=[h1];details.look['.post_item_single .entry-content']=[entry];
details.append(h1,article,entry);
app('details','?article=sky-explorer',{nodes:{'[data-nl-detail]':[details]}});
assert.equal(h1.textContent,'Sky Explorer');assert.match(entry.text,/all-sky/i);
const future={...seed,upcoming:[{type:'article',id:'future-test',title:'Future data release',publishAt:'2098-12-31T20:00:00Z'}]};
app('details','?article=future-test',{nodes:{'[data-nl-detail]':[details]},content:future});
assert.equal(h1.textContent,'Future data release');assert.match(entry.text,/Scheduled for.*SLST/);

const videos=new El('a');videos.dataset.nlVideo='index';videos.href='#go-video2';
const player=new El('div','sc_layouts_popup');
const videoDoc=app('index','',{nodes:{'[data-nl-video]':[videos]},templates:{'go-video2':player},popup:true});
videos.handlers.click({preventDefault(){},stopImmediatePropagation(){}});
const options=videoDoc.opened;
assert.ok(options);
const frame=options.items.src.all.find(n=>n.tagName==='IFRAME');
assert.equal(new URL(frame.src).searchParams.get('autoplay'),'1');
assert.equal(new URL(frame.src).hostname,'www.youtube.com');
options.callbacks.close();assert.ok(!options.items.src.all.includes(frame));

const feedbackHost=new El('section'), slider=new El('div','slider_container'), track=new El('div','swiper-wrapper');
const slide=new El('div','swiper-slide');slide.append(new El('div','sc_testimonials_item_content'));
track.append(slide);slider.append(track);feedbackHost.append(slider);
app('gallery','',{nodes:{'[data-nl-feedback]':[feedbackHost]},content:{...seed,feedback:[{name:'Test reader',text:'Nice sky images'}]}});
assert.match(feedbackHost.text,/Nice sky images.*Test reader/);
assert.equal(track.children.length,seed.feedbackDefaults.length+1);
console.log('Public smoke checks passed for calendar views, gallery images and feedback, profile logos, scheduled details, and video playback setup.');
