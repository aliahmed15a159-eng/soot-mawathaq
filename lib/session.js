'use strict';
/**
 * جلسات موقّعة (HMAC) داخل كوكي HttpOnly + دعم رمز جلسة احتياطي لبيئات الـ iframe المدمجة
 * بدون أي مكتبات خارجية.
 */
const crypto = require('crypto');
const { config } = require('./config');

const COOKIE = 'sm_session';
const ADMIN_COOKIE = 'sm_admin';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(str) {
  return Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function sign(payloadObj) {
  const body = b64url(JSON.stringify(payloadObj));
  const sig = crypto.createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verify(cookieValue) {
  if (!cookieValue || typeof cookieValue !== 'string' || !cookieValue.includes('.')) return null;
  const [body, sig] = cookieValue.split('.');
  const expected = crypto.createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(fromB64url(body));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) {
      try { out[k] = decodeURIComponent(v); } catch { out[k] = v; }
    }
  });
  return out;
}

function isSecureReq(req) {
  if (!req) return false;
  const proto = String(req.headers?.['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  if (proto === 'https') return true;
  if (req.socket && req.socket.encrypted) return true;
  const host = String(req.headers?.host || '');
  if (host.endsWith('.e2b.app') || host.endsWith('.vercel.app')) return true;
  return false;
}

function cookieString(name, value, { maxAge = 0, httpOnly = true, path = '/', secure = false } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (secure) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  if (httpOnly) parts.push('HttpOnly');
  if (maxAge) parts.push(`Max-Age=${Math.floor(maxAge)}`);
  return parts.join('; ');
}

function readSession(req) {
  const cookies = parseCookies(req);
  if (cookies[COOKIE]) {
    const c = verify(cookies[COOKIE]);
    if (c) return c;
  }
  const hdrToken = req.headers?.['x-session-token'];
  if (hdrToken) {
    const h = verify(String(hdrToken).trim());
    if (h) return h;
  }
  try {
    const u = new URL(req.url || '/', 'http://localhost');
    const qToken = u.searchParams.get('_st');
    if (qToken) {
      const q = verify(qToken.trim());
      if (q) return q;
    }
  } catch {}
  return null;
}

function startSession(res, data, req = null) {
  const payload = { ...data, iat: Date.now(), exp: Date.now() + config.sessionTtlMinutes * 60_000 };
  const signed = sign(payload);
  const secure = isSecureReq(req || res.req);
  res.setHeader('Set-Cookie', cookieString(COOKIE, signed, { maxAge: config.sessionTtlMinutes * 60, secure }));
  res.setHeader('X-Session-Token', signed);
  return { payload, signed };
}

function endSession(res, req = null) {
  const secure = isSecureReq(req || res.req);
  res.setHeader('Set-Cookie', cookieString(COOKIE, '', { maxAge: -1, secure }));
  res.setHeader('X-Session-Token', '');
}

function startAdmin(res, req = null) {
  const payload = { role: 'admin', iat: Date.now(), exp: Date.now() + 8 * 3600_000 };
  const signed = sign(payload);
  const secure = isSecureReq(req || res.req);
  res.setHeader('Set-Cookie', cookieString(ADMIN_COOKIE, signed, { maxAge: 8 * 3600, secure }));
  return payload;
}

function isAdmin(req) {
  const cookies = parseCookies(req);
  const data = verify(cookies[ADMIN_COOKIE]);
  return !!(data && data.role === 'admin');
}

function endAdmin(res, req = null) {
  const secure = isSecureReq(req || res.req);
  res.setHeader('Set-Cookie', cookieString(ADMIN_COOKIE, '', { maxAge: -1, secure }));
}

module.exports = { readSession, startSession, endSession, startAdmin, isAdmin, endAdmin, parseCookies, sign, verify };
