import fs from 'node:fs';
import path from 'node:path';
import { SERVER_ROOT } from './config.js';
import { hashPassword } from './auth.js';
import { processImage } from './images.js';

/*
 * Demo data: 10 categories, 3 sellers, 42 products with generated images,
 * 2 demo buyers, and a few past orders + reviews so ratings and the seller
 * dashboard are not empty. All demo accounts use DEMO_PASSWORD.
 */
const SEED_IMAGES = path.join(SERVER_ROOT, 'seed-images');
export const DEMO_PASSWORD = 'shuka1234';

export const CATEGORIES = [
  ['Electronics', 'electronics'],
  ['Home & Kitchen', 'home-kitchen'],
  ['Fashion', 'fashion'],
  ['Beauty & Health', 'beauty'],
  ['Books', 'books'],
  ['Sports & Outdoors', 'sports'],
  ['Toys & Kids', 'toys'],
  ['Food & Drinks', 'food'],
  ['Handmade & Souvenirs', 'handmade'],
  ['Auto', 'auto'],
];

const SELLERS = [
  { key: 'aram', email: 'aram@shuka.test', name: 'Aram Petrosyan', phone: '+37491123456', store: 'Ararat Tech', avatar: 'aram' },
  { key: 'ani', email: 'ani@shuka.test', name: 'Ani Hakobyan', phone: '+37493234567', store: 'Gyumri Crafts', avatar: 'anahit' },
  { key: 'davit', email: 'davit@shuka.test', name: 'Davit Sargsyan', phone: '+37477345678', store: 'Sevan Market', avatar: 'aram' },
];
const BUYERS = [
  { key: 'lilit', email: 'lilit@shuka.test', name: 'Lilit Grigoryan', phone: '+37494456789', avatar: 'anahit' },
  { key: 'narek', email: 'narek@shuka.test', name: 'Narek Avetisyan', phone: '+37455567890', avatar: 'aram' },
];

