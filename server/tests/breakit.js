/*
 * Break-it tests from the Shuka brief, run against a running server.
 *
 *   npm run test:breakit                              (local server on :3000)
 *   BASE_URL=https://your-site.netlify.app npm run test:breakit
 *
 * Every run creates its own fresh accounts and products, so it can be repeated.
 * The foreign-key test opens the SQLite file directly, so it only runs when the
 * database is on this machine (skipped for a remote BASE_URL).
 */
import crypto from 'node:crypto';
import sharp from 'sharp';
import { openDb } from '../src/db.js';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API = `${BASE}/api`;
const RUN = crypto.randomBytes(3).toString('hex');
const isLocal = /localhost|127\.0\.0\.1/.test(BASE);

/* ───── tiny HTTP client with its own cookie jar ───── */
class Client {
  constructor(name) { this.name = name; this.cookie = ''; }
  async req(method, path, body, { form } = {}) {
    const headers = {};
    if (this.cookie) headers.cookie = this.cookie;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(API + path, { method, headers, body: payload });
    const set = res.headers.getSetCookie?.() || [];
    for (const c of set) {
      const pair = c.split(';')[0];
      if (pair.startsWith('shuka_session=')) this.cookie = pair.endsWith('=') ? '' : pair;
    }
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    return { status: res.status, body: json };
  }
  get(p) { return this.req('GET', p); }
  post(p, b) { return this.req('POST', p, b ?? {}); }
  put(p, b) { return this.req('PUT', p, b); }
  patch(p, b) { return this.req('PATCH', p, b); }
}

const key = () => crypto.randomBytes(16).toString('hex');
const address = {
  recipient: 'Test Buyer', phone: '+37491000000', region: 'yerevan',
  city: 'Yerevan', street: 'Abovyan St 1', apartment: '2', note: '',
};

async function user(label, { seller = false } = {}) {
  const c = new Client(label);
  const r = await c.post('/auth/register', {
    email: `${label}-${RUN}@test.shuka`, password: 'test-password-1', name: `Test ${label}`, phone: '+37491000000',
  });
  if (r.status !== 201) throw new Error(`register ${label}: ${r.status} ${JSON.stringify(r.body)}`);
  if (seller) {
    const a = await c.post('/seller/activate', { storeName: `Store ${label} ${RUN}`, phone: '+37491000001' });
    if (a.status !== 200) throw new Error(`activate ${label}: ${a.status} ${JSON.stringify(a.body)}`);
  }
  return c;
}

const jpeg = () =>
  sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 200, g: 80, b: 40 } } }).jpeg().toBuffer();

async function upload(c, productId, files) {
  const form = new FormData();
  for (const f of files) form.append('images', new Blob([f.data], { type: f.type }), f.name);
  return c.req('POST', `/seller/products/${productId}/images`, undefined, { form });
}

async function product(seller, { title, price = 5000, stock = 10 } = {}) {
  const r = await seller.post('/seller/products', {
    title: title || `Test product ${RUN}`, categoryId: 1, description: 'A product made by the break-it tests.',
    priceAmd: price, stock,
  });
  if (r.status !== 201) throw new Error(`create product: ${r.status} ${JSON.stringify(r.body)}`);
  const id = r.body.product.id;
  const up = await upload(seller, id, [{ data: await jpeg(), type: 'image/jpeg', name: 'photo.jpg' }]);
  if (up.status !== 201) throw new Error(`upload: ${up.status} ${JSON.stringify(up.body)}`);
  const pub = await seller.patch(`/seller/products/${id}`, { isPublished: true });
  if (pub.status !== 200) throw new Error(`publish: ${pub.status} ${JSON.stringify(pub.body)}`);
  return id;
}

async function buy(buyer, productId, qty = 1) {
  const a = await buyer.put(`/cart/items/${productId}`, { quantity: qty });
  if (a.status !== 200) throw new Error(`add to cart: ${a.status} ${JSON.stringify(a.body)}`);
  const o = await buyer.post('/orders', { ...address, requestKey: key() });
  if (o.status !== 201) throw new Error(`checkout: ${o.status} ${JSON.stringify(o.body)}`);
  const detail = await buyer.get(`/orders/${o.body.order.id}`);
  return { orderId: o.body.order.id, sellerOrderId: detail.body.order.parts[0].id };
}

const stockOf = async (id) => (await new Client('guest').get(`/products/${id}`)).body.product.stock;

