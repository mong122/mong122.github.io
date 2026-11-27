// 🏠 LH 집 공고 (11/27) — LH 분양·임대 공고 중 집(임대주택·분양주택·신혼희망·매입임대)만, 마감 순 · build.js 가 부름
module.exports = function lh({ fs, path, OUT, DATA, page, esc, dleft, md }) {
  const f = path.join(DATA, 'pool-lh.json');
  if (!fs.existsSync(f)) { console.log('  🏠 LH: 자료 없음'); return 0; }
  const all = (JSON.parse(fs.readFileSync(f, 'utf8')).items || []).filter((x) => x.end && dleft(x.end) >= 0 && !/토지|상가/.test(`${x.upp} ${x.type}`));
  all.sort((a, b) => a.end.localeCompare(b.end));
  const tab = (x) => (/신혼/.test(`${x.upp} ${x.type}`) ? '신혼희망' : /분양/.test(`${x.upp} ${x.type}`) ? '분양' : '임대');
  const T = ['임대', '분양', '신혼희망'].filter((t) => all.some((x) => tab(x) === t));
  const short = (r) => String(r || '').replace(/특별자치시|특별자치도|특별시|광역시/g, '').replace(/도$/, '');
  const dd = (d) => (d === 0 ? '오늘 마감' : `D-${d}`);
  const card = (x) => `<a class="card" data-t="${tab(x)}" data-end="${x.end}" href="${esc(x.url)}" rel="nofollow noreferrer" target="_blank"><span class="org-name" style="white-space:normal;font-size:17px">${esc(x.title)}</span>
<span class="chips"><span class="c c-kind">${esc(x.type || x.upp)}</span><span class="c c-rg">${esc(short(x.region))}</span></span>
<span class="when"><span>${x.start ? md(x.start) + ' 공고' : ''} · ${md(x.end)} 마감</span><b class="dday ${dleft(x.end) <= 3 ? 'soon' : ''}">${dd(dleft(x.end))}</b></span><span class="foot"><span class="open">LH 청약플러스</span><span class="go">공고 보기 →</span></span></a>`;
  fs.writeFileSync(path.join(OUT, 'lh.html'), page('LH 임대·분양 공고 마감 순', `
<h1>LH 집 공고</h1><p class="lead">LH(한국토지주택공사)가 지금 받는 임대·분양 공고 ${all.length}건을 마감이 가까운 순으로 모았어요. 누르면 LH 청약플러스 공고로 가요.</p>
<div class="srctabs"><button data-t="" class="on">전체 <small>${all.length}</small></button>${T.map((t) => `<button data-t="${t}">${t} <small>${all.filter((x) => tab(x) === t).length}</small></button>`).join('')}</div>
<div class="grid" id="lhl">${all.map(card).join('')}</div>
<div class="box" style="white-space:normal;margin-top:18px"><b>공고 보는 법</b><div>· 임대 = 영구·국민·행복·통합공공·매입임대처럼 보증금·월세를 내고 사는 집 · 분양 = 사서 들어가는 집 · 신혼희망 = 신혼부부·예비 신혼부부용</div><div>· 소득·자산 기준과 무주택 조건은 공고마다 달라요. 공고문의 "신청 자격"을 꼭 먼저 보세요.</div></div>
<p class="note">LH 공공데이터를 깃허브가 4시간마다 새로 받아요. 토지·상가 공고는 뺐어요.</p>
<script>document.querySelectorAll('.srctabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.srctabs button').forEach(x=>x.classList.toggle('on',x===b));for(const c of lhl.children)c.hidden=!!b.dataset.t&&c.dataset.t!==b.dataset.t});</script>`, { on: 'lh', desc: `LH 임대·분양 공고 ${all.length}건 마감 순 — 국민임대·행복주택·매입임대·신혼희망` }));
  console.log(`  🏠 LH 집 공고 ${all.length}`);
  return all.length;
};
