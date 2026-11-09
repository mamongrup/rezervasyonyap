const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const sharp = require('/var/www/vhosts/rezervasyonyap.tr/httpdocs/frontend/node_modules/sharp');
sharp.concurrency(1);
sharp.cache({memory: 32, files: 0, items: 16});
const directory = '/var/lib/bunny-external';
const queueDirectory = path.join(directory, 'queue');
const hosts = JSON.parse(fs.readFileSync('/root/.config/bunny/provider-hosts.json', 'utf8'));
const allowed = new Set(hosts);
const key = fs.readFileSync('/root/.config/bunny/storage.key', 'utf8').trim();
const storage = 'https://storage.bunnycdn.com/rezervasyonyap-medya-pilot/';
const cdn = 'https://rezervasyonyapmedyapilot.b-cdn.net/';
const active = new Map();
const maxBytes = 30 * 1024 * 1024;
const maxQueued = 10000;
function normalizedRaw(raw) {
 const repair=require('/root/bunny-provider-repair.cjs');
 const fallback=require('/root/bunny-image-fallbacks.cjs');
 const repaired=fallback.repairExternalListingImageExt(repair.rewriteAegeanHotelsImageToBookeder(raw));
 const url=new URL(repaired);
 if(url.username||url.password||url.port)throw Error('Unsupported image source');
 if(url.hostname==='photos.hotelbeds.com'&&url.pathname.startsWith('/giata/')) {
  const image=url.hostname+url.pathname+url.search;
  return 'https://cdn.kplus.com.tr/?url='+encodeURIComponent(Buffer.from(image).toString('base64'));
 }
 return repaired;
}
function sourceUrl(raw) {
  const url = new URL(normalizedRaw(raw));
  const index = hosts.indexOf(url.hostname);
  if (index < 0 || !['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) throw Error('Unsupported image source');
  const zone = index < 50 ? 'rezervasyonyapsuppliers' : 'rezervasyonyapsuppliers2';
  return 'https://' + zone + '.b-cdn.net/https/' + url.hostname + url.pathname + url.search;
}
function readMarker(id) {
  try { return JSON.parse(fs.readFileSync(path.join(directory, id + '.json'), 'utf8')); } catch { return {}; }
}
function writeMarker(id, value) {
  const file = path.join(directory, id + '.json');
  fs.writeFileSync(file + '.tmp', JSON.stringify(value), {mode: 0o600});
  fs.renameSync(file + '.tmp', file);
}
function redirect(response, location, cached) {
  response.writeHead(302, {Location: location, 'Cache-Control': cached ? 'public, max-age=3600' : 'no-store', 'X-Bunny-Media': cached ? 'verified-avif-storage' : 'preparing-avif'});
  response.end();
}
async function readBounded(response) {
  if (Number(response.headers.get('content-length')) > maxBytes) throw Error('Image exceeds size limit');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    total += part.value.length;
    if (total > maxBytes) { await reader.cancel(); throw Error('Image exceeds size limit'); }
    chunks.push(Buffer.from(part.value));
  }
  return Buffer.concat(chunks, total);
}
async function processJob(id, raw) {
  const previous = readMarker(id);
  try {
    const imageOptions={headers:{'User-Agent':'Mozilla/5.0',Referer:'https://rezervasyonyap.tr/'},redirect:'error',signal:AbortSignal.timeout(25000)};
    let response=await fetch(sourceUrl(raw),imageOptions);
    if(!response.ok&&normalizedRaw(raw).startsWith('https://cdn.kplus.com.tr/?url=')){await response.body?.cancel();response=await fetch(normalizedRaw(raw),{...imageOptions,signal:AbortSignal.timeout(25000)})}
    if (!response.ok) throw Error('Source HTTP ' + response.status);
    const original = await readBounded(response);
    const data = await sharp(original, {limitInputPixels: 25000000}).rotate().avif({quality: 75, effort: 3}).toBuffer();
    const checksum = crypto.createHash('sha256').update(data).digest('hex');
    const target = 'external/' + checksum.slice(0, 2) + '/' + checksum + '.avif';
    writeMarker(id, {...previous, sourceVerifiedUntil: Date.now() + 86400000});
    const uploaded = await fetch(storage + target, {method: 'PUT', headers: {AccessKey: key, Checksum: checksum.toUpperCase(), 'Content-Type': 'image/avif'}, body: data, signal: AbortSignal.timeout(30000), redirect: 'error'});
    await uploaded.arrayBuffer();
    if (uploaded.status !== 201) throw Error('Storage HTTP ' + uploaded.status);
    writeMarker(id, {target, updated: Date.now(), sourceVerifiedUntil: Date.now() + 86400000});
    console.log('AVIF stored', id);
  } catch (error) {
    writeMarker(id, {...readMarker(id), failureUntil: Date.now() + 3600000});
    console.error('Image deferred', id, error.message);
  } finally {
    try { fs.unlinkSync(path.join(queueDirectory, id + '.json')); } catch {}
  }
}
const queued = new Set(fs.readdirSync(queueDirectory).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).map(name => name.slice(0, -5)));
function pump() {
  for (const id of queued) {
    if (active.size >= 2) break;
    if (active.has(id)) continue;
    let raw;
    try { raw = JSON.parse(fs.readFileSync(path.join(queueDirectory, id + '.json'), 'utf8')).raw; sourceUrl(raw); }
    catch { queued.delete(id); continue; }
    const task = processJob(id, raw).catch(error => console.error('Queue error', id, error.message)).finally(() => { active.delete(id); queued.delete(id); queueMicrotask(pump); });
    active.set(id, task);
  }
}
function enqueue(id, raw) {
  if (queued.has(id) || active.has(id) || queued.size >= maxQueued) return;
  const file = path.join(queueDirectory, id + '.json');
  fs.writeFileSync(file + '.tmp', JSON.stringify({raw, created: Date.now()}), {mode: 0o600});
  fs.renameSync(file + '.tmp', file);
  queued.add(id);
  pump();
}
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const stock = url.pathname.startsWith('/api/bunny-stock/');
    if ((!stock && url.pathname !== '/api/listing-ext-image') || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(404); response.end(); return; }
    const raw = (stock ? request.url.slice('/api/bunny-stock/'.length) : (url.searchParams.get('u') || '')).trim();
    if (!raw || raw.length > 8192) { response.writeHead(400); response.end(); return; }
    let source;
    try { source = sourceUrl(raw); } catch { response.writeHead(stock ? 400 : 503); response.end(); return; }
    const id = crypto.createHash('sha256').update(normalizedRaw(raw).startsWith('https://cdn.kplus.com.tr/?url=') ? 'hotelbeds-proxy-v3:'+raw : raw).digest('hex');
    let marker = readMarker(id);
    if (marker.target && /^external\/[a-f0-9]{2}\/[a-f0-9]{64}\.avif$/.test(marker.target) && Date.now() - marker.updated < 86400000) { redirect(response, cdn + marker.target, true); return; }
    if (!(marker.failureUntil > Date.now())) {
      enqueue(id, raw);
      if (active.has(id)) {
        let timer;
        await Promise.race([active.get(id), new Promise(resolve => { timer = setTimeout(resolve, 2000); })]);
        clearTimeout(timer);
      }
      marker = readMarker(id);
      if (marker.target && Date.now() - marker.updated < 86400000) { redirect(response, cdn + marker.target, true); return; }
    }
    redirect(response, marker.sourceVerifiedUntil > Date.now() && !normalizedRaw(raw).startsWith("https://cdn.kplus.com.tr/?url=") ? source : normalizedRaw(raw), false);
  } catch (error) {
    console.error('Image request failed', error.message);
    if (!response.headersSent) response.writeHead(503, {'Cache-Control': 'no-store'});
    response.end();
  }
}).listen(Number(process.env.BUNNY_MEDIA_PORT || 3031), '127.0.0.1', () => { console.log('Bunny image service ready', {providers: allowed.size, queued: queued.size}); pump(); });
setInterval(pump, 5000).unref();