// [category slug, seller key, title, price AMD, stock, description]
const PRODUCTS = [
  ['electronics', 'aram', 'Wireless Earbuds Pro', 24900, 25, 'Bluetooth 5.3 earbuds with active noise cancelling, 30 hours of battery with the case and a USB-C charging port. Comes with three sizes of ear tips.'],
  ['electronics', 'aram', 'Smart Watch Fit 3', 39900, 12, 'Fitness watch with heart-rate and sleep tracking, 1.4" AMOLED screen, water resistant to 50 m. Shows calls and messages from your phone.'],
  ['electronics', 'aram', 'Power Bank 20000 mAh', 14500, 40, 'Fast-charging power bank with two USB-A ports and one USB-C port. Charges a phone about four times. Includes a cable.'],
  ['electronics', 'aram', 'Mechanical Keyboard (Armenian layout)', 32000, 8, 'Compact 75% mechanical keyboard with Armenian and English key labels, hot-swappable switches and white backlight.'],
  ['electronics', 'aram', 'Portable Bluetooth Speaker', 18900, 3, 'Waterproof speaker with deep bass and 12 hours of play time. Perfect for Sevan beach days and mountain trips.'],
  ['electronics', 'aram', 'USB-C Fast Charger 65W', 9900, 60, 'GaN charger for laptops, tablets and phones. Small enough to fit in a pocket, with a foldable plug.'],
  ['electronics', 'aram', '4K Action Camera', 54000, 5, 'Action camera with image stabilisation, a waterproof case to 30 m and a set of mounts for helmets and bikes.'],
  ['auto', 'aram', 'Car Phone Holder (magnetic)', 5900, 50, 'Strong magnetic holder for the air vent. Holds the phone steady on Yerevan’s bumpy roads. Rotates 360°.'],
  ['auto', 'aram', 'Dash Cam Full HD', 27500, 10, 'Front dash camera with night vision, loop recording and a parking mode. 32 GB memory card included.'],
  ['auto', 'aram', 'Car Vacuum Cleaner', 16900, 14, 'Cordless handheld vacuum for the car interior with a washable filter and three nozzles.'],
  ['sports', 'aram', 'Trekking Poles (pair)', 12900, 20, 'Light aluminium poles with cork handles, adjustable from 65 to 135 cm. Great for hikes to Aragats.'],
  ['sports', 'aram', 'Yoga Mat 6 mm', 8900, 30, 'Non-slip TPE yoga mat with a carry strap. Easy to clean and light to take to the park.'],
  ['sports', 'aram', 'Insulated Water Bottle 750 ml', 7500, 45, 'Stainless steel bottle that keeps drinks cold for 24 hours or hot for 12. Leak-proof lid.'],
  ['sports', 'aram', 'Camping Tent for 2', 45000, 6, 'Two-person dome tent, sets up in five minutes. Waterproof fly and a vestibule for backpacks.'],

  ['handmade', 'ani', 'Hand-painted Pomegranate Plate', 15000, 9, 'Ceramic plate painted by hand in Gyumri with a traditional pomegranate pattern. 26 cm across. Each piece is unique.'],
  ['handmade', 'ani', 'Carved Wooden Khachkar (small)', 22000, 4, 'Small decorative khachkar carved from walnut wood by a local master. About 20 cm tall, with a stand.'],
  ['handmade', 'ani', 'Armenian Rug Coaster Set', 6500, 25, 'Set of six woven coasters with classic Armenian rug ornaments. Cotton and wool.'],
  ['handmade', 'ani', 'Silver Pomegranate Pendant', 18500, 11, 'Sterling silver pendant in the shape of a pomegranate, with a 45 cm chain. Comes in a gift box.'],
  ['handmade', 'ani', 'Duduk (apricot wood)', 65000, 2, 'Traditional Armenian duduk made from apricot wood, with a spare reed and a case. Tuned in A.'],
  ['handmade', 'ani', 'Embroidered Table Runner', 19000, 7, 'Linen table runner with hand embroidery inspired by Vaspurakan patterns. 40 × 150 cm.'],
  ['home-kitchen', 'ani', 'Copper Jazve (Armenian coffee pot)', 8500, 35, 'Hand-hammered copper jazve for strong Armenian coffee. Holds two cups. Wooden handle.'],
  ['home-kitchen', 'ani', 'Clay Tonir Pot', 12000, 10, 'Traditional clay pot for slow-cooking khashlama and stews in the oven or tonir.'],
  ['home-kitchen', 'ani', 'Ceramic Coffee Cups (set of 6)', 13500, 15, 'Small cups with saucers for Armenian coffee, glazed in deep blue with gold rims.'],
  ['home-kitchen', 'ani', 'Wool Throw Blanket', 26000, 8, 'Warm blanket of Shirak sheep wool, woven on a hand loom. 130 × 180 cm.'],
  ['fashion', 'ani', 'Knitted Wool Socks', 3500, 60, 'Thick hand-knitted socks with a traditional pattern. Warm enough for Gyumri winters.'],
  ['fashion', 'ani', 'Leather Crossbody Bag', 29000, 6, 'Small bag of genuine leather made in Yerevan, with an adjustable strap and two pockets.'],
  ['fashion', 'ani', 'Silk Scarf with Ornament', 14000, 12, 'Light silk scarf printed with an ornament from Armenian manuscripts. 90 × 90 cm.'],
  ['books', 'ani', 'Armenian Cookbook (English)', 11000, 18, 'Over 120 family recipes from dolma to gata, with photos and stories from every region of Armenia.'],
  ['books', 'ani', 'Learn Armenian Alphabet — Kids Book', 4500, 30, 'Colourful picture book that teaches the 39 letters of the Armenian alphabet with animals and words.'],
  ['books', 'ani', 'Hiking Guide to Armenia', 9500, 0, 'Maps and descriptions of 50 hiking routes, from Dilijan forests to the Syunik canyons.'],

  ['food', 'davit', 'Apricot Jam from Ararat Valley', 2800, 80, 'Homemade jam of sun-ripened apricots from the Ararat valley. 450 g glass jar, no preservatives.'],
  ['food', 'davit', 'Mountain Honey 1 kg', 7500, 40, 'Wildflower honey from the mountains of Tavush. Thick, aromatic and raw.'],
  ['food', 'davit', 'Dried Fruit Gift Box', 9800, 22, 'Gift box with dried apricots, peaches, figs, plums and sujukh — walnuts in grape syrup.'],
  ['food', 'davit', 'Armenian Brandy 5 Years (0.5 L)', 12500, 15, 'Aged five years in oak barrels. Notes of vanilla and dried fruit. For buyers over 18.'],
  ['food', 'davit', 'Herbal Mountain Tea', 2200, 70, 'Mix of thyme, mint and rosehip picked on the slopes of Aragats. 100 g.'],
  ['food', 'davit', 'Gata Sweet Bread (box of 4)', 4800, 1, 'Fresh gata from a family bakery in Garni, flaky with a sweet butter filling.'],
  ['beauty', 'davit', 'Natural Olive Soap Set', 4200, 50, 'Three bars of handmade soap with olive oil, lavender and honey. Gentle for all skin types.'],
  ['beauty', 'davit', 'Rosehip Face Oil', 8900, 20, 'Cold-pressed rosehip oil for face and hair. 30 ml bottle with a dropper.'],
  ['beauty', 'davit', 'Hair Dryer Ionic 2000W', 17500, 9, 'Powerful ionic hair dryer with three heat levels, a cool shot and a diffuser.'],
  ['toys', 'davit', 'Wooden Building Blocks (60 pcs)', 11500, 16, 'Natural beech-wood blocks in many shapes and colours. Safe paint, for ages 2 and up.'],
  ['toys', 'davit', 'Plush Bear Arjuk', 6900, 28, 'Soft and cuddly plush bear, 35 cm. Washable. A friend for every child.'],
  ['toys', 'davit', 'Board Game "Tavlu" (Backgammon)', 15500, 10, 'Wooden nardi board with inlay decoration, checkers and dice. The classic game of every Armenian yard.'],
];

