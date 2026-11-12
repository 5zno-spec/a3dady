const AR = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
let digits = 'ar';   // 'ar' = ٠١٢٣ ، 'en' = 0123
const fmt = n => digits === 'ar' ? String(n).split('').map(d => AR[+d]).join('') : String(n);
const fmtH = n => fmt(n);

/* الأقسام: ٠–١٠، ١١–٢٠، ٢١–٥٠ */
const MAXN = 50;
const SECS = [{from: 0, to: 10, label: '(0 - 10)'}, {from: 11, to: 20, label: '(11 - 20)'}, {from: 21, to: 50, label: '(21 - 50)'}];
const secOf = n => n <= 10 ? 0 : n <= 20 ? 1 : 2;
const range = s => Array.from({length: SECS[s].to - SECS[s].from + 1}, (_, i) => SECS[s].from + i);

/* أسماء الأعداد ٠–٥٠ */
const BASE = ['صفر','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة'];
const TEENS = ['أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون'];
const NAMES = Array.from({length: MAXN + 1}, (_, n) =>
  n <= 10 ? BASE[n] : n < 20 ? TEENS[n - 11] : n % 10 === 0 ? TENS[n / 10] : BASE[n % 10] + ' و' + TENS[Math.floor(n / 10)]);

const PAL = ['#FF9FB0','#FFC27A','#FFE27A','#8FE3A8','#9CCBFF','#C9B3FF'];   // ألوان الأرقام بالترتيب
/* عبارات التشجيع: العبارة رقم i ينطقها الملف audio/praise/(i+1).mp3 */
const PRAISE = ['أحسنت', 'ممتاز', 'رائع', 'ما شاء الله', 'بارك الله فيك'];
/* الأشكال صور في img/shapes (الاسم هو اسم الملف) */
const EMOJI = ['seed','faucet','watering-can','shower','tree','house','rocket','backpack','net','gift','comb','candle','frog','key','fish','brush'];
EMOJI.forEach(id => { new Image().src = 'img/shapes/' + id + '.webp'; });
/* لكل رقم خمسة أشكال مختلفة للتعبير عنه (الخطوة 3 أولية مع 16 فلا يتكرر شكل داخل المجموعة) */
const SETS = Array.from({length: MAXN + 1}, (_, n) => Array.from({length:5}, (_, k) => EMOJI[(n*5 + k*3 + 1) % EMOJI.length]));
const $ = id => document.getElementById(id);
/* خلط عادل (Fisher–Yates) حتى لا تميل الإجابة الصحيحة إلى موضع معيّن */
const shuffle = a => { for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* حفظ التقدم في المتصفح */
const KEY = 'arabic-numbers-v1';
let store = {};
try{ store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }catch(e){ store = {}; }
const okNum = n => Number.isInteger(n) && n >= 0 && n <= MAXN;
const shapeIdx = Array(MAXN + 1).fill(0);
if(Array.isArray(store.shapeIdx)) store.shapeIdx.forEach((v, i) => { if(i <= MAXN && Number.isInteger(v) && v >= 0 && v < 5) shapeIdx[i] = v; });
/* الأرقام التي اجتاز الطفل اختبارها: لعبة «العب مع الأعداد» لا تتجاوزها */
const studied = new Set(Array.isArray(store.learned) ? store.learned.filter(okNum) : []);
/* درجات اختبار كل رقم: best أفضل درجة (من ٥)، last آخر درجة، tries عدد مرات الاختبار، date آخر مرة */
const MROUNDS = 5;
const PASS = 4;   // أقل درجة للاجتياز والانتقال للرقم التالي (من ٥)
const stats = {};
if(store.stats && typeof store.stats === 'object'){
  for(const k in store.stats){
    const n = +k, s = store.stats[k];
    if(okNum(n) && s && Number.isInteger(s.best) && s.best >= 0 && s.best <= MROUNDS){
      stats[n] = {best: s.best, last: Number.isInteger(s.last) ? s.last : s.best, tries: Number.isInteger(s.tries) ? s.tries : 1, date: +s.date || 0};
    }
  }
}
let curTab = 'cards', score = 0, qi = 0, answer, locked = false, qEmoji, qList = [], pending = false, done = false;
let best = Number.isInteger(store.best) ? store.best : 0;
function persist(){
  try{
    localStorage.setItem(KEY, JSON.stringify({
      cur, shapeIdx, muted, best, learned: [...studied], stats,
      game: {score, qi, answer, emoji: qEmoji, list: qList, pending, done}
    }));
  }catch(e){}
}

/* صوت */
let actx, muted = !!store.muted;
function audioCtx(){
  actx = actx || new (window.AudioContext||window.webkitAudioContext)();
  if(actx.state === 'suspended') actx.resume();   // ضروري على آيفون حتى تُسمع النغمات
  return actx;
}
function tone(freqs){
  if(muted) return;
  try{
    const ac = audioCtx();
    freqs.forEach((f,i)=>{
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f; o.type = 'triangle';
      g.gain.setValueAtTime(.18, ac.currentTime + i*.12);
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + i*.12 + .25);
      o.connect(g); g.connect(ac.destination);
      o.start(ac.currentTime + i*.12); o.stop(ac.currentTime + i*.12 + .28);
    });
  }catch(e){}
}
/* صوت الخطأ: نغمتان هابطتان مميّزتان (بُوبُوو)، واهتزاز خفيف للهاتف حيث يُدعم */
function wrong(){
  try{ if(navigator.vibrate) navigator.vibrate(90); }catch(e){}
  if(muted) return;
  try{
    const ac = audioCtx(), t = ac.currentTime;
    [[330, 0, .16], [220, .17, .3]].forEach(([f, d, len]) => {
      const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(f, t + d);
      o.frequency.exponentialRampToValueAtTime(f * .88, t + d + len);
      lp.type = 'lowpass'; lp.frequency.value = 1400;      // ينعّم خشونة الموجة المربعة
      g.gain.setValueAtTime(.0001, t + d);
      g.gain.exponentialRampToValueAtTime(.2, t + d + .02);
      g.gain.setValueAtTime(.2, t + d + len - .06);
      g.gain.exponentialRampToValueAtTime(.001, t + d + len);
      o.connect(lp); lp.connect(g); g.connect(ac.destination);
      o.start(t + d); o.stop(t + d + len + .02);
    });
  }catch(e){}
}
const ICON_SOUND = `<svg class="ic ic-lg" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 12.5h4.5l6-5v17l-6-5H5.5z"/><path d="M21 12.2c1.9 2.3 1.9 5.3 0 7.6M24.4 9.2c3.5 4 3.5 9.6 0 13.6"/></svg>`, ICON_MUTE = `<svg class="ic ic-lg" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 12.5h4.5l6-5v17l-6-5H5.5z"/><path d="M21.5 12.5l6 7M27.5 12.5l-6 7"/></svg>`;
const ICON_PLAY = '<svg class="ic" viewBox="0 0 32 32" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><path d="M11 7.5v17l14-8.5z"/></svg>';
const ICON_STOP = '<svg class="ic" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><rect x="9" y="9" width="14" height="14" rx="3"/></svg>';
/* تشغيل ملف صوتي مسجّل، وإن فشل يُنطق النص بصوت الجهاز (مرة واحدة، ولآخر صوت طُلب فقط).
   onEnd (اختياري) يُستدعى مرة واحدة عند انتهاء الملف أو بعد النطق البديل */
