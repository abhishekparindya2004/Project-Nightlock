(() => {
  'use strict';
  const script = document.currentScript;
  if (!script || customElements.get('nightlock-assistant')) return;
  const asset = new URL('.', script.src);
  const endpoint = new URL(script.dataset.endpoint || '/api/nightlock-ai', document.baseURI);
  const art = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 244" class="astronaut-art" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="nl-suit" x1="10%" y1="0%" x2="90%" y2="100%" gradientUnits="objectBoundingBox">
      <stop stop-color="#f6f9ff"/><stop offset=".46" stop-color="#e5eaf6"/><stop offset=".75" stop-color="#b8c4d9"/><stop offset="1" stop-color="#8a9ab5"/>
    </linearGradient>
    <linearGradient id="nl-shell" x1="0%" y1="0%" x2="70%" y2="100%">
      <stop stop-color="#ffffff"/><stop offset=".55" stop-color="#dce6f5"/><stop offset="1" stop-color="#8f9ebc"/>
    </linearGradient>
    <linearGradient id="nl-metal" x1="5%" y1="0%" x2="88%" y2="94%">
      <stop stop-color="#576d8b"/><stop offset="1" stop-color="#233347"/>
    </linearGradient>
    <linearGradient id="nl-glass" x1="18%" y1="12%" x2="80%" y2="98%">
      <stop stop-color="#111b33"/><stop offset=".43" stop-color="#1c3d58"/><stop offset=".73" stop-color="#326b82"/><stop offset="1" stop-color="#c39b78"/>
    </linearGradient>
    <linearGradient id="nl-glint" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop stop-color="#b3e9ff" stop-opacity=".82"/><stop offset=".77" stop-color="#a8d4ff" stop-opacity=".06"/>
    </linearGradient>
    <radialGradient id="nl-ground"><stop stop-color="#86caff" stop-opacity=".45"/><stop offset="1" stop-color="#7fa8ff" stop-opacity="0"/></radialGradient>
    <clipPath id="nl-visor-clip"><path d="M75 48c8-15 24-23 45-20 18 2 29 16 31 34 2 20-9 34-31 38-23 4-41-3-47-16-4-10-4-24 2-36z"/></clipPath>
  </defs>
  <ellipse class="ground" cx="103" cy="229" rx="70" ry="11" fill="url(#nl-ground)"/>
  <ellipse cx="103" cy="229" rx="34" ry="5" fill="#060916" opacity=".57"/>
  <g class="astronaut-body" stroke="#182639" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- Life support pack -->
    <path d="M130 93c13-1 23 3 25 12l3 36c0 7-6 11-13 12l-12 2-6-60z" fill="url(#nl-metal)"/>
    <path d="m143 104 9 2 3 27-8 1z" fill="#d2deef"/>
    <path d="m149 111 1 14" stroke="#92c4df"/>
    <!-- Legs and boots -->
    <path d="M84 159l24 4-6 25-3 28c-7 5-16 5-23-1l1-27z" fill="url(#nl-suit)"/>
    <path d="M111 161l24-6 5 34 1 25c-5 6-14 8-22 3l-5-28z" fill="url(#nl-suit)"/>
    <path d="M78 188c4-4 15-4 23 0l-1 13c-6 4-17 4-23-1zM116 189c7-5 17-7 23-4l2 13c-7 5-16 6-23 3z" fill="#aabbd2"/>
    <path d="m81 202 14 1m27 0 13-3" stroke="#d8e5f7"/>
    <path d="M77 211c5 3 12 4 21 0l2 11c0 5-5 8-11 8H71c-7-1-11-5-8-9 2-4 9-5 14-10z" fill="url(#nl-metal)"/>
    <path d="M121 212c6 3 13 3 20-2 2 4 4 6 10 8 6 2 6 8 1 10l-21 2c-6 0-12-2-12-7z" fill="url(#nl-metal)"/>
    <path d="M67 224c8 2 21 2 29-1m28 2c8 1 18-1 26-3" stroke="#91a4c1"/>
    <path d="M81 214l8 2m42 0 8-2" stroke="#e6edf8"/>
    <!-- Resting arm -->
    <path d="M129 103c10-4 19 2 22 12l7 31-11 9-12-4-8-33z" fill="url(#nl-suit)"/>
    <path d="m135 132 17-5m-15 13 17-5" fill="none" stroke="#a1adc4"/>
    <path d="m142 147 14-4 5 10-15 5z" fill="url(#nl-metal)"/>
    <path d="M147 156c-2 6 0 12 4 14 3 2 4 1 4-2l-1-4c3 6 7 5 8 2 2-3 1-10-2-14z" fill="url(#nl-suit)"/>
    <!-- Waving shoulder, forearm, and glove -->
    <g class="wave-arm">
      <path d="M87 100c-8-3-15-1-22 5l-15 12-5-19-16 4 4 27c1 9 9 14 18 11 14-5 26-14 38-23z" fill="url(#nl-suit)"/>
      <path d="m67 105 10 13m-16-8 10 12m-32-1 12-4m-14-3 12-4" fill="none" stroke="#a0aec7"/>
      <path d="M30 103c4-1 13-4 16-4l-2-11-16 4z" fill="url(#nl-metal)"/>
      <path d="M29 92c-5-5-8-8-10-12l-6-7c-3-5 1-8 5-5l6 6-5-18c-1-5 4-7 6-3l5 14-4-20c-1-5 5-7 7-2l4 20-2-19c0-5 6-5 7 0l2 20 2-13c1-5 7-4 7 1l-1 20c0 8-4 12-9 15z" fill="url(#nl-suit)"/>
      <path d="M26 75c5-6 12-6 16-2m-13 9c4 3 9 1 12-2" fill="none" stroke="#9badc5" stroke-width="1.45"/>
      <path d="m30 96 10-3" stroke="#f0956e" stroke-width="2"/>
    </g>
    <!-- Suit shell, harness, and chest console -->
    <path d="M82 99c5-6 17-9 29-9 10 0 22 6 28 15l-2 27 4 27c-1 13-15 20-32 20-18 0-33-8-33-20l4-28-3-17z" fill="url(#nl-suit)"/>
    <path d="M79 145c17 7 43 8 60-1l2 11c-16 10-49 10-64 1z" fill="url(#nl-metal)"/>
    <path d="M97 151c7 1 16 2 25-1l-1 10c-7 2-16 2-23 0z" fill="#cfdaef"/>
    <path d="M105 154h8" stroke="#7085a2"/>
    <path d="M84 102l7-5 7 7-9 31-7-3zM126 98l7 6 2 28-7 2-7-30z" fill="#a9b8d1"/>
    <path d="M94 115c5-3 23-4 29 0l1 22c-9 4-22 4-30 0z" fill="url(#nl-metal)"/>
    <path d="M99 119h19v9H99z" fill="#123349" stroke="#5b8bac" stroke-width="1"/>
    <path d="M101 124h4l2-3 2 5 2-2h5" fill="none" stroke="#87ddf9" stroke-width="1.3"/>
    <circle class="signal" cx="103" cy="133" r="1.65" fill="#91ecff" stroke="none"/>
    <circle cx="109" cy="133" r="1.35" fill="#f59b74" stroke="none"/>
    <circle cx="115" cy="133" r="1.35" fill="#b7c6de" stroke="none"/>
    <path d="M79 111l5-3 2 8-5 3z" fill="#eb946d" stroke-width="1"/>
    <path d="M135 109l3 7-3 5-3-6z" fill="#f0a97e" stroke-width="1"/>
    <!-- Neck lock and helmet -->
    <path d="M84 91c5-5 40-6 48-1l1 9c-10 7-37 7-47 1z" fill="url(#nl-metal)"/>
    <path d="M91 96c10 4 25 4 35-1" stroke="#c5d6ec"/>
    <path d="M65 63c0-30 22-51 50-50 27 1 45 20 46 49 2 27-15 44-45 47-30 3-50-12-51-46z" fill="url(#nl-shell)" stroke-width="2.4"/>
    <path d="M85 26c14-10 32-11 47-6" fill="none" stroke="#fff" stroke-width="2.5" opacity=".86"/>
    <path d="M75 48c8-15 24-23 45-20 18 2 29 16 31 34 2 20-9 34-31 38-23 4-41-3-47-16-4-10-4-24 2-36z" fill="url(#nl-glass)" stroke-width="2.1"/>
    <g clip-path="url(#nl-visor-clip)" stroke="none">
      <path d="M67 78c16-13 42-12 66 1 8 4 16 5 24 3l-7 20H69z" fill="#dfac80" opacity=".27"/>
      <path d="M72 65c5-17 24-30 42-32 12-1 19 5 18 8-19-1-35 7-49 21z" fill="url(#nl-glint)"/>
      <path d="M84 79c16 9 42 11 58-1" fill="none" stroke="#aee2fa" stroke-width="1.7" opacity=".42"/>
      <path d="M129 44l1.1 3.4 3.5 1.1-3.5 1.2-1.1 3.4-1.2-3.4-3.3-1.2 3.3-1.1z" fill="#e7f6ff"/>
      <circle cx="138" cy="59" r="1.15" fill="#d2eeff"/>
      <circle cx="118" cy="57" r="1" fill="#d2eeff" opacity=".8"/>
    </g>
    <path d="M71 52c-5-2-9 1-11 6l-1 15c1 7 6 10 13 7l3-4V58z" fill="url(#nl-shell)"/>
    <path d="M66 58c4-1 5 2 5 5v10c0 4-6 4-7 0V63c0-2 1-4 2-5z" fill="url(#nl-metal)" stroke-width="1.5"/>
    <path d="M69 66v5" stroke="#9ce9fa" stroke-width="1.6"/>
  </g>
  <g class="wave-sparks" fill="none" stroke="#a2eaff" stroke-width="1.6" stroke-linecap="round">
    <path d="M12 51l-4-5m11-8-2-6m31 3 2-6"/><path d="M55 32v6m-3-3h6"/>
  </g>
</svg>`;
  const pict = {
    chat:'<path d="M4.5 5.5h15v10h-9l-4.5 3v-3H4.5z"/><path d="M8 10.5h8"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    reset:'<path d="M4 11a8 8 0 1 1 1.5 6M4 5v6h6"/>',
    send:'<path d="m3 11.6 17.5-7.1-5.9 15-3.2-6.1zM11.4 13.4l9.1-8.9"/>'
  };
  const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${pict[name]}</svg>`;
  function astronaut(part) {
    return art.replace(/nl-([\w-]+)/g, 'nl-'+part+'-$1');
  }
  const prompts = [
    ['About SPHEREx','What is the SPHEREx mission?'],
    ['Find an event','Where can I find NightLock events?'],
    ['Explore the gallery','Where is the astronomy gallery?'],
    ['Plan a night outside','How do I start stargazing?']
  ];
  const routes = {
    'about-spherex.html':'About SPHEREx','observatory.html':'Observatory','event.html':'Events',
    'gallery.html':'Gallery','blog.html':'Blog','our-services.html':'Our Services','our-team.html':'Our Team'
  };
  // Resolve relative to the integration folder so links also work on GitHub Pages subpaths.
  const siteRoot = new URL('..', asset);
  const local = [
    {test:/\b(spherex|infrared|spectroscopy|nasa|mission|telescope|spectral|sky map|cosmic)\b/i, text:'SPHEREx is NASA’s space telescope for surveying the sky in near-infrared light. It uses 102 infrared wavelength channels to study galaxies, clues about the early universe, and ices in regions where stars and planets form.',links:['about-spherex.html','observatory.html']},
    {test:/\b(event\w*|calendar|schedule|upcoming|session|date|book)\b/i,text:'Open NightLock’s Events page to check the current calendar in List, Month, or Day view. The Observatory page also has a schedule. Check the event’s detail page for its date and status.',links:['event.html','observatory.html']},
    {test:/\b(gallery|images?|photos?|album|pictures?)\b/i,text:'The Gallery is where you can browse NightLock’s space images. Open an image to see it larger.',links:['gallery.html']},
    {test:/\b(stargaz\w*|binoculars|skywatch\w*|constellation\w*)\b/i,text:'Start with a clear night, a dark spot with an open view, and a sky chart set to your location and date. Give your eyes time to adapt and try the Moon or a bright planet before looking for faint objects.',links:['observatory.html','our-services.html']},
    {test:/\b(articles?|news|blog|updates?)\b/i,text:'The NightLock Blog has astronomy articles and mission updates.',links:['blog.html']},
    {test:/\b(team|members?|contact)\b/i,text:'The Our Team page introduces Project NightLock and links to the individual profiles.',links:['our-team.html']},
    {test:/\b(services?|learn|programmes?|programs?)\b/i,text:'Our Services has observing guides and learning resources. Start there if you’re new to astronomy.',links:['our-services.html']}
  ];
  function localAnswer(q) {
    if (/^\s*(hi|hey|hello)[.!?\s]*$/i.test(q)) return {answer:'Hi! I’m NightLock, your space guide. Try asking about SPHEREx, upcoming events, or where to find the gallery.',links:[]};
    const match = local.find(x => x.test.test(q));
    return match ? {answer:match.text,links:match.links} : {
      answer:'I’m in quick-guide mode, so I can help with SPHEREx, stargazing, events, and finding pages on NightLock. Try one of the suggested questions.',
      links:['about-spherex.html','event.html']
    };
  }

  class NightlockAssistant extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const shadow = this.attachShadow({mode:'open'});
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = new URL('widget.css', asset).href;
      const shell = document.createElement('div');
      shell.hidden = true;
      shell.innerHTML = `
        <button class="launcher" type="button" aria-controls="nl-panel" aria-expanded="false" aria-label="Chat with NightLock AI">
          <span class="launcher-figure">${astronaut('launch')}</span>
        </button>
        <section class="panel" id="nl-panel" role="region" aria-labelledby="nl-title" hidden>
          <header class="header">
            <span class="avatar">${astronaut('avatar')}</span>
            <div class="header-text"><span class="kicker">Your astronomy guide</span><h2 id="nl-title">NightLock AI</h2></div>
            <button class="icon-btn reset" type="button" title="New conversation" aria-label="New conversation">${icon('reset')}</button>
            <button class="icon-btn close" type="button" title="Minimize" aria-label="Minimize NightLock AI">${icon('close')}</button>
          </header>
          <div class="feed" role="log" aria-label="Conversation with NightLock" aria-relevant="additions" aria-live="polite" tabindex="0"></div>
          <div class="bottom">
            <div class="prompts" aria-label="Suggested questions"></div>
            <form class="composer">
              <label class="sr-only" for="nl-input">Ask NightLock AI a question</label>
              <textarea id="nl-input" rows="1" maxlength="1000" placeholder="Ask about space…" required></textarea>
              <button class="send" type="submit" aria-label="Send message">${icon('send')}</button>
            </form>
            <p class="notice" aria-live="polite"></p>
          </div>
        </section>`;
      style.addEventListener('load', () => {
        shell.hidden = false;
        this.wave(shadow.querySelector('.launcher'));
      },{once:true});
      style.addEventListener('error', () => console.error('NightLock widget.css could not be loaded.'),{once:true});
      shadow.append(style, shell);

      const launcher = shadow.querySelector('.launcher');
      const panel = shadow.querySelector('.panel');
      const feed = shadow.querySelector('.feed');
      const input = shadow.querySelector('textarea');
      const form = shadow.querySelector('form');
      const send = shadow.querySelector('.send');
      const notice = shadow.querySelector('.notice');
      const suggestions = shadow.querySelector('.prompts');
      const close = shadow.querySelector('.close');
      let history = [], request = null, revision = 0, busy = false;
      let mode = 'checking';
      const setMode = (next, note) => {
        mode = next;
        notice.textContent = note ?? (mode === 'ai' ? 'AI responses may contain mistakes.' :
          mode === 'checking' ? 'Connecting to NightLock…' : 'Quick guide · No AI model connected');
      };
      const addIntro = () => {
        const intro = document.createElement('div');
        intro.className = 'intro-card';
        intro.innerHTML = '<div><span class="kicker">Mission desk</span><strong>Ready to explore?</strong><p>Ask me about SPHEREx, stargazing, or the NightLock site.</p></div>'+astronaut('intro');
        feed.append(intro);
      };
      const append = (role, text, links=[], error=false, citations=[]) => {
        const msg = document.createElement('div');
        msg.className = 'message';
        msg.dataset.role = role;
        if (error) msg.dataset.error = '';
        const who = document.createElement('span');
        who.className = 'who';
        who.textContent = role === 'user' ? 'You' : 'NightLock';
        const p = document.createElement('p');
        let cursor=0, count=0;
        const indexed=[...text];
        const sourceLinks=[];
        for(const ref of citations){
          if(!ref || !Number.isInteger(ref.at) || ref.at<cursor || ref.at>indexed.length || !ref.url)continue;
          let endpoint;
          try{endpoint=new URL(ref.url,siteRoot);}catch(_){continue;}
          if(!['http:','https:'].includes(endpoint.protocol)||endpoint.username||endpoint.password)continue;
          if(endpoint.origin!==location.origin&&!/^https?:\/\//i.test(ref.url))continue;
          const segment=indexed.slice(cursor,ref.at).join('').replace(/\[NL\d+\]/g,'');
          p.append(segment);
          let number=sourceLinks.findIndex(s=>s.url===endpoint.href)+1;
          if(!number){sourceLinks.push({url:endpoint.href,title:ref.title});number=++count;}
          const link=document.createElement('a');
          link.textContent=' ['+number+']';link.href=endpoint.href;link.title=ref.title||endpoint.hostname;
          link.setAttribute('aria-label','Source '+number+' — '+link.title);
          if(endpoint.origin!==location.origin){link.target='_blank';link.rel='noopener noreferrer';}
          if(!p.lastChild||p.lastChild.href!==link.href)p.append(link);
          cursor=ref.at;
        }
        const tail=indexed.slice(cursor).join('');
        p.append(role==='assistant'?tail.replace(/\[NL\d+\]/g,''):tail);
        msg.append(who, p);
        if (links.length) {
          const related = document.createElement('div');
          related.className = 'sources';
          for (const link of [...new Set(links)].slice(0, 3)) {
            if (!Object.prototype.hasOwnProperty.call(routes, link)) continue;
            const item = document.createElement('a');
            item.textContent = routes[link]+' ↗';
            item.href = new URL(link, siteRoot).href;
            related.append(item);
          }
          if (related.childElementCount) msg.append(related);
        }
        feed.append(msg);
        feed.scrollTop = feed.scrollHeight;
      };
      const setBusy = state => {
        busy = state;
        send.disabled = state;
        for (const btn of suggestions.children) btn.disabled = state;
      };
      function toggle(open) {
        panel.hidden = !open;
        launcher.hidden = open;
        launcher.setAttribute('aria-expanded', String(open));
        if (open) {
          connect();
          close.focus({preventScroll:true});
          this.wave(panel);
        } else {
          launcher.focus({preventScroll:true});
          this.wave(launcher);
        }
      }
      launcher.addEventListener('click', () => toggle.call(this, true));
      close.addEventListener('click', () => toggle.call(this, false));
      panel.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          toggle.call(this, false);
        }
      });
      const inspect = async () => {
        if (location.protocol === 'file:' || endpoint.origin !== location.origin) return false;
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 4000);
        try {
          const r = await fetch(endpoint,{signal:abort.signal,cache:'no-store',headers:{Accept:'application/json'}});
          return r.ok && (await r.json()).mode === 'ai';
        } catch (_) {
          return false;
        } finally {clearTimeout(timer);}
      };
      let ready;
      const connect = () => ready ??= inspect().then(enabled => setMode(enabled ? 'ai' : 'guide'));
      const reset = () => {
        revision++;
        request?.abort();
        request = null;
        history = [];
        setBusy(false);
        feed.replaceChildren();
        addIntro();
        input.value = '';
        input.focus({preventScroll:true});
        setMode(mode);
        this.wave(panel);
      };
      shadow.querySelector('.reset').addEventListener('click',reset);
      const ask = async raw => {
        const question = raw.trim().slice(0,1000);
        if (!question || busy) return;
        const turn = ++revision;
        input.value = '';
        setBusy(true);
        append('user',question);
        const activity = document.createElement('div');
        activity.className = 'activity';
        activity.innerHTML = 'NightLock is thinking <span aria-hidden="true">…</span>';
        feed.append(activity);
        feed.scrollTop = feed.scrollHeight;
        try {
          await connect();
          if (turn !== revision) return;
          let result;
          if (mode !== 'ai') {
            result = localAnswer(question);
          } else {
            const controller = new AbortController();
            request = controller;
            const timer = setTimeout(() => controller.abort(), 52000);
            try {
              const r = await fetch(endpoint,{
                method:'POST',
                headers:{'Content-Type':'application/json',Accept:'application/json'},
                body:JSON.stringify({message:question,history:history.slice(-8)}),
                signal:controller.signal
              });
              const payload = await r.json();
              if (!r.ok || typeof payload.answer !== 'string') {
                throw Error(payload.error || 'NightLock couldn’t get a reply.');
              }
              result = {answer:payload.answer,links:Array.isArray(payload.links)?payload.links:[],citations:Array.isArray(payload.citations)?payload.citations:[]};
              setMode('ai');
              history.push({role:'user',content:question},{role:'assistant',content:result.answer.slice(0,1800)});
              history = history.slice(-8);
            } finally {clearTimeout(timer);}
          }
          activity.remove();
          if (turn !== revision) return;
          append('assistant',result.answer,result.links,false,result.citations);
          this.wave(panel);
        } catch (error) {
          activity.remove();
          if (turn !== revision) return;
          const fallback = localAnswer(question);
          const why = error.name==='AbortError'?'The AI response timed out.':error instanceof SyntaxError || error instanceof TypeError ? 'Could not reach the AI server.' : error.message;
          append('assistant',why+'\n\nQuick guide: '+fallback.answer,fallback.links,true);
          setMode('ai','AI unavailable for this reply · Quick guide shown');
        } finally {
          if (turn === revision) {request = null;setBusy(false);}
        }
      };
      for (const [label,text] of prompts) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.addEventListener('click',() => ask(text));
        suggestions.append(b);
      }
      form.addEventListener('submit', e => {e.preventDefault();ask(input.value);});
      input.addEventListener('keydown',e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {e.preventDefault();form.requestSubmit();}
      });
      addIntro();
    }

    wave(target) {
      if (!target || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      clearTimeout(target.nlWaveTimer);
      target.removeAttribute('data-wave');
      void target.offsetWidth;
      target.setAttribute('data-wave','');
      target.nlWaveTimer = setTimeout(() => target.removeAttribute('data-wave'),1000);
    }
  }

  customElements.define('nightlock-assistant',NightlockAssistant);
  if (!document.querySelector('nightlock-assistant')) {
    const widget = document.createElement('nightlock-assistant');
    if (script.dataset.position === 'left') widget.dataset.left = '';
    if (document.querySelector('[data-nl-scroll], .trx_addons_scroll_to_top')) widget.dataset.scrollButton = '';
    document.body.append(widget);
  }
})();
