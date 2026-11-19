import { getDb, nowIso } from './db.js';
import { conflict, notFound, forbidden } from './errors.js';

export const STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];

/**
 * The ONLY list of allowed status moves. Anything not listed returns 409.
 *   Placed → Confirmed → Shipped → Delivered   (seller only)
 *   Placed / Confirmed → Cancelled             (buyer or seller; stock is restored)
 */
const MOVES = {
  placed: { confirmed: ['seller'], cancelled: ['seller', 'buyer'] },
  confirmed: { shipped: ['seller'], cancelled: ['seller', 'buyer'] },
  shipped: { delivered: ['seller'] },
  delivered: {},
  cancelled: {},
};

/** Moves `role` may make from `status` — used to decide which buttons the UI shows. */
export const allowedMoves = (status, role) =>
  Object.entries(MOVES[status] || {}).filter(([, roles]) => roles.includes(role)).map(([to]) => to);

/**
 * Change the status of one seller order. Both the seller status endpoint and
 * the buyer cancel endpoint go through here, so this is the one place that
 * decides whether a move is allowed.
 *
 * Runs in one BEGIN IMMEDIATE transaction: check the move, update the row
 * (guarded by the old status), add a status_history row, and — for a cancel —
 * put the stock back, all-or-nothing.
 */
export function changeStatus({ sellerOrderId, to, actor, role }) {
  const db = getDb();

  return db.transaction(() => {
    // Scope the lookup to the caller, so another user's order looks like it does not exist.
    const so =
      role === 'seller'
        ? db.prepare('SELECT * FROM seller_orders WHERE id = ? AND seller_id = ?').get(sellerOrderId, actor.id)
        : db.prepare(
            `SELECT so.* FROM seller_orders so JOIN orders o ON o.id = so.order_id
             WHERE so.id = ? AND o.buyer_id = ?`,
          ).get(sellerOrderId, actor.id);
    if (!so) throw notFound('Order');

    if (!STATUSES.includes(to)) {
      throw conflict('STATUS_NOT_ALLOWED', `Unknown status "${to}"`);
    }
    const roles = MOVES[so.status]?.[to];
    if (!roles) {
      throw conflict('STATUS_NOT_ALLOWED', `An order cannot move from ${so.status} to ${to}`, {
        from: so.status, to,
      });
    }
    if (!roles.includes(role)) {
      throw forbidden(`Only the ${roles.join(' or ')} can move an order to ${to}`);
    }

    const now = nowIso();
    const res = db
      .prepare('UPDATE seller_orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
      .run(to, now, so.id, so.status);
    if (res.changes !== 1) {
      throw conflict('STATUS_CHANGED', 'This order was just changed by someone else — reload and try again');
    }

    db.prepare(
      `INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(so.id, so.status, to, actor.id, now);

    if (to === 'cancelled') {
      // Return the stock in the same transaction as the status change.
      db.prepare(
        `UPDATE products
            SET stock = stock + (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                                 WHERE oi.seller_order_id = ? AND oi.product_id = products.id),
                updated_at = ?
          WHERE id IN (SELECT product_id FROM order_items WHERE seller_order_id = ?)`,
      ).run(so.id, now, so.id);
    }

    return { ...so, status: to, updated_at: now };
  }).immediate();
}
