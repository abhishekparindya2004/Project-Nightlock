(() => {
  'use strict';
  const $=(q,r=document)=>r.querySelector(q);
  const auth=$('#auth'), workspace=$('#workspace'), signout=$('#signout'), publish=$('#publish'), status=$('#status'), editor=$('#editor');
  const tabs=$('#sections');
  const pageNames={'index':'Home','observatory':'Observatory','about-spherex':'About SPHEREx','our-services':'Our Services','our-team':'Our Team','team-member':'Team Member','astronut':'Astronaut Profile','event':'Events','gallery':'Gallery','blog':'Blog','details':'Details'};
  const config={
    fields:'Page text & links',articles:'Articles & details',events:'Events',people:'Profiles',services:'Services',gallery:'Gallery',blocks:'New page blocks',videos:'Video sections',reading:'SPHEREx reading',stats:'Counters',feedback:'Feedback review',settings:'Site settings',newsletter:'Newsletter'
  };
  const placements=[['home','Home · Latest Observations'],['recent','Blog · Recent articles'],['popular','Blog · Popular news'],['latest','Gallery · Latest articles'],['mission','Observatory / About SPHEREx · Mission updates'],['guides','Our Services · Observing guides']];
  let csrf='', site, revision, manifest, dirty=false, active='fields', currentPage='index';
  let requestCount=0, editGeneration=0;
  const make=(tag,text='',cls='')=>{
    const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;
  };
  const add=(n,...children)=>{n.append(...children.filter(Boolean));return n;};
  const btn=(text,fn,cls='secondary')=>{const b=make('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;};
  const info=(text)=>make('p',text,'muted');
  const message=(text,bad=false)=>{status.textContent=text;status.classList.toggle('error',bad);};
  const updatePublish=()=>{publish.disabled=!dirty||requestCount>0;publish.textContent=dirty?'Publish changes':'Published';};
  const changed=()=>{dirty=true;editGeneration++;updatePublish();message('You have unpublished changes.');};
  const opts=(n,values)=>{
    values.forEach(([value,label])=>{const o=make('option',label);o.value=value;n.append(o);});return n;
  };
  const confirmRemove=(label)=>window.confirm('Remove '+label+' from the draft? This takes effect after you publish.');
  const slug=(s)=>s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
  const nextID=(array,k)=>{
    let id=k+'-'+Date.now().toString(36);
    while(array.some(r=>r.id===id))id+='x';return id;
  };
  async function api(path,options={}) {
    const headers=options.headers||{};
    if(options.method==='POST')headers['X-CSRF-Token']=csrf;
    const response=await fetch('/api/admin/'+path,{...options,headers,credentials:'same-origin'});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'The request could not be completed.');
    return data;
  }
  const post=(path,payload)=>api(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const activate=async()=>{
    const result=await api('site');
    csrf=result.csrf;site=result.site;revision=result.revision;manifest=result.fields;
    dirty=false;auth.hidden=true;workspace.hidden=false;signout.hidden=false;updatePublish();render();
  };
  $('#login').addEventListener('submit',async e=>{
    e.preventDefault();
    const form=e.target,n=$('#auth-status'),submit=$('button',form);
    submit.disabled=true;n.textContent='Signing in…';
    try{
      await post('login',Object.fromEntries(new FormData(form)));
      form.reset();n.textContent='';await activate();
    }catch(err){n.textContent=err instanceof SyntaxError?'Start the NightLock server before opening the admin panel.':err.message;}
    finally{submit.disabled=false;}
  });
  signout.addEventListener('click',async()=>{
    if(dirty&&!window.confirm('Discard unpublished changes and sign out?'))return;
    try{await post('logout',{});dirty=false;location.reload();}
    catch(e){message(e.message,true);}
  });
  publish.addEventListener('click',async()=>{
    if(!dirty||requestCount)return;
    if([...site.articles,...site.events].some(r=>r.publishAt===null)){message('Set a release date and time, or select Publish now.',true);return;}
    requestCount++;updatePublish();message('Publishing…');const generation=editGeneration;
    try{
      const out=await post('site',{site,revision});revision=out.revision;
      dirty=generation!==editGeneration;
      message((dirty?'Published the saved snapshot. New edits remain in your draft.':'Published to the website.')+(out.queued?' '+out.queued+' email update(s) queued.':''));
    }catch(e){message(e.message,true);}
    finally{requestCount--;updatePublish();}
  });
  addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  function field(record,key,label,type='text',cfg={}) {
    const wrap=make('label','',type==='checkbox'?'check':'control');
    let input;
    if(type==='textarea'){
      input=make('textarea');input.rows=cfg.rows||4;
    }else if(type==='select'){input=opts(make('select'),cfg.options);}
    else {input=make('input');input.type=type==='media'?'text':type;}
    if(type==='checkbox')input.checked=record[key]===true;
    else input.value=record[key]??'';
    input.addEventListener(type==='checkbox'||type==='select'?'change':'input',()=>{
      record[key]=type==='checkbox'?input.checked:input.value;
      if(cfg.updated)cfg.updated(input.value);
      changed();
    });
    if(type==='checkbox')wrap.append(input,make('span',label));
    else wrap.append(make('span',label),input);
    if(cfg.placeholder)input.placeholder=cfg.placeholder;
    if(type!=='media')return wrap;
    const shell=add(make('div','','media-field'),wrap);
    const upload=make('input');upload.type='file';upload.accept=cfg.accept||'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf,text/plain';
    const fileLabel=add(make('label','','file-label'),make('span','Upload a file'),upload);
    const output=make('small','','muted');output.setAttribute('role','status');
    upload.addEventListener('change',async()=>{
      const f=upload.files[0];if(!f)return;
      if(f.size>30*1024*1024){output.textContent='Choose a file under 30 MB.';return;}
      requestCount++;updatePublish();upload.disabled=true;output.textContent='Uploading…';
      try{
        const mime={csv:'text/csv',json:'application/json',txt:'text/plain'}[f.name.split('.').pop().toLowerCase()]||f.type||'application/octet-stream';
        const out=await api('media',{method:'POST',headers:{'Content-Type':mime},body:f});
        record[key]=out.url;input.value=out.url;if(cfg.updated)cfg.updated(out.url);output.textContent='Uploaded. Publish to show it on the site.';changed();
      }catch(e){output.textContent=e.message;}
      finally{upload.value='';upload.disabled=false;requestCount--;updatePublish();}
    });
    shell.append(fileLabel,output);return shell;
  }
  const imageField=(record,key='image',name='Image URL or path')=>field(record,key,name,'media',{accept:'image/jpeg,image/png,image/webp,image/gif'});
  const videoField=(record,key='video',name='Video URL or upload')=>field(record,key,name,'media',{accept:'video/mp4,video/webm',placeholder:'MP4, WebM, YouTube or Vimeo link'});
  const docField=(record)=>field(record,'document','Data/document URL or upload','media',{accept:'application/pdf,text/plain,.csv,.json,.fits,.fit'});
  const group=(label,...children)=>add(make('fieldset'),make('legend',label),...children);
  function sublist(label,list,renderer,newValue){
    const panel=make('div','','sublist');
    const items=make('div','','sublist-items');
    const renderItems=()=>{
      items.replaceChildren(...list.map((r,i)=>add(make('div','','subrow'),...renderer(r),btn('Remove',()=>{list.splice(i,1);changed();renderItems();},'secondary danger'))));
    };
    panel.append(make('h3',label),items,btn('Add '+label.toLowerCase().replace(/s$/,''),()=>{list.push(newValue());changed();renderItems();}));
    renderItems();return panel;
  }
  const links=(r,key='sources',label='Sources')=>sublist(label,r[key]??=[],x=>[field(x,'label','Label'),field(x,'url','URL')],()=>({label:'',url:''}));
  function placementFields(r){
    r.placement??=[];
    const fs=group('Show this article in');
    placements.forEach(([key,label])=>{
      const b=make('input');b.type='checkbox';b.checked=r.placement.includes(key);
      b.addEventListener('change',()=>{r.placement=b.checked?[...r.placement,key]:r.placement.filter(i=>i!==key);changed();});
      fs.append(add(make('label','','check'),b,make('span',label)));
    });return fs;
  }
  function releaseFields(r){
    const delayed=Boolean(r.publishAt)||r.publishAt===null;
    const choice={mode:delayed?'later':'now'};
    const offset=330*60*1000;
    const at={stamp:r.publishAt?new Date(new Date(r.publishAt).getTime()+offset).toISOString().slice(0,16):''};
    const instant=field(at,'stamp','Release date and time (Sri Lanka · UTC+05:30)','datetime-local',{updated:v=>{r.publishAt=v?new Date(v+'+05:30').toISOString():null;}});
    const schedule=make('div');schedule.hidden=!delayed;
    schedule.append(instant,field(r,'announce','Show as an upcoming release in Our events and Event schedule','checkbox'));
    const mode=field(choice,'mode','Release','select',{options:[['now','Publish now'],['later','Schedule for later']],updated:v=>{
      schedule.hidden=v!=='later';
      if(v==='later'){
        if(!at.stamp)at.stamp=new Date(Date.now()+offset+60*60*1000).toISOString().slice(0,16);
        instant.querySelector('input').value=at.stamp;
        r.publishAt=new Date(at.stamp+'+05:30').toISOString();r.announce=true;
        schedule.querySelector('input[type="checkbox"]').checked=true;
      }else r.publishAt='';
    }});
    return group('Publishing',mode,schedule,info('Use Publish changes to save. Scheduled details go live at the chosen time. Subscribers are notified when the record goes live.'));
  }
  function fieldsFor(k,r,labelNode){
    const grid=make('div','','fields-grid');
    if(k==='stats')return add(grid,field(r,'label','Label','text',{updated:x=>labelNode.textContent=x||'New counter'}),field(r,'value','Value'));
    const core=[field(r,'title','Title or name','text',{updated:x=>labelNode.textContent=x||'Untitled'}),field(r,'id','URL ID · lowercase letters, numbers and hyphens')];
    if(k==='reading')return add(grid,...core,field(r,'body','Reading text','textarea',{rows:12}));
    if(k==='gallery')return add(grid,...core,imageField(r),field(r,'alt','Image description for accessibility'),field(r,'description','Caption or note','textarea'));
    const text=add(make('div','','fields-grid'),...core,field(r,'summary','Short introduction','textarea'),field(r,'body','Detail page text · blank line between paragraphs','textarea',{rows:9}));
    if(k==='people'){
      const features=add(make('div','','fields-grid'),field(r,'role','Role'),field(r,'kind','Profile page type','select',{options:[['team','Team member'],['astronaut','Astronaut']]}),
        field(r,'linkedin','LinkedIn URL'),field(r,'profileLink','Optional custom profile destination'),field(r,'featured','Show in Blog → People to know (astronauts only)','checkbox'),imageField(r,'image','Portrait URL or upload'));
      const schools=sublist('Education institutes',r.institutes??=[],i=>[field(i,'title','Institution name'),imageField(i,'image','Logo')],()=>({title:'',image:''}));
      const extra=sublist('Profile sections',r.sections??=[],i=>[field(i,'title','Section heading'),field(i,'body','Text','textarea')],()=>({title:'',body:''}));
      return add(make('div','','stack'),text,features,schools,extra,links(r,'links','Profile links'));
    }
    const media=group('Media and documents',add(make('div','','fields-grid'),imageField(r),videoField(r),imageField(r,'poster','Video thumbnail'),docField(r)));
    if(k==='articles'){
      return add(make('div','','stack'),text,add(make('div','','fields-grid'),field(r,'category','Category'),field(r,'date','Display date (optional)','date')),releaseFields(r),placementFields(r),media,links(r));
    }
    if(k==='events'){
      const details=group('Calendar details',add(make('div','','fields-grid'),field(r,'date','Start date','date'),field(r,'end','End date (optional)','date'),
        field(r,'dateDisplay','Optional date label (e.g. December 2026)'),field(r,'location','Location'),field(r,'organizer','Organizer'),field(r,'status','Status'),
        field(r,'eventTime','Event time label (optional)'),field(r,'schedule','Show on the Observatory event schedule','checkbox'),field(r,'calendar','Show in the Gallery’s Our events section','checkbox')));
      return add(make('div','','stack'),text,details,releaseFields(r),media,links(r));
    }
    return add(make('div','','stack'),text,media,add(make('div','','fields-grid'),field(r,'link','Custom Read more destination (optional)'),field(r,'button','Button text')));
  }
  const collectionLabels={articles:'article',events:'event',people:'profile',services:'service',gallery:'gallery image',reading:'reading slide',stats:'counter'};
  const desc={
    articles:'A published article automatically has a Details page. Choose the lists where it should appear. Upload a PDF or plain-text file as an attachment and enter the title, summary, and main article text here.',
    events:'A published event appears in the Events calendar and has a Details page. Use the schedule checkbox to include it on the Observatory page.',
    people:"A published profile has its own link and detail page. Enter verified LinkedIn URLs only. Add institutes and logos for an individual; badges appear on that member's profile. The Blog's People to know section is for astronaut profiles.",
    services:'Edit the original service excerpts or add a new service. The list shows three entries per page. Leave a custom destination blank to use the service’s own detail page.',
    gallery:'Upload photos and edit their captions. Published items appear in the gallery album in this order.',
    reading:'Long slides advance at a reading pace. Where a slide’s URL ID matches an article, the article’s text is used so it only needs to be edited once.',
    stats:'Both the Observatory and Blog use these counters. Leading numbers animate as they scroll into view.'
  };
  function renderCollection(k){
    const records=site[k];const area=add(make('section','','editor-panel'),make('h2',config[k]),info(desc[k]));
    const grid=make('div','','records');
    const search=make('input');search.type='search';search.placeholder='Find by title';search.setAttribute('aria-label','Filter by title');
    const label=collectionLabels[k];
    const addRecord=()=>{
      const id=nextID(records,k.slice(0,4));const name=prompt('Title or name for the new '+label+'?');
      if(name===null||!name.trim())return;
      const value=k==='stats'?{label:name.trim(),value:''}:{title:name.trim(),id:slug(name)||id};
      if(records.some(i=>i.id===value.id)&&value.id)value.id=id;
      if(k==='articles'){value.category='Science';value.placement=['home','recent','popular','latest'];}
      if(k==='events'){value.date=new Date(Date.now()+19800000).toISOString().slice(0,10);value.schedule=true;value.calendar=true;}
      if(k==='people')value.kind='team';
      records.push(value);changed();search.value='';draw(value);
    };
    const draw=open=>{
      const term=search.value.trim().toLowerCase();grid.replaceChildren();
      records.forEach((r,i)=>{
        const name=r.title||r.label||'Untitled';
        if(term&&!name.toLowerCase().includes(term))return;
        const d=make('details','','record');d.open=r===open;
        const s=make('summary',name);
        const box=make('div','','record-inner');
        const move=(by)=>{const j=i+by;if(j<0||j>=records.length)return;[records[i],records[j]]=[records[j],records[i]];changed();draw(r);};
        d.append(s,box);
        const hydrate=()=>{
          if(box.childNodes.length||!d.open)return;
          box.append(fieldsFor(k,r,s),add(make('div','','record-actions'),
            i>0?btn('Move up',()=>move(-1)):null,i<records.length-1?btn('Move down',()=>move(1)):null,
            btn('Remove '+label,()=>{if(confirmRemove(name)){records.splice(i,1);changed();draw();}},'secondary danger')));
        };
        d.addEventListener('toggle',hydrate);hydrate();grid.append(d);
      });
      if(!grid.childNodes.length)grid.append(info('No entries match.'));
      if(open)grid.querySelector('details[open]')?.scrollIntoView({block:'nearest'});
    };
    search.addEventListener('input',()=>draw());
    area.append(add(make('div','','toolbar'),search,btn('Add '+label,addRecord,'primary')),grid);editor.replaceChildren(area);draw();
  }
  function pagePicker(cb,shared=false){
    const options=Object.entries(pageNames);
    if(shared)options.push(['shared navigation','Shared navigation']);
    const s=opts(make('select'),options);s.value=currentPage in pageNames||shared?currentPage:'index';
    if(!s.value)s.value='index';
    s.addEventListener('change',()=>{currentPage=s.value;cb();});
    return add(make('label','','control page-picker'),make('span','Page'),s);
  }
  function renderFields(){
    const panel=add(make('section','','editor-panel'),make('h2','Page text, images and links'),
      info('Edit the original content in place without changing its layout. Search by existing text or image name. For lists and detail pages, use the article, event, profile, and service editors.'),pagePicker(renderFields,true));
    const search=make('input');search.type='search';search.placeholder='Find text, link or image';search.setAttribute('aria-label','Find editable fields');
    panel.append(search);const list=make('div','','records');panel.append(list);
    editor.replaceChildren(panel);
    const draw=()=>{
      const term=search.value.trim().toLowerCase();list.replaceChildren();
      Object.entries(manifest).filter(([,v])=>v.page===currentPage||(currentPage==='team-member'&&v.page==='astronut'&&v.fields.image)).forEach(([key,v])=>{
        if(term&&!(v.label+' '+Object.values(v.fields).join(' ')).toLowerCase().includes(term))return;
        const d=make('details','','record'),name=make('summary',v.label||key),fields=make('div','','record-inner');
        d.append(name,fields);
        d.addEventListener('toggle',()=>{
          if(!d.open||fields.childNodes.length)return;
          const working={...v.fields,...site.overrides[key]};
          const edit=(f,label,type)=>field(working,f,label,type,{accept:f==='image'?'image/jpeg,image/png,image/webp,image/gif':undefined,updated:val=>{(site.overrides[key]??={})[f]=val;}});
          Object.keys(v.fields).forEach(f=>fields.append(edit(f,({text:'Text',url:'Destination URL',image:'Image URL or path',alt:'Image alternative text',placeholder:'Placeholder',title:'Hover title','aria-label':'Accessible label',value:'Button label'})[f],f==='image'?'media':f==='text'?'textarea':'text')));
          fields.append(btn('Restore original',()=>{delete site.overrides[key];changed();fields.replaceChildren();d.open=false;}));
        });
        list.append(d);
      });
      if(!list.childNodes.length)list.append(info('No matching fields. Content for this page is managed in its collection editor.'));
    };
    search.addEventListener('input',draw);draw();
  }
  function renderBlocks(){
    const panel=add(make('section','','editor-panel'),make('h2','Add page content'),
      info('New sections appear after the existing page content and before the newsletter. They use the site’s typography, colours and spacing.'),pagePicker(renderBlocks));
    const records=site.blocks[currentPage in pageNames?currentPage:'index']??=[];
    const rows=sublist('Content blocks',records,r=>[field(r,'title','Heading'),field(r,'body','Text','textarea'),imageField(r),field(r,'alt','Alternative text'),videoField(r),
      imageField(r,'poster','Video thumbnail'),docField(r),field(r,'url','Button destination'),field(r,'button','Button text')],()=>({title:'',body:''}));
    panel.append(rows);editor.replaceChildren(panel);
  }
  function renderVideos(){
    const panel=add(make('section','','editor-panel'),make('h2','Video sections'),
      info('Change the linked video or cover image without changing the original layout. Clear a URL to hide its play button.'));
    const entries=Object.entries(site.videos).filter(([id])=>id!=='our-services');
    const pick=opts(make('select'),entries.map(([id])=>[id,pageNames[id]||id]));
    if(entries.some(([id])=>id===currentPage))pick.value=currentPage;
    const fields=make('div');
    function draw(){const r=site.videos[pick.value];if(r)fields.replaceChildren(group(pageNames[pick.value]||pick.value,field(r,'title','Accessible title'),videoField(r,'url'),imageField(r,'poster','Video thumbnail')));}
    pick.addEventListener('change',()=>{currentPage=pick.value;draw();});
    panel.append(add(make('label','','control page-picker'),make('span','Page'),pick),fields);draw();
    editor.replaceChildren(panel);
  }
  function renderSettings(){
    const r=site.settings;
    const panel=add(make('section','','editor-panel'),make('h2','Site settings'),field(r,'siteName','Site name'),field(r,'newsletterTitle','Newsletter heading'),field(r,'newsletterDescription','Newsletter description'),
      field(r,'subscribeLabel','Subscribe button label'),field(r,'footerCallout','Footer callout text'));
    editor.replaceChildren(panel);
  }
  async function renderFeedback(){
    const panel=add(make('section','','editor-panel'),make('h2','Feedback review'),info('Visitor submissions appear in Community Feedback. Edit the name or text, hide submissions, or delete unwanted entries here.'));
    editor.replaceChildren(panel);
    try{
      const {entries}=await api('feedback');if(!panel.isConnected)return;
      if(!entries.length)panel.append(info('There are no submissions yet.'));
      entries.forEach(r=>{
        const row=add(make('article','','review-row'),make('span',' · '+r.status,'muted'));
        const name=make('input');name.type='text';name.maxLength=80;name.value=r.name;name.setAttribute('aria-label','Feedback author name');
        const text=make('textarea');text.maxLength=1200;text.rows=4;text.value=r.text;text.setAttribute('aria-label','Feedback text');
        row.append(add(make('label','','control'),make('span','Name'),name),add(make('label','','control'),make('span','Feedback'),text));
        const save=async()=>{
          if(!name.value.trim()||!text.value.trim()){message('Name and feedback text are required.',true);return;}
          try{await post('feedback',{id:r.id,status:'edit',name:name.value,text:text.value});message('Feedback changes saved.');renderFeedback();}
          catch(e){message(e.message,true);}
        };
        const set=async state=>{
          if(state==='delete'&&!window.confirm('Permanently delete this submission?'))return;
          try{await post('feedback',{id:r.id,status:state});message('Feedback updated.');renderFeedback();}
          catch(e){message(e.message,true);}
        };
        row.append(add(make('div','','record-actions'),btn('Save edits',save,'primary'),r.status==='approved'?btn('Hide',()=>set('hidden')):btn('Approve',()=>set('approved'),'secondary'),btn('Delete',()=>set('delete'),'secondary danger')));
        panel.append(row);
      });
    }catch(e){panel.append(info(e.message));}
  }
  async function renderNewsletter(){
    const panel=add(make('section','','editor-panel'),make('h2','Newsletter'),
      info('New articles, events, gallery uploads and newly attached documents queue an automatic email at publication. You can also queue a message here.'));
    editor.replaceChildren(panel);
    try{
      const r=await api('newsletter');if(!panel.isConnected)return;
      panel.append(info((r.ready?'Email delivery is configured.':'Email delivery is not configured. Configure SMTP and the public site URL on the server.')+' '+r.subscribers+' subscriber(s) · '+r.pending+' queued · '+r.sent+' sent · '+r.failed+' failed.'));
      if(r.failed)panel.append(btn('Retry failed emails',async()=>{
        try{const out=await post('newsletter',{action:'retry'});message(out.message);renderNewsletter();}catch(e){message(e.message,true);}
      }));
      const draft={subject:'',body:''};
      const n=(key,label,tag)=>{
        const input=make(tag);input.addEventListener('input',()=>draft[key]=input.value);return add(make('label','','control'),make('span',label),input);
      };
      panel.append(n('subject','Subject','input'),n('body','Message','textarea'),btn('Queue newsletter',async()=>{
        if(!draft.subject.trim()||!draft.body.trim()){message('Enter a subject and message first.',true);return;}
        if(!window.confirm('Queue this message for current subscribers?'))return;
        try{const out=await post('newsletter',draft);message(out.message);renderNewsletter();}
        catch(e){message(e.message,true);}
      },'primary'));
    }catch(e){panel.append(info(e.message));}
  }
  function render(){
    tabs.replaceChildren(...Object.entries(config).map(([id,label])=>{
      const b=btn(label,()=>{active=id;render();});b.setAttribute('aria-pressed',String(active===id));return b;
    }));
    if(active==='fields')renderFields();
    else if(active==='blocks')renderBlocks();
    else if(active==='videos')renderVideos();
    else if(active==='settings')renderSettings();
    else if(active==='feedback')renderFeedback();
    else if(active==='newsletter')renderNewsletter();
    else renderCollection(active);
  }
  activate().catch(()=>{updatePublish();});
})();
