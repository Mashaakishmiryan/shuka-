import { badRequest, notFound } from './errors.js';

/** Yerevan plus the 10 marzer. The frontend translates these keys. */
export const REGIONS = [
  'yerevan', 'aragatsotn', 'ararat', 'armavir', 'gegharkunik', 'kotayk',
  'lori', 'shirak', 'syunik', 'tavush', 'vayots_dzor',
];

/**
 * Tiny schema validator. A rule is { type, required, min, max, ... }.
 * Collects one error code per field and throws a single 400 with all of them.
 * Field error codes: required, too_short, too_long, invalid, too_small, too_large.
 */
export function validate(body, rules, { partial = false } = {}) {
  const src = body && typeof body === 'object' ? body : {};
  const out = {};
  const fields = {};

  for (const [name, rule] of Object.entries(rules)) {
    let v = src[name];
    const missing = v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
    if (missing) {
      if (partial && v === undefined) continue;
      if (rule.required) fields[name] = 'required';
      else if (rule.default !== undefined) out[name] = rule.default;
      continue;
    }

    switch (rule.type) {
      case 'string': {
        if (typeof v !== 'string') { fields[name] = 'invalid'; break; }
        v = v.trim();
        if (rule.min && v.length < rule.min) fields[name] = 'too_short';
        else if (rule.max && v.length > rule.max) fields[name] = 'too_long';
        else if (rule.pattern && !rule.pattern.test(v)) fields[name] = 'invalid';
        else if (rule.oneOf && !rule.oneOf.includes(v)) fields[name] = 'invalid';
        else out[name] = rule.transform ? rule.transform(v) : v;
        break;
      }
      case 'int': {
        const n = typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? Number(v) : v;
        if (!Number.isSafeInteger(n)) fields[name] = 'invalid';
        else if (rule.min !== undefined && n < rule.min) fields[name] = 'too_small';
        else if (rule.max !== undefined && n > rule.max) fields[name] = 'too_large';
        else out[name] = n;
        break;
      }
      case 'bool': {
        if (typeof v !== 'boolean') fields[name] = 'invalid';
        else out[name] = v;
        break;
      }
      default:
        throw new Error(`Unknown rule type ${rule.type}`);
    }
  }

  if (Object.keys(fields).length) throw badRequest('Please check the highlighted fields', fields);
  return out;
}

// Shared field rules
export const emailRule = {
  type: 'string', required: true, max: 254,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, transform: (s) => s.toLowerCase(),
};
export const passwordRule = { type: 'string', required: true, min: 8, max: 200 };
export const nameRule = { type: 'string', required: true, min: 2, max: 80 };
// Armenian or international number: optional +, 8–15 digits; spaces, dashes and brackets allowed.
export const phoneRule = {
  type: 'string', required: true, max: 25,
  pattern: /^\+?[\d\s\-()]{8,22}$/,
  transform: (s) => s.replace(/[^\d+]/g, ''),
};

/** Parse a positive integer route param, or throw 404 (an invalid id cannot exist). */
export function idParam(value, what = 'Resource') {
  const n = Number(value);
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(n) || n <= 0) throw notFound(what);
  return n;
}