let current;
function playClip(src, text, onEnd){
  let ended = false;
  const end = d => { if(ended || !onEnd) return; ended = true; setTimeout(onEnd, d); };
  if(muted){ end(700); return; }
  try{ if(current) current.pause(); speechSynthesis.cancel(); }catch(e){}
  const a = new Audio(src);
  current = a;
  let fell = false;
  const fallback = () => { if(fell || current !== a) return; fell = true; synth(text); end(1100); };
  a.onerror = fallback;
  a.onended = () => end(150);
  a.play().catch(fallback);
  if(onEnd) setTimeout(() => end(0), 3000);   // احتياط: لا يتوقف العدّ إن لم يصل حدث الانتهاء
}
const speak = n => playClip('audio/' + n + '.mp3', NAMES[n]);
function synth(text){
  try{
    if(!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = .8;
    speechSynthesis.speak(u);
  }catch(e){}
}
/* فقاعة تشجيع عند الإجابة الصحيحة: عبارة عشوائية (لا تتكرر مرتين متتاليتين) تظهر ويُسمع صوتها */
let lastPraise = -1, praiseEl = null, praiseT = 0, praiseA = 0;
function praise(){
  let i;
  do{ i = Math.floor(Math.random() * PRAISE.length); }while(i === lastPraise);
  lastPraise = i;
  clearTimeout(praiseT); clearTimeout(praiseA);
  if(praiseEl) praiseEl.remove();
  const el = document.createElement('div');
  el.className = 'praise'; el.setAttribute('role', 'status'); el.textContent = PRAISE[i];
  document.body.appendChild(el); praiseEl = el;
  praiseT = setTimeout(() => { el.remove(); if(praiseEl === el) praiseEl = null; }, 1550);
  praiseA = setTimeout(() => playClip('audio/praise/' + (i + 1) + '.mp3', PRAISE[i]), 380);   // بعد نغمة النجاح
}
function applyMute(){
  $('mute').innerHTML = muted ? ICON_MUTE : ICON_SOUND;
  $('mute').setAttribute('aria-pressed', muted);
  $('mute').setAttribute('aria-label', muted ? 'تشغيل الصوت' : 'كتم الصوت');
  if(muted){ try{ if(current) current.pause(); speechSynthesis.cancel(); }catch(e){} }
}
$('mute').onclick = () => { muted = !muted; applyMute(); persist(); };
if(muted) applyMute();

/* العدّ بالصوت في لوحة الأعداد: زر تحت اللوحة ينطق أرقامها بالترتيب ويُضيء كل بطاقة أثناء نطقها.
   الضغط مرة أخرى (أو فتح بطاقة أو مغادرة اللوحة) يوقف العدّ. countTok يلغي أي عدّ سابق ما زال ينتظر */
let countTok = 0, counting = false;
function setCountBtn(on){
  counting = on;
  const b = $('countBtn');
  b.innerHTML = on ? ICON_STOP : ICON_PLAY;
  b.setAttribute('aria-pressed', on);
  b.setAttribute('aria-label', on ? 'إيقاف العدّ' : 'عُدّ أرقام اللوحة');
}
function stopCount(){
  if(!counting) return;
  countTok++;
  setCountBtn(false);
  cardGrid.querySelectorAll('.lit').forEach(c => c.classList.remove('lit'));
  try{ if(current) current.pause(); speechSynthesis.cancel(); }catch(e){}
}
function startCount(){
  const tok = ++countTok;
  setCountBtn(true);
  const cards = [...cardGrid.children];
  let i = 0;
  const step = () => {
    if(tok !== countTok) return;
    cards.forEach(c => c.classList.remove('lit'));
    if(i >= cards.length){ setCountBtn(false); return; }
    const c = cards[i++];
    c.classList.add('lit');
    try{ c.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }catch(e){}
    playClip('audio/' + c.dataset.n + '.mp3', NAMES[+c.dataset.n], step);
  };
  step();
}

/* الأقسام: بطاقات الأعداد، تعلّم رقم، العب مع الأعداد، إنجازاتي */
function show(tab){
  stopCount();
  curTab = tab;
  ['cards', 'learn', 'play', 'ach'].forEach(s => $(s).classList.toggle('hidden', s !== tab));
  if(tab === 'play' && (qi === 0 || done)) startGame();
  if(tab === 'ach') renderAch();
  persist();
}

/* الأشكال:
   حتى العشرة تُرتَّب في شبكة تملأ المربع.
   فوق العشرة: بطاقات العشرات في عمود واحد على اليسار، والآحاد على اليمين.
   tensLayout يحسب المقاسات (بنسبة من عرض المربع) لتكون البطاقات والأشكال أكبر ما يمكن:
   ارتفاع البطاقة يكفي لرصّ كل العشرات رأسيًا، وللآحاد يُختار عدد الأعمدة الذي يعطي أكبر شكل */
function tensLayout(t, o){
  const H = 88, gap = 3;
  const ch = Math.min(26, (H - (t - 1) * gap) / t);
  const cw = Math.min(ch * 1.55, 40);
  const W = 90 - cw - 4;
  let us = 0, oc = 1;
  for(let c = 1; c <= o; c++){
    const s = Math.min(W / c, H / Math.ceil(o / c), 24);
    if(s > us){ us = s; oc = c; }
  }
  return {ch, cw, us, oc};
}
function renderShapes(el, id, n){
  if(n === 0){ el.innerHTML = ''; return; }
  const img = `<img src="img/shapes/${id}.webp" alt="" draggable="false">`;
  if(n <= 10){
    el.style.setProperty('--c', Math.ceil(Math.sqrt(n)));
    el.innerHTML = '<div class="sg">' + `<span class="c">${img}</span>`.repeat(n) + '</div>';
    return;
  }
  const t = Math.floor(n / 10), o = n % 10, L = tensLayout(t, o);
  el.innerHTML = '<div class="tg" style="--ch:' + L.ch + 'cqw;--cw:' + L.cw + 'cqw;--us:' + L.us + 'cqw;--oc:' + L.oc + '">' +
    '<div class="tcol">' + `<span class="ten">${img}<b>${fmt(10)}</b></span>`.repeat(t) + '</div>' +
    (o ? '<div class="ocol">' + `<span class="one">${img}</span>`.repeat(o) + '</div>' : '') +
    '</div>';
}

/* بطاقات الأعداد ومربعات صفحة التعلّم تُبنى حسب القسم المفتوح */
const cardGrid = $('cardGrid'), grid = $('grid');
let curSec = 0, cur = 1;
function setSection(s){
  stopCount();
  curSec = s;
  cardGrid.innerHTML = ''; grid.innerHTML = '';
  cardGrid.dataset.sec = s; grid.dataset.sec = s;
  range(s).forEach(n => {
    const c = document.createElement('button');
    c.className = 'card'; c.dataset.n = n; c.innerHTML = fmtH(n);
    c.onclick = () => openLearn(n);
    cardGrid.appendChild(c);
    const b = document.createElement('button');
    b.className = 'num'; b.dataset.n = n; b.innerHTML = fmtH(n);
    b.setAttribute('aria-pressed', n === cur);
    b.onclick = () => requestPick(n);
    grid.appendChild(b);
  });
  updateNums();
}
const numBtn = n => grid.querySelector('[data-n="' + n + '"]');
function openLearn(n){
  const s = secOf(n);
  if(s !== curSec) setSection(s);
  history.pushState({v: 'sec', tab: 'learn', depth: 2, sec: s}, '');
  show('learn');
  pick(n);
}
$('countBtn').onclick = () => counting ? stopCount() : startCount();

/* إنجازاتي: نسبة الأرقام المنجزة، ولكل قسم عنوان، ولكل رقم شريط بدرجته ونجومه */
const starCount = s => s >= 5 ? 3 : s >= 3 ? 2 : s >= 1 ? 1 : 0;
function renderAch(){
  const total = MAXN + 1, doneN = studied.size, pct = Math.round(doneN / total * 100);
  $('achDone').innerHTML = 'أنجزت <b>' + fmt(doneN) + '</b> من ' + fmt(total);
  $('achPct').innerHTML = '<b>' + fmt(pct) + (digits === 'ar' ? '٪' : '%') + '</b>';
  $('achBar').setAttribute('aria-valuenow', pct);
  $('achFill').style.width = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => { $('achFill').style.width = pct + '%'; }));
  const pts = Object.values(stats).reduce((a, s) => a + s.best, 0);
  $('achPts').textContent = 'مجموع النقاط: ' + fmt(pts) + ' من ' + fmt(total * MROUNDS) +
    (best ? ' · أفضل نتيجة في اللعب: ' + fmt(best) + ' من ' + fmt(TOTAL) : '');
  const list = $('achList');
  list.innerHTML = '';
  SECS.forEach((sec, si) => {
    const nums = range(si), d = nums.filter(n => studied.has(n)).length;
    const h = document.createElement('div');
    h.className = 'ach-sec';
    h.innerHTML = 'الأعداد <span dir="ltr">' + sec.label + '</span><span>' + fmt(d) + ' من ' + fmt(nums.length) + '</span>';
    list.appendChild(h);
    nums.forEach((n, i) => {
      const s = stats[n], dn = studied.has(n);
      const b = document.createElement('button');
      b.className = 'ach-row' + (dn ? '' : ' todo');
      b.style.setProperty('--b', PAL[i % PAL.length]);
      const w = s ? s.best / MROUNDS * 100 : (dn ? 100 : 0);
      let scoreHtml, label;
      if(s){
        const st = starCount(s.best);
        scoreHtml = '<b>' + fmt(s.best) + ' من ' + fmt(MROUNDS) + '</b>' + '<i class="on">★</i>'.repeat(st) + '<i>★</i>'.repeat(3 - st);
        label = NAMES[n] + ': ' + s.best + ' من ' + MROUNDS;
      }else if(dn){
        scoreHtml = '<b>✓</b>'; label = NAMES[n] + ': تم';
      }else{
        scoreHtml = 'لم يُختبَر'; label = NAMES[n] + ': لم يُختبَر';
      }
      b.innerHTML = '<span class="ach-n">' + fmtH(n) + '</span>' +
        '<span class="ach-mid"><span class="ach-name">' + NAMES[n] + '</span><span class="pbar"><i style="width:' + w + '%"></i></span></span>' +
        '<span class="ach-score">' + scoreHtml + '</span>';
      b.setAttribute('aria-label', label);
      b.onclick = () => openLearn(n);
      list.appendChild(b);
    });
  });
}

