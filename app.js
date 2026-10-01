// NBE · Effective Communication · Communication Model Exercise
// Options (URL query string):
//   ?feedback=check  hold feedback until "Check all" is pressed (default: instant on drop)
//   ?arabic=off      hide the Arabic text
(() => {
  'use strict';

  const SCEN = {
    A: { short: 'Blocked card call', en: 'A customer calls the call centre about a blocked card while driving.', ar: 'عميل يتصل بمركز الاتصال بشأن بطاقة موقوفة أثناء القيادة.',
      cards: [['Customer', 'sender'], ['"My card stopped working!"', 'encoding'], ['Phone call', 'channel'], ['Agent works out it is a security block', 'decoding'], ['Call-centre agent', 'receiver'], ['Agent repeats back the issue', 'feedback'], ['Road noise', 'noise'], ["Customer's stress", 'noise']] },
    B: { short: 'Missing signature', en: 'A branch emails Operations an account-opening file with a missing signature.', ar: 'فرع يرسل إلى إدارة العمليات بالبريد الإلكتروني ملف فتح حساب ينقصه توقيع.',
      cards: [['Branch officer', 'sender'], ['Writes a request and attaches the file', 'encoding'], ['Email', 'channel'], ['Ops reviews the file', 'decoding'], ['Operations team', 'receiver'], ['Ops replies: "Signature missing"', 'feedback'], ['Missing signature', 'noise'], ['Vague subject line', 'noise'], ['Crowded inbox', 'noise']] },
    C: { short: 'Morning huddle', en: 'A manager gives instructions to the team in a 5-minute morning huddle.', ar: 'مدير يعطي تعليمات للفريق في اجتماع صباحي مدته خمس دقائق.',
      cards: [['Branch manager', 'sender'], ['Turns the plan into 3 short points', 'encoding'], ['Face-to-face huddle', 'channel'], ['Team links points to their tasks', 'decoding'], ['The team', 'receiver'], ['Team asks questions and confirms', 'feedback'], ['Only 5 minutes', 'noise'], ['Phones ringing nearby', 'noise']] },
    D: { short: 'New fee SMS', en: 'A customer receives an SMS about a new fee and visits the branch angry.', ar: 'عميل تصله رسالة نصية عن رسوم جديدة فيزور الفرع غاضبًا.',
      cards: [['The bank', 'sender'], ['Fee notice written as a short SMS', 'encoding'], ['SMS', 'channel'], ['Reads it as an unfair charge', 'decoding'], ['Customer', 'receiver'], ['Visits the branch angry', 'feedback'], ['No reason given for the fee', 'noise'], ['Technical wording', 'noise']] }
  };
  const STAGE_W = 1920, STAGE_H = 1080;
  const WRONG_RETURN_MS = 700;

  const params = new URLSearchParams(location.search);
  const instantFeedback = params.get('feedback') !== 'check';
  const showArabic = params.get('arabic') !== 'off';

  const $ = id => document.getElementById(id);
  const wrap = $('wrap'), stage = $('stage'), ghost = $('ghost');
  const zoneEls = {}, cardLists = {};
  document.querySelectorAll('[data-zone]').forEach(el => { zoneEls[el.dataset.zone] = el; });
  document.querySelectorAll('[data-cards]').forEach(el => { cardLists[el.dataset.cards] = el; });
  const tabEls = [...document.querySelectorAll('.tab')];

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let scale = 1;
  let timers = [];
  let cardEls = [];
  const state = { tab: 'A', order: [], placed: {}, drag: null, hover: null };

  // ---------- Fit the 1920×1080 stage to the screen ----------
  function fit() {
    const w = wrap.clientWidth || window.innerWidth, h = wrap.clientHeight || window.innerHeight;
    const s = Math.min(w / STAGE_W, h / STAGE_H);
    if (isFinite(s) && s > 0) {
      scale = s;
      stage.style.transform = `scale(${s})`;
    }
  }

  // ---------- Board state ----------
  function reset(tab) {
    timers.forEach(clearTimeout); timers = [];
    endDrag();
    state.tab = tab;
    state.order = shuffle([...SCEN[tab].cards.keys()]);
    state.placed = {};
    cardEls.forEach(el => el.remove());
    cardEls = SCEN[tab].cards.map(([text], id) => makeCard(id, text));
    renderScenario();
    render();
  }

  function makeCard(id, text) {
    const el = document.createElement('div');
    el.className = 'card';
    const check = document.createElement('span');
    check.className = 'check';
    check.textContent = '✓';
    const label = document.createElement('span');
    label.className = 'text';
    label.textContent = text;
    el.append(check, label);
    el.addEventListener('pointerdown', e => onDown(id, e));
    el.addEventListener('animationend', () => el.classList.remove('anim-pop', 'anim-shake'));
    return el;
  }

  function setPlaced(id, val) {
    if (val) state.placed[id] = val; else delete state.placed[id];
  }

  function animate(id, cls) {
    const el = cardEls[id];
    el.classList.remove('anim-pop', 'anim-shake');
    void el.offsetWidth; // restart the animation if it is already running
    el.classList.add(cls);
  }

  function place(id, zone) {
    if (!instantFeedback) { setPlaced(id, { zone, status: 'pending' }); render(); return; }
    if (SCEN[state.tab].cards[id][1] === zone) {
      setPlaced(id, { zone, status: 'correct' });
      render();
      animate(id, 'anim-pop');
    } else {
      fail(id, zone);
    }
  }

  function fail(id, zone) {
    setPlaced(id, { zone, status: 'wrong' });
    render();
    animate(id, 'anim-shake');
    timers.push(setTimeout(() => {
      const p = state.placed[id];
      if (p && p.status === 'wrong') { setPlaced(id, null); render(); }
    }, WRONG_RETURN_MS));
  }

  function checkAll() {
    const cards = SCEN[state.tab].cards;
    Object.entries(state.placed).forEach(([key, p]) => {
      const id = +key;
      if (p.status !== 'pending') return;
      if (cards[id][1] === p.zone) {
        setPlaced(id, { zone: p.zone, status: 'correct' });
        render();
        animate(id, 'anim-pop');
      } else {
        fail(id, p.zone);
      }
    });
  }

  function showAnswers() {
    timers.forEach(clearTimeout); timers = [];
    endDrag();
    SCEN[state.tab].cards.forEach(([, zone], id) => {
      const p = state.placed[id];
      if (!(p && p.status === 'correct')) state.placed[id] = { zone, status: 'shown' };
    });
    render();
  }

  // ---------- Dragging ----------
  function toStage(e) {
    const r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }

  function zoneAt(e) {
    for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
      const z = el.closest && el.closest('[data-zone]');
      if (z && !z.hidden) return z.dataset.zone;
    }
    return null;
  }

  function onDown(id, e) {
    const p = state.placed[id];
    if (p && p.status !== 'pending') return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const el = cardEls[id];
    const r = el.getBoundingClientRect(), pt = toStage(e);
    state.drag = { id, dx: (e.clientX - r.left) / scale, dy: (e.clientY - r.top) / scale };
    ghost.textContent = SCEN[state.tab].cards[id][0];
    ghost.style.width = Math.max(r.width / scale, 200) + 'px';
    moveGhost(pt);
    ghost.hidden = false;
    el.classList.add('is-source');
  }

  function moveGhost(pt) {
    const d = state.drag;
    ghost.style.left = (pt.x - d.dx) + 'px';
    ghost.style.top = (pt.y - d.dy) + 'px';
  }

  function setHover(zone) {
    if (state.hover === zone) return;
    if (state.hover && zoneEls[state.hover]) zoneEls[state.hover].classList.remove('is-hover');
    state.hover = zone;
    if (zone && zoneEls[zone]) zoneEls[zone].classList.add('is-hover');
  }

  function endDrag() {
    if (state.drag && cardEls[state.drag.id]) cardEls[state.drag.id].classList.remove('is-source');
    state.drag = null;
    ghost.hidden = true;
    setHover(null);
  }

  function onMove(e) {
    if (!state.drag) return;
    moveGhost(toStage(e));
    setHover(zoneAt(e));
  }

  function onUp(e) {
    const d = state.drag;
    if (!d) return;
    const zone = e.type === 'pointercancel' ? null : zoneAt(e);
    endDrag();
    if (!zone || zone === 'tray') { setPlaced(d.id, null); render(); }
    else place(d.id, zone);
  }

  // ---------- Rendering ----------
  function renderScenario() {
    const scen = SCEN[state.tab];
    tabEls.forEach(t => {
      const active = t.dataset.tab === state.tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active);
    });
    $('scenario-label').textContent = `Scenario ${state.tab} · ${scen.short}`;
    $('scenario-en').textContent = scen.en;
    $('scenario-ar').textContent = scen.ar;
  }

  function render() {
    const { order, placed } = state;
    const total = order.length;
    const statuses = Object.values(placed).map(p => p.status);
    const correct = statuses.filter(s => s === 'correct').length;
    const settled = statuses.filter(s => s === 'correct' || s === 'shown').length;
    const done = settled === total;

    // Put each card in its zone, keeping the shuffled order.
    const wanted = {};
    Object.keys(cardLists).forEach(z => { wanted[z] = []; });
    order.forEach(id => {
      const p = placed[id];
      const el = cardEls[id];
      wanted[p ? p.zone : 'tray'].push(el);
      el.classList.remove('is-pending', 'is-correct', 'is-shown', 'is-wrong');
      if (p) el.classList.add('is-' + p.status);
    });
    Object.entries(wanted).forEach(([z, els]) => {
      const list = cardLists[z];
      const current = [...list.children];
      if (current.length !== els.length || current.some((c, i) => c !== els[i])) list.append(...els);
    });

    $('score-value').textContent = `${correct} / ${total}`;
    $('progress-fill').style.width = Math.round(correct / total * 100) + '%';

    $('tray').hidden = done;
    $('reflect').hidden = !done;
    if (done) {
      const anyShown = statuses.includes('shown');
      $('reflect-label').textContent = 'Reflect · ' + (anyShown ? 'answers shown' : `all ${total} placed correctly`);
    }
  }

  // ---------- Wire up ----------
  if (!showArabic) stage.classList.add('no-ar');
  tabEls.forEach(t => t.addEventListener('click', () => reset(t.dataset.tab)));
  $('btn-check').addEventListener('click', checkAll);
  $('btn-show').addEventListener('click', showAnswers);
  $('btn-reset').addEventListener('click', () => reset(state.tab));
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap);

  fit();
  reset('A');
})();
