// Downloads one free-licence photo per seed product from Wikimedia Commons
// into server/seed-images/NN.jpg and writes server/seed-images/CREDITS.json.
// Only CC0 / public domain / CC BY / CC BY-SA files are used.
//
//   node scripts/fetch-seed-photos.js            fetch the missing ones
//   node scripts/fetch-seed-photos.js 4 17       re-fetch products 4 and 17 (next candidate)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '..', 'seed-images');
const UA = 'ShukaSeedScript/1.0 (student marketplace project; seed images)';

// One search per product, same order as PRODUCTS in src/seed.js.
export const QUERIES = [
  'earbuds charging case', 'smartwatch', 'portable charger power bank', 'mechanical keyboard', 'portable bluetooth speaker',
  'usb charger', 'action camera', 'smartphone car mount', 'dashcam', 'handheld vacuum cleaner',
  'hiking poles', 'rolled yoga mat', 'water bottle stainless', 'camping tent',
  'pomegranate ceramic plate', 'khachkar', 'woven coasters', 'pomegranate pendant', 'duduk apricot wood', 'embroidered table runner',
  'cezve copper', 'clay pot cooking', 'turkish coffee cups', 'wool blanket',
  'wool socks knitted', 'leather handbag', 'silk scarf', 'cookbook',
  'alphabet book', 'topographic map hiking',
  'apricot jam', 'jar of honey', 'dried apricots', 'armenian brandy', 'cup of herbal tea', 'gata armenian pastry',
  'handmade soap bars', 'dropper bottle', 'hair dryer', 'wooden toy blocks', 'teddy bear', 'backgammon board',
];

const OK_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? [1-4]\.0)/i;
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function candidates(query) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '20',
    gsrsearch: `${query} filetype:bitmap`, prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '1200',
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  let j;
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    const text = await r.text();
    try { j = JSON.parse(text); break; } catch {
      if (attempt >= 6) throw new Error('rate limited');
      await sleep(5000 * attempt); // Commons asks clients to slow down
    }
  }
  const pages = Object.values(j.query?.pages || {}).sort((a, b) => a.index - b.index);
  return pages
    .map((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii) return null;
      const m = ii.extmetadata || {};
      return {
        title: p.title,
        page: ii.descriptionurl,
        url: ii.thumburl || ii.url,
        width: ii.width, height: ii.height, mime: ii.mime,
        license: strip(m.LicenseShortName?.value),
        artist: strip(m.Artist?.value).slice(0, 120),
      };
    })
    .filter((c) => c && /jpeg|png/.test(c.mime) && c.width >= 700 && c.height >= 500 && OK_LICENSE.test(c.license))
    .filter((c) => c.width / c.height < 2.2 && c.height / c.width < 2.2);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const creditsFile = path.join(OUT, 'CREDITS.json');
  const credits = fs.existsSync(creditsFile) ? JSON.parse(fs.readFileSync(creditsFile, 'utf8')) : {};
  const redo = new Set(process.argv.slice(2).map(Number));

  for (let i = 0; i < QUERIES.length; i++) {
    const file = path.join(OUT, `${String(i).padStart(2, '0')}.jpg`);
    if (fs.existsSync(file) && !redo.has(i)) continue;
    const skip = redo.has(i) ? (credits[i]?.tried || [credits[i]?.title]).filter(Boolean) : [];
    try {
      const list = (await candidates(QUERIES[i])).filter((c) => !skip.includes(c.title));
      if (!list.length) { console.log(`${i} ${QUERIES[i]}: no candidate`); continue; }
      const c = list[0];
      const res = await fetch(c.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`download ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf).rotate().resize(1000, 1000, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80 }).toFile(file);
      credits[i] = { query: QUERIES[i], title: c.title, page: c.page, license: c.license, artist: c.artist, tried: [...skip, c.title] };
      console.log(`${i} ${QUERIES[i]} → ${c.title} (${c.license})`);
    } catch (e) {
      console.log(`${i} ${QUERIES[i]}: ${e.message}`);
    }
    fs.writeFileSync(creditsFile, JSON.stringify(credits, null, 2));
    await sleep(2500);
  }
}

main();