/* تعلّم */
function pick(n, quiet){
  cur = n;
  [...grid.children].forEach(b => b.setAttribute('aria-pressed', +b.dataset.n === n));
  $('big').innerHTML = '<span class="dn">' + fmtH(n) + '</span>';
  $('word').textContent = NAMES[n];
  $('word').classList.toggle('long', NAMES[n].length > 7);
  renderShapes($('things'), SETS[n][shapeIdx[n]], n);
  updateShapeBtn();
  persist();
  if(!quiet){ tone([660]); speak(n); }
}
/* تغيير الرقم من صفحة التعلّم: إن لم يُختبَر الرقم الحالي بعد، نسأل الطفل أولًا
   (askTarget: الرقم الذي أراد الانتقال إليه، ليُفتح عند «ليس الآن») */
let askTarget = null;
function requestPick(n){
  if(n !== cur && !studied.has(cur)){ askTarget = n; return showAsk(); }
  pick(n);
}
function updateShapeBtn(){
  const b = $('shapeBtn');
  b.style.visibility = cur === 0 ? 'hidden' : 'visible';
}
$('shapeBtn').onclick = () => {
  if(cur === 0) return;
  shapeIdx[cur] = (shapeIdx[cur] + 1) % 5;
  renderShapes($('things'), SETS[cur][shapeIdx[cur]], cur);
  updateShapeBtn();
  persist();
  speak(cur);
};
cur = okNum(store.cur) ? store.cur : 1;
setSection(secOf(cur));
pick(cur, true);

