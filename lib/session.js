'use strict';
/**
 * جلسات موقّعة (HMAC) داخل كوكي HttpOnly — بدون أي مكتبات خارجية.
 * الجلسة تحمل: هوية الناخب، الانتخابة، ووضع «منصة الاقتراع» إن وُجد.
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
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function cookieString(name, value, { maxAge = 0, httpOnly = true, path = '/' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, 'SameSite=Lax'];
  if (httpOnly) parts.push('HttpOnly');
  if (maxAge) parts.push(`Max-Age=${Math.floor(maxAge)}`);
  return parts.join('; ');
}

function readSession(req) {
  const cookies = parseCookies(req);
  return verify(cookies[COOKIE]);
}

function startSession(res, data) {
  const payload = { ...data, iat: Date.now(), exp: Date.now() + config.sessionTtlMinutes * 60_000 };
  res.setHeader('Set-Cookie', cookieString(COOKIE, sign(payload), { maxAge: config.sessionTtlMinutes * 60 }));
  return payload;
}

function endSession(res) {
  res.setHeader('Set-Cookie', cookieString(COOKIE, '', { maxAge: -1 }));
}

function startAdmin(res) {
  const payload = { role: 'admin', iat: Date.now(), exp: Date.now() + 8 * 3600_000 };
  res.setHeader('Set-Cookie', cookieString(ADMIN_COOKIE, sign(payload), { maxAge: 8 * 3600 }));
  return payload;
}

function isAdmin(req) {
  const cookies = parseCookies(req);
  const data = verify(cookies[ADMIN_COOKIE]);
  return !!(data && data.role === 'admin');
}

function endAdmin(res) {
  res.setHeader('Set-Cookie', cookieString(ADMIN_COOKIE, '', { maxAge: -1 }));
}

module.exports = { readSession, startSession, endSession, startAdmin, isAdmin, endAdmin, parseCookies };
