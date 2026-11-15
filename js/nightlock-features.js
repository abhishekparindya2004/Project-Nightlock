/* Add NightLock features to the existing theme widgets without replacing their wrappers. */
(() => {
  'use strict';
  const $=(q,r=document)=>r.querySelector(q), $$=(q,r=document)=>[...r.querySelectorAll(q)];
  const page=document.body.dataset.nlPage, query=new URLSearchParams(location.search), seed=window.NightLockContent;
  const feedbackPage=page==='details'||page==='gallery';
  const oldVimeo='https://player.vimeo.com/video/313824875?dnt=1';
  for(const key of ['gallery','our-services']){
    if(seed.videos?.[key]?.url===oldVimeo)seed.videos[key].url='https://youtu.be/V-UhPS1Jwl4?si=AsgARDqHf8BWogNZ';
  }
  const firstYearArticle=seed.articles?.find(item=>item.id==='spherex-first-year-data');
  if(firstYearArticle?.sources?.some(source=>source.url==='https://www.ipac.caltech.edu/doi/10.26131/IRSA678')){
    firstYearArticle.sources=[
      {label:'NASA Science · SPHEREx mission',url:'https://science.nasa.gov/mission/spherex/'},
      {label:'NASA · First all-sky infrared map',url:'https://www.nasa.gov/image-article/first-sky-map-from-nasas-spherex-observatory/'}
    ];
  }
  const firstYearEvent=seed.events?.find(item=>item.id==='spherex-dr1');
  if(firstYearEvent?.sources?.some(source=>source.url==='https://www.ipac.caltech.edu/doi/10.26131/IRSA678')){
    firstYearEvent.sources=[
      {label:'NASA Science · SPHEREx mission',url:'https://science.nasa.gov/mission/spherex/'},
      {label:'NASA · First all-sky infrared map',url:'https://www.nasa.gov/image-article/first-sky-map-from-nasas-spherex-observatory/'}
    ];
  }
  seed.feedbackDefaults=[];
  const make=(tag,cls='',text='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const set=(n,t)=>{if(n)n.textContent=t??'';};
  const endpoint=name=>new URL('/api/'+name,location.href);
  const route=(k,id)=>'details.html?'+k+'='+encodeURIComponent(id);
  const template=id=>document.getElementById(id)?.content.firstElementChild?.cloneNode(true);
  const base=location.href.split(/[?#]/)[0];
  const find=(a,id)=>a.find(x=>x.id===id);
  const value=(u,media=false)=>{
    if(!u||/[\x00-\x1f\\]/.test(u)||u.startsWith('//'))return '';
    try{
      const link=new URL(u,base);
      if(['https:','http:'].includes(link.protocol))return u;
      if(!media&&['mailto:','tel:'].includes(link.protocol))return u;
      if(location.protocol==='file:'&&link.protocol==='file:'&&!/^[a-z]+:/i.test(u))return u;
    }catch(_){}
    return '';
  };
  const href=(n,u)=>{const v=value(u);if(n&&v){n.href=v;n.removeAttribute('aria-disabled');}};
  const a=(t,u,c='')=>{const n=make('a',c,t);href(n,u);return n;};
  const paragraphs=(where,text,cl='')=>{String(text||'').split(/\n\s*\n/).filter(p=>p.trim()).forEach(p=>where.append(make('p',cl,p)));};
  const bg=(n,u,property='--nl-media')=>{const v=value(u,true);if(n&&v)n.style.setProperty(property,'url('+JSON.stringify(new URL(v,base).href)+')');};
  const image=(n,u,alt)=>{const v=value(u,true);if(!n||!v)return;n.removeAttribute('srcset');n.removeAttribute('sizes');n.src=v;if(alt!=null)n.alt=alt;};
  const detailHeroFallbacks={
    'sky-explorer':['PIA15481','NASA/JPL-Caltech/UCLA','Mapping the Infrared Universe: The Entire WISE Sky'],
    'explore-the-observatory':['PIA12169','NASA/CXC/JPL-Caltech/PSU/CfA','Trigger-Happy Cloud'],
    'night-sky-tours':['PIA14102','NASA/JPL-Caltech/UCLA','Star Formation in the Heart of the Swan'],
    'stargazing-nights':['PIA13459','NASA/JPL-Caltech/UCLA','Supergiant Star Near Giraffe Hind Foot'],
    'alien-life-the-search-continues-to-be-unabated':['PIA17444','NASA/JPL-Caltech','Spitzer Trains Its Eyes on Exoplanets'],
    'watching-the-famous-comet-passing-earth':['PIA13576','NASA/JPL-Caltech/UMD','Fab Five at Comet Hartley 2'],
    'the-biggest-solar-system-secrets-beyond-the-textbooks':['PIA22192','NASA/Ames Research Center/Wendy Stenzel','Kepler-90 System'],
    'unraveling-the-fabric-of-reality-with-the-help-of-quantum-physics':['iss073e0817671','NASA','Cold Atom Lab aboard the International Space Station'],
    'the-mars-mission-or-humanitys-next-giant-leap':['PIA14838','NASA/JPL-Caltech','Curiosity and Descent Stage'],
    'are-the-black-holes-really-a-portal-to-unknown-realms':['PIA14730','NASA','Flaring Black Hole'],
    'exoplanets-and-the-quest-for-alien-worlds':['PIA18904','NASA/Ames/JPL-Caltech','First K2 Exoplanet Artist Concept'],
    'everything-about-time-travel-and-its-theories':['PIA16696','NASA/JPL-Caltech','How to Measure the Spin of a Black Hole'],
    'stars-in-perfect-synchrony-form-a-symphony':['PIA13149','NASA/JPL-Caltech/University of Michigan','Blobs House Twin Stars'],
    'all-time-favorite-spots-to-watch-the-stars':['PIA13974','NASA/JPL-Caltech/UCLA','WISE Unveils a Treasure Trove of Beauty'],
    'what-we-like-about-astronomic-science':['GSFC_20171208_Archive_e001518','NASA','Horsehead Nebula'],
    'how-to-keep-track-of-the-space-objects':['PIA26452','NASA/JPL-Caltech','Asteroid 2024 PT5 Orbit'],
    'this-weeks-moonless-sky-discoveries':['PIA14102','NASA/JPL-Caltech/UCLA','Star Formation in the Heart of the Swan'],
    'a-new-group-of-spider-pulsars-in-omega-centauri':['PIA10372','NASA/JPL-Caltech/NOAO/AURA/NSF','Omega Centauri in Infrared'],
    'the-international-space-station-celebrates-25-years':['s135e006700','NASA','International Space Station during STS-135 Approach'],
    'a-new-cosmic-neighbor-discovered':['GSFC_20171208_Archive_e001791','NASA','Supernova in a Nearby Galaxy'],
    'comet-reveals-its-hidden-secrets':['PIA13547','NASA/JPL-Caltech','Hartley 2 on the Move'],
    'mysterious-galaxy-changes-caught-in-infrared':['PIA13789','NASA/JPL-Caltech/UCLA','The Hidden Galaxy']
  };
  const setDetailHeroCredit=(hero,fallback)=>{
    let credit=$('.nl-detail-image-credit',hero);
    if(!fallback){credit?.remove();return;}
    if(!credit){credit=make('a','nl-detail-image-credit');hero.append(credit);}
    credit.href='https://images.nasa.gov/details/'+fallback[0];
    credit.target='_blank';
    credit.rel='noopener noreferrer';
    credit.title=fallback[2];
    credit.textContent='Image: '+fallback[1];
    credit.style.cssText='position:absolute;right:1rem;top:.75rem;z-index:3;padding:.25rem .45rem;background:rgba(0,0,0,.55);color:#fff;font-size:.7rem;line-height:1.3';
  };
  const setDetailHeroBackground=(hero,source)=>{
    const url=value(source,true);
    if(url)hero.style.setProperty('background-image','linear-gradient(rgba(9,14,28,.4),rgba(9,14,28,.42)),url('+JSON.stringify(new URL(url,base).href)+')','important');
  };
  const setDetailHero=(hero,item,key)=>{
    const fallback=detailHeroFallbacks[key]||['placeholder','',''];
    const fallbackImage=fallback[0]==='placeholder'?'images/placeholder.png':'images/nasa/'+fallback[0]+'.jpg';
    hero.classList.add('nl-detail-image-edited');
    setDetailHeroBackground(hero,fallbackImage);
    setDetailHeroCredit(hero,fallback[0]==='placeholder'?null:fallback);
    const source=value(item.image,true);
    if(!source)return;
    const probe=new Image();
    probe.onload=()=>{setDetailHeroBackground(hero,source);setDetailHeroCredit(hero,null);};
    probe.onerror=()=>{setDetailHeroBackground(hero,fallbackImage);setDetailHeroCredit(hero,fallback[0]==='placeholder'?null:fallback);};
    probe.src=new URL(source,base).href;
  };
  const button=(text,link)=>{
    const n=a('',link,'sc_button sc_button_default sc_button_size_normal sc_button_icon_left nl-theme-button');
    const s=make('span','sc_button_text');s.append(make('span','sc_button_title',text));n.append(s);return n;
  };
  const fmt=(day,opts={month:'short',day:'numeric',year:'numeric'})=>{
    const d=new Date(day+'T00:00:00Z');return day&&!isNaN(d)?new Intl.DateTimeFormat('en',{...opts,timeZone:'UTC'}).format(d):'';
  };
  const iso=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const isArchive=e=>/^Archived example/i.test(e.status||'');
  const date=(d)=>d.dateDisplay||fmt(d.date||(d.publishAt?sriLankaDate(d.publishAt):''));
  const same=(a,b)=>{
    if(a===b)return true;
    if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
    if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i]));
    const keys=new Set([...Object.keys(a),...Object.keys(b)]);
    return [...keys].every(k=>same(a[k]??'',b[k]??''));
  };
  const shifted=(day,m=0,d=0)=>{
    const [y,n,t]=day.split('-').map(Number);return iso(new Date(y,n-1+m,m?1:t+d,12));
  };
  function markNav(content=seed) {
    const entry=query.get('article');
    const article=entry&&find(content.articles,entry);
    const key=page==='team-member'?'our-team':page==='details'?(query.has('event')?'event':query.has('service')||article?.placement?.includes('guides')?'our-services':article?.placement?.includes('mission')||article?.category==='Observatory'?'observatory':article?.placement?.includes('latest')?'gallery':'blog'):page;
    $$('[data-nl-nav]').forEach(n=>{
      n.removeAttribute('aria-current');
      const li=n.closest('li');if(li){li.removeAttribute('data-nl-active');li.classList.remove('current-menu-item','current-menu-ancestor','current-menu-parent','current_page_item','current_page_ancestor');}
    });
    $$('[data-nl-nav="portfolio"]').forEach(n=>{if(n.getAttribute('href')==='portfolio.html')href(n,'gallery.html');});
    $$('[data-nl-nav="'+key+'"]').forEach(n=>{
      const li=n.closest('li');if(!li)return;
      n.setAttribute('aria-current','page');li.dataset.nlActive='page';li.classList.add('current-menu-item');
      for(let p=li.parentElement.closest('li');p;p=p.parentElement.closest('li')){
        // A parent can indicate an open branch, but must not imply Home is the selected page.
        if($(':scope > [data-nl-nav="index"]',p))continue;
        p.dataset.nlActive='branch';p.classList.add('current-menu-ancestor');
      }
    });
  }
  function scrollControl(){
    const n=$('[data-nl-scroll]');if(!n)return;
    const update=()=>{const show=scrollY>360;n.classList.toggle('show',show);n.tabIndex=show?0:-1;};
    addEventListener('scroll',update,{passive:true});update();
    n.addEventListener('click',e=>{e.preventDefault();scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},true);
  }
  function eventQuickInfo(){
    $$('[data-nl-event-toggle]').forEach(toggle=>{
      const panel=document.getElementById(toggle.getAttribute('aria-controls'));
      if(!panel)return;
      toggle.addEventListener('click',e=>{
        e.preventDefault();
        const expanded=toggle.getAttribute('aria-expanded')!=='true';
        toggle.setAttribute('aria-expanded',String(expanded));
        panel.hidden=!expanded;
      });
    });
  }
  function publicForm(id,action){
    const form=typeof id==='string'?document.getElementById(id):id;if(!form)return;
    form.addEventListener('submit',async e=>{
      e.preventDefault();e.stopImmediatePropagation();
      if(!form.reportValidity())return;
      const status=$('[role="status"]',form), submit=$('button[type="submit"],input[type="submit"]',form);
      if(submit)submit.disabled=true;set(status,'Sending…');
      try{
        if(location.protocol==='file:')throw Error('Start the NightLock server to send this form.');
        const r=await fetch(endpoint(action),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
        const data=await r.json();
        if(!r.ok)throw Error(data.error||'This form could not be sent.');
        form.reset();set(status,data.message);
        if(action==='feedback')await refreshPublicFeedback(true);
      }catch(err){set(status,err instanceof SyntaxError||err instanceof TypeError?'This form needs the NightLock server. No information was sent.':err.message);}
      finally{if(submit)submit.disabled=false;}
    },true);
  }
  function open(label){
    const d=make('dialog','nl-media-dialog');d.setAttribute('aria-label',label);
    const close=make('button','nl-media-close','×');close.type='button';close.setAttribute('aria-label','Close');close.onclick=()=>d.close();
    const frame=make('div','nl-media-frame');d.append(close,frame);document.body.append(d);
    d.addEventListener('close',()=>d.remove(),{once:true});d.addEventListener('click',e=>{if(e.target===d)d.close();});
    d.showModal();return frame;
  }
  function videoMedia(entry){
    const raw=value(entry?.url,true);if(!raw)return null;
    const link=new URL(raw,base);
    const youtube=link.hostname==='youtu.be'?link.pathname.split('/')[1]:
      ['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(link.hostname)?
        link.searchParams.get('v')||link.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1]:'';
    const vimeo=['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(link.hostname)?link.pathname.match(/(?:^|\/)(\d+)(?:\/|$)/)?.[1]:'';
    if(youtube&&/^[\w-]{11}$/.test(youtube)){
      const params=link.searchParams,start=params.get('start')||params.get('t');
      link.href='https://www.youtube.com/embed/'+youtube+'?autoplay=1&rel=0';
      if(start)link.searchParams.set('start',start);
    }else if(vimeo){
      const hash=link.searchParams.get('h')||link.pathname.match(/^\/\d+\/([a-f0-9]+)$/i)?.[1];
      link.href='https://player.vimeo.com/video/'+vimeo+'?autoplay=1&dnt=1';
      if(hash)link.searchParams.set('h',hash);
    }else if(/\.(mp4|webm|ogg|ogv)$/i.test(link.pathname)){
      const v=make('video');v.controls=true;v.autoplay=true;v.playsInline=true;v.src=link.href;
      if(entry.poster)v.poster=value(entry.poster,true);return v;
    }else return button('Open video',raw);
    const f=make('iframe');f.src=link.href;f.title=entry.title||'Video';f.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
    f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';return f;
  }
  function play(entry,originalId,trigger){
    const media=videoMedia(entry);if(!media)return;
    const jq=window.jQuery;
    if(jq?.magnificPopup?.open){
      const original=originalId&&document.getElementById(originalId);
      const panel=original?.cloneNode(false)||make('div','sc_layouts sc_layouts_popup');
      panel.removeAttribute('id');
      const frame=make('div','nl-original-player');frame.append(media);panel.append(frame);
      jq.magnificPopup.open({type:'inline',items:{src:panel},mainClass:'nl-original-video',
        closeBtnInside:true,closeOnContentClick:false,autoFocusLast:true,
        closeMarkup:'<button type="button" class="mfp-close" aria-label="Close video"><span class="mfp-close-icon">×</span></button>',
        callbacks:{open(){media.play?.().catch(()=>{});},close(){media.remove();},afterClose(){trigger?.focus();}}});
      return;
    }
    const frame=open(entry.title||'Video');frame.append(media);media.play?.().catch(()=>{});
  }
  function videos(d) {
    $$('[data-nl-video]').forEach(n=>{
      const v=d.videos[n.dataset.nlVideo];
      const originalId=(n.getAttribute('href')||'').replace(/^#/,'')||({observatory:'go-video4'})[n.dataset.nlVideo];
      if(!v?.url){n.hidden=true;n.setAttribute('aria-hidden','true');return;}
      n.hidden=false;
      n.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();play(v,originalId,n);},true);
    });
    $$('[data-nl-poster]').forEach(n=>{
      const v=d.videos[n.dataset.nlPoster];if(v?.poster){const cover=$('img',n);if(cover&&n.classList.contains('post_featured'))image(cover,v.poster,cover.alt);else{n.classList.add('nl-poster-edited');bg(n,v.poster);}}
    });
  }
  function applyOverrides(d,root=document) {
    $$('[data-nl-edit]',root).forEach(n=>{
      const r=d.overrides[n.dataset.nlEdit];if(!r)return;
      for(const k of ['placeholder','title','aria-label','value'])if(r[k]!=null)n.setAttribute(k,r[k]);
      if(n.tagName==='IMG'){if(r.image)image(n,r.image,r.alt);else if(r.alt!=null)n.alt=r.alt;}
      else{
        if(n.tagName==='A'&&r.url!=null){if(r.url)href(n,r.url);else n.removeAttribute('href');}
        if(r.text!=null){
          const target=n.dataset.nlNav?$('span:first-child',n)||n:n.dataset.nlCal==='title'?$('a.nl-calendar-title',n)||n:n;
          if(!target.children.length)set(target,r.text);
          else {const text=[...target.childNodes].find(child=>child.nodeType===3&&child.textContent.trim());if(text)text.textContent=r.text;else target.append(document.createTextNode(r.text));}
          if(n.matches('.post_title, .team_member_title, title'))document.title=n.tagName==='TITLE'?r.text:r.text+' | '+d.settings.siteName;
        }
      }
    });
  }
  function editable(d) {
    applyOverrides(d);
    $$('[data-nl-hero-fallback-image]').forEach(n=>{const u=d.overrides[n.dataset.nlHeroFallbackImage]?.image;if(u)image(n,u);});
    $$('[data-nl-background]').forEach(n=>{
      const u=d.overrides[n.dataset.nlBackground]?.image;
      if(u){bg(n,u);n.classList.add('nl-background-edited');}
    });
    $$('[data-nl-setting]').forEach(n=>{
      const x=d.settings[n.dataset.nlSetting];if(x==null)return;
      const child=$('.sc_item_title_text',n);
      set(child||n,x);
      if(n.dataset.nlSetting==='newsletterDescription')n.hidden=x===seed.settings.newsletterDescription;
    });
    if(d.settings.siteName&&d.settings.siteName!==seed.settings.siteName)document.title=document.title.replace(/NightLock/g,d.settings.siteName);
    const root=$('[data-nl-extra]');if(!root)return;
    (d.blocks[page]||[]).forEach((b,i)=>{
      const section=make('section','sc_content sc_content_default sc_content_width_100p nl-added-theme-section');
      section.id='nightlock-update-'+(i+1);
      const inner=make('div','content_wrap');
      const title=make('h2','sc_item_title sc_title_title');title.append(make('span','sc_item_title_text',b.title));inner.append(title);
      const copy=make('div','sc_item_descr sc_title_descr');paragraphs(copy,b.body);inner.append(copy);
      if(b.image&&!b.video){const pic=make('img');image(pic,b.image,b.alt||b.title);pic.loading='lazy';inner.append(pic);}
      if(b.video){const playBtn=button('Play video',b.video);bg(playBtn,b.poster||b.image);playBtn.classList.add('nl-content-video');playBtn.onclick=e=>{e.preventDefault();play({...b,url:b.video});};inner.append(playBtn);}
      if(b.document)inner.append(button('Read document',b.document));
      if(b.url)inner.append(button(b.button||'Read more',b.url));
      section.append(inner);root.append(section);
    });
  }
  function articleCard(card,record,placement,baseRecord,existing){
    const go=route('article',record.id);
    const title=$('.sc_blogger_item_title a,.post_title a',card);
    const category=$('.post_categories a',card);
    const cover=$('img',card);
    const excerpt=$('.sc_blogger_item_excerpt,.post_excerpt',card);
    if(!existing||record.summary!==baseRecord?.summary)set(excerpt,record.summary);
    if(!existing||record.title!==baseRecord?.title)set(title,record.title);
    if(!existing||record.category!==baseRecord?.category)set(category,record.category);
    const day=$('.post_date a',card)||$('.post_date',card);
    if(!existing||record.date!==baseRecord?.date||record.publishAt!==baseRecord?.publishAt){set(day,date(record));if(day)day.hidden=!(record.date||record.publishAt);}
    if(!existing||record.image!==baseRecord?.image){if(record.image)image(cover,record.image,record.title);else if(cover)cover.closest('.post_featured')?.setAttribute('hidden','');}
    $$('a',card).forEach(n=>{if(placement==='home'||!n.closest('.post_categories'))href(n,go);});
    return card;
  }
  function pageRanked(records,key){
    const rank=id=>{
      let hash=2166136261;
      for(const char of key+':'+id){hash=Math.imul(hash^char.charCodeAt(0),16777619);}
      return hash>>>0;
    };
    return records.slice().sort((a,b)=>rank(a.id)-rank(b.id)||a.id.localeCompare(b.id));
  }
  function detailArticleCard(item){
    const url=route('article',item.id),column=make('div','column-1_2'),card=make('div','related_item post_format_standard post type-post status-publish has-post-thumbnail');
    const featured=make('div','post_featured with_thumb hover_link'),cover=make('img','attachment-stargaze-thumb-square size-stargaze-thumb-square wp-post-image');
    if(item.image){image(cover,item.image,item.title);cover.loading='lazy';cover.width=890;cover.height=664;featured.append(cover);}
    featured.append(make('div','mask'));
    const overlay=a('',url,'link');overlay.setAttribute('aria-hidden','true');overlay.tabIndex=-1;featured.append(overlay);
    const header=make('div','post_header entry-header'),meta=make('div','post_meta post_meta_categories'),category=make('span','post_meta_item post_categories cat_sep');
    category.append(a(item.category||'Article','blog.html'));meta.append(category);
    const title=make('h6','post_title entry-title');title.append(a(item.title,url));
    header.append(meta,title);card.append(featured,header);column.append(card);return column;
  }
  function latestArticleCard(item){
    const url=route('article',item.id),card=make('article','post_item with_thumb'),thumb=make('div','post_thumb hover_zoom'),content=make('div','post_content');
    const link=a('',url),cover=make('img','attachment-stargaze-thumb-tiny size-stargaze-thumb-tiny wp-post-image');
    if(item.image){image(cover,item.image,item.title);cover.loading='lazy';cover.width=120;cover.height=120;link.append(cover);}
    thumb.append(link);
    const info=make('div','post_info');
    if(item.category){const categories=make('div','post_info_item post_categories');categories.append(a(item.category,'blog.html'));info.append(categories);}
    const published=date(item);
    if(published){const posted=make('span','post_info_item post_info_posted'),dateLink=a(published,url,'post_info_date');posted.append(dateLink);info.append(posted);}
    const title=make('h6','post_title');title.append(a(item.title,url));
    content.append(info,title);card.append(thumb,content);return card;
  }
  function detailArticleLists(d,currentId,selectionKey){
    const available=d.articles.filter(item=>item.id!==currentId);
    const relatedHost=$('.related_wrap .columns_wrap');
    if(relatedHost){
      relatedHost.replaceChildren(...pageRanked(available,'related:'+selectionKey).slice(0,2).map(detailArticleCard));
    }
    const recent=$('.widget_recent_posts');
    if(!recent)return;
    set($('.widget_title',recent),'Latest Articles');
    recent.querySelectorAll('article').forEach(card=>card.remove());
    const latestPool=available.slice().sort((a,b)=>(b.publishAt||b.date||'').localeCompare(a.publishAt||a.date||'')||a.id.localeCompare(b.id)).slice(0,12);
    pageRanked(latestPool,'latest:'+selectionKey).slice(0,2).forEach(item=>recent.append(latestArticleCard(item)));
  }
  const recentArticleStates=new WeakMap();
  function renderRecentBlogArticles(host,d){
    let state=recentArticleStates.get(host);
    if(!state){
      state={items:[],limit:6,term:'',button:null,render:null};
      const form=$('#nightlock-article-search'),input=form&&$('input[type="search"]',form),status=$('#nightlock-article-search-status');
      if(input){input.value=query.get('q')||'';state.term=input.value;}
      if(!host.id)host.id='nightlock-recent-articles';
      state.button=make('button','nl-article-load-more','Read more');
      state.button.type='button';
      state.button.setAttribute('aria-controls',host.id);
      host.insertAdjacentElement('afterend',state.button);
      state.render=()=>{
        const needle=state.term.trim().toLocaleLowerCase();
        const matches=state.items.filter(record=>{
          const text=[record.title,record.category,record.summary,record.body,record.date,record.publishAt,date(record)].join(' ').toLocaleLowerCase();
          return !needle||text.includes(needle);
        });
        const visible=matches.slice(0,state.limit);
        const cards=visible.map(record=>{
          const card=template('nl-article-recent-template');
          if(!card)return null;
          card.dataset.nlRecord=record.id;
          articleCard(card,record,'recent',null,false);
          return card;
        }).filter(Boolean);
        host.replaceChildren(...cards);
        state.button.hidden=visible.length>=matches.length;
        if(status){
          status.textContent=needle
            ? matches.length+' article'+(matches.length===1?'':'s')+' found; showing '+visible.length+'.'
            : visible.length+' of '+state.items.length+' articles shown.';
        }
      };
      state.button.addEventListener('click',()=>{state.limit+=5;state.render();});
      if(input){
        input.addEventListener('input',()=>{
          state.term=input.value;state.limit=6;state.render();
        });
      }
      if(form&&input){
        form.addEventListener('submit',e=>{
          e.preventDefault();e.stopImmediatePropagation();
          state.term=input.value;state.limit=6;
          const url=new URL(location.href),term=state.term.trim();
          if(term)url.searchParams.set('q',term);else url.searchParams.delete('q');
          history.replaceState(null,'',url.href);state.render();
        },true);
      }
      recentArticleStates.set(host,state);
    }
    state.items=d.articles.slice().sort((a,b)=>(b.publishAt||b.date||'').localeCompare(a.publishAt||a.date||''));
    state.render();
  }
  function articleLists(d){
    $$('[data-nl-articles]').forEach(host=>{
      const placement=host.dataset.nlArticles;
      if(placement==='recent'&&page==='blog'){
        renderRecentBlogArticles(host,d);
        return;
      }
      const old=$$('[data-nl-record]',host).filter(n=>n.closest('[data-nl-articles]')===host);
      const includes=x=>x.placement?.includes(placement);
      let wanted=d.articles.filter(includes);
      if(placement==='recent')wanted.sort((a,b)=>(b.publishAt||b.date||'').localeCompare(a.publishAt||a.date||''));
      if(placement==='home'){
        const original=new Set(old.map(el=>el.dataset.nlRecord));
        wanted=wanted.sort((a,b)=>(b.publishAt||b.date||'').localeCompare(a.publishAt||a.date||'')||Number(original.has(a.id))-Number(original.has(b.id))).slice(0,3);
      }
      const known=new Set(old.map(x=>x.dataset.nlRecord));
      old.forEach(card=>{
        const item=find(wanted,card.dataset.nlRecord);
        if(!item){(card.closest('.nl-article-grid-cell,.swiper-slide,.trx_addons_column-1_3')||card).remove();return;}
        articleCard(card,item,placement,find(seed.articles,item.id),true);
      });
      const fresh=wanted.filter(x=>!known.has(x.id)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
      [...fresh].reverse().forEach(item=>{
        const clone=template('nl-article-'+placement+'-template');
        if(!clone)return;
        const card=clone.matches('[data-nl-record]')?clone:$('[data-nl-record]',clone)||clone;
        card.dataset.nlRecord=item.id;
        articleCard(clone,item,placement,null,false);
        host.prepend(clone);
      });
      if(placement==='recent'){
        const order=new Map(wanted.map((item,index)=>[item.id,index]));
        [...host.children].filter(card=>card.matches('[data-nl-record]')).sort((a,b)=>(order.get(a.dataset.nlRecord)??Infinity)-(order.get(b.dataset.nlRecord)??Infinity)).forEach(card=>host.append(card));
      }
      const sw=host.closest('.slider_container')?.swiper;
      if(sw&&(fresh.length||old.some(x=>!find(wanted,x.dataset.nlRecord))))sw.update();
    });
  }
  function detail(d){
    const root=$('[data-nl-detail]');if(!root)return;
    const kind=query.has('event')?'event':query.has('service')?'service':'article';
    const key=query.get(kind)||'the-biggest-solar-system-secrets-beyond-the-textbooks';
    const aliases=key==='new-shooting-clubs-in-pittsburgh-pennsylvania'?'a-giant-stream-of-stars-noticed-between-galaxies':key;
    const list=d[kind==='article'?'articles':kind==='event'?'events':'services'];
    const item=find(list,aliases), original=find(seed.articles,key);
    detailArticleLists(d,kind==='article'?item?.id:null,kind+':'+(item?.id||key));
    const h=$('.post_header_single .post_title',root), area=$('.post_item_single .entry-content',root);
    if(!h||!area)return;
    if(!query.has(kind)&&(!item||same(item,original)))return;
    if(!item){
      set(h,'This entry is not available');
      set($('.post_header_single .post_date',root),'');
      const future=d.upcoming?.find(r=>r.id===key&&r.type===kind);
      if(future){
        set(h,future.title);document.title=future.title+' | '+d.settings.siteName;
        set($('.post_header_single .post_categories a',root),future.type==='event'?'Event':'News');
        set($('.breadcrumbs .breadcrumbs_item.current'),future.title);
        $('.post_header_single .post_meta_comments',root)?.setAttribute('hidden','');
        $('.post_footer_single',root)?.setAttribute('hidden','');
        const moment=releaseLabel(future.publishAt);
        set($('.post_header_single .post_date',root),moment);
        area.replaceChildren(make('p','wp-block-paragraph','Scheduled for '+moment+'. Check back here after publication.'));
      }else area.replaceChildren(button('Browse NightLock',kind==='event'?'event.html':'blog.html'));return;
    }
    document.title=item.title+' | '+(d.settings.siteName||'NightLock');
    set(h,item.title);set($('.post_header_single .post_categories a',root),item.category||(kind==='event'?'Event':'Service'));
    set($('.post_header_single .post_date',root),date(item));
    const hero=$('.post_header_wrap.with_featured_image',root);
    if(hero)setDetailHero(hero,item,aliases);
    const br=$('.breadcrumbs .breadcrumbs_item.current');if(br)set(br,item.title);
    if(kind==='event'){
      $('.post_header_single .post_meta_comments',root)?.setAttribute('hidden','');
      const footer=$('.post_footer_single',root);
      if(footer)footer.hidden=true;
    }
    if(key==='the-biggest-solar-system-secrets-beyond-the-textbooks'&&same(item,original))return;
    area.replaceChildren();
    if(item.summary)area.append(make('p','has-drop-cap wp-block-paragraph',item.summary));
    if(item.status||item.location||item.organizer||item.eventTime)area.append(make('p','post_meta',[item.status,item.location,item.organizer,item.eventTime].filter(Boolean).join(' · ')));
    if(item.body&&item.body!==item.summary)paragraphs(area,item.body,'wp-block-paragraph');
    if(item.video){
      const b=button('Play video',item.video);b.onclick=e=>{e.preventDefault();play({...item,url:item.video});};area.append(b);
    }
    if(item.document)area.append(button('Read document',item.document));
    if(item.sources?.length){
      area.append(make('h5','wp-block-heading','Sources and further reading'));
      const ul=make('ul');item.sources.forEach(x=>{const li=make('li');li.append(a(x.label,x.url));ul.append(li);});area.append(ul);
    }
  }
  function serviceList(d){
    const host=$('[data-nl-services]'),nav=$('[data-nl-service-pager]');if(!host||!nav)return;
    const before=$$('[data-nl-service-guide]',host);
    const order=before.map(n=>n.dataset.nlServiceGuide);
    const added=d.services.filter(s=>!order.includes(s.id));
    // The archive cards are the original landing content. Published Services use the same excerpt template.
    before.forEach(card=>{
      const id=card.dataset.nlServiceGuide, item=find(d.articles,id), original=find(seed.articles,id);
      const service=find(d.services,id), initial=find(seed.services,id);
      if(!service&&(!item||!item.placement?.includes('guides'))){card.remove();return;}
      if(!service&&initial){card.remove();return;}
      const changed=service&&initial&&!same(service,initial);
      const display=changed?service:item||service;
      const h=$('.post_title a',card), dateNode=$('.post_date',card), cover=$('img',card);
      if(changed||display.title!==original?.title)set(h,display.title);
      if(item&&item.date!==original?.date)set(dateNode,date(item));
      if(display.image&&(changed?display.image!==initial.image:display.image!==original?.image))image(cover,display.image,display.title);
      if(changed||display.summary!==original?.summary){
        const copy=$('.post_content_inner',card);if(copy)set(copy,display.summary);
      }
      const go=changed?(value(service.link)||route('service',id)):route('article',id);
      $$('a',card).filter(a=>!a.hasAttribute('data-nl-video')&&(a.getAttribute('href')?.startsWith('details.html')||a.classList.contains('post-more-link'))).forEach(a=>href(a,go));
      if(changed){
        const read=$('.post-more-link',card), footer=$('.post_content',card);
        if(read)set(read,service.button||'Read More');
        if(service.video){const v=button('Play video',service.video);v.onclick=e=>{e.preventDefault();play({...service,url:service.video});};footer?.append(v);}
        if(service.document)footer?.append(button('Read document',service.document));
      }
    });
    d.articles.filter(x=>x.placement?.includes('guides')&&!order.includes(x.id)).forEach(x=>added.push({...x,link:route('article',x.id)}));
    for(const item of added){
      const c=template('nl-service-template');if(!c)continue;
      c.removeAttribute('data-nl-service-guide');c.dataset.nlPublishedService=item.id;
      const go=value(item.link)||route('service',item.id);
      $$('a',c).forEach(n=>href(n,go));set($('.post_title a',c),item.title);
      const im=$('img',c);if(item.image)image(im,item.image,item.title);else im?.closest('.post_featured')?.remove();
      const copy=$('.post_content',c);copy.replaceChildren();
      paragraphs(copy,item.summary,'wp-block-paragraph');
      if(item.body)paragraphs(copy,item.body,'wp-block-paragraph');
      if(item.video){
        const v=button('Play video',item.video);bg(v,item.poster||item.image);v.classList.add('nl-content-video');v.onclick=e=>{e.preventDefault();play({...item,url:item.video});};copy.append(v);
      }
      copy.append(button(item.button||'Read more',go));
      if(item.document)copy.append(button('Read document',item.document));
      host.append(c);
    }
    const entries=[...host.children].filter(x=>x.tagName==='ARTICLE');
    const links=$('.nav-links',nav);if(!links)return;
    const size=3,pages=Math.ceil(entries.length/size);
    const idx=Math.min(pages||1,Math.max(1,Math.trunc(Number(query.get('page')))||1));
    entries.forEach((entry,i)=>entry.hidden=Math.floor(i/size)+1!==idx);
    links.replaceChildren();
    for(let p=1;p<=pages;p++){
      const n=p===idx?make('span','page-numbers current',String(p)):a(String(p),'our-services.html?page='+p,'page-numbers');
      n.setAttribute('aria-label','Page '+p);if(p===idx)n.setAttribute('aria-current','page');links.append(n);
    }
    if(idx<pages){const next=a('›','our-services.html?page='+(idx+1),'next page-numbers');next.setAttribute('aria-label','Next page');links.append(next);}
    nav.hidden=pages<2;
  }
  function linkedin(where,p,showMissing=false) {
    if(!where)return;
    where.replaceChildren();
    if(!p.linkedin&&!showMissing)return;
    const n=p.linkedin
      ? a('',p.linkedin,'social_item social_item_style_icons nl-linkedin')
      : make('span','social_item social_item_style_icons nl-linkedin nl-linkedin-unavailable');
    n.setAttribute('aria-label',p.linkedin?p.title+' on LinkedIn':'LinkedIn profile link not provided for '+p.title);
    if(!p.linkedin)n.setAttribute('role','img');
    n.append(make('span','social_icon','in'));where.append(n);
  }
  function people(d) {
    const team=$('[data-nl-team]');
    if(team){
      const existing=$$('[data-nl-person]',team);
      const cached=new Map(existing.map(x=>[x.dataset.nlPerson,x]));
      const active=d.people.filter(x=>x.kind!=='astronaut');
      existing.filter(x=>!find(active,x.dataset.nlPerson)).forEach(x=>x.remove());
      active.forEach(p=>{
        let slot=cached.get(p.id), newly=!slot;
        if(!slot)slot=template('nl-team-template');
        if(!slot)return;
        const old=find(seed.people,p.id);
        slot.dataset.nlPerson=p.id;
        const to=value(p.profileLink)||'team-member.html?member='+encodeURIComponent(p.id);
        const title=$('.sc_team_item_title a',slot);
        if(newly||p.title!==old?.title||p.id==='abhishek-parindya')set(title,p.title);
        if(newly||p.role!==old?.role||p.id==='abhishek-parindya')set($('.sc_team_item_subtitle',slot),p.role);
        if(newly||p.image!==old?.image)image($('img',slot),p.image,p.title);
        $$('a.post_link,.sc_team_item_title a',slot).forEach(n=>{href(n,to);if(!n.textContent.trim())n.setAttribute('aria-label','View '+p.title+' profile');});
        linkedin($('.sc_team_item_socials',slot),p,p.kind!=='astronaut');
        if(newly||!same(active.map(x=>x.id),existing.map(x=>x.dataset.nlPerson)))team.append(slot);
      });
    }
    const blog=$('[data-nl-people-blog]');
    if(blog){
      const slots=$('[data-nl-blog-person]',blog)?.parentElement?.parentElement;
      if(slots){
        const ids=new Set($$('[data-nl-blog-person]').map(x=>x.dataset.nlBlogPerson));
        d.people.filter(p=>p.kind==='astronaut'&&p.featured&&!ids.has(p.id)&&!same(p,find(seed.people,p.id))).forEach(p=>{
          const node=template('nl-blog-person-template'), card=node&&$('[data-nl-blog-person]',node);
          if(card){card.dataset.nlBlogPerson=p.id;card.dataset.nlNewPerson='';slots.append(node);}
        });
      }
    }
    $$('[data-nl-blog-person]').forEach(n=>{
      const p=find(d.people,n.dataset.nlBlogPerson);
      if(!p||p.kind!=='astronaut'||!p.featured){(n.parentElement.className.includes('trx_addons_column')?n.parentElement:n).hidden=true;return;}
      const old=find(seed.people,p.id), go=value(p.profileLink)||(p.kind==='astronaut'?'astronut.html':'team-member.html')+'?member='+encodeURIComponent(p.id);
      set($('.sc_team_item_title a',n),p.title);set($('.sc_team_item_subtitle',n),p.role);
      $$('a.post_link,.sc_team_item_title a',n).forEach(a=>href(a,go));
      if(p.image!==old?.image||n.hasAttribute('data-nl-new-person')){
        const cover=$('.post_thumb',n);if(cover){bg(cover,p.image);cover.classList.add('nl-background-edited');}
      }
      linkedin($('.sc_team_item_socials',n),p);
    });
    const profile=$('[data-nl-profile]');if(!profile)return;
    const p=find(d.people,query.get('member')||'abhishek-parindya');
    const dest=$('[data-nl-back]',profile);
    dest?.addEventListener('click',e=>{
      try{const back=new URL(document.referrer);if(back.origin===location.origin&&/(our-team|blog)\.html$/.test(back.pathname)){e.preventDefault();history.back();}}catch(_){}
    });
    if(!p){
      set($('.team_member_title',profile),'Profile not found');
      set($('.team_member_position',profile),'');
      $('[data-nl-bio]',profile)?.replaceChildren();
      $('.team_member_featured',profile)?.setAttribute('hidden','');
      return;
    }
    set($('.team_member_title',profile),p.title);set($('.team_member_position',profile),p.role);
    document.title=p.title+' | '+(d.settings.siteName||'NightLock');
    image($('.team_member_avatar img',profile),p.image,p.title);
    const head=$('.team_member_description',profile);
    if(p.linkedin||p.kind!=='astronaut'){const icons=make('div','socials_wrap nl-profile-links');linkedin(icons,p,p.kind!=='astronaut');head.append(icons);}
    const logos=$('[data-nl-institutes]',profile);
    if(logos){
      logos.replaceChildren();
      const institutes=Array.isArray(p.institutes)?p.institutes:[];
      logos.hidden=!institutes.length;
      if(institutes.length){
        const row=make('div','nl-institutes-row');
        institutes.forEach(i=>{
          const badge=make('div','nl-institution-logo'),fig=make('figure','nl-institution');
          if(i.image){const im=make('img');image(im,i.image,i.title+' logo');badge.append(im);}
          else badge.append(make('span','',i.title.split(/\s+/).slice(0,3).map(a=>a[0]).join('')));
          fig.append(badge,make('figcaption','',i.title));row.append(fig);
        });logos.append(row);
      }
    }
    const body=$('[data-nl-bio]',profile);
    if(body){
      body.replaceChildren();
      if(p.summary)body.append(make('p','',p.summary));
      paragraphs(body,p.body);
      p.sections?.forEach(s=>{body.append(make('h4','sc_item_title',s.title));paragraphs(body,s.body);});
      if(p.links?.length){
        const links=make('div','nl-profile-links');p.links.forEach(l=>links.append(button(l.label,l.url)));body.append(links);
      }
      const bioSection=body.closest('.elementor-inner-section');
      if(bioSection)bioSection.hidden=!body.childElementCount;
    }
  }
  function album(d) {
    const host=$('.nl-album-grid');if(!host)return;
    const originals=new Map($$('[data-nl-photo]',host).map(n=>[n.dataset.nlPhoto,n]));
    host.replaceChildren();
    d.gallery.forEach(p=>{
      const n=originals.get(p.id)||make('div','nl-album-cell');n.dataset.nlPhoto=p.id;
      const old=find(seed.gallery,p.id), l=$('a',n)||a('',p.image), im=$('img',n)||make('img');
      href(l,p.image);l.setAttribute('aria-label','Open '+p.title);im.loading='lazy';
      image(im,p.image,p.alt||p.title);
      if(!im.parentElement)l.append(im);if(!l.parentElement)n.append(l);
      l.addEventListener('click',e=>{e.preventDefault();const frame=open(p.title), src=make('img');image(src,p.image,p.alt||p.title);frame.append(src);if(p.description)frame.append(make('p','',p.description));});
      if(!old||p.title!==old.title||p.description){const caption=make('span','nl-album-caption',p.title);n.append(caption);}
      host.append(n);
    });
  }
  function startCarousel(host,delay,manual=false) {
    const slider=$('.slider_container',host);if(!slider)return;
    const panels=$('.swiper-wrapper',slider);if(!panels)return;
    const getSlides=()=>[...panels.children].filter(e=>e.classList.contains('swiper-slide')&&!e.classList.contains('swiper-slide-duplicate'));
    let sw=slider.swiper;
    if(sw?.destroyed)sw=null;
    if(sw?.autoplay?.running)sw.autoplay.stop();
    if(!sw&&window.Swiper){
      const prev=$('.slider_prev',host),next=$('.slider_next',host);
      sw=new window.Swiper(slider,{slidesPerView:1,speed:550,autoHeight:true,loop:false,rewind:true,navigation:{prevEl:prev,nextEl:next},observer:true,observeParents:true});
    }
    let i=0,hover=false,focus=false,visible=false,timer;
    const paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const choose=()=>{
      const count=getSlides().length; if(count<2)return;
      if(sw){
        i=sw.realIndex??0;
        if(i===count-1)sw.slideTo(0);else sw.slideNext();
      }else{
        i=(i+1)%count;getSlides().forEach((n,j)=>n.hidden=i!==j);
      }
    };
    if(!sw){
      slider.classList.add('nl-carousel-fallback');
      const draw=()=>getSlides().forEach((n,j)=>n.hidden=i!==j);
      getSlides().forEach((n,j)=>n.hidden=j!==0);
      for(const [name,by] of [['.slider_prev',-1],['.slider_next',1]]){
        $(name,host)?.addEventListener('click',e=>{e.preventDefault();i=(i+by+getSlides().length)%getSlides().length;draw();schedule();});
      }
    }
    const schedule=()=>{
      clearTimeout(timer);
      if(!paused&&!hover&&!focus&&visible&&!document.hidden&&getSlides().length>1)timer=setTimeout(()=>{choose();schedule();},delay);
    };
    if('IntersectionObserver'in window)new IntersectionObserver(items=>{visible=items[0].isIntersecting;schedule();},{threshold:.13}).observe(slider);
    else visible=true;
    if(sw){sw.update();sw.on('slideChange',schedule);}
    if(!manual){
      host.addEventListener('mouseenter',()=>{hover=true;schedule();});
      host.addEventListener('mouseleave',()=>{hover=false;schedule();});
    }
    host.addEventListener('focusin',()=>{focus=true;schedule();});
    host.addEventListener('focusout',e=>{focus=host.contains(e.relatedTarget);schedule();});
    document.addEventListener('visibilitychange',schedule);
    schedule();
    return {show(index){if(sw){sw.slideTo(index,0);return;}i=index;getSlides().forEach((n,j)=>n.hidden=i!==j);schedule();}};
  }
  function reading(d){
    const host=$('[data-nl-reading]');if(!host)return;
    $$('[data-nl-reading-id]',host).forEach(n=>{
      const read=find(d.reading,n.dataset.nlReadingId), article=find(d.articles,n.dataset.nlReadingId), orig=find(seed.reading,n.dataset.nlReadingId), origA=find(seed.articles,n.dataset.nlReadingId);
      if(!read)return;
      const body=article&&!same(article,origA)?[article.summary,article.body].join('\n\n'):read.body;
      const title=article&&!same(article,origA)?article.title:read.title;
      n.replaceChildren(make('p','nl-reading-title',title));paragraphs(n,body);
    });
    startCarousel(host,130000,true);
  }
  let feedbackCarousel, feedbackTemplate, feedbackSignature='', feedbackPollTimer, feedbackPollInFlight=false, feedbackPollFailed=false, latestSiteContent=seed;
  function communityPanel(){
    if($('[data-nl-feedback]'))return null;
    let panel=$('[data-nl-community-panel]');
    if(panel)return panel;
    panel=make('section','nl-community-feedback');panel.dataset.nlCommunityPanel='';
    panel.append(make('p','nl-community-eyebrow','Community'));
    panel.append(make('h2','','Community feedback'));
    panel.append(make('p','nl-community-intro','Thoughts shared by NightLock visitors.'));
    const list=make('div','nl-community-feedback-list');list.dataset.nlCommunityFeedbackList='';
    list.setAttribute('aria-live','polite');panel.append(list);
    const form=make('form','nl-community-feedback-form');form.id='nl-feedback-form';
    const name=make('input');name.type='text';name.name='name';name.maxLength=80;name.required=true;name.autocomplete='name';name.placeholder='Your name';name.setAttribute('aria-label','Your name');
    const message=make('textarea');message.name='text';message.maxLength=1200;message.required=true;message.rows=4;message.placeholder='Share your feedback';message.setAttribute('aria-label','Your feedback');
    const consent=make('input');consent.type='checkbox';consent.name='consent';consent.value='on';consent.required=true;
    const consentLabel=make('label','nl-community-consent');consentLabel.append(consent,make('span','','I agree to display my feedback publicly.'));
    const submit=make('button','','Send feedback');submit.type='submit';
    form.append(make('label','nl-community-field'),make('label','nl-community-field'),consentLabel,submit,make('p','nl-community-form-status'));
    $('label:nth-child(1)',form).append(make('span','','Name'),name);
    $('label:nth-child(2)',form).append(make('span','','Feedback'),message);
    const status=form.lastElementChild;status.setAttribute('role','status');
    panel.append(form);
    const footer=$('.page_footer_wrap')||$('footer');
    (footer?.parentElement||document.body).insertBefore(panel,footer||null);
    publicForm(form,'feedback');
    return panel;
  }
  function feedback(d,showNewest=false){
    const entries=(d.feedback||[]).map(f=>({id:f.id||'',author:f.name||'Visitor',body:f.text||''}));
    const signature=JSON.stringify(entries);
    const panel=communityPanel(),list=panel&&$('[data-nl-community-feedback-list]',panel);
    if(list&&list.dataset.signature!==signature){
      list.dataset.signature=signature;
      list.replaceChildren();
      if(!entries.length)list.append(make('p','nl-community-empty','No visitor feedback yet. Be the first to share your thoughts.'));
      entries.forEach(f=>{
        const card=make('article','nl-community-feedback-card');
        card.append(make('p','',f.body),make('p','nl-feedback-credit','— '+f.author));
        list.append(card);
      });
    }
    const host=$('[data-nl-feedback]');if(!host)return;
    const slider=$('.slider_container',host),track=slider&&$('.swiper-wrapper',slider);
    if(!slider||!track)return;
    feedbackTemplate??=track.querySelector('.swiper-slide')?.cloneNode(true);
    if(!feedbackTemplate)return;
    if(signature!==feedbackSignature){
      if(!feedbackCarousel&&slider.swiper&&!slider.swiper.destroyed)slider.swiper.destroy(true,true);
      const slides=entries.map((x,i)=>{
        const n=feedbackTemplate.cloneNode(true);
        n.className='slider-slide swiper-slide';n.removeAttribute('style');n.removeAttribute('data-swiper-slide-index');n.dataset.slideNumber=i;
        const content=$('.sc_testimonials_item_content',n);
        if(content){content.replaceChildren();paragraphs(content,x.body);content.append(make('p','nl-feedback-credit',x.author));}
        return n;
      });
      track.replaceChildren(...(slides.length?slides:[make('div','slider-slide swiper-slide sc_testimonials_item_content','No visitor feedback yet. Be the first to share yours.')]));
      const bullets=$('.slider_pagination_wrap',host);if(bullets)bullets.hidden=true;
      feedbackCarousel??=startCarousel(host,11000);
      slider.swiper?.update();
      if(showNewest&&entries.length)feedbackCarousel?.show(0);
    }
    feedbackSignature=signature;
  }
  async function refreshPublicFeedback(force=false){
    if(location.protocol==='file:'||feedbackPollInFlight)return;
    feedbackPollInFlight=true;
    try{
      const response=await fetch(endpoint('feedback'),{cache:'no-store'});
      if(!response.ok)throw Error('Feedback refresh failed ('+response.status+').');
      const result=await response.json();
      if(!Array.isArray(result.entries))throw Error('The feedback response was invalid.');
      const updated={...latestSiteContent,feedback:result.entries};
      const previous=JSON.stringify(latestSiteContent.feedback||[]);
      const next=JSON.stringify(result.entries);
      if(force||previous!==next){latestSiteContent=updated;feedback(updated,true);}
      feedbackPollFailed=false;
      const notice=$('[data-nl-feedback-refresh-status]');
      if(notice)set(notice,'');
    }catch(error){
      let notice=$('[data-nl-feedback-refresh-status]');
      if(!notice){
        const host=$('[data-nl-community-panel]')||$('[data-nl-feedback]');
        if(host){notice=make('p','nl-feedback-refresh-status');notice.dataset.nlFeedbackRefreshStatus='';notice.setAttribute('role','status');host.append(notice);}
      }
      if(notice)set(notice,'Feedback could not be refreshed. Check your connection and try again.');
      if(!feedbackPollFailed){console.error('NightLock feedback could not be refreshed.',error);feedbackPollFailed=true;}
    }finally{feedbackPollInFlight=false;}
  }
  function startFeedbackPolling(){
    if(location.protocol==='file:'||feedbackPollTimer)return;
    refreshPublicFeedback();
    feedbackPollTimer=setInterval(()=>refreshPublicFeedback(),1000);
  }
  function stats(d) {
    $$('[data-nl-stats]').forEach(root=>{
      const values=$$('.sc_skills_total',root),titles=$$('.sc_skills_item_title',root);
      const apply=(i,s)=>{
        const n=values[i];if(!n)return;
        set(titles[i],s.label);set(n,s.value);
        for(const key of ['data-stop','data-speed','data-duration','data-start','data-ed'])n.removeAttribute(key);
        n.dataset.nlCounter=s.value;
        const m=/^(\d+)(.*)$/.exec(s.value);
        if(!m||matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver'in window))return;
        const obs=new IntersectionObserver(entries=>{
          if(!entries[0].isIntersecting)return;
          obs.disconnect();const start=performance.now(),target=Number(m[1]);
          const animate=now=>{const p=Math.min(1,(now-start)/1250);set(n,Math.round(target*(1-Math.pow(1-p,3)))+m[2]);if(p<1)requestAnimationFrame(animate);};requestAnimationFrame(animate);
        },{threshold:.22});obs.observe(n);
      };
      d.stats.slice(0,4).forEach((s,i)=>apply(i,s));
    });
  }
  function eventRow(r,item) {
    r.dataset.nlRecord=item.id;
    const to=route('event',item.id), h=$('.tribe-events-calendar-list__event-title a',r);
    if(h){set(h,item.title);href(h,to);}
    if(h)h.title=item.title;
    const dateBox=$('.tribe-events-calendar-list__event-datetime',r);
    if(dateBox){const label=date(item)+(item.end&&!item.dateDisplay?' – '+fmt(item.end):'')+(item.eventTime?' · '+item.eventTime:'');set(dateBox,label);dateBox.dateTime=item.date;}
    set($('.tribe-events-calendar-list__event-date-tag-weekday',r),fmt(item.date,{weekday:'short'}));
    set($('.tribe-events-calendar-list__event-date-tag-daynum',r),item.date.slice(-2));
    const photo=$('img',r);
    if(item.image){
      image(photo,item.image,item.title);
      if(photo&&photo.parentElement?.tagName!=='A'){
        const l=a('',to);photo.before(l);l.append(photo);l.setAttribute('aria-label','Read '+item.title);
      }else if(photo)href(photo.parentElement,to);
    }else if(photo)photo.remove();
    const venue=$('.tribe-events-calendar-list__event-venue',r);
    if(venue){set(venue,item.location);venue.hidden=!item.location;}
    const dsc=$('.tribe-events-calendar-list__event-description',r);
    if(dsc){dsc.classList.remove('tribe-common-a11y-hidden');set(dsc,item.summary);}
    const details=$('.tribe-events-calendar-list__event-details',r), action=$('.tribe-events-calendar-list__event-cost',r);
    if(details&&action&&item.status){
      const m=make('p','post_meta',item.status);action.before(m);
    }
    if(action){const link=$('a',action);if(link)href(link,to);else action.append(button('Read',to));}
    return r;
  }
  function events(d){
    const root=$('[data-nl-events]');if(!root)return;
    const baseMonth=$('.tribe-events-calendar-list__month-separator',root)?.cloneNode(true);
    const originals=new Map($$('[data-nl-record]',root).map(r=>[r.dataset.nlRecord,r.cloneNode(true)]));
    const search=$('#nightlock-event-search'), searchInput=search&&$('input[type="search"]',search);
    let term=(query.get('q')||'').trim();if(searchInput)searchInput.value=term;
    search?.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();
      term=searchInput.value.trim();refresh(view);},true);
    const announcements=(d.upcoming||[]).filter(r=>r.type==='event').map(r=>({...r,date:sriLankaDate(r.publishAt),
      dateDisplay:releaseLabel(r.publishAt),eventTime:'',image:'',summary:'',status:'Scheduled release'}));
    const all=[...d.events,...announcements].sort((a,b)=>a.date.localeCompare(b.date));
    const selection=$('[data-nl-event-date]'), dateButton=$('.tribe-events-c-top-bar__datepicker-button');
    let view=['list','month','day'].includes(query.get('view'))?query.get('view'):'list';
    let day=/^\d{4}-\d{2}-\d{2}$/.test(query.get('date')||'')&&fmt(query.get('date'))?query.get('date'):iso();
    const bar=$$('[data-nl-view]');
    const refresh=(mode,newDay=day)=>{
      view=mode;day=newDay;
      const u=new URL(location.href);u.searchParams.set('view',view);
      if(view==='list')u.searchParams.delete('date');else u.searchParams.set('date',day);
      if(term)u.searchParams.set('q',term);else u.searchParams.delete('q');
      if(location.protocol!=='file:')history.replaceState(null,'',u.href);
      draw();
    };
    const menu=$('.tribe-events-c-view-selector__content'), toggle=$('[data-nl-view-toggle]');
    if(toggle&&menu)toggle.addEventListener('click',e=>{
      e.preventDefault();e.stopImmediatePropagation();
      const expanded=menu.classList.contains('nl-view-open');
      menu.classList.toggle('nl-view-open',!expanded);menu.setAttribute('aria-hidden',String(expanded));
      toggle.setAttribute('aria-expanded',String(!expanded));
    },true);
    bar.forEach(n=>n.addEventListener('click',e=>{
      e.preventDefault();e.stopImmediatePropagation();
      menu?.classList.remove('nl-view-open');menu?.setAttribute('aria-hidden','true');toggle?.setAttribute('aria-expanded','false');
      refresh(n.dataset.nlView);
    },true));
    if(selection){selection.addEventListener('change',()=>{if(selection.value)refresh(view==='list'?'day':view,selection.value);});}
    $$('[data-nl-event-step]').forEach(n=>n.addEventListener('click',e=>{
      e.preventDefault();e.stopImmediatePropagation();
      const step=n.dataset.nlEventStep;
      if(step==='today'){refresh(view==='list'?'day':view,iso());return;}
      const k=step==='prev'?-1:1;
      refresh(view==='list'?'month':view,view==='day'?shifted(day,0,k):shifted(day,k));
    },true));
    if(dateButton)dateButton.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(selection){selection.hidden=!selection.hidden;if(!selection.hidden)selection.focus();}},true);
    const group=(heading,entries)=>{
      if(!entries.length)return;
      if(baseMonth){
        const clone=baseMonth.cloneNode(true);
        set($('time',clone)||$('h3',clone),heading);root.append(clone);
      }
      for(const item of entries){
        const old=originals.get(item.id), unchanged=old&&same(item,find(seed.events,item.id));
        const row=old?.cloneNode(true)||template('nl-event-template');if(!row)continue;
        if(unchanged){$$('a',row).forEach(n=>href(n,route('event',item.id)));root.append(row);}
        else root.append(eventRow(row,item));
      }
    };
    function draw(){
      root.dataset.view=view;
      const month=day.slice(0,7);
      const named=fmt(month+'-01',{month:'long',year:'numeric'});
      if(selection){selection.value=day;selection.hidden=view==='list';}
      $$('.tribe-events-c-top-bar__datepicker-time span').forEach(n=>set(n,view==='list'?'Upcoming':view==='month'?named:fmt(day)));
      const viewName=$('.tribe-events-c-view-selector__button-text');set(viewName,view[0].toUpperCase()+view.slice(1));
      bar.forEach(n=>{
        const selected=n.dataset.nlView===view;n.closest('li')?.classList.toggle('tribe-events-c-view-selector__list-item--active',selected);
        if(selected)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');
      });
      root.replaceChildren();
      const filteredAll=term?all.filter(e=>[e.title,e.summary,e.body,e.organizer,e.location,e.status].some(v=>String(v||'').toLowerCase().includes(term.toLowerCase()))):all;
      const published=filteredAll.filter(e=>!isArchive(e));
      if(view==='list'){
        const upcoming=published.filter(e=>(e.end||e.date)>=iso());
        group('Upcoming and ongoing',upcoming);
        group('Past events and releases',published.filter(e=>(e.end||e.date)<iso()).reverse());
        if(!root.children.length)root.append(make('li','tribe-events-calendar-list__month-separator',term?'No events match “'+term+'”.':'No events have been published.'));
      }else if(view==='day'){
        const relevant=published.filter(e=>e.date<=day&&(e.end||e.date)>=day);
        group(fmt(day),relevant);
        if(!relevant.length)root.append(make('li','tribe-events-calendar-list__month-separator','No events on '+fmt(day)+'.'));
      }else{
        const li=make('li','nl-month-panel'), grid=make('div','nl-month-grid');
        grid.setAttribute('aria-label',named);
        for(const k of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])grid.append(make('span','nl-month-week',k));
        const start=new Date(month+'-01T00:00:00Z').getUTCDay(), parts=month.split('-').map(Number);
        const count=new Date(Date.UTC(parts[0],parts[1],0)).getUTCDate();
        for(let k=0;k<start;k++)grid.append(make('span'));
        for(let k=1;k<=count;k++){
          const dt=month+'-'+String(k).padStart(2,'0');
          const n=make('button','tribe-common-c-btn-border-small',String(k));n.type='button';
          const nEvents=published.filter(e=>e.date<=dt&&(e.end||e.date)>=dt).length;
          if(nEvents)n.append(make('small','',String(nEvents)));
          n.setAttribute('aria-label',fmt(dt)+(nEvents?', '+nEvents+' events':''));
          n.onclick=()=>refresh('day',dt);grid.append(n);
        }
        li.append(grid);root.append(li);
        const filtered=published.filter(e=>e.date.slice(0,7)<=month&&(e.end||e.date).slice(0,7)>=month);
        group(named,filtered);
        if(!filtered.length)root.append(make('li','tribe-events-calendar-list__month-separator','No events this month.'));
      }
      applyOverrides(d,root);
    }
    draw();
  }
  const sriLankaDate=stamp=>new Date(new Date(stamp).getTime()+19800000).toISOString().slice(0,10);
  const releaseLabel=stamp=>new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Colombo'}).format(new Date(stamp))+' SLST';
  function calendarTeasers(d){
    const originals=$$('[data-nl-calendar-row]');if(!originals.length)return;
    const queued=(d.upcoming||[]).map(r=>({...r,instant:new Date(r.publishAt),queued:true}));
    const upcomingEvents=d.events.filter(r=>!isArchive(r)&&r.calendar===true&&(r.end||r.date)>=iso()).map(r=>({...r,type:'event',instant:new Date(r.date+'T00:00:00+05:30')}));
    const upcoming=[...queued,...upcomingEvents].sort((a,b)=>a.instant-b.instant).slice(0,1);
    const linkTo=(n,type,id,title)=>{
      if(!n)return;
      const link=a(title||n.textContent,route(type,id),'nl-calendar-title');n.replaceChildren(link);
    };
    if(!upcoming.length){
      originals.slice(1).forEach(r=>r.remove());
      linkTo($('[data-nl-cal="title"]',originals[0]),'event',originals[0].dataset.nlCalendarRow);
      return;
    }
    const root=originals[0].parentElement;
    const dividers=$$('[data-nl-cal-divider]',root);
    originals.forEach((original,i)=>{
      const item=upcoming[i];if(!item){original.remove();return;}
      const row=template('nl-upcoming-template');if(!row)return;
      row.dataset.nlCalendarRow=item.id;
      const fmtDate=opts=>new Intl.DateTimeFormat('en',{...opts,timeZone:'Asia/Colombo'}).format(item.instant);
      set($('[data-nl-cal="day"]',row),fmtDate({day:'numeric'}));
      set($('[data-nl-cal="month"]',row),fmtDate({month:'long',year:'numeric'}));
      linkTo($('[data-nl-cal="title"]',row),item.type,item.id,item.title);
      set($('[data-nl-cal="location"]',row),item.location||(item.type==='article'?'NightLock article':'NightLock event'));
      set($('[data-nl-cal="time"]',row),item.queued?fmtDate({hour:'numeric',minute:'2-digit'})+' SLST · Scheduled release':item.eventTime||item.status||'');
      original.replaceWith(row);
    });
    dividers.forEach((divider,i)=>{if(i+1>=upcoming.length)divider.remove();});
  }
  function schedule(d){
    const host=$('[data-nl-schedule]');if(!host)return;
    const root=$('.elementor-tabs',host);
    const desktop=$('.elementor-tabs-wrapper',host), content=$('.elementor-tabs-content-wrapper',host);
    if(!root||!desktop||!content)return;
    const current=$$('[data-nl-schedule-id]',content), existing=new Map(current.map(r=>[r.dataset.nlScheduleId,r]));
    const update=(row,x,old,force)=>{
      const cols=$$('h6',row);
      if(force||x.title!==old?.title){const h=cols[1];if(h){const n=$('a',h)||a('',route(x.type||'event',x.id));set(n,x.title);if(!n.parentNode)h.replaceChildren(n);}}
      if(force||x.organizer!==old?.organizer)set(cols[2],x.organizer);
      if(force||x.location!==old?.location)set(cols[3],x.location);
      const status=$$('.elementor-widget-heading',row).at(-1);
      if(status&&(force||x.status!==old?.status)){const t=$('.elementor-heading-title',status);if(t)set(t,x.status);}
      if(force||x.date!==old?.date||x.dateDisplay!==old?.dateDisplay)set(cols[0],date(x));
      $$('a',row).forEach(n=>href(n,route(x.type||'event',x.id)));
    };
    const announced=(d.upcoming||[]).map(r=>({...r,date:sriLankaDate(r.publishAt),dateDisplay:releaseLabel(r.publishAt),organizer:'NightLock',location:r.type==='article'?'Article':'Event',status:'Scheduled release'}));
    const arr=[...d.events.filter(e=>e.schedule&&!isArchive(e)),...announced].sort((a,b)=>a.date.localeCompare(b.date));
    const hasCalendarChange=arr.some(x=>{
      const old=find(seed.events,x.id);return !old||x.date!==old.date||!existing.has(x.id);
    })||current.some(r=>!find(arr,r.dataset.nlScheduleId));
    if(!hasCalendarChange){
      arr.forEach(e=>{const row=existing.get(e.id);if(row)update(row,e,find(seed.events,e.id),false);});
      return;
    }
    const groups=[...new Set(arr.map(e=>e.date.slice(0,7)))];
    const desktopSample=desktop.firstElementChild, mobileSample=content.firstElementChild, panelSample=$('.elementor-tab-content',content);
    if(!desktopSample||!mobileSample||!panelSample)return;
    desktop.replaceChildren();content.replaceChildren();
    if(!groups.length){content.append(make('p','','No events are scheduled.'));return;}
    groups.forEach((month,j)=>{
      const i=j+1;
      const t=desktopSample.cloneNode(false),m=mobileSample.cloneNode(false),p=panelSample.cloneNode(false);
      t.id='nightlock-schedule-tab-'+i;p.id='nightlock-schedule-panel-'+i;
      t.setAttribute('aria-controls',p.id);m.setAttribute('aria-controls',p.id);p.setAttribute('aria-labelledby',t.id);
      t.dataset.tab=m.dataset.tab=p.dataset.tab=String(i);
      const title='Day #'+i+' - '+fmt(month+'-01',{month:'short',year:'numeric'});
      set(t,title);set(m,title);
      for(const e of arr.filter(x=>x.date.startsWith(month))){
        const old=find(seed.events,e.id), n=existing.get(e.id)?.cloneNode(true)||template('nl-schedule-template');
        if(n){n.dataset.nlScheduleId=e.id;update(n,e,old,!existing.has(e.id));p.append(n);}
      }
      desktop.append(t);content.append(m,p);
    });
    const activate=i=>{
      $$('[data-tab]',root).forEach(n=>{
        const on=n.dataset.tab===String(i);
        n.classList.toggle('elementor-active',on);
        if(n.classList.contains('elementor-tab-content')){n.hidden=!on;n.style.display=on?'block':'none';n.setAttribute('aria-hidden',String(!on));}
        else{n.setAttribute('aria-selected',String(on));n.setAttribute('aria-expanded',String(on));n.tabIndex=on?0:-1;}
      });
    };
    $$('[role="tab"],.elementor-tab-title',root).forEach(n=>{
      n.onclick=()=>activate(n.dataset.tab);
      n.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();activate(n.dataset.tab);}};
    });activate(1);
  }
  function heroFallback(){
    const host=$('[data-nl-hero]'), module=$('sr7-module',host||document);if(!host||!module)return;
    const detect=()=>{
      if(module.classList.contains('nl-hero-fallback'))return;
      const slide=$('sr7-slide[data-key]:not([aria-hidden="true"])',module);
      const rendered=slide?.getBoundingClientRect();
      const text=slide?.querySelector('sr7-txt');
      if(rendered?.height>100&&text?.getBoundingClientRect().width>40)return;
      const fallback=$('[data-nl-hero-backup]',host);
      if(fallback){fallback.hidden=false;module.hidden=true;}
    };
    addEventListener('load',()=>setTimeout(detect,400),{once:true});
    setTimeout(detect,2600);
  }
  scrollControl();
  eventQuickInfo();
  publicForm('nl-subscribe','subscribe');
  if(feedbackPage)publicForm('nl-feedback-form','feedback');
  heroFallback();
  let liveRevision=0,liveSiteLoaded=false,liveRevisionTimer=0;
  function startLiveRevisionPolling(){
    if(location.protocol==='file:'||liveRevisionTimer)return;
    let checking=false,warned=false;
    liveRevisionTimer=setInterval(async()=>{
      if(checking||document.visibilityState==='hidden')return;
      const focused=document.activeElement;
      if(focused?.matches('input:not([type="submit"]),textarea,select,[contenteditable="true"]'))return;
      checking=true;
      try{
        if(!liveSiteLoaded){
          const response=await fetch(endpoint('site'),{cache:'no-store'});
          if(!response.ok)throw new Error('Public site data request failed: '+response.status);
          location.reload();return;
        }
        const response=await fetch(endpoint('revision'),{cache:'no-store'});
        if(!response.ok)throw new Error('Live update check failed: '+response.status);
        const data=await response.json();
        if(!Number.isSafeInteger(data.revision))throw new Error('Live update response has no valid revision.');
        warned=false;
        if(data.revision!==liveRevision)location.reload();
      }catch(error){
        if(!warned){console.warn('NightLock live update check failed; it will retry.',error);warned=true;}
      }finally{checking=false;}
    },3000);
  }
  function run(d,fromServer=false){
    latestSiteContent=d;
    liveRevision=Number.isSafeInteger(Number(d.revision))?Number(d.revision):0;
    liveSiteLoaded=fromServer;
    markNav(d);articleLists(d);serviceList(d);people(d);detail(d);album(d);events(d);calendarTeasers(d);schedule(d);stats(d);videos(d);
    editable(d);
    startLiveRevisionPolling();
    const carousel=()=>{reading(d);if(feedbackPage){feedback(d);startFeedbackPolling();}};
    // Wait for the archived theme to initialise Swiper before attaching our controls.
    if(document.readyState==='complete')carousel();else {let done=false;const ready=()=>{if(!done){done=true;carousel();}};addEventListener('load',ready,{once:true});setTimeout(ready,1250);}
  }
  if(location.protocol==='file:'){run(seed);return;}
  const stop=new AbortController(), timer=setTimeout(()=>stop.abort(),2000);
  fetch(endpoint('site'),{signal:stop.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json();})
    .then(data=>{clearTimeout(timer);run(data,true);},()=>{clearTimeout(timer);run(seed,false);});
})();
