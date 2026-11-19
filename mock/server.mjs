import http from 'node:http';
import { createSession, getSession, postMessage } from './handlers/agent.mjs';
import { recordConsent, getMe, patchMe, exportData, revokeConsent } from './handlers/consent.mjs';
import { listStations, createBooking, getBooking, patchBooking } from './handlers/booking.mjs';
import { tokenize, detokenize } from './handlers/vault.mjs';

const PORT = Number(process.env.MOCK_PORT || 8787);

function json(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error('body too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const p = url.pathname;
  const method = req.method || 'GET';

  if (method === 'GET' && p === '/health') return json(res, 200, { status: 'ok' });

  try {
    const body = method === 'POST' || method === 'PATCH' ? await readBody(req) : {};

    // Agent 会话（Task 1 契约）
    if (method === 'POST' && p === '/api/v1/agent/sessions') return json(res, 201, createSession(body));
    let m = /^\/api\/v1\/agent\/sessions\/([^/]+)\/messages$/.exec(p);
    if (method === 'POST' && m) {
      const r = postMessage(decodeURIComponent(m[1]), body);
      return r ? json(res, 200, r) : json(res, 404, { code: 'SESSION_NOT_FOUND', message: '会话不存在' });
    }
    m = /^\/api\/v1\/agent\/sessions\/([^/]+)$/.exec(p);
    if (method === 'GET' && m) {
      const r = getSession(decodeURIComponent(m[1]));
      return r ? json(res, 200, r) : json(res, 404, { code: 'SESSION_NOT_FOUND', message: '会话不存在' });
    }

    // 站点与预约（Task 3 契约）
    if (method === 'GET' && p === '/api/v1/stations') return json(res, 200, listStations());
    if (method === 'POST' && p === '/api/v1/bookings') {
      const r = createBooking(body);
      return r.error ? json(res, 409, r.error) : json(res, 201, r);
    }
    m = /^\/api\/v1\/bookings\/([^/]+)$/.exec(p);
    if (method === 'GET' && m) {
      const r = getBooking(m[1]);
      return r ? json(res, 200, r) : json(res, 404, { code: 'BOOKING_NOT_FOUND', message: '预约不存在' });
    }
    if (method === 'PATCH' && m) {
      const r = patchBooking(m[1], body);
      return r ? json(res, 200, r) : json(res, 404, { code: 'BOOKING_NOT_FOUND', message: '预约不存在' });
    }

    // 同意与权利（Task 5 契约）
    if (method === 'POST' && p === '/api/v1/consent/revoke') {
      return json(res, 200, revokeConsent(body.candidate_id, body));
    }
    if (method === 'POST' && p === '/api/v1/consent') return json(res, 201, recordConsent(body));
    m = /^\/api\/v1\/candidates\/([^/]+)\/me$/.exec(p);
    if (method === 'GET' && m) {
      const r = getMe(m[1]);
      return r ? json(res, 200, r) : json(res, 404, { code: 'CANDIDATE_NOT_FOUND', message: '候选人不存在' });
    }
    if (method === 'PATCH' && m) {
      const r = patchMe(m[1], body);
      if (!r) return json(res, 404, { code: 'CANDIDATE_NOT_FOUND', message: '候选人不存在' });
      return r.error ? json(res, 400, r.error) : json(res, 200, r);
    }
    m = /^\/api\/v1\/candidates\/([^/]+)\/export$/.exec(p);
    if (method === 'GET' && m) {
      const r = exportData(m[1]);
      return r ? json(res, 200, r) : json(res, 404, { code: 'CANDIDATE_NOT_FOUND', message: '候选人不存在' });
    }

    // 保险箱（Task 5 契约）
    if (method === 'POST' && p === '/api/v1/vault/tokenize') {
      const r = tokenize(body);
      return r.error ? json(res, 400, r.error) : json(res, 200, r);
    }
    if (method === 'POST' && p === '/api/v1/vault/detokenize') {
      const r = detokenize(body);
      return r.error ? json(res, 403, r.error) : json(res, 200, r);
    }

    return json(res, 404, { code: 'NOT_FOUND', message: `无此接口：${method} ${p}` });
  } catch (err) {
    return json(res, 400, { code: 'BAD_REQUEST', message: err.message || '请求格式错误' });
  }
});

const HOST = process.env.MOCK_HOST || '127.0.0.1'; // 容器内传 0.0.0.0
server.listen(PORT, HOST, () => {
  console.log(`[mock] listening on http://${HOST}:${PORT}  (${new Date().toISOString()})`);
});
