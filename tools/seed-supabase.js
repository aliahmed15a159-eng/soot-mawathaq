'use strict';
/**
 * تعبئة Supabase ببيانات محاكاة لانتخابات اتحاد طلاب المدارس.
 * يحافظ على أي استحقاق أو مرشحين مخصّصين، ولا يعيد تسمية مرشحين لهم أصوات مسجّلة.
 * التشغيل: node tools/seed-supabase.js
 */
const { config } = require('../lib/config');
const {
  DEMO_SCHOOL_ELECTION,
  DEFAULT_STUDENT_CANDIDATES,
  LEGACY_STUDENT_CANDIDATE_NAMES,
  LEGACY_SCHOOL_ELECTION_TITLES,
} = require('../lib/default-candidates');

if (config.databaseMode !== 'supabase') {
  console.error('✗ مفاتيح Supabase غير مضبوطة في .env — لا شيء لتنفيذه.');
  process.exit(1);
}

const H = {
  apikey: config.supabaseKey,
  Authorization: `Bearer ${config.supabaseKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function api(method, resource, body, query = '') {
  const res = await fetch(`${config.supabaseUrl}/rest/v1/${resource}${query}`, {
    method, headers: H, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${resource}: ${res.status} ${(data && data.message) || ''}`);
  return data;
}

function candidateRow(candidate, electionId) {
  return {
    ...(electionId ? { election_id: electionId } : {}),
    name: candidate.name,
    slogan: candidate.slogan,
    program: candidate.program,
    photo_url: candidate.photo_url,
    sort: candidate.sort,
  };
}

(async () => {
  console.log('→ التحقق من جداول Supabase…');
  await api('GET', 'elections', null, '?select=id&limit=1');

  const elections = await api('GET', 'elections', null, '?select=*&order=id.asc') || [];
  let election = elections.find((row) => row.title === DEMO_SCHOOL_ELECTION.title) || null;

  if (!election) {
    const previousDemo = elections.find((row) => LEGACY_SCHOOL_ELECTION_TITLES.includes(row.title));
    if (previousDemo) {
      const ballots = await api('GET', 'ballots', null, `?election_id=eq.${previousDemo.id}&select=id&limit=1`) || [];
      if (!ballots.length) {
        const patched = await api('PATCH', 'elections', {
          ...DEMO_SCHOOL_ELECTION,
        }, `?id=eq.${previousDemo.id}`);
        election = patched && patched[0] ? patched[0] : { ...previousDemo, ...DEMO_SCHOOL_ELECTION };
        console.log('✓ حُدّث استحقاق المحاكاة القديم إلى انتخابات اتحاد طلاب المدارس');
      }
    }
  }

  if (!election) {
    const created = await api('POST', 'elections', [{
      ...DEMO_SCHOOL_ELECTION,
      state: 'open',
    }]);
    election = created && created[0];
    if (!election) throw new Error('تعذّر إنشاء استحقاق انتخابات المدارس.');
    console.log('✓ أُنشئ استحقاق انتخابات اتحاد طلاب المدارس');
  }

  const existing = await api(
    'GET',
    'candidates',
    null,
    `?election_id=eq.${election.id}&select=*&order=sort.asc`,
  ) || [];
  const ballots = await api('GET', 'ballots', null, `?election_id=eq.${election.id}&select=id&limit=1`) || [];
  const currentNames = new Set(DEFAULT_STUDENT_CANDIDATES.map((candidate) => candidate.name));
  const isKnownDemoList = existing.every((candidate) => (
    LEGACY_STUDENT_CANDIDATE_NAMES.has(String(candidate.name || '').trim()) || currentNames.has(candidate.name)
  ));

  if (!existing.length) {
    await api('POST', 'candidates', DEFAULT_STUDENT_CANDIDATES.map((candidate) => candidateRow(candidate, election.id)));
    console.log('✓ أُضيفت بيانات 4 مرشحين افتراضيين');
  } else if (!ballots.length && isKnownDemoList) {
    const usedSorts = new Set();
    await Promise.all(existing.map((row, index) => {
      const sort = Number(row.sort) || index + 1;
      const replacement = DEFAULT_STUDENT_CANDIDATES.find((candidate) => candidate.sort === sort);
      if (!replacement) return Promise.resolve();
      usedSorts.add(replacement.sort);
      return api('PATCH', 'candidates', candidateRow(replacement), `?id=eq.${row.id}`);
    }));
    const missing = DEFAULT_STUDENT_CANDIDATES
      .filter((candidate) => !usedSorts.has(candidate.sort))
      .map((candidate) => candidateRow(candidate, election.id));
    if (missing.length) await api('POST', 'candidates', missing);
    console.log('✓ حُدّثت بيانات المرشحين الافتراضيين');
  } else if (ballots.length) {
    console.log('ℹ توجد أصوات مسجّلة؛ لم تُغيّر بيانات مرشحي هذا الاستحقاق حفاظًا على النتائج.');
  } else {
    console.log(`ℹ يوجد ${existing.length} مرشح مخصّص؛ تم الحفاظ على القائمة كما هي.`);
  }

  console.log('\nتم ✓ — الاستحقاق تجريبي، وأسماء وبرامج المرشحين افتراضية.');
})().catch((error) => {
  console.error(`✗ فشل تجهيز بيانات الانتخابات: ${error.message}`);
  process.exitCode = 1;
});