const HUES = {
  electronics: 215, 'home-kitchen': 25, fashion: 330, beauty: 290, books: 40,
  sports: 150, toys: 50, food: 15, handmade: 5, auto: 200,
};

/** Simple illustrated placeholder per category (shapes only — no fonts needed on the server). */
function productSvg(slug, seed, variant) {
  const h = (HUES[slug] + seed * 17 + variant * 40) % 360;
  const bg1 = `hsl(${h}, 60%, 92%)`;
  const bg2 = `hsl(${(h + 30) % 360}, 55%, 80%)`;
  const main = `hsl(${h}, 55%, 42%)`;
  const accent = `hsl(${(h + 180) % 360}, 60%, 55%)`;
  const light = `hsl(${h}, 40%, 98%)`;
  const shapes = {
    electronics: `<rect x="420" y="220" width="360" height="680" rx="56" fill="${main}"/><rect x="450" y="280" width="300" height="540" rx="18" fill="${light}"/><circle cx="600" cy="860" r="18" fill="${light}"/><circle cx="600" cy="550" r="90" fill="${accent}" opacity=".8"/>`,
    'home-kitchen': `<path d="M380 520 h440 l-40 340 a40 40 0 0 1 -40 36 h-280 a40 40 0 0 1 -40 -36 z" fill="${main}"/><rect x="350" y="480" width="500" height="60" rx="30" fill="${accent}"/><path d="M820 600 q120 20 90 140 q-20 60 -110 60" stroke="${main}" stroke-width="34" fill="none"/>`,
    fashion: `<path d="M420 300 l120 -60 q60 60 120 0 l120 60 l110 160 l-110 70 l-40 -50 v420 h-280 v-420 l-40 50 l-110 -70 z" fill="${main}"/><circle cx="600" cy="520" r="40" fill="${accent}"/>`,
    beauty: `<rect x="500" y="420" width="200" height="460" rx="40" fill="${main}"/><rect x="530" y="300" width="140" height="140" rx="20" fill="${accent}"/><rect x="560" y="240" width="80" height="80" rx="10" fill="${main}"/><rect x="530" y="560" width="140" height="180" rx="16" fill="${light}" opacity=".85"/>`,
    books: `<rect x="360" y="300" width="230" height="600" rx="16" fill="${main}"/><rect x="610" y="300" width="230" height="600" rx="16" fill="${accent}"/><rect x="400" y="380" width="150" height="20" rx="10" fill="${light}"/><rect x="650" y="380" width="150" height="20" rx="10" fill="${light}"/><rect x="590" y="300" width="20" height="600" fill="${light}"/>`,
    sports: `<circle cx="600" cy="600" r="280" fill="${main}"/><path d="M330 520 q270 120 540 0 M330 680 q270 -120 540 0" stroke="${light}" stroke-width="26" fill="none"/><path d="M600 320 v560" stroke="${light}" stroke-width="26"/>`,
    toys: `<rect x="360" y="620" width="220" height="220" rx="24" fill="${main}"/><rect x="620" y="620" width="220" height="220" rx="24" fill="${accent}"/><rect x="490" y="380" width="220" height="220" rx="24" fill="hsl(${(h + 90) % 360}, 60%, 55%)"/><circle cx="600" cy="490" r="40" fill="${light}"/>`,
    food: `<rect x="430" y="380" width="340" height="500" rx="60" fill="${main}"/><rect x="460" y="300" width="280" height="100" rx="20" fill="${accent}"/><rect x="470" y="540" width="260" height="180" rx="20" fill="${light}" opacity=".9"/><circle cx="600" cy="630" r="50" fill="${accent}"/>`,
    handmade: `<circle cx="600" cy="620" r="250" fill="${main}"/><path d="M560 360 l40 -80 l40 80 z" fill="${accent}"/><circle cx="600" cy="620" r="170" fill="none" stroke="${light}" stroke-width="18" stroke-dasharray="30 22"/><circle cx="600" cy="620" r="60" fill="${accent}"/>`,
    auto: `<path d="M300 700 q20 -140 140 -160 l90 -110 h220 l110 110 q120 20 140 160 v80 h-700 z" fill="${main}"/><circle cx="440" cy="790" r="70" fill="${accent}"/><circle cx="760" cy="790" r="70" fill="${accent}"/><path d="M560 450 h150 l80 90 h-230 z" fill="${light}" opacity=".85"/>`,
  };
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
      <rect width="1200" height="1200" fill="url(#g)"/>
      <circle cx="${200 + ((seed * 97) % 800)}" cy="${150 + ((seed * 53) % 300)}" r="${60 + (seed % 5) * 20}" fill="${light}" opacity=".35"/>
      <ellipse cx="600" cy="960" rx="330" ry="40" fill="#000" opacity=".08"/>
      <g transform="rotate(${variant ? -8 : 0} 600 600)">${shapes[slug]}</g>
    </svg>`,
  );
}

export const isEmpty = (db) => db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0;

const isoDaysAgo = (days, extraMinutes = 0) => new Date(Date.now() - days * 864e5 + extraMinutes * 6e4).toISOString();

export async function seedDatabase(db, { log = console.log } = {}) {
  const hash = await hashPassword(DEMO_PASSWORD);

  // 1. Categories, users (fast, synchronous)
  const ids = { users: {}, categories: {} };
  db.transaction(() => {
    const insCat = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
    for (const [name, slug] of CATEGORIES) ids.categories[slug] = Number(insCat.run(name, slug).lastInsertRowid);

    const insUser = db.prepare(
      'INSERT INTO users (email, password_hash, name, phone, store_name, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    for (const s of SELLERS) ids.users[s.key] = Number(insUser.run(s.email, hash, s.name, s.phone, s.store, s.avatar, isoDaysAgo(90)).lastInsertRowid);
    for (const b of BUYERS) ids.users[b.key] = Number(insUser.run(b.email, hash, b.name, b.phone, null, b.avatar, isoDaysAgo(60)).lastInsertRowid);
  }).immediate();

  // 2. Products (created unpublished, published after images exist)
  const insProduct = db.prepare(
    `INSERT INTO products (seller_id, category_id, title, description, price_amd, stock, is_published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  );
  const productIds = [];
  db.transaction(() => {
    PRODUCTS.forEach(([slug, seller, title, price, stock, desc], i) => {
      const created = isoDaysAgo(45 - i, i * 7); // spread out so "newest" has a real order
      productIds.push(Number(insProduct.run(ids.users[seller], ids.categories[slug], title, desc, price, stock, created, created).lastInsertRowid));
    });
  }).immediate();

  // 3. Images — a real free-licence photo per product (seed-images/NN.jpg, see CREDITS.json);
  //    the drawn placeholder is only used if a photo is missing. Resized outside any transaction.
  const insImage = db.prepare('INSERT INTO product_images (product_id, file_path, position) VALUES (?, ?, ?)');
  for (let i = 0; i < PRODUCTS.length; i++) {
    const slug = PRODUCTS[i][0];
    const photo = path.join(SEED_IMAGES, `${String(i).padStart(2, '0')}.jpg`);
    const paths = [];
    if (fs.existsSync(photo)) {
      paths.push(await processImage(fs.readFileSync(photo), productIds[i], path.basename(photo)));
    } else {
      for (let v = 0; v < 2; v++) paths.push(await processImage(productSvg(slug, i, v), productIds[i], `seed-${i}-${v}.svg`, { allowSvg: true }));
    }
    db.transaction(() => {
      paths.forEach((p, pos) => insImage.run(productIds[i], p, pos));
      db.prepare('UPDATE products SET is_published = 1 WHERE id = ?').run(productIds[i]);
    }).immediate();
  }

  // 4. Past orders (some delivered with reviews) so ratings and dashboards have data
  const byTitle = (t) => {
    const i = PRODUCTS.findIndex((p) => p[2] === t);
    return { id: productIds[i], seller: ids.users[PRODUCTS[i][1]], title: t, price: PRODUCTS[i][3] };
  };
  const pastOrders = [
    { buyer: 'lilit', days: 20, status: 'delivered', items: [['Wireless Earbuds Pro', 1], ['Copper Jazve (Armenian coffee pot)', 2]],
      reviews: [['Wireless Earbuds Pro', 5, 'Great sound and the battery lasts all week. Delivered to Arabkir in two days.'], ['Copper Jazve (Armenian coffee pot)', 4, 'Beautiful jazve, the coffee foams perfectly.']] },
    { buyer: 'narek', days: 15, status: 'delivered', items: [['Wireless Earbuds Pro', 1], ['Apricot Jam from Ararat Valley', 3]],
      reviews: [['Wireless Earbuds Pro', 4, 'Good value. The case is a bit big.'], ['Apricot Jam from Ararat Valley', 5, 'Tastes like my grandmother’s jam!']] },
    { buyer: 'lilit', days: 10, status: 'delivered', items: [['Hand-painted Pomegranate Plate', 1], ['Mountain Honey 1 kg', 1]],
      reviews: [['Hand-painted Pomegranate Plate', 5, 'A real piece of art. Packed very carefully.'], ['Mountain Honey 1 kg', 5, 'Thick and fragrant honey.']] },
    { buyer: 'narek', days: 6, status: 'delivered', items: [['Smart Watch Fit 3', 1], ['Trekking Poles (pair)', 1]],
      reviews: [['Smart Watch Fit 3', 3, 'Works well, but the app is only in English.'], ['Trekking Poles (pair)', 5, 'Took them to Aragats — very solid.']] },
    { buyer: 'lilit', days: 2, status: 'confirmed', items: [['Power Bank 20000 mAh', 1]] },
    { buyer: 'narek', days: 1, status: 'placed', items: [['Board Game "Tavlu" (Backgammon)', 1], ['Wool Throw Blanket', 1]] },
  ];
  const address = {
    lilit: ['Lilit Grigoryan', '+37494456789', 'yerevan', 'Yerevan', 'Komitas Ave 12', '34', ''],
    narek: ['Narek Avetisyan', '+37455567890', 'shirak', 'Gyumri', 'Rustaveli St 5', '', 'Call before delivery'],
  };
  const PATH = ['placed', 'confirmed', 'shipped', 'delivered'];

  db.transaction(() => {
    let k = 0;
    for (const o of pastOrders) {
      const buyerId = ids.users[o.buyer];
      const lines = o.items.map(([t, q]) => ({ ...byTitle(t), qty: q }));
      const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const created = isoDaysAgo(o.days);
      const orderId = db
        .prepare(
          `INSERT INTO orders (buyer_id, recipient, phone, region, city, street, apartment, note, total_amd, request_key, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(buyerId, ...address[o.buyer], total, `seed-order-${k++}-${Date.now()}`, created).lastInsertRowid;

      const sellers = [...new Set(lines.map((l) => l.seller))];
      for (const sellerId of sellers) {
        const mine = lines.filter((l) => l.seller === sellerId);
        const steps = PATH.slice(0, PATH.indexOf(o.status) + 1);
        const lastAt = isoDaysAgo(o.days, (steps.length - 1) * 600);
        const soId = db
          .prepare('INSERT INTO seller_orders (order_id, seller_id, status, subtotal_amd, updated_at) VALUES (?, ?, ?, ?, ?)')
          .run(orderId, sellerId, o.status, mine.reduce((s, l) => s + l.price * l.qty, 0), lastAt).lastInsertRowid;
        for (const l of mine) {
          db.prepare('INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity) VALUES (?, ?, ?, ?, ?)')
            .run(soId, l.id, l.title, l.price, l.qty);
        }
        steps.forEach((st, idx) => {
          db.prepare('INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at) VALUES (?, ?, ?, ?, ?)')
            .run(soId, idx === 0 ? null : steps[idx - 1], st, idx === 0 ? buyerId : sellerId, isoDaysAgo(o.days, idx * 600));
        });
      }

      for (const [t, rating, body] of o.reviews || []) {
        db.prepare('INSERT INTO reviews (product_id, buyer_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(byTitle(t).id, buyerId, rating, body, isoDaysAgo(o.days - 1));
      }
    }
    db.exec(`UPDATE products SET
      rating_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = products.id),
      rating_avg   = (SELECT COALESCE(AVG(rating), 0) FROM reviews r WHERE r.product_id = products.id)`);
  }).immediate();

  log(`Seeded ${CATEGORIES.length} categories, ${SELLERS.length} sellers, ${BUYERS.length} buyers, ${PRODUCTS.length} products, ${pastOrders.length} orders.`);
}