/* نافذة: هل أتممت دراسة الرقم؟ */
function showAsk(){
  $('askN').innerHTML = fmtH(cur);
  $('ask').classList.remove('hidden');
  $('askTest').focus();
}
function hideAsk(){ $('ask').classList.add('hidden'); }
$('askClose').onclick = () => { hideAsk(); askTarget = null; const b = numBtn(cur); if(b) b.focus(); };
$('ask').onclick = e => { if(e.target === $('ask')){ hideAsk(); askTarget = null; } };
$('askTest').onclick = () => { hideAsk(); askTarget = null; openMini(); };
/* «ليس الآن»: تخطي الاختبار والانتقال للرقم المختار */
$('askSkip').onclick = () => {
  hideAsk();
  if(askTarget !== null) pick(askTarget);
  askTarget = null;
};

/* العب */
const TOTAL = 10;
function startGame(){
  score = 0; qi = 0; done = false; pending = false;
  if(playPool().length < 2){
    $('round').classList.add('hidden'); $('result').classList.add('hidden'); $('lock').classList.remove('hidden');
    persist(); return;
  }
  $('lock').classList.add('hidden');
  $('round').classList.remove('hidden');
  $('result').classList.add('hidden');
  nextQ();
}
function updateBar(){
  $('score').textContent = fmt(score);
  $('count').textContent = fmt(qi) + ' من ' + fmt(TOTAL);
  $('sfill').style.width = ((score / TOTAL) * 100) + '%';
  $('pfill').style.width = (((done ? TOTAL : pending ? qi : qi - 1) / TOTAL) * 100) + '%';
}
function updateFinal(){
  $('final').textContent = 'حصلت على ' + fmt(score) + ' من ' + fmt(TOTAL);
  $('best').textContent = 'أفضل نتيجة: ' + fmt(best) + ' من ' + fmt(TOTAL);
}
/* أرقام اللعب: كل ما اجتازه الطفل من ١ إلى ٥٠ */
const playPool = () => [...studied].filter(n => n >= 1);
/* يختار أقرب الأرقام للرقم المطلوب ليكون التمييز بينها ممتعًا */
function pickOthers(pool, n, count){
  return pool.filter(k => k !== n)
    .map(k => ({k, w: Math.abs(k - n) + Math.random() * 2.5})).sort((a, b) => a.w - b.w).slice(0, count).map(o => o.k);
}
function nextQ(){
  if(qi >= TOTAL) return finish();
  qi++; pending = false;
  const pool = playPool();
  answer = pool[Math.floor(Math.random() * pool.length)];
  const e = EMOJI[Math.floor(Math.random()*EMOJI.length)];
  buildQ(e, shuffle([answer, ...pickOthers(pool, answer, 2)]));
  persist();
}
function buildQ(e, list){
  locked = false; qEmoji = e; qList = list;
  renderShapes($('qthings'), e, answer);
  updateBar();
  $('msg').textContent = '';
  $('choices').innerHTML = '';
  $('choices').style.gridTemplateColumns = 'repeat(' + list.length + ',1fr)';
  list.forEach(n => {
    const b = document.createElement('button');
    b.className = 'choice'; b.dataset.n = n; b.innerHTML = fmtH(n);
    b.setAttribute('aria-label', NAMES[n]);
    b.onclick = () => choose(b, n);
    $('choices').appendChild(b);
  });
}
function choose(btn, n){
  if(locked || btn.disabled) return;
  if(n === answer){
    locked = true; score++; pending = true; persist();
    btn.classList.add('ok');
    tone([523, 659, 784]);
    $('msg').textContent = 'صحيح! ' + NAMES[n];
    praise();
    updateBar();
    setTimeout(nextQ, 1600);
  }else{
    btn.classList.add('no'); btn.disabled = true;
    wrong();
    $('msg').textContent = 'حاول مرة أخرى';
  }
}
function finish(){
  done = true; pending = false; if(score > best) best = score; persist();
  $('round').classList.add('hidden');
  $('result').classList.remove('hidden');
  const s = score >= 9 ? 3 : score >= 6 ? 2 : 1;
  $('stars').textContent = '⭐'.repeat(s) + '☆'.repeat(3 - s);
  updateFinal();
  tone([523, 659, 784, 1047]);
}
$('again').onclick = startGame;
$('toLearn').onclick = () => { setSection(0); history.replaceState({v: 'sec', tab: 'cards', depth: 1, sec: 0}, ''); show('cards'); };

