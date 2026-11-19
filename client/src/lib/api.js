// Thin fetch wrapper. All requests go to /api on the same origin
// (Vite proxies it in development, Netlify in production), so the
// httpOnly session cookie is always first-party.

export class ApiError extends Error {
  constructor(status, body, network = false) {
    const e = body?.error || {};
    super(e.message || (network ? 'Network error' : `HTTP ${status}`));
    this.status = status;
    this.code = e.code || (network ? 'NETWORK' : 'HTTP_ERROR');
    this.fields = e.fields || {};
    this.data = e;
    this.network = network;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GETs are retried a few times: a free server that was asleep can take ~30-60 s to wake up. */
async function request(method, path, body, opts = {}) {
  const tries = method === 'GET' ? 4 : 1;
  for (let i = 1; ; i++) {
    try {
      return await requestOnce(method, path, body, opts);
    } catch (e) {
      if (!e.network || i >= tries) throw e;
      await sleep(2500 * i);
    }
  }
}

async function requestOnce(method, path, body, { form } = {}) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (form) opts.body = form;
  else if (body !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`/api${path}`, opts);
  } catch {
    throw new ApiError(0, null, true);
  }
  if (res.status === 204) return null;
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    // A proxy/host error page (e.g. a sleeping free server) has no JSON body.
    if (!data && res.status >= 500) throw new ApiError(res.status, null, true);
    throw new ApiError(res.status, data);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
  upload: (p, files) => {
    const form = new FormData();
    for (const f of files) form.append('images', f);
    return request('POST', p, undefined, { form });
  },
};

/** Build "?a=1&b=2" from an object, skipping empty values. */
export function qs(params) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, v);
  const out = s.toString();
  return out ? `?${out}` : '';
}

/** Random request key so a repeated "Place order" never creates a second order. */
export function newRequestKey() {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}
