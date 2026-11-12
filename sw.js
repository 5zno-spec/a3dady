/* يعمل التطبيق بلا إنترنت: تُخزَّن الملفات عند أول زيارة ثم تُقدَّم من الجهاز */
const VERSION = 'v39';
const CACHE = 'arabic-numbers-' + VERSION;
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'img/logo.webp', 'img/favicon-32.png', 'img/apple-touch-icon.png', 'img/icon-192.png', 'img/icon-512.png', 'img/icon-maskable-192.png', 'img/icon-maskable-512.png',
  ...Array.from({length: 51}, (_, i) => 'audio/' + i + '.mp3'),          // أصوات الأرقام ٠ – ٥٠
  ...Array.from({length: 5}, (_, i) => 'audio/praise/' + (i + 1) + '.mp3'),   // عبارات التشجيع
  ...['seed','faucet','watering-can','shower','tree','house','rocket','backpack','net','gift','comb','candle','frog','key','fish','brush'].map(s => 'img/shapes/' + s + '.webp')
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('arabic-numbers-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Safari يطلب الصوت على أجزاء (Range)، فنقتطع الجزء المطلوب من الملف المخزَّن */
async function rangeResponse(req, res){
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if(!m || !res || res.status !== 200) return res;
  const buf = await res.arrayBuffer();
  const start = m[1] ? parseInt(m[1], 10) : 0;
  const end = m[2] ? Math.min(parseInt(m[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
      'Content-Length': String(end - start + 1)
    }
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if(!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, {ignoreSearch: sameOrigin, ignoreVary: true});
    const refresh = fetch(req).then(res => {
      /* لا نخزّن الاستجابات الجزئية (206) لأن cache.put يرفضها */
      if(res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
      return res;
    });
    if(cached){
      refresh.catch(() => {});                       // تحديث هادئ في الخلفية عند وجود إنترنت
      return req.headers.get('range') ? rangeResponse(req, cached) : cached;
    }
    try{
      const res = await refresh;
      return res;
    }catch(err){
      if(req.mode === 'navigate'){
        const page = await cache.match('index.html');
        if(page) return page;
      }
      return new Response('', {status: 504, statusText: 'Offline'});
    }
  })());
});