/* خيار شكل الأرقام */
function applyDigits(mode, save){
  digits = mode;
  $('d-ar').setAttribute('aria-pressed', mode === 'ar');
  $('d-en').setAttribute('aria-pressed', mode === 'en');
  if(save){ try{ localStorage.setItem('digits', mode); }catch(e){} }
  [...grid.children, ...cardGrid.children].forEach(b => b.innerHTML = fmtH(b.dataset.n));
  pick(cur, true);
  if(!$('ask').classList.contains('hidden')) $('askN').innerHTML = fmtH(cur);
  if(curTab === 'ach') renderAch();
  if(qi){
    updateBar();
    if(Number.isInteger(answer) && qEmoji) renderShapes($('qthings'), qEmoji, answer);   // بطاقات ١٠ تتبع شكل الأرقام
    [...$('choices').children].forEach(b => b.innerHTML = fmtH(b.dataset.n));
    if(!$('result').classList.contains('hidden')) updateFinal();
  }
}
$('d-ar').onclick = () => applyDigits('ar', true);
$('d-en').onclick = () => applyDigits('en', true);
let saved = 'ar';
try{ saved = localStorage.getItem('digits') === 'en' ? 'en' : 'ar'; }catch(e){}

/* استرجاع اللعبة المحفوظة (اللعبة الجارية فقط؛ اللعبة المنتهية تبدأ من جديد) */
(function restoreGame(){
  const g = store.game;
  if(!g || g.done || !Number.isInteger(g.qi) || g.qi < 1 || !Number.isInteger(g.score)) return;
  const valid = Number.isInteger(g.answer) && Array.isArray(g.list) && (g.list.length === 2 || g.list.length === 3) &&
    g.list.every(n => okNum(n) && n >= 1 && studied.has(n)) && g.list.includes(g.answer) && EMOJI.includes(g.emoji);
  if(!valid) return;
  score = g.score; qi = g.qi; answer = g.answer; pending = !!g.pending;
  if(pending) nextQ();
  else buildQ(g.emoji, g.list);
})();
applyDigits(saved);

