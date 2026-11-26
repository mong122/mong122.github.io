// 🧮 실수령 계산 (11/27) — 4대 보험 2026 근로자 몫 · 소득세는 window.TAX (국세청 간이세액표, 없으면 빼지 않고 "준비 중")
(() => {
  const $ = (id) => document.getElementById(id);
  const TAX = window.TAX || null; // { name, rows: [[하한천원, 상한천원, [가족1..11 세액원]]], over: 표 위(천만 원 넘는) 구간 계산 함수 이름 }
  const fl10 = (v) => Math.floor(Math.round(v) / 10) * 10; // 11/27 하루: 2,800,000×0.009 = 25,199.99… 로 10원 덜 나오던 것
  const won = (v) => Math.round(v).toLocaleString('ko-KR') + '원';
  const num = (el) => +String(el.value).replace(/[^\d.]/g, '') || 0;
  function incomeTax(base, fam, kids) {
    if (!TAX) return null;
    const k = base / 1000;
    const f = Math.min(Math.max(fam, 1), 11);
    let t = null;
    const r = TAX.rows.find((x) => k >= x[0] && k < x[1]);
    if (r) t = r[2][f - 1];
    else if (k < TAX.rows[0][0]) t = 0;
    else if (typeof window.TAX_OVER === 'function') t = window.TAX_OVER(base, f);
    if (t == null) return null;
    if (typeof window.TAX_KIDS === 'function') t = Math.max(0, t - window.TAX_KIDS(kids));
    return t;
  }
  function run() {
    const y = num($('cy')) * 1e4, nt = num($('cn')) * 1e4, fam = +$('cf').value, kids = +$('ck').value;
    if (y <= 0) { $('rNet').textContent = '연봉을 넣어 주세요'; $('rT').innerHTML = ''; $('rNote').textContent = ''; return; }
    const m = y / 12, base = Math.max(0, m - nt);
    const july = new Date() >= new Date('2026-07-01T00:00:00+09:00');
    const lo = july ? 410000 : 400000, hi = july ? 6590000 : 6370000;
    const np = fl10(Math.min(Math.max(base, lo), hi) * 0.0475);
    const hi1 = fl10(base * 0.03595), lt = fl10(hi1 * 0.1314), ei = fl10(base * 0.009);
    const it = incomeTax(base, fam, kids), lit = it == null ? null : fl10(it * 0.1);
    const ded = np + hi1 + lt + ei + (it || 0) + (lit || 0);
    $('rNet').textContent = won(m - ded);
    const rows = [['월급 (연봉 ÷ 12)', m], ['국민연금 4.75%', -np], ['건강보험 3.595%', -hi1], ['장기요양 (건보료 × 13.14%)', -lt], ['고용보험 0.9%', -ei], ['소득세 (간이세액표)', it == null ? null : -it], ['지방소득세 (소득세 × 10%)', lit == null ? null : -lit]];
    $('rT').innerHTML = rows.map(([k, v]) => `<tr><th>${k}</th><td>${v == null ? '국세청 표 준비 중' : (v < 0 ? '− ' : '') + won(Math.abs(v))}</td></tr>`).join('');
    $('rNote').textContent = TAX ? `소득세는 ${TAX.name} 기준이에요.` : '소득세는 국세청 간이세액표를 넣는 중이라 아직 빼지 않았어요. 실제로 받는 돈은 이보다 조금 적어요.';
  }
  const q = new URLSearchParams(location.search);
  if (q.get('y')) $('cy').value = q.get('y');
  for (const id of ['cy', 'cn', 'cf', 'ck']) { $(id).oninput = run; $(id).onchange = run; }
  run();
})();
