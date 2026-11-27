// 💹 예적금 금리 비교 (11/27) — 금감원 금융상품 한눈에 (깃허브가 FINLIFE_KEY 로 받음) · build.js 가 부름
module.exports = function rates({ fs, path, OUT, DATA, page, esc }) {
  const f = path.join(DATA, 'pool-rates.json');
  if (!fs.existsSync(f)) { console.log('  💹 금리: 자료 없음 (깃허브 Secrets 에 FINLIFE_KEY 를 넣으면 생김)'); return 0; }
  const all = (JSON.parse(fs.readFileSync(f, 'utf8')).items || []).filter((x) => x.opts && x.opts.length);
  const month = all.map((x) => x.month).sort().pop() || '';
  const data = all.map((x) => [x.kind, x.grp, x.bank, x.name, x.way, x.cond, x.opts.map((o) => [o.trm, o.rate, o.rate2, o.type, o.rsrv])]);
  fs.writeFileSync(path.join(OUT, 'rates.html'), page('예금·적금 금리 비교 (은행·저축은행)', `
<h1>예금·적금 금리 비교</h1><p class="lead">은행·저축은행 예금 ${all.filter((x) => x.kind === '예금').length}개, 적금 ${all.filter((x) => x.kind === '적금').length}개 · 금감원 공시 기준${month ? ` (${month.slice(0, 4)}년 ${+month.slice(4)}월 공시)` : ''}</p>
<div class="srctabs" id="rk"><button data-k="예금" class="on">정기예금</button><button data-k="적금">적금</button></div>
<div class="filters"><select id="rt"><option value="6">6개월</option><option value="12" selected>12개월</option><option value="24">24개월</option><option value="36">36개월</option></select>
<select id="rg"><option value="">은행·저축은행 모두</option><option>은행</option><option>저축은행</option></select>
<select id="rs"><option value="2">최고 금리(우대 포함) 높은 순</option><option value="1">기본 금리 높은 순</option></select><input id="rq" placeholder="은행·상품 이름" style="flex:1 1 160px"></div>
<table class="rank" id="rtab"></table>
<div class="box" style="white-space:normal;margin-top:16px"><b>금리 읽는 법</b><div>· 기본 금리 = 조건 없이 받는 금리 · 최고 금리 = 우대 조건(급여 이체·카드 실적 등)을 다 채웠을 때 금리예요. 우대 조건은 상품마다 달라요.</div><div>· 적금은 매달 넣는 돈에만 이자가 붙어서, 같은 금리라도 예금보다 실제 이자가 적어요.</div><div>· 1인당 예금자 보호는 금융회사마다 원금과 이자를 합쳐 1억 원까지예요(2025년 9월부터).</div></div>
<p class="note">가입 전 은행에서 금리·조건을 꼭 확인하세요.</p>
<script>const D=${JSON.stringify(data)};let K='예금';const e=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const draw=()=>{const t=+rt.value,g=rg.value,s=+rs.value,q=rq.value.trim();const L=[];for(const x of D){if(x[0]!==K||(g&&x[1]!==g)||(q&&!(x[2]+x[3]).includes(q)))continue;const o=x[6].filter(o=>o[0]===t).sort((a,b)=>b[s]-a[s])[0];if(o)L.push([x,o])}L.sort((a,b)=>b[1][s]-a[1][s]||b[1][1]-a[1][1]);
rtab.innerHTML='<tr><th>순위</th><th>상품</th><th>기본</th><th>최고</th></tr>'+(L.length?L.slice(0,80).map(([x,o],i)=>'<tr><td>'+(i+1)+'</td><td><b>'+e(x[3])+'</b><span class="yr" style="display:block">'+e(x[2])+' · '+e(x[1])+(o[4]?' · '+e(o[4]):'')+' · '+e(o[3])+'</span><span class="note" style="display:block">'+e((x[5]||'').slice(0,90))+'</span></td><td>'+o[1].toFixed(2)+'%</td><td><b style="color:var(--ok)">'+o[2].toFixed(2)+'%</b></td></tr>').join(''):'<tr><td colspan="4">맞는 상품이 없어요</td></tr>')};
document.querySelectorAll('#rk button').forEach(b=>b.onclick=()=>{K=b.dataset.k;document.querySelectorAll('#rk button').forEach(x=>x.classList.toggle('on',x===b));draw()});[rt,rg,rs].forEach(x=>x.onchange=draw);rq.oninput=draw;draw();</script>`, { on: 'rates', desc: '은행·저축은행 정기예금·적금 금리를 기간별로 높은 순 비교 — 금감원 공시 기준' }));
  console.log(`  💹 금리: 예금·적금 ${all.length}`);
  return all.length;
};