/* اختبار الرقم (زر ▶ أو «اختبر الآن»): اختر المجموعة التي فيها هذا العدد.
   البدائل أرقام قريبة من نفس القسم. الدرجة: عدد الجولات التي أجاب فيها صحيحًا من أول محاولة (من ٥).
   الاجتياز من ٤ فأكثر: يُحسب الرقم منجزًا ويمكن الانتقال للتالي والإعادة اختيارية.
   أقل من ٤: لا انتقال، ويُطلب من الطفل إعادة الاختبار (أو الإغلاق بعلامة ✕) */
let mN = 0, mR = 0, mLock = false, mEmoji = [], mTimer = 0, mFirst = 0, mMiss = false;
function openMini(){
  clearTimeout(mTimer); stopCountdown();   // إلغاء أي جولة أو عدّ تنازلي مؤجّل من فتح سابق
  if(!(history.state && history.state.v === 'mini')) history.pushState({v: 'mini', tab: 'learn', depth: 3, sec: curSec}, '');
  mN = cur; mR = 0; mFirst = 0;
  mEmoji = shuffle(SETS[mN].slice());   // شكل مختلف لكل جولة دون تكرار
  $('mNum').innerHTML = fmtH(mN);
  $('mResult').classList.add('hidden'); $('mRound').classList.remove('hidden');
  $('mini').classList.remove('hidden');
  nextMini();
  $('mClose').focus();
  speak(mN);
}
/* الإغلاق بعلامة ✕ يعمل في أي لحظة، حتى في منتصف الاختبار أو مع ظهور نافذة النتيجة */
function closeMini(){
  clearTimeout(mTimer); stopCountdown();
  $('mini').classList.add('hidden'); $('mResult').classList.add('hidden');
  if(history.state && history.state.v === 'mini') history.back();
  $('miniBtn').focus();
}
function nextMini(){
  if($('mini').classList.contains('hidden')) return;   // أُغلقت اللعبة قبل انتهاء المؤقت
  if(mR >= MROUNDS) return finishMini();
  mR++; mLock = false; mMiss = false;
  $('mCount').textContent = fmt(mR) + ' من ' + fmt(MROUNDS);
  $('mQ').textContent = mN === 0 ? 'أين المربع الفارغ؟' : 'أين المجموعة التي فيها ' + NAMES[mN] + '؟';
  $('mMsg').textContent = '';
  /* ترتيب المربعات (ثلاثة متجاورة، أو اثنان وواحد تحتهما على الهاتف) تتولّاه CSS */
  const list = shuffle([mN, ...pickOthers(range(secOf(mN)), mN, 2)]);
  const emoji = mEmoji[(mR - 1) % mEmoji.length];
  $('mCards').innerHTML = '';
  list.forEach(c => {
    const b = document.createElement('button');
    b.className = 'mcard half shapes';
    b.setAttribute('aria-label', c === 0 ? 'مربع فارغ' : NAMES[c] + ' أشكال');
    renderShapes(b, emoji, c);
    b.onclick = () => {
      if(mLock || b.disabled) return;
      if(c === mN){
        mLock = true; if(!mMiss) mFirst++;
        b.classList.add('ok'); tone([523, 659, 784]);
        $('mMsg').textContent = 'صحيح! ' + NAMES[mN];
        praise();
        mTimer = setTimeout(nextMini, 1700);
      }else{
        mMiss = true;
        b.classList.add('no'); b.disabled = true; wrong();
        $('mMsg').textContent = 'حاول مرة أخرى';
      }
    };
    $('mCards').appendChild(b);
  });
}
/* إتمام الاختبار:
   اجتاز (٤ من ٥ فأكثر): «أحسنت» والنجوم، وعدّ تنازلي ٣ ثوانٍ ثم الانتقال لبطاقات الأعداد، مع زري الإعادة والرقم التالي.
   لم يجتز: «حاول مرة أخرى» والدرجة المطلوبة، وزر الإعادة فقط، بلا عدّ تنازلي ولا انتقال */