/* ───── runner ───── */
const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail || '' , ms: Date.now() - t0 });
    console.log(`  ✔ ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (e) {
    results.push({ name, ok: false, detail: e.message, ms: Date.now() - t0 });
    console.log(`  ✘ ${name} — ${e.message}`);
  }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

console.log(`\nShuka break-it tests against ${BASE}  (run ${RUN})\n`);

const health = await fetch(`${API}/health`).catch(() => null);
if (!health || !health.ok) {
  console.error(`Server is not reachable at ${API}/health — start it with \`npm run dev\` first.`);
  process.exit(1);
}

const sellerA = await user('sellerA', { seller: true });
const sellerB = await user('sellerB', { seller: true });
const buyer1 = await user('buyer1');
const buyer2 = await user('buyer2');

/* 1 */
await test('1. Last units — 30 checkouts at once for a product with stock 3', async () => {
  const pid = await product(sellerA, { title: `Last units ${RUN}`, stock: 3 });
  const buyers = [];
  for (let i = 0; i < 30; i++) buyers.push(await user(`rush${i}`));
  for (const b of buyers) {
    const r = await b.put(`/cart/items/${pid}`, { quantity: 1 });
    expect(r.status === 200, `cart add failed: ${r.status}`);
  }
  const responses = await Promise.all(buyers.map((b) => b.post('/orders', { ...address, requestKey: key() })));
  const ok = responses.filter((r) => r.status === 201).length;
  const conflicts = responses.filter((r) => r.status === 409).length;
  const other = responses.filter((r) => r.status !== 201 && r.status !== 409);
  const locked = responses.filter((r) => JSON.stringify(r.body).toLowerCase().includes('locked')).length;
  const stock = await stockOf(pid);
  expect(ok === 3, `expected 3 orders, got ${ok}`);
  expect(conflicts === 27, `expected 27 × 409, got ${conflicts}`);
  expect(other.length === 0, `unexpected responses: ${other.map((r) => r.status).join(',')}`);
  expect(locked === 0, `"database is locked" appeared ${locked} times`);
  expect(stock === 0, `expected stock 0, got ${stock}`);
  const sample = responses.find((r) => r.status === 409).body.error;
  return `3 orders, 27 × 409 ("${sample.message}"), stock 0, no lock errors`;
});

/* 2 */
let doubleOrder;
await test('2. Double click — same checkout twice with the same request key', async () => {
  const pid = await product(sellerA, { title: `Double click ${RUN}`, price: 7000, stock: 10 });
  await buyer1.put(`/cart/items/${pid}`, { quantity: 1 });
  const k = key();
  const [a, b] = await Promise.all([
    buyer1.post('/orders', { ...address, requestKey: k }),
    buyer1.post('/orders', { ...address, requestKey: k }),
  ]);
  const c = await buyer1.post('/orders', { ...address, requestKey: k }); // a third, later repeat
  expect([a, b, c].every((r) => r.status === 201 || r.status === 200), `statuses ${a.status}/${b.status}/${c.status}`);
  const ids = new Set([a, b, c].map((r) => r.body.order.id));
  expect(ids.size === 1, `got ${ids.size} different orders`);
  expect(await stockOf(pid) === 9, 'stock was taken more than once');
  doubleOrder = { pid, orderId: a.body.order.id };
  return `one order #${a.body.order.id}, stock reduced once`;
});

/* 3 */
await test('3. Price changed — seller raises price after it went into the cart', async () => {
  const pid = await product(sellerA, { title: `Price change ${RUN}`, price: 10000, stock: 5 });
  await buyer2.put(`/cart/items/${pid}`, { quantity: 1 });
  await sellerA.patch(`/seller/products/${pid}`, { priceAmd: 12500 });
  const r = await buyer2.post('/orders', { ...address, requestKey: key() });
  expect(r.status === 409 && r.body.error.code === 'PRICE_CHANGED', `got ${r.status} ${JSON.stringify(r.body)}`);
  expect(r.body.error.items[0].newPrice === 12500, 'new price not reported');
  const cart = await buyer2.get('/cart');
  expect(cart.body.cart.groups[0].items[0].priceChanged === true, 'cart does not warn about the price change');
  expect(await stockOf(pid) === 5, 'stock changed although checkout stopped');
  // Accepting the new price lets the checkout go through.
  await buyer2.put(`/cart/items/${pid}`, { quantity: 1, acceptPrice: true });
  const ok = await buyer2.post('/orders', { ...address, requestKey: key() });
  expect(ok.status === 201 && ok.body.order.totalAmd === 12500, `after accepting: ${ok.status}`);
  return `409 "${r.body.error.message}"; after accepting, order at 12 500 AMD`;
});

