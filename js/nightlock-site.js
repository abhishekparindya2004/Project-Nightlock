/* NightLock static-site integration. It never sends form data or navigation to ThemeRex. */
(function () {
  'use strict';
  function run() {
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var query = new URLSearchParams(location.search);
    document.querySelectorAll('header.top_panel nav.sc_layouts_menu').forEach(function (nav) {
      nav.querySelectorAll('a[href="astronut.html"], a[href="portfolio.html"]').forEach(function (link) {
        var item = link.closest('li');
        if (item) item.remove();
      });
      nav.querySelectorAll('a[href="blog.html"]').forEach(function (link) {
        var item = link.closest('li');
        if (!item) return;
        Array.prototype.slice.call(item.children).forEach(function (child) {
          if (child.matches('ul.sub-menu')) child.remove();
        });
        item.classList.remove('menu-item-has-children');
      });
    });
    document.querySelectorAll('ul#menu_footer').forEach(function (nav) {
      [['event.html','Events'],['gallery.html','Gallery']].forEach(function (entry) {
        if (nav.querySelector('a[href="'+entry[0]+'"]')) return;
        var item=document.createElement('li');
        item.className='menu-item menu-item-type-custom menu-item-object-custom nl-footer-menu-item';
        var link=document.createElement('a');
        link.href=entry[0];
        var label=document.createElement('span');
        label.textContent=entry[1];
        link.appendChild(label);
        item.appendChild(link);
        nav.appendChild(item);
      });
    });
    document.querySelectorAll('a[aria-disabled="true"]').forEach(function (a) {
      a.addEventListener('click', function (event) { event.preventDefault(); }, true);
      a.removeAttribute('target');
    });
    document.querySelectorAll('a[href="dilmani.blog.html"]').forEach(function(a){a.href='blog.html';});
    document.querySelectorAll('a[href="dilmani.ourteam.html"]').forEach(function(a){a.href='our-team.html';});
    // WordPress exported template has no CMS; avoid making bogus submissions.
    function messageFor(form, text, error) {
      var node = form.nextElementSibling;
      if (!node || !node.classList.contains('nl-site-message')) {
        node = document.createElement('div'); node.className = 'nl-site-message';
        node.setAttribute('role', 'status'); form.insertAdjacentElement('afterend',node);
      }
      node.classList.toggle('is-error', !!error); node.textContent = text;
      return node;
    }
    document.querySelectorAll('form').forEach(function (form) {
      if (['nightlock-event-search','nightlock-article-search','nl-subscribe','nl-feedback-form'].includes(form.id)) return;
      form.addEventListener('submit', function (e) {
        if (form.classList.contains('search_form')) {
          e.preventDefault();
          var val = (form.querySelector('input[type="search"],input[name="s"]') || {}).value || '';
          location.href = 'blog.html' + (val.trim() ? '?q=' + encodeURIComponent(val.trim()) : '');
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!form.reportValidity()) return;
        if (form.id === 'commentform' || form.classList.contains('comment-form')) {
          // The exported template has no public comment backend; comments stay local.
          var fields = new FormData(form);
          var text = String(fields.get('comment') || '').trim();
          var name = String(fields.get('author') || 'Visitor').trim() || 'Visitor';
          if (!text) { messageFor(form,'Please write a comment first.',true); return; }
          var key = 'nightlock-comments-' + page;
          var comments = [];
          try {comments = JSON.parse(localStorage.getItem(key) || '[]');} catch (_) {}
          comments.push({name: name, text: text, date: new Date().toLocaleDateString()});
          try { localStorage.setItem(key,JSON.stringify(comments)); } catch (_) {}
          showLocalComments(); form.reset();
          messageFor(form, 'Your comment was saved in this browser only (not published online).', false);
          return;
        }
        messageFor(form, 'This form is ready for a contact or newsletter service. No information was sent because the site has no connected backend.', false);
      }, true);
    });
    function showLocalComments() {
      var area = document.getElementById('nightlock-local-comments');
      var form = document.getElementById('commentform');
      if (!form) return;
      if (!area) {
        area = document.createElement('section'); area.id = 'nightlock-local-comments';
        area.className = 'nl-local-comments';form.parentNode.insertBefore(area,form);
      }
      var arr = [];
      try {arr=JSON.parse(localStorage.getItem('nightlock-comments-'+page)||'[]');} catch (_){}
      area.replaceChildren();
      if (!arr.length)return;
      var heading=document.createElement('h3');heading.textContent='Comments saved on this device';area.appendChild(heading);
      arr.forEach(function(c) {
        var item=document.createElement('div');item.className='nl-site-message';
        var who=document.createElement('strong');who.textContent=(c.name||'Visitor')+' · '+(c.date||'');
        var para=document.createElement('p');para.textContent=c.text||'';item.append(who,para);area.appendChild(item);
      });
    }
    showLocalComments();
    if (page==='event.html') {
      var search=document.getElementById('nightlock-event-search');
      var entries=Array.prototype.slice.call(document.querySelectorAll('.tribe-events-calendar-list__event-row'));
      var list=document.getElementById('nightlock-events-list');
      if (search && list && !list.hasAttribute('data-nl-events')) {
        search.addEventListener('submit',function(e){
          e.preventDefault();
          e.stopImmediatePropagation();
          var input=search.querySelector('input[type="search"],input[type="text"]');
          var term=(input && input.value || '').trim().toLowerCase();
          var visible=0;
          entries.forEach(function (ev){
            var matches=!term || ev.textContent.toLowerCase().includes(term);
            ev.hidden=!matches;ev.style.display=matches?'':'none';
            if(matches)visible++;
          });
          var notice=document.getElementById('nightlock-events-feedback');
          if (!notice) {notice=document.createElement('p');notice.id='nightlock-events-feedback';notice.className='nl-site-message';list.insertAdjacentElement('beforebegin',notice);}
          notice.textContent=term ? visible+' event'+(visible===1?'':'s')+' matching “'+(input.value.trim())+'”' : 'Showing all '+entries.length+' listed events.';
        },true);
      }
    }
    if (page==='blog.html' && query.get('q') && !document.querySelector('[data-nl-articles]')) {
      var term=query.get('q').toLowerCase();
      var items=Array.prototype.slice.call(document.querySelectorAll('.sc_blogger_item'));
      var matching=0;
      items.forEach(function(el){var ok=el.textContent.toLowerCase().includes(term);el.hidden=!ok;el.style.display=ok?'':'none';if(ok)matching++;});
      var root=document.querySelector('.page_content_wrap');
      if (root) {
        var info=document.createElement('p');info.className='nl-site-message';info.textContent='Blog search: “'+query.get('q')+'” — '+matching+' matching article card'+(matching===1?'':'s')+'.';root.insertAdjacentElement('afterbegin',info);
      }
    }
    if (page==='details.html' && query.get('article') && !document.querySelector('[data-nl-detail]')) {
      var slug=query.get('article');
      var articles=window.NightLockArticles || {};
      var data=articles[slug];
      if (!data) {
        slug=slug.replace(/[^a-z0-9-]/gi,'');
        data={title:slug.replace(/-/g,' ').replace(/\b\w/g,function(m){return m.toUpperCase();}),excerpt:'Explore this astronomy topic and related learning resources from the NightLock collection.'};
      }
      var title=document.querySelector('.post_header_single .post_title');
      if (title && data.title)title.textContent=data.title;
      document.title=data.title+' | NightLock';
      var dateLabel=document.querySelector('.post_header_single .post_meta_item.post_date');
      if(dateLabel)dateLabel.textContent=data.date||'NightLock Science Blog';
      var featured=document.querySelector('.post_header_wrap.with_featured_image, .post_item_single .post_featured, .post_featured.post_featured_bg');
      if(featured && data.image && data.image.startsWith('images/')) { featured.style.setProperty('background-image','linear-gradient(rgba(9,14,28,.40),rgba(9,14,28,.42)), url(\"'+data.image.replace(/\"/g,'')+'\")','important'); }
      var content=document.querySelector('.post_item_single .entry-content');
      if (content) {
        // The archive contains one original full article; for other article
        // links, present a matching article overview rather than unrelated text.
        var section=document.createElement('section');section.className='nl-article-summary';
        var intro=document.createElement('p');intro.textContent=data.excerpt || ('An introduction to '+data.title+'.');
        var heading=document.createElement('h3');heading.textContent='Explore this topic';
        var body=document.createElement('p');body.textContent='This NightLock article overview connects the topic with wider questions in astronomy, science learning, observation, and space exploration.';
        var link=document.createElement('a');link.href='blog.html';link.textContent='Explore more articles';
        section.append(intro,heading,body,link);content.replaceChildren(section);
      }
      var bread=document.querySelector('.breadcrumbs .breadcrumbs_item.current');
      if (bread)bread.textContent=data.title;
    }
    // Fallback for images from the archived WordPress theme that are not
    // included in the uploaded image collection.
    document.querySelectorAll('img').forEach(function(img) {
      img.addEventListener('error',function(){
        if(img.dataset.nlFallback) return;
        img.dataset.nlFallback='1';
        var src=img.currentSrc || img.src || '';
        if (/stargaze\.themerex\.net|cdninstagram\.com|gravatar\.com/.test(src)) {
          img.removeAttribute('srcset');img.src='images/placeholder.png';
        }
      });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
  else run();
})();
