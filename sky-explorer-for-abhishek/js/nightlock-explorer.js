/* =========================================================
   NightLock Sky Explorer
   ---------------------------------------------------------
   Shows a series of SPHEREx images of one patch of sky, in
   date order, so people can see things move or change.

   WHERE THE DATA COMES FROM
   1. If  data/nightlock-targets.json  exists, the page loads it.
      That file is written by the Python pipeline (Haroon's part):
      one entry per target, one entry per processed image (PNG
      cutout + date + metadata). See data/nightlock-targets.sample.json
   2. If it does not exist (or the page is opened by double-click),
      the page makes DEMO images in the browser so the UI still works.
      These are clearly labelled "Demo data".
   ========================================================= */
(function () {
  'use strict';

  var DATA_URL = 'images/spherex/nightlock-targets.json';   // written by export_web.py
  var DEFAULT_PIXEL_ARCSEC = 6.2;   // SPHEREx pixel size is about 6.2 arcseconds
  var MATCH_DEG = 0.5;              // coordinate search: how close counts as "this target"
  var DAY = 86400000;

  /* ---------------------------------------------------------
     SMALL HELPERS
     --------------------------------------------------------- */
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pad(n, w) { return String(n).padStart(w || 2, '0'); }
  function rng(seed) {                         // repeatable random numbers
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function toMJD(ms) { return ms / DAY + 40587; }
  function fmtDate(ms) {
    var d = new Date(ms);
    return d.getUTCDate() + ' ' + ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function fmtTime(ms) { var d = new Date(ms); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC'; }
  function monthLabel(ms) { var d = new Date(ms); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function raHMS(deg) {
    var t = Math.round(((deg % 360) + 360) % 360 / 15 * 36000);             // tenths of a second
    return pad(Math.floor(t / 36000)) + 'h ' + pad(Math.floor(t % 36000 / 600)) + 'm ' + ((t % 600) / 10).toFixed(1).padStart(4, '0') + 's';
  }
  function decDMS(deg) {
    var s = Math.round(Math.abs(deg) * 3600);
    return (deg < 0 ? '−' : '+') + pad(Math.floor(s / 3600)) + '° ' + pad(Math.floor(s % 3600 / 60)) + '′ ' + pad(s % 60) + '″';
  }
  function sepDeg(ra1, de1, ra2, de2) {         // angle between two sky positions
    var r = Math.PI / 180, a = Math.sin((de2 - de1) * r / 2), b = Math.sin((ra2 - ra1) * r / 2);
    var h = a * a + Math.cos(de1 * r) * Math.cos(de2 * r) * b * b;
    return 2 * Math.asin(Math.min(1, Math.sqrt(h))) / r;
  }
  function isoWeek(ms) {
    var d = new Date(ms); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return { year: d.getUTCFullYear(), week: Math.ceil(((d - y0) / DAY + 1) / 7) };
  }

  /* ---------------------------------------------------------
     1. DEMO DATA: the 5 test targets named in the challenge
     (catalogue values are approximate and only for the demo)
     --------------------------------------------------------- */
  var DEMO_TARGETS = [
    { id: 'barnard', name: "Barnard's Star", kind: 'moving', type: 'Red dwarf · the fastest-moving star in our sky',
      ra: 269.4521, dec: 4.6934, pm: { ra: -798.6, dec: 10328.1 }, amp: 230, seed: 3,
      note: 'Moves about 10.4 arcseconds a year, so it creeps north by roughly 1.7 SPHEREx pixels every year. Play the time-lapse and watch the bright star in the middle.' },
    { id: 'wise0855', name: 'WISE 0855−0714', kind: 'moving', type: 'Coldest known brown dwarf · very fast mover',
      ra: 133.79513, dec: -7.24515, pm: { ra: -8118, dec: 673 }, amp: 70, seed: 7,
      note: 'A failed star about as cold as the North Pole. Faint in near-infrared, but it moves about 8 arcseconds a year. Use Difference to find it.' },
    { id: 'epsindib', name: 'Epsilon Indi B', kind: 'moving', type: 'Pair of brown dwarfs orbiting the star ε Indi A',
      ra: 331.0438, dec: -56.7828, pm: { ra: 3966, dec: -2536 }, amp: 110, seed: 11,
      note: 'Two brown dwarfs travelling together with a nearby star, about 4.7 arcseconds a year. A small shift, so try zooming in.' },
    { id: 'rwaur', name: 'RW Aurigae', kind: 'variable', type: 'Young variable star system',
      ra: 76.9564, dec: 30.4014, pm: { ra: 0, dec: 0 }, amp: 150, seed: 19, vary: 'irregular',
      note: 'Does not move, but its brightness changes irregularly as dust passes in front of it. Watch the brightness chart.' },
    { id: 'rdra', name: 'R Draconis', kind: 'variable', type: 'Pulsating red giant (Mira variable)',
      ra: 248.1674, dec: 66.7550, pm: { ra: 0, dec: 0 }, amp: 150, seed: 23, vary: 'mira',
      note: 'A giant star that swells and shrinks, getting much brighter and dimmer over about 8 months.' }
  ];
  // SPHEREx maps the whole sky every ~6 months; each visit gives several images a few days apart.
  var DEMO_DATES = ['2025-05-14T03:12:00Z', '2025-05-20T21:40:00Z', '2025-11-12T08:05:00Z', '2025-11-18T14:31:00Z',
                    '2026-05-13T05:47:00Z', '2026-05-19T19:22:00Z', '2026-11-04T10:58:00Z'];
  var DEMO_SIZE = 80;

  function addGauss(img, w, h, x, y, amp, sig) {
    var r = Math.ceil(sig * 4);
    for (var j = Math.max(0, Math.floor(y - r)); j < Math.min(h, Math.ceil(y + r)); j++) {
      for (var i = Math.max(0, Math.floor(x - r)); i < Math.min(w, Math.ceil(x + r)); i++) {
        var dx = i + 0.5 - x, dy = j + 0.5 - y;
        img[j * w + i] += amp * Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig));
      }
    }
  }

  function demoTarget(t) {
    var w = DEMO_SIZE, h = DEMO_SIZE, pix = DEFAULT_PIXEL_ARCSEC;
    var times = DEMO_DATES.map(function (s) { return Date.parse(s); });
    var tMid = (times[0] + times[times.length - 1]) / 2;
    var field = rng(t.seed), stars = [];
    for (var s = 0; s < 60; s++) stars.push({ x: field() * w, y: field() * h, a: 18 + 200 * Math.pow(field(), 4) });
    var det = 3, band = [1.63, 2.41];   // use one detector so every image shows the same "colour"
    var frames = times.map(function (ms, k) {
      var img = new Float32Array(w * h), nz = rng(t.seed * 101 + k);
      for (var p = 0; p < img.length; p++) img[p] = 12 + (nz() + nz() + nz() - 1.5) * 5;
      stars.forEach(function (st) { addGauss(img, w, h, st.x, st.y, st.a, 1.05); });
      var yrs = (ms - tMid) / (365.25 * DAY);
      var x = w / 2 - (t.pm.ra / 1000 * yrs) / pix;             // East is left, North is up
      var y = h / 2 - (t.pm.dec / 1000 * yrs) / pix;
      var amp = t.amp, days = (ms - times[0]) / DAY;
      if (t.vary === 'mira') amp *= 1 + 0.75 * Math.sin(2 * Math.PI * days / 245);
      if (t.vary === 'irregular') amp *= 1 + 0.45 * Math.sin(days / 37) + 0.3 * Math.sin(days / 11 + 1);
      addGauss(img, w, h, x, y, amp, 1.1);
      var wk = isoWeek(ms);
      return {
        t: ms, date: new Date(ms).toISOString(), data: img, w: w, h: h, target_px: [x, y],
        obs_id: wk.year + 'W' + pad(wk.week) + '_' + (1 + k % 2) + 'A', detector: det, wavelength_um: band,
        n_stacked: 6 + Math.floor(nz() * 10), masked_pct: +(4 + nz() * 6).toFixed(1),
        file: 'demo_' + t.id + '_' + new Date(ms).toISOString().slice(0, 10) + '.png'
      };
    });
    return Object.assign({}, t, { pixel_arcsec: pix, frames: frames, ready: true });
  }

  /* ---------------------------------------------------------
     2. LOADING REAL DATA (from the pipeline's JSON + PNGs)
     --------------------------------------------------------- */
  function loadJSON() {
    if (location.protocol === 'file:') return Promise.resolve(null);   // browsers block this; use demo
    return fetch(DATA_URL, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function loadImage(src) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(src); }; im.src = src; });
  }
  function imageToData(im) {
    var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    var ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0);
    var d = ctx.getImageData(0, 0, c.width, c.height).data, out = new Float32Array(c.width * c.height);
    for (var i = 0, p = 0; i < out.length; i++, p += 4) out[i] = (d[p] + d[p + 1] + d[p + 2]) / 3;
    return { data: out, w: c.width, h: c.height };
  }
  function realTarget(t, base) {
    var frames = (t.frames || []).map(function (f) {
      var ms = Date.parse(f.date);
      var tp = f.target_px ? [f.target_px[0] + 0.5, f.target_px[1] + 0.5] : null;   // astropy pixel centres -> ours
      return Object.assign({}, f, { t: ms, target_px: tp });
    }).filter(function (f) { return !isNaN(f.t); }).sort(function (a, b) { return a.t - b.t; });
    return Object.assign({ kind: 'moving', pm: { ra: 0, dec: 0 } }, t, {
      frames: frames, pixel_arcsec: t.pixel_arcsec || base.pixel_arcsec || DEFAULT_PIXEL_ARCSEC, ready: false
    });
  }
  function ensureLoaded(t) {
    if (t.ready) return Promise.resolve(t);
    return Promise.all(t.frames.map(function (f) { return loadImage(f.src); })).then(function (ims) {
      ims.forEach(function (im, i) { Object.assign(t.frames[i], imageToData(im)); });
      t.ready = true; return t;
    });
  }

  /* ---------------------------------------------------------
     3. SCIENCE BITS: stretch, colour maps, position, brightness
     --------------------------------------------------------- */
  var CMAPS = {
    space: [[0, 6, 12, 40], [0.25, 18, 38, 110], [0.55, 70, 120, 220], [0.8, 150, 210, 255], [1, 255, 255, 255]],
    grey: [[0, 0, 0, 0], [1, 255, 255, 255]],
    heat: [[0, 0, 0, 0], [0.35, 140, 20, 10], [0.65, 240, 120, 30], [0.85, 255, 210, 90], [1, 255, 255, 235]],
    ice:  [[0, 0, 0, 0], [0.4, 20, 50, 130], [0.75, 60, 200, 230], [1, 235, 255, 255]]
  };
  var LUTS = {};
  function lut(name) {
    if (LUTS[name]) return LUTS[name];
    var stops = CMAPS[name], out = new Uint8ClampedArray(256 * 3);
    for (var i = 0; i < 256; i++) {
      var v = i / 255, k = 1;
      while (k < stops.length - 1 && stops[k][0] < v) k++;
      var a = stops[k - 1], b = stops[k], f = (v - a[0]) / (b[0] - a[0] || 1);
      for (var c = 1; c <= 3; c++) out[i * 3 + c - 1] = a[c] + (b[c] - a[c]) * f;
    }
    return (LUTS[name] = out);
  }

  // One brightness scale for ALL images of a target, so blinking compares like with like.
  function limits(t) {
    if (t.lim) return t.lim;
    var vals = [];
    t.frames.forEach(function (f) { for (var i = 0; i < f.data.length; i += 7) vals.push(f.data[i]); });
    vals.sort(function (a, b) { return a - b; });
    var lo = vals[Math.floor(vals.length * 0.02)], hi = vals[Math.floor(vals.length * 0.998)];
    return (t.lim = { lo: lo, hi: Math.max(hi, lo + 1) });
  }
  function paint(data, w, h, lim, cmap) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'), img = ctx.createImageData(w, h), o = img.data, L = lut(cmap), Q = 6, aQ = Math.asinh(Q);
    for (var i = 0, p = 0; i < data.length; i++, p += 4) {
      var v = clamp((data[i] - lim.lo) / (lim.hi - lim.lo), 0, 1);
      var k = Math.round(Math.asinh(v * Q) / aQ * 255) * 3;
      o[p] = L[k]; o[p + 1] = L[k + 1]; o[p + 2] = L[k + 2]; o[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); return c;
  }
  function frameCanvas(t, i, cmap) {
    var f = t.frames[i], key = 'c_' + cmap;
    return f[key] || (f[key] = paint(f.data, f.w, f.h, limits(t), cmap));
  }
  function stackCanvas(t, cmap) {
    var key = 'stack_' + cmap;
    if (t[key]) return t[key];
    var f0 = t.frames[0], sum = new Float32Array(f0.data.length);
    t.frames.forEach(function (f) { for (var i = 0; i < sum.length; i++) sum[i] += f.data[i]; });
    for (var i = 0; i < sum.length; i++) sum[i] /= t.frames.length;
    return (t[key] = paint(sum, f0.w, f0.h, limits(t), cmap));
  }
  function diffCanvas(t, a, b) {
    var key = 'diff_' + a + '_' + b;
    if (t[key]) return t[key];
    var A = t.frames[a], B = t.frames[b], lim = limits(t), span = lim.hi - lim.lo;
    var c = document.createElement('canvas'); c.width = A.w; c.height = A.h;
    var ctx = c.getContext('2d'), img = ctx.createImageData(A.w, A.h), o = img.data;
    for (var i = 0, p = 0; i < A.data.length; i++, p += 4) {
      var d = (A.data[i] - B.data[i]) / span, base = clamp((A.data[i] - lim.lo) / span, 0, 1) * 28;
      var k = clamp((Math.abs(d) - 0.04) / 0.25, 0, 1);
      if (d > 0.04)       { o[p] = base + 62 * k;  o[p + 1] = base + 230 * k; o[p + 2] = base + 230 * k; }
      else if (d < -0.04) { o[p] = base + 240 * k; o[p + 1] = base + 163 * k; o[p + 2] = base + 94 * k; }
      else                { o[p] = o[p + 1] = o[p + 2] = base; }
      o[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); return (t[key] = c);
  }

  // Where should the target be in frame i? (pipeline value, else from proper motion)
  function predicted(t, i) {
    var f = t.frames[i];
    if (f.target_px) return f.target_px;
    var yrs = (f.t - t.frames[0].t) / (365.25 * DAY), pix = t.pixel_arcsec;
    return [f.w / 2 - (t.pm.ra / 1000 * yrs) / pix, f.h / 2 - (t.pm.dec / 1000 * yrs) / pix];
  }
  // Median of the ring around a point = local background
  function ringMedian(f, x, y, r1, r2) {
    var v = [];
    for (var j = Math.floor(y - r2); j <= Math.ceil(y + r2); j++) for (var i = Math.floor(x - r2); i <= Math.ceil(x + r2); i++) {
      if (i < 0 || j < 0 || i >= f.w || j >= f.h) continue;
      var d = Math.hypot(i + 0.5 - x, j + 0.5 - y);
      if (d >= r1 && d <= r2) v.push(f.data[j * f.w + i]);
    }
    v.sort(function (a, b) { return a - b; });
    return v.length ? v[v.length >> 1] : 0;
  }
  // Measure the real position (centroid) and brightness near the predicted spot
  function measure(t) {
    if (t.meas) return t.meas;
    t.meas = t.frames.map(function (f, i) {
      var p = predicted(t, i), bg = ringMedian(f, p[0], p[1], 5, 8), sx = 0, sy = 0, s = 0, flux = 0;
      for (var j = Math.floor(p[1] - 3); j <= Math.ceil(p[1] + 3); j++) for (var k = Math.floor(p[0] - 3); k <= Math.ceil(p[0] + 3); k++) {
        if (k < 0 || j < 0 || k >= f.w || j >= f.h) continue;
        var d = Math.hypot(k + 0.5 - p[0], j + 0.5 - p[1]);
        if (d > 3) continue;
        var v = f.data[j * f.w + k] - bg;
        if (d <= 2.5) flux += v;
        if (v > 0) { sx += v * (k + 0.5); sy += v * (j + 0.5); s += v; }
      }
      var pos = s > 0 ? [sx / s, sy / s] : p;
      if (Math.hypot(pos[0] - p[0], pos[1] - p[1]) > 2.5) pos = p;   // ignore a neighbour pulling it away
      return { pos: pos, flux: flux };
    });
    // Prefer the pipeline's photometry (measured on the science images) when the JSON has it
    var usePipe = t.frames.some(function (f) { return typeof f.flux === 'number'; });
    t.meas.forEach(function (m, i) { m.flux = usePipe ? (typeof t.frames[i].flux === 'number' ? t.frames[i].flux : null) : m.flux; });
    var fl = t.meas.map(function (m) { return m.flux; }).filter(function (v) { return v !== null && v > 0; }).sort(function (a, b) { return a - b; });
    var med = fl[fl.length >> 1] || 1;
    t.meas.forEach(function (m) { m.rel = (m.flux !== null && m.flux > 0) ? m.flux / med : null; });
    return t.meas;
  }

  /* ---------------------------------------------------------
     4. STATE
     --------------------------------------------------------- */
  var S = {
    targets: [], demo: true, t: null,
    mode: 'play', idx: 0, a: 0, b: 0, blinkShowA: true, playing: true, fps: 2,
    zoom: 1, cx: 0, cy: 0, cmap: 'space', track: false, cross: true, grid: false, smooth: true,
    view: 'map', map: { ra0: 0, dec0: 0, zoom: 1, grid: true, mw: true, ecl: true, labels: true }
  };
  var timer = null;
  var frames = $$('.nx-frame');
  var stage = $('#nxStage');

  function msg(text) {
    var m = $('#nxMsg');
    m.textContent = text || ''; m.hidden = !text;
    $('#nxMain').classList.toggle('has-msg', !!text);
  }

  /* ---------------------------------------------------------
     5. DRAWING THE VIEWER
     --------------------------------------------------------- */
  function sizeCanvas(cv) {
    var dpr = window.devicePixelRatio || 1, w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
    if (w && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; }
    return dpr;
  }
  function geom(cv) {                      // native pixel -> screen mapping
    var f = S.t.frames[0], sc = Math.min(cv.width / f.w, cv.height / f.h) * S.zoom;
    return { sc: sc, ox: cv.width / 2 - S.cx * sc, oy: cv.height / 2 - S.cy * sc };
  }
  function shownIndex(panel) {             // which image index a panel shows
    if (S.mode === 'play') return S.idx;
    if (S.mode === 'blink') return S.blinkShowA ? S.a : S.b;
    if (S.mode === 'side') return panel === 0 ? S.a : S.b;
    return null;                           // diff / stack
  }

  function render() {
    var t = S.t; if (!t || !t.ready) return;
    var meas = measure(t);
    frames.forEach(function (fr, panel) {
      if (fr.hidden) return;
      var cv = fr.querySelector('canvas'), dpr = sizeCanvas(cv), ctx = cv.getContext('2d'), g = geom(cv), f0 = t.frames[0];
      ctx.fillStyle = '#04081c'; ctx.fillRect(0, 0, cv.width, cv.height);
      var i = shownIndex(panel), src;
      if (S.mode === 'diff') src = diffCanvas(t, S.a, S.b);
      else if (S.mode === 'stack') src = stackCanvas(t, S.cmap);
      else src = frameCanvas(t, i, S.cmap);
      ctx.imageSmoothingEnabled = S.smooth;
      ctx.drawImage(src, g.ox, g.oy, f0.w * g.sc, f0.h * g.sc);

      // 1 arcminute grid
      if (S.grid) {
        var step = 60 / t.pixel_arcsec * g.sc;
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = dpr;
        ctx.beginPath();
        for (var x = (g.ox + f0.w / 2 * g.sc) % step; x < cv.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); }
        for (var y = (g.oy + f0.h / 2 * g.sc) % step; y < cv.height; y += step) { ctx.moveTo(0, y); ctx.lineTo(cv.width, y); }
        ctx.stroke();
      }
      // path of the target across all images
      if (S.track && t.kind === 'moving') {
        ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.beginPath();
        meas.forEach(function (m, k) { var X = g.ox + m.pos[0] * g.sc, Y = g.oy + m.pos[1] * g.sc; if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
        ctx.stroke(); ctx.setLineDash([]);
        meas.forEach(function (m, k) {
          var f = k / Math.max(1, meas.length - 1);
          ctx.fillStyle = 'rgb(' + Math.round(62 + 178 * f) + ',' + Math.round(230 - 67 * f) + ',' + Math.round(230 - 136 * f) + ')';
          ctx.beginPath(); ctx.arc(g.ox + m.pos[0] * g.sc, g.oy + m.pos[1] * g.sc, 2.5 * dpr, 0, 7); ctx.fill();
        });
      }
      // marker circle(s)
      if (S.cross) {
        var R = Math.max(14 * dpr, 3.2 * g.sc);
        var ring = function (k, col) {
          var p = meas[k].pos; ctx.strokeStyle = col; ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath(); ctx.arc(g.ox + p[0] * g.sc, g.oy + p[1] * g.sc, R, 0, 7); ctx.stroke();
        };
        if (i !== null) ring(i, S.mode === 'play' ? '#ffffff' : (i === S.a ? '#3ee6e6' : '#f0a35e'));
        else if (S.mode === 'diff') { ring(S.a, '#3ee6e6'); ring(S.b, '#f0a35e'); }
      }
      updateHud(fr, panel, i, g);
    });
    drawLive();
    updatePanels();
  }

  function updateHud(fr, panel, i, g) {
    var t = S.t, n = t.frames.length, label = fr.querySelector('.nx-label'), dot = fr.querySelector('.nx-hud--tl .nx-dot');
    if (S.mode === 'play') { label.textContent = fmtDate(t.frames[i].t) + ' · image ' + (i + 1) + ' of ' + n; dot.className = 'nx-dot nx-dot--w'; }
    else if (S.mode === 'diff') { label.textContent = 'Difference · A − B'; dot.className = 'nx-dot'; }
    else if (S.mode === 'stack') { label.textContent = 'Stack of all ' + n + ' images'; dot.className = 'nx-dot nx-dot--w'; }
    else { var isA = i === S.a && (S.mode === 'side' ? panel === 0 : S.blinkShowA);
      label.textContent = (isA ? 'A · ' : 'B · ') + fmtDate(t.frames[i].t); dot.className = 'nx-dot' + (isA ? '' : ' nx-dot--b'); }
    // scale bar
    var bar = fr.querySelector('.nx-scale i');
    if (bar) {
      var dpr = window.devicePixelRatio || 1, arc = 30, px = arc / t.pixel_arcsec * g.sc / dpr;
      if (px < 36) { arc = 60; px *= 2; } if (px > 170) { arc = 10; px /= 3; }
      bar.style.width = Math.round(px) + 'px'; fr.querySelector('.nx-scale-txt').textContent = arc + '″';
    }
  }

  /* ---------------------------------------------------------
     6. SIDE PANELS, TIMELINE, CHART
     --------------------------------------------------------- */
  function dl(el, rows) {
    el.innerHTML = rows.filter(function (r) { return r[1] !== undefined && r[1] !== null && r[1] !== ''; })
      .map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('');
  }
  function currentFrameIndex() { if (S.view === 'map') return S.idx; var i = shownIndex(0); return i === null ? S.a : i; }

  function updatePanels() {
    var t = S.t, n = t.frames.length, meas = measure(t), i = currentFrameIndex(), f = t.frames[i];
    // timeline
    $('#nxRange').value = S.idx;
    if (S.mode === 'play' || S.view === 'map') $('#nxDate').innerHTML = fmtDate(f.t) + ' <small>' + fmtTime(f.t) + ' · ' + (S.idx + 1) + '/' + n + '</small>';
    else if (S.mode === 'stack') $('#nxDate').innerHTML = fmtDate(t.frames[0].t) + ' → ' + fmtDate(t.frames[n - 1].t);
    else $('#nxDate').innerHTML = 'A ' + fmtDate(t.frames[S.a].t) + ' → B ' + fmtDate(t.frames[S.b].t) + ' <small>(' + Math.round(Math.abs(t.frames[S.b].t - t.frames[S.a].t) / DAY) + ' days)</small>';
    // this image
    var wl = Array.isArray(f.wavelength_um) ? f.wavelength_um[0] + '–' + f.wavelength_um[1] + ' µm' : (f.wavelength_um ? f.wavelength_um + ' µm' : '');
    dl($('#nxFrameDl'), [
      ['Date', fmtDate(f.t) + ', ' + fmtTime(f.t)],
      ['MJD', toMJD(f.t).toFixed(4)],
      ['Observation', f.obs_id],
      ['Detector', f.detector],
      ['Wavelength', wl],
      ['Exposures stacked', f.n_stacked],
      ['Masked pixels', f.masked_pct !== undefined ? f.masked_pct + '%' : ''],
      ['Image size', f.w + ' × ' + f.h + ' px'],
      ['File', f.file]
    ]);
    // motion summary (measured from the images)
    var first = meas[0].pos, last = meas[n - 1].pos, shiftPx = Math.hypot(last[0] - first[0], last[1] - first[1]);
    var yrs = (t.frames[n - 1].t - t.frames[0].t) / (365.25 * DAY), pmTot = Math.hypot(t.pm.ra, t.pm.dec) / 1000;
    var rows = [
      ['Right ascension', raHMS(t.ra)], ['Declination', decDMS(t.dec)],
      ['Images', n + ' over ' + Math.round(yrs * 12) + ' months'],
      ['Field of view', (f.w * t.pixel_arcsec / 60).toFixed(1) + '′ × ' + (f.h * t.pixel_arcsec / 60).toFixed(1) + '′']
    ];
    if (t.kind === 'moving') {
      rows.push(['Proper motion R.A.·cos(Dec)', t.pm.ra.toFixed(1) + ' mas/yr']);
      rows.push(['Proper motion Dec', t.pm.dec.toFixed(1) + ' mas/yr']);
      rows.push(['Total motion', pmTot.toFixed(1) + '″ / year']);
      rows.push(['Measured shift', (shiftPx * t.pixel_arcsec).toFixed(1) + '″ (' + shiftPx.toFixed(1) + ' px)']);
    } else {
      var rel = meas.map(function (m) { return m.rel; }).filter(function (v) { return v !== null; });
      rows.push(['Brightness range', rel.length ? (Math.min.apply(null, rel)).toFixed(2) + '× – ' + (Math.max.apply(null, rel)).toFixed(2) + '×' : 'not measurable']);
    }
    dl($('#nxObjDl'), rows);
    lightCurve(t, meas, i);
    syncURL();
  }

  function showTarget() {
    var t = S.t, n = t.frames.length;
    $('#nxName').textContent = t.name;
    $('#nxType').textContent = t.type || '';
    var k = $('#nxKind'); k.textContent = t.kind === 'variable' ? 'Changes brightness' : 'Moves'; k.className = 'nx-kind nx-kind--' + t.kind;
    $('#nxNote').textContent = t.note || '';
    var star = $('#nxStar'); star.textContent = t.kind === 'variable' ? '●' : '★'; star.style.color = t.kind === 'variable' ? '#ef6a5a' : '';
    $('#nxCoordBox').innerHTML = 'R.A. ' + raHMS(t.ra) + '<br>Dec. ' + decDMS(t.dec) + '<br><small>Equatorial, J2000</small>';
    $('#nxFov').textContent = 'FoV ' + (t.frames[0].w * t.pixel_arcsec / 60).toFixed(1) + '′';
    $$('.nx-target').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === t.id)); });
    // timeline
    var range = $('#nxRange'); range.max = n - 1;
    var ticks = $('#nxTicks'); ticks.innerHTML = ''; var last = '', lastPos = -1;
    t.frames.forEach(function (f, i) {
      var lab = monthLabel(f.t); if (lab === last) return; last = lab;
      var pos = n > 1 ? i / (n - 1) : 0; if (pos - lastPos < 0.11 && lastPos >= 0) return; lastPos = pos;
      var b = document.createElement('button'); b.className = 'nx-tick'; b.textContent = lab;
      b.style.left = (n > 1 ? i / (n - 1) * 100 : 0) + '%';
      b.addEventListener('click', function () { setMode('play'); setPlaying(false); S.idx = i; render(); });
      ticks.appendChild(b);
    });
    // A / B pickers
    ['#nxA', '#nxB'].forEach(function (sel) {
      $(sel).innerHTML = t.frames.map(function (f, i) { return '<option value="' + i + '">' + fmtDate(f.t) + '</option>'; }).join('');
    });
    $('#nxA').value = S.a; $('#nxB').value = S.b;
    $$('.nx-demo').forEach(function (d) { d.hidden = !S.demo; });
    // detector band picker (only when the data has several bands)
    var bandSel = $('#nxBand');
    if (t.variants && t.variants.length > 1) {
      bandSel.innerHTML = t.variants.map(function (v, k) { return '<option value="' + k + '">' + (v.bandLabel || v.band) + ' (' + v.frames.length + ')</option>'; }).join('');
      bandSel.value = t.variants.indexOf(t); bandSel.hidden = false;
    } else bandSel.hidden = true;
  }

  function lightCurve(t, meas, cur) {
    var svg = $('#nxLc'), W = 280, H = 120, L = 30, R = 8, T = 10, B = 22;
    var t0 = t.frames[0].t, t1 = t.frames[t.frames.length - 1].t || t0 + 1;
    var rel = meas.map(function (m) { return m.rel; }).filter(function (v) { return v !== null; });
    if (!rel.length) { svg.innerHTML = '<text x="140" y="60" fill="#7a84a0" font-size="11" text-anchor="middle">No reliable brightness measurements (saturated or masked)</text>'; return; }
    var lo = Math.min.apply(null, rel), hi = Math.max.apply(null, rel);
    var pad5 = Math.max(0.1, (hi - lo) * 0.15); lo -= pad5; hi += pad5;
    var X = function (ms) { return L + (ms - t0) / (t1 - t0 || 1) * (W - L - R); };
    var Y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var pts = meas.map(function (m, i) { return m.rel === null ? null : [X(t.frames[i].t), Y(m.rel)]; });
    var s = '<line x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - R) + '" y2="' + (H - B) + '" stroke="#2b303b"/>';
    s += '<line x1="' + L + '" y1="' + Y(1) + '" x2="' + (W - R) + '" y2="' + Y(1) + '" stroke="#2b303b" stroke-dasharray="3 3"/>';
    s += '<text x="' + (L - 6) + '" y="' + (Y(1) + 4) + '" fill="#6b7280" font-size="10" text-anchor="end">1×</text>';
    s += '<text x="' + L + '" y="' + (H - 6) + '" fill="#6b7280" font-size="10">' + monthLabel(t0) + '</text>';
    s += '<text x="' + (W - R) + '" y="' + (H - 6) + '" fill="#6b7280" font-size="10" text-anchor="end">' + monthLabel(t1) + '</text>';
    s += '<polyline fill="none" stroke="#3ee6e6" stroke-opacity=".5" stroke-width="1.5" points="' + pts.filter(Boolean).map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>';
    pts.forEach(function (p, i) {
      if (!p) return;
      var on = i === cur;
      s += '<circle class="nx-lc-pt" data-i="' + i + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (on ? 5.5 : 3.5) + '" fill="' + (on ? '#ffffff' : '#3ee6e6') + '"><title>' + fmtDate(t.frames[i].t) + ': ' + meas[i].rel.toFixed(2) + '×</title></circle>';
    });
    svg.innerHTML = s;
  }

  /* ---------------------------------------------------------
     7. MODES, PLAYBACK, TARGET SELECTION
     --------------------------------------------------------- */
  function tick() {
    clearTimeout(timer);
    if (!S.playing || !S.t || !S.t.ready) return;
    if (S.view !== 'map' && S.mode !== 'play' && S.mode !== 'blink') return;
    timer = setTimeout(function () {
      if (S.mode === 'play' || S.view === 'map') S.idx = (S.idx + 1) % S.t.frames.length;
      else S.blinkShowA = !S.blinkShowA;
      render(); tick();
    }, 1000 / S.fps);
  }
  function setPlaying(on) {
    S.playing = on;
    var b = $('#nxPlay'); b.textContent = on ? '❚❚' : '▶'; b.setAttribute('aria-label', on ? 'Pause' : 'Play');
    tick();
  }
  function setMode(m) {
    S.mode = m;
    $$('.nx-tab').forEach(function (t) { t.setAttribute('aria-pressed', String(t.dataset.mode === m)); });
    var img = S.view === 'images';
    frames[0].hidden = !img; frames[1].hidden = !img || m !== 'side';
    stage.classList.toggle('nx-stage--side', img && m === 'side');
    stage.classList.toggle('nx-stage--diff', img && m === 'diff');
    $('#nxAB').hidden = !img || m === 'play' || m === 'stack';
    var live = !img || m === 'play' || m === 'blink', step = !img || m === 'play';
    $('#nxPlay').disabled = !live; $('#nxPlay').style.opacity = live ? 1 : 0.35;
    ['#nxRange', '#nxPrev', '#nxNext'].forEach(function (s) { $(s).disabled = !step; $(s).style.opacity = step ? 1 : 0.35; });
    render(); tick();
  }
  function selectTarget(t, opts) {
    opts = opts || {};
    clearTimeout(timer);
    S.t = t;
    ensureLoaded(t).then(function () {
      if (S.t !== t) return;
      var n = t.frames.length;
      S.idx = clamp(opts.frame || 0, 0, n - 1);
      S.a = clamp(opts.a !== undefined ? opts.a : 0, 0, n - 1);
      S.b = clamp(opts.b !== undefined ? opts.b : n - 1, 0, n - 1);
      S.zoom = 1; S.cx = t.frames[0].w / 2; S.cy = t.frames[0].h / 2;
      if (!opts.keepMap) { S.map.ra0 = t.ra; S.map.dec0 = t.dec; }
      S.mode = opts.mode || S.mode;
      showTarget(); setView(S.view);
    }).catch(function (src) { msg('Could not load an image for ' + t.name + ' (' + src + '). Check the file paths in ' + DATA_URL + '.'); });
  }

  /* ---------------------------------------------------------
     7b. VIEW SWITCH, LIVE IMAGE, SKY MAP, CLOCKS
     --------------------------------------------------------- */
  function setView(v) {
    S.view = v;
    var img = v === 'images';
    $$('.nx-views button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === v)); });
    $('#nxMap').hidden = img;
    $('#nxModes').hidden = !img; $('#nxImgBar').hidden = !img; $('#nxMapBar').hidden = img;
    $('#nxOpenImages').textContent = img ? '‹ Back to sky map' : 'Open SPHEREx images ›';
    setMode(S.mode);
    drawMap();
  }

  // Small image in the object card (follows the time-lapse)
  function drawLive() {
    var t = S.t, cv = $('#nxLive'), ctx = cv.getContext('2d'), i = currentFrameIndex(), f = t.frames[i], m = measure(t)[i];
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(frameCanvas(t, i, S.cmap), 0, 0, cv.width, cv.height);
    var sc = cv.width / f.w;
    ctx.strokeStyle = '#ff5ad8'; ctx.lineWidth = 2;
    var x = m.pos[0] * sc, y = m.pos[1] * sc, r = 22;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
    ctx.moveTo(x - r - 10, y); ctx.lineTo(x - r + 6, y); ctx.moveTo(x + r - 6, y); ctx.lineTo(x + r + 10, y);
    ctx.moveTo(x, y - r - 10); ctx.lineTo(x, y - r + 6); ctx.moveTo(x, y + r - 6); ctx.lineTo(x, y + r + 10);
    ctx.stroke();
    $('#nxLiveDate').textContent = fmtDate(f.t) + ' · ' + (i + 1) + '/' + t.frames.length;
  }

  var D2R = Math.PI / 180;
  var MAPSTARS = (function () {
    var r = rng(99), a = [];
    for (var k = 0; k < 1800; k++) a.push({ ra: r() * 360, dec: Math.asin(r() * 2 - 1) / D2R, m: Math.pow(r(), 6) });
    return a;
  })();
  function eqFromGal(l, b) {
    var aG = 192.85948 * D2R, dG = 27.12825 * D2R, lN = 122.93192 * D2R; l *= D2R; b *= D2R;
    var sd = Math.sin(dG) * Math.sin(b) + Math.cos(dG) * Math.cos(b) * Math.cos(lN - l);
    var y = Math.cos(b) * Math.sin(lN - l), x = Math.cos(dG) * Math.sin(b) - Math.sin(dG) * Math.cos(b) * Math.cos(lN - l);
    return { ra: ((aG + Math.atan2(y, x)) / D2R + 360) % 360, dec: Math.asin(sd) / D2R };
  }
  function eqFromEcl(lam) {
    var e = 23.4393 * D2R; lam *= D2R;
    return { ra: (Math.atan2(Math.sin(lam) * Math.cos(e), Math.cos(lam)) / D2R + 360) % 360, dec: Math.asin(Math.sin(e) * Math.sin(lam)) / D2R };
  }
  function proj(ra, dec, M) {                 // stereographic projection, North up, East left
    var a = (ra - M.ra0) * D2R, d = dec * D2R, d0 = M.dec0 * D2R;
    var cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a), k = 2 / (1 + cosc);
    var x = k * Math.cos(d) * Math.sin(a), y = k * (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a));
    return { x: M.cx - x * M.R / 2, y: M.cy - y * M.R / 2, ok: cosc > -0.05 };
  }
  function polyline(ctx, pts, M) {
    var on = false;
    ctx.beginPath();
    pts.forEach(function (q) {
      var p = proj(q[0], q[1], M);
      if (!p.ok) { on = false; return; }
      if (on) ctx.lineTo(p.x, p.y); else { ctx.moveTo(p.x, p.y); on = true; }
    });
    ctx.stroke();
  }
  function drawMap() {
    if (S.view !== 'map' || !S.targets.length) return;
    var wrap = $('#nxMap'), cv = wrap.querySelector('canvas'), dpr = sizeCanvas(cv), ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height, M = S.map, k, j;
    M.cx = W / 2; M.cy = H / 2; M.R = Math.min(W, H) * 0.47 * M.zoom; M.dpr = dpr;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.arc(M.cx, M.cy, M.R, 0, 7);
    var g = ctx.createRadialGradient(M.cx, M.cy, M.R * 0.05, M.cx, M.cy, M.R);
    g.addColorStop(0, '#2a2f86'); g.addColorStop(1, '#1b1e62');
    ctx.fillStyle = g; ctx.fill(); ctx.clip();
    // Milky Way band
    if (M.mw) {
      for (var b = -14; b <= 14; b += 2) {
        var band = []; for (k = 0; k <= 360; k += 2) { var e = eqFromGal(k, b); band.push([e.ra, e.dec]); }
        ctx.strokeStyle = 'rgba(175,175,240,' + (0.09 * (1 - Math.abs(b) / 16)).toFixed(3) + ')';
        ctx.lineWidth = Math.max(4 * dpr, M.R / 45); polyline(ctx, band, M);
      }
    }
    // coordinate grid
    if (M.grid) {
      ctx.strokeStyle = 'rgba(150,160,240,.32)'; ctx.lineWidth = dpr;
      for (k = 0; k < 360; k += 30) { var mer = []; for (j = -88; j <= 88; j += 2) mer.push([k, j]); polyline(ctx, mer, M); }
      for (j = -75; j <= 75; j += 15) { var par = []; for (k = 0; k <= 360; k += 2) par.push([k, j]); polyline(ctx, par, M); }
      ctx.fillStyle = 'rgba(190,200,255,.65)'; ctx.font = (10 * dpr) + 'px sans-serif'; ctx.textAlign = 'center';
      for (k = 0; k < 360; k += 30) { var pl = proj(k, clamp(M.dec0, -60, 60), M); if (pl.ok) ctx.fillText((k / 15) + 'h', pl.x, pl.y - 4 * dpr); }
      for (j = -60; j <= 60; j += 30) { var pd = proj(M.ra0, j, M); if (pd.ok && j) ctx.fillText((j > 0 ? '+' : '') + j + '°', pd.x + 16 * dpr, pd.y - 3 * dpr); }
    }
    // ecliptic
    if (M.ecl) {
      var ec = []; for (k = 0; k <= 360; k += 1) { var q = eqFromEcl(k); ec.push([q.ra, q.dec]); }
      ctx.strokeStyle = '#39b56a'; ctx.lineWidth = 1.5 * dpr; polyline(ctx, ec, M);
    }
    // background stars
    var zs = Math.sqrt(M.zoom);
    MAPSTARS.forEach(function (st) {
      var p = proj(st.ra, st.dec, M); if (!p.ok) return;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.45 + 0.55 * st.m).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, (0.5 + st.m * 2.2) * dpr * zs, 0, 7); ctx.fill();
    });
    // NightLock targets
    M.hits = [];
    S.targets.forEach(function (t) {
      var p = proj(t.ra, t.dec, M); if (!p.ok) return;
      var sel = S.t && t.id === S.t.id;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (t.kind === 'variable') { ctx.fillStyle = '#ef6a5a'; ctx.beginPath(); ctx.arc(p.x, p.y, 5 * dpr, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = '#f4b740'; ctx.font = (17 * dpr) + 'px sans-serif'; ctx.fillText('★', p.x, p.y); }
      if (M.labels) {
        ctx.fillStyle = sel ? '#ffffff' : '#f4c96a'; ctx.font = (sel ? '600 ' : '') + (12 * dpr) + 'px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(t.name, p.x + 12 * dpr, p.y);
      }
      if (sel) {
        var r = 16 * dpr; ctx.strokeStyle = '#ff5ad8'; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7);
        ctx.moveTo(p.x - r - 9 * dpr, p.y); ctx.lineTo(p.x - r + 5 * dpr, p.y); ctx.moveTo(p.x + r - 5 * dpr, p.y); ctx.lineTo(p.x + r + 9 * dpr, p.y);
        ctx.moveTo(p.x, p.y - r - 9 * dpr); ctx.lineTo(p.x, p.y - r + 5 * dpr); ctx.moveTo(p.x, p.y + r - 5 * dpr); ctx.lineTo(p.x, p.y + r + 9 * dpr);
        ctx.stroke();
      }
      M.hits.push({ t: t, x: p.x / dpr, y: p.y / dpr });
    });
    ctx.restore();
    ctx.strokeStyle = 'rgba(200,210,255,.35)'; ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath(); ctx.arc(M.cx, M.cy, M.R, 0, 7); ctx.stroke();
    ctx.textBaseline = 'alphabetic';
    $('#nxMap .nx-maptitle').textContent = 'Equatorial · J2000 · centre ' + raHMS(M.ra0).slice(0, 7) + ' ' + decDMS(M.dec0).slice(0, 4);
  }

  function clocks() {
    var now = Date.now(), d = new Date(now), jd = now / DAY + 2440587.5;
    $('#nxUT').textContent = pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
    var local; try { local = d.toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Colombo' }); } catch (e) { local = d.toLocaleTimeString(); }
    $('#nxLocal').textContent = local;
    $('#nxJD').textContent = jd.toFixed(5);
    $('#nxMJD').textContent = (jd - 2400000.5).toFixed(5);
    var gmst = 280.46061837 + 360.98564736629 * (jd - 2451545), lst = (((gmst + 79.8612) % 360) + 360) % 360 / 15;
    var h = Math.floor(lst), mi = Math.floor((lst - h) * 60), se = Math.floor(((lst - h) * 60 - mi) * 60);
    $('#nxLMST').textContent = pad(h) + ':' + pad(mi) + ':' + pad(se);
  }
  clocks(); setInterval(clocks, 1000);

  /* ---------------------------------------------------------
     8. COORDINATE SEARCH  (?ra=..&dec=.. works too)
     --------------------------------------------------------- */
  function parseCoords(s) {
    s = s.trim(); if (!s) return null;
    var nums = s.replace(/\u2212/g, '-').match(/[+\-]?\d+(?:\.\d+)?/g); if (!nums) return null;
    if (nums.length === 2 && !/[hm:]/i.test(s)) return { ra: +nums[0], dec: +nums[1] };        // degrees
    if (nums.length === 6) {                                                                  // h m s  d m s
      var ra = (Math.abs(+nums[0]) + +nums[1] / 60 + +nums[2] / 3600) * 15;
      var dec = Math.abs(+nums[3]) + +nums[4] / 60 + +nums[5] / 3600;
      return { ra: ra, dec: nums[3].charAt(0) === '-' ? -dec : dec };
    }
    return null;
  }
  function search(q) {
    var low = q.trim().toLowerCase();
    var byName = S.targets.filter(function (t) { return low && (t.name.toLowerCase().indexOf(low) > -1 || t.id === low); })[0];
    if (byName) { msg(''); selectTarget(byName); return true; }
    var c = parseCoords(q);
    if (!c || isNaN(c.ra) || isNaN(c.dec) || Math.abs(c.dec) > 90) {
      msg('Type a position as "RA Dec" in degrees (269.45 4.69) or hours/degrees (17 57 48.5 +04 41 36), or a target name.'); return false;
    }
    var best = null, bd = 1e9;
    S.targets.forEach(function (t) { var d = sepDeg(c.ra, c.dec, t.ra, t.dec); if (d < bd) { bd = d; best = t; } });
    if (best && bd <= MATCH_DEG) { msg('Showing ' + best.name + ' (' + (bd * 60).toFixed(1) + '′ from your position).'); selectTarget(best); return true; }
    msg('No processed SPHEREx images for ' + raHMS(c.ra) + ' ' + decDMS(c.dec) + ' yet. The nearest NightLock target is ' + best.name + ', ' + bd.toFixed(1) + '° away. Adding any sky position on request is our next step.');
    return false;
  }

  function syncURL() {
    if (!S.t || location.protocol === 'file:') return;
    var p = new URLSearchParams({ target: S.t.id, view: S.view, mode: S.mode });
    if (S.t.band) p.set('band', S.t.band);
    if (S.mode === 'play') p.set('frame', S.idx); else { p.set('a', S.a); p.set('b', S.b); }
    history.replaceState(null, '', location.pathname + '?' + p.toString());
  }

  /* ---------------------------------------------------------
     9. EVENTS
     --------------------------------------------------------- */
  $$('.nx-tab').forEach(function (b) { b.addEventListener('click', function () { S.mode = b.dataset.mode; setView('images'); }); });
  $$('.nx-views button').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
  $('#nxOpenImages').addEventListener('click', function () { setView(S.view === 'map' ? 'images' : 'map'); });
  [['#nxMapGrid', 'grid'], ['#nxMapMW', 'mw'], ['#nxMapEcl', 'ecl'], ['#nxMapLabels', 'labels']].forEach(function (p) {
    $(p[0]).addEventListener('click', function () { S.map[p[1]] = !S.map[p[1]]; $(p[0]).setAttribute('aria-pressed', String(S.map[p[1]])); drawMap(); });
  });
  $('#nxMapIn').addEventListener('click', function () { S.map.zoom = Math.min(12, S.map.zoom * 1.5); drawMap(); });
  $('#nxMapOut').addEventListener('click', function () { S.map.zoom = Math.max(0.6, S.map.zoom / 1.5); drawMap(); });
  $('#nxMapHome').addEventListener('click', function () { if (S.t) { S.map.ra0 = S.t.ra; S.map.dec0 = S.t.dec; } S.map.zoom = 1; drawMap(); });
  (function () {                                  // sky map: drag to look around, click a target to pick it
    var el = $('#nxMap'), out = el.querySelector('.nx-mapcursor'), down = null, moved = false;
    function hit(e) {
      var r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = 18;
      (S.map.hits || []).forEach(function (h) { var d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h.t; } });
      return best;
    }
    el.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, ra: S.map.ra0, dec: S.map.dec0 }; moved = false; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', function (e) {
      if (down) {
        var dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        if (moved) {
          el.classList.add('is-drag');
          var degpp = 2 / (S.map.R / (S.map.dpr || 1)) / D2R;
          S.map.ra0 = ((down.ra + dx * degpp / Math.max(0.2, Math.cos(down.dec * D2R))) % 360 + 360) % 360;
          S.map.dec0 = clamp(down.dec + dy * degpp, -89, 89);
          drawMap(); return;
        }
      }
      var h = hit(e);
      out.textContent = h ? h.name + ' · ' + h.frames.length + ' SPHEREx images · click to select' : 'Click a target · drag to look around';
      el.style.cursor = h ? 'pointer' : '';
    });
    el.addEventListener('pointerup', function (e) {
      el.classList.remove('is-drag');
      if (down && !moved) { var h = hit(e); if (h) { msg(''); selectTarget(h, { keepMap: true }); } }
      down = null;
    });
    el.addEventListener('dblclick', function (e) { var h = hit(e); if (h) { selectTarget(h); setView('images'); } });
  })();
  $('#nxPlay').addEventListener('click', function () { setPlaying(!S.playing); });
  $('#nxRange').addEventListener('input', function (e) { setPlaying(false); S.idx = +e.target.value; render(); });
  $('#nxPrev').addEventListener('click', function () { setPlaying(false); S.idx = (S.idx - 1 + S.t.frames.length) % S.t.frames.length; render(); });
  $('#nxNext').addEventListener('click', function () { setPlaying(false); S.idx = (S.idx + 1) % S.t.frames.length; render(); });
  $('#nxSpeed').addEventListener('change', function (e) { S.fps = +e.target.value; tick(); });
  $('#nxA').addEventListener('change', function (e) { S.a = +e.target.value; render(); });
  $('#nxB').addEventListener('change', function (e) { S.b = +e.target.value; render(); });
  $('#nxBand').addEventListener('change', function (e) {
    var v = S.t && S.t.variants && S.t.variants[+e.target.value];
    if (v) selectTarget(v, { keepMap: true, mode: S.mode });
  });
  $('#nxSwap').addEventListener('click', function () { var x = S.a; S.a = S.b; S.b = x; $('#nxA').value = S.a; $('#nxB').value = S.b; render(); });
  [['#nxTrack', 'track'], ['#nxCross', 'cross'], ['#nxGrid', 'grid'], ['#nxSmooth', 'smooth']].forEach(function (p) {
    $(p[0]).addEventListener('click', function () { S[p[1]] = !S[p[1]]; $(p[0]).setAttribute('aria-pressed', String(S[p[1]])); render(); });
  });
  $('#nxCmap').addEventListener('change', function (e) { S.cmap = e.target.value; render(); });
  function zoomTo(z) { S.zoom = clamp(z, 1, 16); $('#nxZoomVal').textContent = S.zoom + '×'; render(); }
  $('#nxZoomIn').addEventListener('click', function () { zoomTo(S.zoom * 2); });
  $('#nxZoomOut').addEventListener('click', function () { zoomTo(S.zoom / 2); });
  $('#nxSearch').addEventListener('submit', function (e) { e.preventDefault(); search($('#nxCoord').value); });
  $('#nxLc').addEventListener('click', function (e) {
    var i = e.target.getAttribute && e.target.getAttribute('data-i'); if (i === null) return;
    setMode('play'); setPlaying(false); S.idx = +i; render();
  });
  $('#nxShare').addEventListener('click', function () {
    var b = $('#nxShare'), url = location.href;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
      function () { b.textContent = 'Link copied'; },
      function () { b.textContent = 'Copy failed: use the address bar'; });
    setTimeout(function () { b.textContent = 'Copy link to this view'; }, 2000);
  });

  // mouse: drag to pan, move to read sky position
  frames.forEach(function (fr) {
    var cv = fr.querySelector('canvas'), out = fr.querySelector('.nx-cursor'), down = null;
    fr.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, cx: S.cx, cy: S.cy }; fr.setPointerCapture(e.pointerId); });
    fr.addEventListener('pointermove', function (e) {
      if (!S.t || !S.t.ready) return;
      var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, g = geom(cv);
      if (down && S.zoom > 1) {
        fr.classList.add('is-drag');
        S.cx = down.cx - (e.clientX - down.x) * dpr / g.sc; S.cy = down.cy - (e.clientY - down.y) * dpr / g.sc;
        var f0 = S.t.frames[0]; S.cx = clamp(S.cx, 0, f0.w); S.cy = clamp(S.cy, 0, f0.h);
        render(); return;
      }
      var x = ((e.clientX - r.left) * dpr - g.ox) / g.sc, y = ((e.clientY - r.top) * dpr - g.oy) / g.sc, f = S.t.frames[0];
      if (x < 0 || y < 0 || x > f.w || y > f.h) { out.textContent = ''; return; }
      var dra = -(x - f.w / 2) * S.t.pixel_arcsec / 3600 / Math.cos(S.t.dec * Math.PI / 180);
      var ddec = -(y - f.h / 2) * S.t.pixel_arcsec / 3600;
      out.textContent = raHMS(S.t.ra + dra) + '   ' + decDMS(S.t.dec + ddec);
    });
    fr.addEventListener('pointerup', function () { down = null; fr.classList.remove('is-drag'); });
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || !S.t) return;
    var modes = { '1': 'play', '2': 'blink', '3': 'side', '4': 'diff', '5': 'stack' };
    if (e.key === ' ') { e.preventDefault(); if (S.view === 'images' && S.mode !== 'play' && S.mode !== 'blink') setMode('play'); setPlaying(!S.playing); }
    else if (e.key === 'ArrowRight') { setMode('play'); setPlaying(false); S.idx = (S.idx + 1) % S.t.frames.length; render(); }
    else if (e.key === 'ArrowLeft') { setMode('play'); setPlaying(false); S.idx = (S.idx - 1 + S.t.frames.length) % S.t.frames.length; render(); }
    else if (modes[e.key]) { S.mode = modes[e.key]; setView('images'); }
    else if (e.key === 'm' || e.key === 'M') setView(S.view === 'map' ? 'images' : 'map');
  });
  window.addEventListener('resize', function () { render(); drawMap(); });

  /* ---------------------------------------------------------
     10. START
     --------------------------------------------------------- */
  function buildList() {
    var list = $('#nxTargets'); list.innerHTML = '';
    [['moving', 'Moving objects'], ['variable', 'Changing brightness']].forEach(function (grp) {
      var items = S.targets.filter(function (t) { return t.kind === grp[0]; });
      if (!items.length) return;
      var h = document.createElement('p'); h.className = 'nx-group'; h.textContent = grp[1]; list.appendChild(h);
      items.forEach(function (t) {
        var b = document.createElement('button'); b.className = 'nx-target'; b.dataset.id = t.id; b.setAttribute('aria-pressed', 'false');
        b.innerHTML = '<span class="nx-glyph nx-glyph--' + t.kind + '">' + (t.kind === 'variable' ? '●' : '★') + '</span>' +
          '<div><p class="nx-target__name">' + t.name + '</p><p class="nx-target__meta">' + t.frames.length + ' images · ' + raHMS(t.ra).slice(0, 7) + ' ' + decDMS(t.dec).slice(0, 4) + '</p></div>';
        b.addEventListener('click', function () { msg(''); selectTarget(t); });
        list.appendChild(b);
      });
    });
  }

  loadJSON().then(function (json) {
    if (json && json.targets && json.targets.length) {
      S.demo = false;
      S.targets = json.targets.map(function (t) {
        if (!t.bands || !t.bands.length) return realTarget(t, json);
        var variants = t.bands.map(function (b) {
          return realTarget(Object.assign({}, t, { frames: b.frames, pixel_arcsec: b.pixel_arcsec || t.pixel_arcsec, band: b.id, bandLabel: b.label }), json);
        });
        variants.forEach(function (v) { v.variants = variants; });
        return variants[0];
      });
      $('#nxDataNote').innerHTML = '<strong>Data:</strong> ' + (json.source || 'NASA SPHEREx images (IRSA)') +
        '.' + (json.generated ? ' Updated ' + fmtDate(Date.parse(json.generated)) + '.' : '');
    } else {
      S.demo = true;
      S.targets = DEMO_TARGETS.map(demoTarget);
      $('#nxDataNote').innerHTML = '<strong>Demo mode.</strong> These images are simulated in your browser to show how the tool works. ' +
        'Processed SPHEREx images load automatically from <code>' + DATA_URL + '</code> when it is present.';
    }
    buildList();
    $('#nxCount').textContent = S.targets.length + ' objects';
    var q = new URLSearchParams(location.search);
    if (q.get('ra') && q.get('dec') && search(q.get('ra') + ' ' + q.get('dec'))) return;
    var start = S.targets.filter(function (t) { return t.id === q.get('target'); })[0] || S.targets[0];
    if (start.variants && q.get('band')) start = start.variants.filter(function (v) { return v.band === q.get('band'); })[0] || start;
    var num = function (k) { return q.get(k) !== null ? +q.get(k) : undefined; };
    S.view = q.get('view') === 'images' ? 'images' : 'map';
    selectTarget(start, { mode: q.get('mode') || 'play', frame: num('frame'), a: num('a'), b: num('b') });
  });
})();