/* 4 */
await test('4. Old order after edit — seller edits title and price of an ordered product', async () => {
  const { pid, orderId } = doubleOrder;
  await sellerA.patch(`/seller/products/${pid}`, { title: `RENAMED ${RUN}`, priceAmd: 99999 });
  const r = await buyer1.get(`/orders/${orderId}`);
  const item = r.body.order.parts[0].items[0];
  expect(item.title === `Double click ${RUN}`, `title is now "${item.title}"`);
  expect(item.unitPriceAmd === 7000, `price is now ${item.unitPriceAmd}`);
  return `order still shows "${item.title}" at ${item.unitPriceAmd} AMD`;
});

/* 5 */
await test("5. Someone else's order — other seller / other buyer open it by id", async () => {
  const pid = await product(sellerA, { title: `Private ${RUN}` });
  const { orderId, sellerOrderId } = await buy(buyer1, pid);
  const checks = [
    ['seller B GET /seller/orders/:id', await sellerB.get(`/seller/orders/${sellerOrderId}`)],
    ['seller B POST status', await sellerB.post(`/seller/orders/${sellerOrderId}/status`, { to: 'confirmed' })],
    ['buyer 2 GET /orders/:id', await buyer2.get(`/orders/${orderId}`)],
    ['buyer 2 cancel', await buyer2.post(`/orders/${orderId}/sellers/${sellerOrderId}/cancel`)],
    ['seller B edits seller A product', await sellerB.patch(`/seller/products/${pid}`, { priceAmd: 1 })],
    ['buyer (not seller) GET /seller/orders', await buyer2.get('/seller/orders')],
    ['guest GET /orders', await new Client('guest').get('/orders')],
  ];
  for (const [label, r] of checks) {
    expect([401, 403, 404].includes(r.status), `${label} returned ${r.status}`);
    const leaked = JSON.stringify(r.body).includes('Abovyan');
    expect(!leaked, `${label} leaked the address`);
  }
  const still = await sellerA.get(`/seller/orders/${sellerOrderId}`);
  expect(still.body.order.status === 'placed', 'status changed');
  return checks.map(([l, r]) => `${r.status}`).join(' / ') + ' — no data shown';
});

/* 6 */
await test('6. Move not allowed — Placed → Delivered, and buyer cancels a shipped order', async () => {
  const pid = await product(sellerA, { title: `Moves ${RUN}` });
  const { orderId, sellerOrderId } = await buy(buyer1, pid);
  const jump = await sellerA.post(`/seller/orders/${sellerOrderId}/status`, { to: 'delivered' });
  expect(jump.status === 409, `placed → delivered returned ${jump.status}`);
  let d = await sellerA.get(`/seller/orders/${sellerOrderId}`);
  expect(d.body.order.status === 'placed' && d.body.order.history.length === 1, 'something changed after the 409');

  for (const to of ['confirmed', 'shipped']) {
    const r = await sellerA.post(`/seller/orders/${sellerOrderId}/status`, { to });
    expect(r.status === 200, `→ ${to} returned ${r.status}`);
  }
  const cancel = await buyer1.post(`/orders/${orderId}/sellers/${sellerOrderId}/cancel`);
  expect(cancel.status === 409, `buyer cancel of shipped returned ${cancel.status}`);
  const back = await sellerA.post(`/seller/orders/${sellerOrderId}/status`, { to: 'placed' });
  expect(back.status === 409, `shipped → placed returned ${back.status}`);
  d = await sellerA.get(`/seller/orders/${sellerOrderId}`);
  expect(d.body.order.status === 'shipped', `status is ${d.body.order.status}`);
  expect(d.body.order.history.length === 3, `history has ${d.body.order.history.length} rows, expected 3`);
  return `409 / 409 / 409, still "shipped", history has 3 rows`;
});

/* 7 */
await test('7. Cancel returns stock — buyer cancels a placed order', async () => {
  const pid = await product(sellerA, { title: `Cancel ${RUN}`, stock: 10 });
  const { orderId, sellerOrderId } = await buy(buyer2, pid, 4);
  const before = await stockOf(pid);
  const r = await buyer2.post(`/orders/${orderId}/sellers/${sellerOrderId}/cancel`);
  expect(r.status === 200, `cancel returned ${r.status}`);
  const after = await stockOf(pid);
  expect(before === 6 && after === 10, `stock ${before} → ${after}, expected 6 → 10`);
  const again = await buyer2.post(`/orders/${orderId}/sellers/${sellerOrderId}/cancel`);
  expect(again.status === 409 && (await stockOf(pid)) === 10, 'a second cancel changed stock');
  return `stock 6 → 10; second cancel is 409`;
});