function finishMini(){
  $('mCount').textContent = '';
  const passed = mFirst >= PASS;
  const prev = stats[mN];
  stats[mN] = {best: Math.max(prev ? prev.best : 0, mFirst), last: mFirst, tries: (prev ? prev.tries : 0) + 1, date: Date.now()};
  if(passed) studied.add(mN);
  updateNums(); persist();
  $('mResCard').classList.toggle('fail', !passed);
  $('mWord').textContent = passed ? 'أحسنت!' : 'حاول مرة أخرى';
  const st = starCount(mFirst);
  $('mStars').textContent = '⭐'.repeat(st) + '☆'.repeat(3 - st);
  $('mStars').classList.toggle('hidden', !passed);
  $('mScore').innerHTML = 'درجتك ' + fmt(mFirst) + ' من ' + fmt(MROUNDS) +
    (passed ? '' : '<br>تحتاج ' + fmt(PASS) + ' من ' + fmt(MROUNDS) + ' للانتقال');
  $('mNext').classList.toggle('hidden', !passed || mN >= SECS[secOf(mN)].to);   // لا انتقال قبل الاجتياز، ولا رقم تالٍ بعد آخر رقم في القسم
  $('mCd').classList.toggle('hidden', !passed);
  $('mResult').classList.remove('hidden');
  if(passed){
    tone([523, 659, 784, 1047]);
    ($('mNext').classList.contains('hidden') ? $('mAgain') : $('mNext')).focus();
    startCountdown();
  }else{
    tone([392, 330]);
    $('mAgain').focus();
  }
}
let cdTimer = 0;
function startCountdown(){
  let left = 3;
  $('mCdN').textContent = fmt(left);
  const ring = $('mCdRing');
  ring.classList.remove('run'); void ring.getBoundingClientRect(); ring.classList.add('run');   // إعادة تشغيل حركة الحلقة
  clearInterval(cdTimer);
  cdTimer = setInterval(() => {
    left--;
    if(left <= 0){ stopCountdown(); toCards(); }
    else $('mCdN').textContent = fmt(left);
  }, 1000);
}
function stopCountdown(){ clearInterval(cdTimer); }
/* بعد إغلاق الاختبار بالرجوع في السجل ننفّذ الخطوة التالية (بطاقات القسم أو الرقم التالي) */
let afterPop = null;
function toCards(){
  stopCountdown();
  const s = secOf(mN);
  const goCards = () => { if(curSec !== s) setSection(s); history.replaceState({v: 'sec', tab: 'cards', depth: 1, sec: s}, ''); show('cards'); };
  const d = history.state && history.state.v === 'mini' ? history.state.depth : 0;
  if(d >= 2){ afterPop = goCards; history.go(-(d - 1)); }
  else { $('mini').classList.add('hidden'); goCards(); }
}
function toNext(){
  stopCountdown();
  const n = mN + 1;
  if(n > SECS[secOf(mN)].to) return toCards();
  afterPop = () => pick(n);
  if(history.state && history.state.v === 'mini') history.back();
  else { $('mini').classList.add('hidden'); const f = afterPop; afterPop = null; f(); }
}
/* الرقم يتلوّن وتظهر عليه علامة صح حين يجتاز الطفل اختباره (وغير المجتاز باهت في اللوحة) */
function updateNums(){
  [...grid.children, ...cardGrid.children].forEach(b => {
    const n = +b.dataset.n, d = studied.has(n);
    b.classList.toggle('done', d);
    b.setAttribute('aria-label', NAMES[n] + (d ? ' - تم' : ''));
  });
}
$('miniBtn').onclick = openMini;
$('mClose').onclick = closeMini;
$('mAgain').onclick = openMini;
$('mNext').onclick = toNext;
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  if(!$('install').classList.contains('hidden')) hideInstall();
  else if(!$('ask').classList.contains('hidden')){ hideAsk(); askTarget = null; }
  else if(!$('mini').classList.contains('hidden')) closeMini();
});

