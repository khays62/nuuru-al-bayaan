// Simple smoke script to preview and execute a mid-year promotion for a single student
// Usage: node backend/tests/smoke_promote.mjs <studentId>

const studentId = process.argv[2] || '6905a9ecbca4bcf2594e07c7';
const base = 'http://localhost:7000/api';

async function http(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, ok: res.ok, data: json };
}

(async () => {
  console.log(`[PROMO] Preview mid-year for ${studentId}`);
  const prev = await http('GET', `${base}/promotions/preview?timing=mid-year&studentIds=${studentId}`);
  console.log('Preview status:', prev.status);
  console.log('Preview data:', JSON.stringify(prev.data, null, 2));

  if (!prev.ok) {
    console.error('Preview failed; aborting');
    process.exit(1);
  }

  console.log(`[PROMO] Execute mid-year for ${studentId}`);
  const exec = await http('POST', `${base}/promotions/execute`, { timing: 'mid-year', studentIds: [studentId] });
  console.log('Execute status:', exec.status);
  console.log('Execute data:', JSON.stringify(exec.data, null, 2));

  console.log('[PROMO] Fetch transfers after execute');
  const transfers = await http('GET', `${base}/students/${studentId}/transfers?limit=10`);
  console.log('Transfers status:', transfers.status);
  console.log('Transfers data:', JSON.stringify(transfers.data, null, 2));
})();