/* 8 */
await test('8. Foreign keys — order item for a product that does not exist', async () => {
  if (!isLocal) return 'skipped (needs the database file on this machine)';
  const db = openDb();
  try {
    const so = db.prepare('SELECT id FROM seller_orders LIMIT 1').get();
    let error;
    try {
      db.prepare('INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity) VALUES (?, 99999999, ?, 100, 1)')
        .run(so.id, 'ghost');
    } catch (e) { error = e; }
    expect(error && error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY', `insert was not rejected (${error?.code})`);
    let delErr;
    try { db.prepare('DELETE FROM products WHERE id = (SELECT product_id FROM order_items LIMIT 1)').run(); } catch (e) { delErr = e; }
    // ON DELETE RESTRICT is reported as SQLITE_CONSTRAINT_TRIGGER, with a FOREIGN KEY message.
    expect(delErr && /FOREIGN KEY constraint failed/.test(delErr.message), 'an ordered product could be deleted');
    let strictErr;
    try { db.prepare("UPDATE products SET price_amd = 'cheap' WHERE id = 1").run(); } catch (e) { strictErr = e; }
    expect(strictErr, 'STRICT table accepted text in an INTEGER column');
    return `rejected: ${error.code}; ordered product delete also rejected; STRICT rejects wrong types`;
  } finally {
    db.close();
  }
});

/* 9 */
await test('9. Bad upload — a 30 MB file and a renamed .exe', async () => {
  const pid = (await sellerA.post('/seller/products', {
    title: `Upload ${RUN}`, categoryId: 1, description: 'Upload test product.', priceAmd: 1000, stock: 1,
  })).body.product.id;
  const big = await upload(sellerA, pid, [{ data: crypto.randomBytes(30 * 1024 * 1024), type: 'image/jpeg', name: 'huge.jpg' }]);
  const exe = Buffer.concat([Buffer.from('MZ\x90\x00\x03\x00\x00\x00'), crypto.randomBytes(4096)]);
  const fake = await upload(sellerA, pid, [{ data: exe, type: 'image/jpeg', name: 'virus.jpg' }]);
  const exeType = await upload(sellerA, pid, [{ data: exe, type: 'application/x-msdownload', name: 'setup.exe' }]);
  for (const [l, r] of [['30 MB', big], ['renamed .exe', fake], ['.exe', exeType]]) {
    expect(r.status === 400 && r.body.error.message, `${l} returned ${r.status} ${JSON.stringify(r.body)}`);
  }
  const p = await sellerA.get(`/seller/products/${pid}`);
  expect(p.body.product.images.length === 0, 'a bad file was saved');
  return `400 "${big.body.error.message}" / 400 "${fake.body.error.message}"`;
});

/* extra rules */
await test('Extra: reviews only after delivery, once per product; rating updates', async () => {
  const pid = await product(sellerB, { title: `Review ${RUN}` });
  const { sellerOrderId } = await buy(buyer1, pid);
  const early = await buyer1.post(`/products/${pid}/reviews`, { rating: 5, body: 'too early' });
  expect(early.status === 403, `review before delivery returned ${early.status}`);
  for (const to of ['confirmed', 'shipped', 'delivered']) await sellerB.post(`/seller/orders/${sellerOrderId}/status`, { to });
  const ok = await buyer1.post(`/products/${pid}/reviews`, { rating: 4, body: 'Nice' });
  expect(ok.status === 201 && ok.body.product.ratingAvg === 4, `review returned ${ok.status}`);
  const twice = await buyer1.post(`/products/${pid}/reviews`, { rating: 1, body: 'again' });
  expect(twice.status === 409, `second review returned ${twice.status}`);
  const other = await buyer2.post(`/products/${pid}/reviews`, { rating: 1 });
  expect(other.status === 403, `review without purchase returned ${other.status}`);
  const overview = await sellerB.get('/seller/overview');
  expect(overview.body.overview.revenue30d === 5000, `revenue is ${overview.body.overview.revenue30d}`);
  return 'before delivery 403, after 201 (avg 4), repeat 409, non-buyer 403, revenue 5 000 AMD';
});

await test('Extra: sellers cannot buy their own products; guests cannot use the cart', async () => {
  const pid = await product(sellerB, { title: `Own ${RUN}` });
  const own = await sellerB.put(`/cart/items/${pid}`, { quantity: 1 });
  expect(own.status === 403, `own product returned ${own.status}`);
  const guest = await new Client('guest').put(`/cart/items/${pid}`, { quantity: 1 });
  expect(guest.status === 401, `guest returned ${guest.status}`);
  const tooMany = await buyer2.put(`/cart/items/${pid}`, { quantity: 11 });
  expect(tooMany.status === 409, `more than stock returned ${tooMany.status}`);
  return 'own product 403, guest 401, more than stock 409';
});

/* summary */
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? ` — ${failed.length} FAILED` : ''}\n`);
process.exit(failed.length ? 1 : 0);