/* الواجهة الرئيسية: تظهر بعد شاشة التحميل */
function setHome(on){
  if(on) stopCount();
  $('home').classList.toggle('hidden', !on);
  document.querySelector('header').inert = on;
  document.querySelector('main').inert = on;
}
setHome(true);

/* التنقل وزر الرجوع في الهاتف:
   الرئيسية ← بطاقات قسم أو إنجازاتي (depth 1) ← تعلّم رقم (depth 2) ← اختبار الرقم (depth 3)
   الرئيسية ← العب مع الأعداد (depth 1). الرجوع يعود خطوة واحدة، والشعار يعود للرئيسية مباشرة.
   كل حالة تحفظ رقم القسم (sec) حتى يعود الرجوع إلى بطاقات القسم الصحيح */
if(history.state) history.replaceState(null, '');
function enter(tab, sec){ history.pushState({v: 'sec', tab, depth: 1, sec}, ''); show(tab); setHome(false); }
function openSec(s){ setSection(s); enter('cards', s); }
$('hb1').onclick = () => openSec(0);
$('hb2').onclick = () => openSec(1);
$('hb3').onclick = () => openSec(2);
$('hb4').onclick = () => enter('play');
$('hb5').onclick = () => enter('ach');
$('homeBtn').onclick = () => {
  const d = history.state && history.state.depth;
  if(d) history.go(-d);
  else { setHome(true); $('hb1').focus(); }
};
window.addEventListener('popstate', e => {
  const st = e.state || {};
  hideAsk(); askTarget = null;
  stopCount();
  if(st.v !== 'mini' && !$('mini').classList.contains('hidden')){
    clearTimeout(mTimer); stopCountdown();
    $('mini').classList.add('hidden');
    $('miniBtn').focus();
  }
  if(st.v === 'mini' && $('mini').classList.contains('hidden')){
    history.replaceState({v: 'sec', tab: 'learn', depth: st.depth, sec: st.sec}, '');   // تقدّم إلى اختبار مغلق: نبقى في صفحة التعلّم
    st.v = 'sec';
  }
  if(st.v === 'sec' || st.v === 'mini'){
    if(Number.isInteger(st.sec) && st.sec !== curSec && st.tab !== 'learn') setSection(st.sec);
    if(st.tab !== curTab || !$('home').classList.contains('hidden')) show(st.tab || 'cards');
    setHome(false);
  }else{
    setHome(true);
    $('hb1').focus();
  }
  if(afterPop){ const f = afterPop; afterPop = null; f(); }
});

/* العمل بلا إنترنت */
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* نافذة التثبيت: تظهر بعد ثانيتين من انتهاء شاشة التحميل،
   فقط حين يسمح المتصفح بالتثبيت (أندرويد ومتصفحات الكمبيوتر) ولم يكن التطبيق مثبتًا */
let installEvt = null, splashDone = false, insTimer = 0;
const isInstalled = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function scheduleInstall(){
  clearTimeout(insTimer);
  if(installEvt && splashDone && !isInstalled()) insTimer = setTimeout(showInstall, 2000);
}
function showInstall(){
  if(!installEvt || isInstalled()) return;
  $('install').classList.remove('hidden');
  $('insBtn').focus();
}
function hideInstall(){
  clearTimeout(insTimer);
  $('install').classList.add('hidden');
}
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();   // نمنع شريط المتصفح الافتراضي ونعرض نافذتنا
  installEvt = e;
  scheduleInstall();
});
$('insBtn').onclick = async () => {
  const p = installEvt;
  hideInstall();
  if(!p) return;
  installEvt = null;   // حدث التثبيت يُستخدم مرة واحدة
  try{ await p.prompt(); await p.userChoice; }catch(e){}
};
$('insClose').onclick = hideInstall;
$('install').onclick = e => { if(e.target === $('install')) hideInstall(); };
window.addEventListener('appinstalled', () => { installEvt = null; hideInstall(); });

/* شاشة التحميل: تختفي بعد ٥ ثوانٍ (شريط التقدم تحرّكه CSS)، ثم تُستأنف حركات الصفحة */
setTimeout(() => {
  const sp = $('splash');
  sp.classList.add('out');
  document.body.classList.remove('loading');
  setTimeout(() => sp.remove(), 650);
  splashDone = true;
  scheduleInstall();
}, 5000);
