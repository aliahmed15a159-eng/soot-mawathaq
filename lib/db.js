'use strict';
/**
 * طبقة البيانات — واجهة واحدة تخدم وضعين:
 *   1) supabase : اتصال مباشر بـ Supabase عبر REST (PostgREST) بمفتاح service_role
 *   2) demo     : قاعدة بيانات JSON محلية تُستخدم لو مفاتيح Supabase غير مضبوطة
 * نفس أسماء الجداول ونفس شكل الصفوف في الوضعين، فالكود اللي فوق مايفرقش.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { config } = require('./config');

const DEMO_FILE = process.env.DEMO_DB_FILE
  ? path.resolve(process.env.DEMO_DB_FILE)
  : (process.env.VERCEL
    ? path.join(os.tmpdir(), 'soot-demo-db.json')
    : path.join(__dirname, '..', 'data', 'demo-db.json'));

/* ------------------------------------------------------------------ Supabase */
function supaHeaders(extra = {}) {
  return {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

const supa = {
  async request(method, resource, { body, query = '', prefer, headers = {} } = {}) {
    const url = `${config.supabaseUrl}/rest/v1/${resource}${query}`;
    const res = await fetch(url, {
      method,
      headers: supaHeaders({ ...(prefer ? { Prefer: prefer } : {}), ...headers }),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = (data && (data.message || data.error || data.hint)) || res.statusText;
      throw new Error(`Supabase ${method} ${resource}: ${res.status} ${msg}`);
    }
    return data;
  },
  async health() {
    await this.request('GET', 'elections', { query: '?select=id&limit=1' });
    return true;
  },
};

/* --------------------------------------------------------------- Demo store */
class DemoStore {
  constructor() {
    this.data = { voters: [], elections: [], candidates: [], tokens: [], ballots: [], reviews: [], audit: [] };
    this.loaded = false;
    this.saveTimer = null;
  }

  load() {
    if (this.loaded) return;
    try {
      if (fs.existsSync(DEMO_FILE)) {
        this.data = { ...this.data, ...JSON.parse(fs.readFileSync(DEMO_FILE, 'utf8')) };
      }
    } catch (err) {
      console.error('[demo-db] تعذّر قراءة الملف، هنبدأ من جديد:', err.message);
    }
    this.loaded = true;
  }

  save() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        fs.mkdirSync(path.dirname(DEMO_FILE), { recursive: true });
        const tmp = `${DEMO_FILE}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
        fs.renameSync(tmp, DEMO_FILE);
      } catch (err) {
        console.error('[demo-db] تعذّر الحفظ:', err.message);
      }
    }, 120);
  }

  /** حفظ فوري ومتزامن — يلغي أي تأجيل معلّق (يُستخدم بعد الاستيراد والعمليات الحساسة) */
  flush() {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    try {
      fs.mkdirSync(path.dirname(DEMO_FILE), { recursive: true });
      const tmp = `${DEMO_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, DEMO_FILE);
    } catch (err) {
      console.error('[demo-db] تعذّر الحفظ الفوري:', err.message);
    }
  }

  nextId(collection) {
    const ids = this.data[collection].map((r) => r.id || 0);
    return (ids.length ? Math.max(...ids) : 0) + 1;
  }
}

const demo = new DemoStore();

/* --------------------------------------------------------------- الواجهة العامة */
const db = {
  mode: config.databaseMode,

  async init() {
    if (db.mode === 'supabase') {
      try {
        await supa.health();
      } catch (err) {
        const notReady = /42P01|does not exist|404/.test(String(err.message));
        if (notReady) {
          throw new Error('الاتصال بـ Supabase تمام، لكن الجداول غير موجودة بعد — نفّذ ملف supabase/schema.sql في SQL Editor أو شغّل: node tools/apply-schema.js');
        }
        throw err;
      }
      return { mode: 'supabase', note: 'متصل بـ Supabase' };
    }
    demo.load();
    db.seedIfEmpty();
    return { mode: 'demo', note: 'وضع التجربة — قاعدة بيانات محلية (ضبط مفاتيح Supabase في .env للاتصال الحقيقي)' };
  },

  /* ---------------- حسابات المديرين (الأدمن) ---------------- */
  async verifyAdmin(email, password) {
    const sec = require('./security');
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();
    const passHash = sec.sha256(`admin:${cleanEmail}:${cleanPass}`);
    if (db.mode === 'supabase') {
      try {
        const rows = await supa.request('GET', 'admins', {
          query: `?email=eq.${encodeURIComponent(cleanEmail)}&active=eq.true&select=*&limit=1`,
        });
        const row = rows && rows[0];
        if (row && sec.safeEqual(row.password_hash, passHash)) {
          await supa.request('PATCH', 'admins', {
            query: `?id=eq.${row.id}`,
            body: { last_login_at: new Date().toISOString() },
          }).catch(() => {});
          return { ok: true, admin: { id: row.id, email: row.email, name: row.full_name, role: row.role } };
        }
      } catch { /* نكمل بالتحقق من الإعدادات */ }
    }
    if (
      cleanEmail && cleanPass &&
      sec.safeEqual(cleanEmail, String(config.adminEmail || '').toLowerCase()) &&
      sec.safeEqual(cleanPass, String(config.adminPassword || ''))
    ) {
      return { ok: true, admin: { email: cleanEmail, name: 'علي أحمد (المدير العام)', role: 'super_admin' } };
    }
    return { ok: false };
  },

  /* ---------------- الناخبون ---------------- */
  async findVoterByIdentity(identityHash) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('GET', 'voters', {
        query: `?identity_hash=eq.${identityHash}&select=*&limit=1`,
      });
      return rows && rows[0] ? rows[0] : null;
    }
    demo.load();
    return demo.data.voters.find((v) => v.identity_hash === identityHash) || null;
  },

  async findVoterById(id) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('GET', 'voters', { query: `?id=eq.${id}&select=*&limit=1` });
      return rows && rows[0] ? rows[0] : null;
    }
    demo.load();
    return demo.data.voters.find((v) => String(v.id) === String(id)) || null;
  },

  async createVoter(record) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('POST', 'voters', { body: record, prefer: 'return=representation' });
      return rows[0];
    }
    demo.load();
    const row = { id: demo.nextId('voters'), created_at: new Date().toISOString(), ...record };
    demo.data.voters.push(row);
    demo.save();
    return row;
  },

  async updateVoter(id, patch) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('PATCH', 'voters', {
        query: `?id=eq.${id}`, body: patch, prefer: 'return=representation',
      });
      return rows[0];
    }
    demo.load();
    const row = demo.data.voters.find((v) => String(v.id) === String(id));
    if (!row) return null;
    Object.assign(row, patch, { updated_at: new Date().toISOString() });
    demo.save();
    return row;
  },

  async countVoters() {
    if (db.mode === 'supabase') {
      const res = await fetch(`${config.supabaseUrl}/rest/v1/voters?select=id`, {
        method: 'HEAD', headers: supaHeaders({ Prefer: 'count=exact' }),
      });
      const range = res.headers.get('content-range') || '*/0';
      return parseInt(range.split('/')[1] || '0', 10);
    }
    demo.load();
    return demo.data.voters.length;
  },

  /* ---------------- الانتخابات ---------------- */
  async listElections() {
    if (db.mode === 'supabase') {
      return supa.request('GET', 'elections', { query: '?select=*&order=id.desc' }) || [];
    }
    demo.load();
    return [...demo.data.elections].sort((a, b) => b.id - a.id);
  },

  async getElection(id) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('GET', 'elections', { query: `?id=eq.${id}&select=*&limit=1` });
      return rows && rows[0] ? rows[0] : null;
    }
    demo.load();
    return demo.data.elections.find((e) => String(e.id) === String(id)) || null;
  },

  async createElection(record) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('POST', 'elections', { body: record, prefer: 'return=representation' });
      return rows[0];
    }
    demo.load();
    const row = { id: demo.nextId('elections'), created_at: new Date().toISOString(), ...record };
    demo.data.elections.push(row);
    demo.save();
    return row;
  },

  async updateElection(id, patch) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('PATCH', 'elections', {
        query: `?id=eq.${id}`, body: patch, prefer: 'return=representation',
      });
      return rows[0];
    }
    demo.load();
    const row = demo.data.elections.find((e) => String(e.id) === String(id));
    if (!row) return null;
    Object.assign(row, patch);
    demo.save();
    return row;
  },

  async deleteElection(id) {
    if (db.mode === 'supabase') {
      await supa.request('DELETE', 'ballots', { query: `?election_id=eq.${id}` }).catch(() => {});
      await supa.request('DELETE', 'vote_tokens', { query: `?election_id=eq.${id}` }).catch(() => {});
      await supa.request('DELETE', 'candidates', { query: `?election_id=eq.${id}` }).catch(() => {});
      await supa.request('DELETE', 'elections', { query: `?id=eq.${id}` });
      return true;
    }
    demo.load();
    demo.data.elections = demo.data.elections.filter((e) => String(e.id) !== String(id));
    demo.data.candidates = demo.data.candidates.filter((c) => String(c.election_id) !== String(id));
    demo.data.ballots = demo.data.ballots.filter((b) => String(b.election_id) !== String(id));
    demo.save();
    return true;
  },

  /* ---------------- المرشحون ---------------- */
  async listCandidates(electionId) {
    if (db.mode === 'supabase') {
      return supa.request('GET', 'candidates', {
        query: `?election_id=eq.${electionId}&select=*&order=sort.asc`,
      }) || [];
    }
    demo.load();
    return demo.data.candidates
      .filter((c) => String(c.election_id) === String(electionId))
      .sort((a, b) => (a.sort || 0) - (b.sort || 0));
  },

  async createCandidate(record) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('POST', 'candidates', { body: record, prefer: 'return=representation' });
      return rows[0];
    }
    demo.load();
    const row = { id: demo.nextId('candidates'), ...record };
    demo.data.candidates.push(row);
    demo.save();
    return row;
  },

  /* ---------------- رموز الاقتراع ---------------- */
  async createToken(record) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('POST', 'vote_tokens', { body: record, prefer: 'return=representation' });
      return rows[0];
    }
    demo.load();
    const row = { id: demo.nextId('tokens'), created_at: new Date().toISOString(), ...record };
    demo.data.tokens.push(row);
    demo.save();
    return row;
  },

  async findTokenByHash(tokenHash) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('GET', 'vote_tokens', { query: `?token_hash=eq.${tokenHash}&select=*&limit=1` });
      return rows && rows[0] ? rows[0] : null;
    }
    demo.load();
    return demo.data.tokens.find((t) => t.token_hash === tokenHash) || null;
  },

  async findActiveTokenForVoter(voterId, electionId) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('GET', 'vote_tokens', {
        query: `?voter_id=eq.${voterId}&election_id=eq.${electionId}&used_at=is.null&select=*&limit=1`,
      });
      return rows && rows[0] ? rows[0] : null;
    }
    demo.load();
    return demo.data.tokens.find((t) => String(t.voter_id) === String(voterId)
      && String(t.election_id) === String(electionId) && !t.used_at) || null;
  },

  async markTokenUsed(id) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('PATCH', 'vote_tokens', {
        query: `?id=eq.${id}&used_at=is.null`, body: { used_at: new Date().toISOString() },
        prefer: 'return=representation',
      });
      return rows && rows[0] ? rows[0] : null; // null = كان مستخدم بالفعل (حماية من التزامن)
    }
    demo.load();
    const row = demo.data.tokens.find((t) => String(t.id) === String(id));
    if (!row || row.used_at) return null;
    row.used_at = new Date().toISOString();
    demo.save();
    return row;
  },

  /* ---------------- الأصوات ---------------- */
  async createBallot(record) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('POST', 'ballots', { body: record, prefer: 'return=representation' });
      return rows[0];
    }
    demo.load();
    const row = { id: demo.nextId('ballots'), cast_at: new Date().toISOString(), ...record };
    demo.data.ballots.push(row);
    demo.save();
    return row;
  },

  async tally(electionId) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('GET', 'ballots', {
        query: `?election_id=eq.${electionId}&select=candidate_id`,
      });
      const counts = {};
      (rows || []).forEach((r) => { counts[r.candidate_id] = (counts[r.candidate_id] || 0) + 1; });
      return counts;
    }
    demo.load();
    const counts = {};
    demo.data.ballots
      .filter((b) => String(b.election_id) === String(electionId))
      .forEach((b) => { counts[b.candidate_id] = (counts[b.candidate_id] || 0) + 1; });
    return counts;
  },

  async findBallotByReceipt(receiptCode) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('GET', 'ballots', {
        query: `?receipt_code=eq.${encodeURIComponent(receiptCode)}&select=id,election_id,candidate_id,cast_at&limit=1`,
      });
      return rows && rows[0] ? rows[0] : null;
    }
    demo.load();
    return demo.data.ballots.find((b) => b.receipt_code === receiptCode) || null;
  },

  async countBallots(electionId) {
    if (db.mode === 'supabase') {
      const res = await fetch(`${config.supabaseUrl}/rest/v1/ballots?election_id=eq.${electionId}&select=id`, {
        method: 'HEAD', headers: supaHeaders({ Prefer: 'count=exact' }),
      });
      const range = res.headers.get('content-range') || '*/0';
      return parseInt(range.split('/')[1] || '0', 10);
    }
    demo.load();
    return demo.data.ballots.filter((b) => String(b.election_id) === String(electionId)).length;
  },

  async hasVotedForElection(voterId, electionId) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('GET', 'vote_tokens', {
        query: `?voter_id=eq.${voterId}&election_id=eq.${electionId}&used_at=not.is.null&select=id&limit=1`,
      });
      return !!(rows && rows.length);
    }
    demo.load();
    return demo.data.tokens.some((t) => String(t.voter_id) === String(voterId)
      && String(t.election_id) === String(electionId) && !!t.used_at);
  },

  /** عدد من صدر لهم رمز اقتراع (المشاركون المؤهّلون) — يُستخدم كمقام نسبة المشاركة */
  async countVerifiedParticipants(electionId) {
    if (db.mode === 'supabase') {
      const res = await fetch(`${config.supabaseUrl}/rest/v1/vote_tokens?election_id=eq.${electionId}&select=id`, {
        method: 'HEAD', headers: supaHeaders({ Prefer: 'count=exact' }),
      });
      const range = res.headers.get('content-range') || '*/0';
      return parseInt(range.split('/')[1] || '0', 10);
    }
    demo.load();
    return demo.data.tokens.filter((t) => String(t.election_id) === String(electionId)).length;
  },

  /* ---------------- مراجعة الحالات المشكوك فيها ---------------- */
  async createReview(record) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('POST', 'reviews', { body: record, prefer: 'return=representation' });
      return rows[0];
    }
    demo.load();
    const row = { id: demo.nextId('reviews'), created_at: new Date().toISOString(), ...record };
    demo.data.reviews.push(row);
    demo.save();
    return row;
  },

  async listReviews(status) {
    if (db.mode === 'supabase') {
      const q = status ? `?status=eq.${status}&select=*&order=id.asc` : '?select=*&order=id.asc';
      return supa.request('GET', 'reviews', { query: q }) || [];
    }
    demo.load();
    return demo.data.reviews.filter((r) => !status || r.status === status);
  },

  async getReview(id) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('GET', 'reviews', { query: `?id=eq.${id}&select=*&limit=1` });
      return rows && rows[0] ? rows[0] : null;
    }
    demo.load();
    return demo.data.reviews.find((r) => String(r.id) === String(id)) || null;
  },

  async updateReview(id, patch) {
    if (db.mode === 'supabase') {
      const rows = await supa.request('PATCH', 'reviews', {
        query: `?id=eq.${id}`, body: patch, prefer: 'return=representation',
      });
      return rows[0];
    }
    demo.load();
    const row = demo.data.reviews.find((r) => String(r.id) === String(id));
    if (!row) return null;
    Object.assign(row, patch, { decided_at: new Date().toISOString() });
    demo.save();
    return row;
  },

  /* ---------------- سجل التدقيق ---------------- */
  async audit(entry) {
    const row = {
      action: entry.action,
      actor: entry.actor || 'system',
      meta: entry.meta || {},
      created_at: new Date().toISOString(),
    };
    try {
      if (db.mode === 'supabase') {
        await supa.request('POST', 'audit_log', { body: row });
      } else {
        demo.load();
        row.id = demo.nextId('audit');
        demo.data.audit.push(row);
        if (demo.data.audit.length > 5000) demo.data.audit.splice(0, demo.data.audit.length - 5000);
        demo.save();
      }
    } catch (err) {
      console.error('[audit] تعذّر كتابة السجل:', err.message);
    }
    return row;
  },

  async listAudit(limit = 100) {
    if (db.mode === 'supabase') {
      return supa.request('GET', 'audit_log', { query: `?select=*&order=id.desc&limit=${limit}` }) || [];
    }
    demo.load();
    return [...demo.data.audit].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, limit);
  },

  /* ---------------- كشوف الناخبين (المرحلة ٢) ---------------- */

  /** استيراد صفوف الكشف — يتجاهل المكرر تلقائيًا */
  async importVoterRoll(rows) {
    if (db.mode === 'supabase') {
      const res = await fetch(`${config.supabaseUrl}/rest/v1/voter_roll?on_conflict=identity_hash`, {
        method: 'POST',
        headers: supaHeaders({ Prefer: 'resolution=ignore-duplicates,return=representation' }),
        body: JSON.stringify(rows),
      });
      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 404 || /relation .* does not exist/.test(txt)) {
          throw new Error('جدول كشوف الناخبين (voter_roll) غير موجود — نفّذ supabase/migrations/002_phase2.sql');
        }
        throw new Error(`importVoterRoll: ${res.status} ${txt.slice(0, 160)}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data.length : 0;
    }
    demo.load();
    demo.data.voter_roll = demo.data.voter_roll || [];
    let added = 0;
    for (const row of rows) {
      if (demo.data.voter_roll.some((r) => r.identity_hash === row.identity_hash)) continue;
      demo.data.voter_roll.push({ id: demo.data.voter_roll.length + 1, imported_at: new Date().toISOString(), ...row });
      added++;
    }
    demo.flush();
    return added;
  },

  /** هل الشخص موجود في كشف الناخبين المعتمد؟ */
  async findInVoterRoll(identityHash) {
    if (db.mode === 'supabase') {
      try {
        const rows = await supa.request('GET', 'voter_roll', {
          query: `?identity_hash=eq.${identityHash}&select=*&limit=1`,
        });
        return rows && rows[0] ? rows[0] : null;
      } catch (err) {
        if (/does not exist|404/.test(String(err.message))) return null; // لا كشوف بعد ⇒ يُتجاهل الشرط
        throw err;
      }
    }
    demo.load();
    return (demo.data.voter_roll || []).find((r) => r.identity_hash === identityHash) || null;
  },

  /** عرض جميع البطاقات المسجّلة في قاعدة البيانات */
  async listIdCards() {
    if (db.mode === 'supabase') {
      try {
        const rows = await supa.request('GET', 'voter_roll', {
          query: '?select=*&order=imported_at.desc&limit=100',
        });
        return rows || [];
      } catch {
        return [];
      }
    }
    demo.load();
    return [...(demo.data.voter_roll || [])].reverse();
  },

  /** إضافة أو تحديث بطاقة هوية بصورتها وبصمة الوجه في قاعدة البيانات */
  async upsertIdCard(row) {
    if (db.mode === 'supabase') {
      const existing = await db.findInVoterRoll(row.identity_hash);
      if (existing) {
        const rows = await supa.request('PATCH', 'voter_roll', {
          query: `?identity_hash=eq.${row.identity_hash}`,
          body: row,
          prefer: 'return=representation',
        });
        return rows && rows[0] ? rows[0] : { ...existing, ...row };
      }
      const rows = await supa.request('POST', 'voter_roll', {
        body: [row],
        prefer: 'return=representation',
      });
      return rows && rows[0] ? rows[0] : row;
    }
    demo.load();
    demo.data.voter_roll = demo.data.voter_roll || [];
    const idx = demo.data.voter_roll.findIndex((r) => r.identity_hash === row.identity_hash);
    if (idx >= 0) {
      demo.data.voter_roll[idx] = { ...demo.data.voter_roll[idx], ...row };
      demo.flush();
      return demo.data.voter_roll[idx];
    }
    const created = { id: demo.data.voter_roll.length + 1, imported_at: new Date().toISOString(), ...row };
    demo.data.voter_roll.push(created);
    demo.flush();
    return created;
  },

  async voterRollStats() {
    if (db.mode === 'supabase') {
      try {
        const res = await fetch(`${config.supabaseUrl}/rest/v1/voter_roll?select=id`, {
          method: 'HEAD', headers: supaHeaders({ Prefer: 'count=exact' }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const range = res.headers.get('content-range') || '*/0';
        return { count: parseInt(range.split('/')[1] || '0', 10), table: true };
      } catch {
        return { count: 0, table: false, note: 'الجدول غير منشأ — نفّذ 002_phase2.sql' };
      }
    }
    demo.load();
    return { count: (demo.data.voter_roll || []).length, table: true };
  },

  /* ---------------- نداءات المزوّدين (تدقيق + متابعة) ---------------- */

  /** تسجيل نداء مزوّد خارجي — لا يفشل العملية أبدًا لو الجدول غير موجود */
  async recordProviderCall(row) {
    const entry = {
      provider: String(row.provider || 'unknown').slice(0, 40),
      operation: String(row.operation || 'unknown').slice(0, 40),
      voter_id: row.voter_id || null,
      duration_ms: Number.isFinite(row.ms) ? Math.round(row.ms) : null,
      ok: row.ok !== false,
      score: row.score === undefined || row.score === null ? null : Number(row.score),
      error: row.error ? String(row.error).slice(0, 200) : null,
      created_at: new Date().toISOString(),
    };
    try {
      if (db.mode === 'supabase') {
        const res = await fetch(`${config.supabaseUrl}/rest/v1/provider_calls`, {
          method: 'POST', headers: supaHeaders({ Prefer: 'return=minimal' }), body: JSON.stringify([entry]),
        });
        if (!res.ok) throw new Error(String(res.status));
        return true;
      }
      demo.load();
      demo.data.provider_calls = demo.data.provider_calls || [];
      demo.data.provider_calls.push({ id: demo.data.provider_calls.length + 1, ...entry });
      if (demo.data.provider_calls.length > 500) demo.data.provider_calls = demo.data.provider_calls.slice(-500);
      demo.save();
      return true;
    } catch {
      return false; // التدقيق إضافة — مش شرط لنجاح التحقق
    }
  },

  async providerCallStats() {
    if (db.mode === 'supabase') {
      try {
        const res = await fetch(`${config.supabaseUrl}/rest/v1/provider_calls?select=provider,ok,duration_ms&order=created_at.desc&limit=200`, {
          headers: supaHeaders(),
        });
        if (!res.ok) throw new Error(String(res.status));
        const rows = await res.json();
        return summarize(rows);
      } catch {
        return { table: false, calls: 0, by_provider: [], note: 'الجدول غير منشأ — نفّذ 002_phase2.sql' };
      }
    }
    demo.load();
    return summarize(demo.data.provider_calls || []);
  },

  /** حفظ فوري لملف وضع التجربة (لا يفعل حاجة في وضع Supabase) */
  flushDemo() { if (db.mode !== 'supabase') demo.flush(); },

  /* ---------------- بيانات تجريبية ---------------- */
  seedIfEmpty() {
    if (db.mode !== 'demo') return;
    demo.load();
    if (demo.data.elections.length) return;
    const now = Date.now();
    const election = {
      id: 1,
      title: 'الانتخابات العامة لرئاسة المجلس الوطني ٢٠٢٦',
      description: 'الاقتراع الإلكتروني الموثّق بالبطاقة القومية وبصمة الوجه لاختيار رئيس المجلس — دورة ٢٠٢٦ / ٢٠٣٠',
      type: 'single',
      starts_at: new Date(now - 86400_000).toISOString(),
      ends_at: new Date(now + 30 * 86400_000).toISOString(),
      state: 'open',
      created_at: new Date().toISOString(),
    };
    demo.data.elections.push(election);
    const names = [
      ['د. طارق عبد الرحمن المنشاوي', 'أستاذ الاقتصاد والإدارة العامة · رمز: الميزان ⚖️', '/candidates/c1.jpg', 'خطة شاملة للتحول الرقمي الحكومي، تمويل المشروعات الصغيرة للشباب، ورفع كفاءة منظومة الخدمات العامة في جميع المحافظات.'],
      ['المستشار كامل محمود الجندي', 'نائب رئيس محكمة النقض الأسبق · رمز: الصقر 🦅', '/candidates/c2.jpg', 'ترسيخ الحوكمة والشفافية المؤسسية، تسريع إجراءات التقاضي الرقمي، وحماية الحقوق الدستورية والرقابة الصارمة على المال العام.'],
      ['د. سلمى حسن الشافعي', 'خبيرة التكنولوجيا وتطوير التعليم الجامعي · رمز: الشمس ☀️', '/candidates/c3.jpg', 'تحديث المناهج التعليمية والبحث العلمي، إنشاء حاضنات تكنولوجية بالجامعات الإقليمية، وتوسيع مظلة الرعاية الصحية الذكية.'],
      ['م. عمرو نبيل السيوفي', 'استشاري البنية التحتية والطاقة المتجددة · رمز: النخلة 🌴', '/candidates/c4.jpg', 'التوسع في مشروعات الطاقة النظيفة والمدن الذكية، تطوير شبكات النقل والمواصلات، وتوفير فرص عمل هندسية وتقنية بالصعيد والدلتا.'],
    ];
    names.forEach((row, i) => {
      demo.data.candidates.push({
        id: i + 1, election_id: 1, name: row[0], slogan: row[1], photo_url: row[2], sort: i + 1,
        program: row[3],
      });
    });
    demo.save();
    demo.data.voter_roll = demo.data.voter_roll || [];
    const sec = require('./security');
    const aliHash = sec.identityFingerprint('31005292501518');
    if (!demo.data.voter_roll.some((r) => r.identity_hash === aliHash)) {
      demo.data.voter_roll.push({
        id: 1,
        identity_hash: aliHash,
        national_id_plain: '31005292501518',
        national_id_masked: '********1518',
        full_name: 'علي أحمد علي محمد',
        birth_date: '2010-05-29',
        governorate: 'أسيوط',
        gender: 'ذكر',
        address: 'ش الجمهورية — قسم أول أسيوط',
        card_image: '/cards/31005292501518.jpg',
        face_image: '/cards/31005292501518-face.jpg',
        face_hash: "0011000000000001000100000000000000000111110000000000111111100000000011111111011100001111111100110000111111110001000011111111000000111111111110000011111111111000000011111111000000001111111100000100011111100000010000111110000000000011111000000000001111100000|0000001111111111011111000010111111101111100011110111111111100110000001111110111010111111111111000100111111110001000011111110001100010111111000000001101111000000001000011000000000000000000000000000000000000000000000001100000000000000110000000000000011000000|1111111111111011111111111111111111111111111111111111111111111111111111111111111111111111101111110011110110001111001100000000011100000001100000000000000010000000000000000000000010000001011000001000001111100000110000000000000011000000000000001100000000000000|0000000000000000000000000000000000000000000000001000011111111111000001111111111100000111111111110000001111111111000000111111111100000011111111110000001111111111000000111111111100000011111111110000001111111111111111111111111111111111111111111111111111111111",
        status: 'eligible',
        source: 'official_id_db',
        imported_at: new Date().toISOString(),
      });
    }
    demo.save();
    console.log('[demo-db] تم إنشاء بيانات تجريبية: انتخابة واحدة + 4 مرشحين + بطاقة علي أحمد علي محمد');
  },

  _demo: demo,
};

/** تلخيص نداءات المزوّدين: العدد ومتوسط الزمن ونسبة النجاح لكل مزوّد */
function summarize(rows) {
  const by = new Map();
  for (const r of rows) {
    const k = r.provider || 'unknown';
    const cur = by.get(k) || { provider: k, calls: 0, ok: 0, total_ms: 0, timed: 0 };
    cur.calls++;
    if (r.ok) cur.ok++;
    if (Number.isFinite(Number(r.duration_ms))) { cur.total_ms += Number(r.duration_ms); cur.timed++; }
    by.set(k, cur);
  }
  return {
    table: true,
    calls: rows.length,
    by_provider: [...by.values()].map((v) => ({
      provider: v.provider, calls: v.calls,
      success_rate: v.calls ? Math.round((v.ok / v.calls) * 100) / 100 : null,
      avg_ms: v.timed ? Math.round(v.total_ms / v.timed) : null,
    })).sort((a, b) => b.calls - a.calls),
  };
}

module.exports = { db };
