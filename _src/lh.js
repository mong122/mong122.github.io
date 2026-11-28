// 🏠 청약·임대 공고 (11/27 LH · 11/28 청약홈 더함) — LH 분양·임대 공고 중 집(임대주택·분양주택·신혼희망·매입임대)만, 마감 순 · build.js 가 부름
module.exports = function lh({ fs, path, OUT, DATA, page, esc, dleft, md }) {
  // 11/28 사장님 "LH 말고 민간임대·공공임대 소식이 저기밖에 없어?" → 청약홈(한국부동산원) 분양·민간임대·공공지원 민간임대·무순위도 같은 쪽에
  const load = (k) => { const p = path.join(DATA, `pool-${k}.json`); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')).items || [] : []; };
  const lhs = load('lh').map((x) => ({ ...x, src: 'LH' }));
  const ahs = load('applyhome').map((x) => ({ ...x, src: '청약홈', upp: x.kind, start: x.notice || x.start, url: x.url || 'https://www.applyhome.co.kr' }));
  const all = [...lhs, ...ahs].filter((x) => x.end && dleft(x.end) >= 0);
  if (!all.length) { console.log('  🏠 청약·임대: 자료 없음'); return 0; }
  const SRCS = [...new Set(all.map((x) => x.src))];
  all.sort((a, b) => a.end.localeCompare(b.end));
  // 청약홈 = 주택 구분에 임대가 있으면 임대 (민간임대·공공지원민간임대), 나머지는 분양 (민영·국민·무순위·오피스텔·도시형) (11/28)
  const tab = (x) => { if (x.src === '청약홈') return /임대/.test(String(x.type || '')) ? '임대' : '분양'; const t = `${x.upp} ${x.type}`; return /토지|상가/.test(t) ? '토지·상가' : /신혼/.test(t) ? '신혼희망' : /임대/.test(t) ? '임대' : /분양|무순위|잔여|오피스텔|도시형|아파트/.test(t) ? '분양' : '임대'; }; // 11/28 사장님 "토지랑 상가도 넣어"
  const T = ['임대', '분양', '신혼희망', '토지·상가'].filter((t) => all.some((x) => tab(x) === t));
  const SH = { 경상남도: '경남', 경상북도: '경북', 전라남도: '전남', 전라북도: '전북', 충청남도: '충남', 충청북도: '충북', 경기도: '경기', 강원도: '강원' };
  const short = (r) => String(r || '').split(/\s+/).map((w) => SH[w] || w.replace(/특별자치시|특별자치도|통합특별시|특별시|광역시/g, '')).join(' ');
  const R = [...new Set(all.map((x) => short(x.region)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const K = [...new Set(all.map((x) => x.type || x.upp).filter(Boolean))].sort((a, b) => all.filter((x) => (x.type || x.upp) === b).length - all.filter((x) => (x.type || x.upp) === a).length);
  const dd = (d) => (d === 0 ? '오늘 마감' : `D-${d}`);
  const card = (x) => `<a class="card" data-src="${x.src}" data-t="${tab(x)}" data-k="${esc(x.type || x.upp)}" data-r="${esc(short(x.region))}" data-end="${x.end}" data-new="${x.start || ''}" data-q="${esc((x.title + ' ' + x.region + ' ' + (x.addr || '') + ' ' + (x.by || '')).toLowerCase())}" href="${esc(x.url)}" rel="nofollow noreferrer" target="_blank"><span class="org-name" style="white-space:normal;font-size:17px">${esc(x.title)}</span>
<span class="chips"><span class="c c-kind">${esc(x.type || x.upp)}</span><span class="c c-rg">${esc(short(x.region))}</span>${x.n ? `<span class="c">${x.n}세대</span>` : ''}</span>
<span class="when"><span>${x.start ? md(x.start) + ' 공고' : ''} · ${md(x.end)} 마감</span><b class="dday ${dleft(x.end) <= 3 ? 'soon' : dleft(x.end) <= 7 ? 'week' : ''}" style="white-space:nowrap">${dd(dleft(x.end))}</b></span><span class="foot"><span class="open">${x.src === 'LH' ? 'LH 청약플러스' : '청약홈'}</span><span class="go">공고 보기 →</span></span></a>`;
  fs.writeFileSync(path.join(OUT, 'lh.html'), page('청약·임대 공고 마감 순 — LH·청약홈', `
<h1>청약·임대 공고</h1>
<div class="srctabs"><button data-t="" class="on">전체 <small>${all.length}</small></button>${T.map((t) => `<button data-t="${t}">${t} <small>${all.filter((x) => tab(x) === t).length}</small></button>`).join('')}</div>
<div class="filters"><input id="lq" placeholder="지역·단지 이름 찾기" style="flex:1 1 220px">${SRCS.length > 1 ? `<select id="ls"><option value="">LH·청약홈</option>${SRCS.map((x) => `<option>${x}</option>`).join('')}</select>` : '<select id="ls" hidden><option value=""></option></select>'}<select id="lr"><option value="">모든 지역</option>${R.map((r) => `<option>${esc(r)}</option>`).join('')}</select><select id="lk"><option value="">모든 종류</option>${K.map((k) => `<option>${esc(k)}</option>`).join('')}</select></div>
<div class="sorts"><button data-s="end" class="on">마감 임박순</button><button data-s="new">새로 올라온 순</button><span class="reset" id="lreset">조건 초기화</span></div>
<p class="note">맞는 공고 <b id="lcnt">${all.length}</b>건</p>
<div class="grid" id="lhl">${all.map(card).join('')}</div><p class="note" id="lempty" hidden>맞는 공고가 없어요.</p>
<div class="box" style="white-space:normal;margin-top:18px"><b>공고 보는 법</b><div>· 임대 = 영구·국민·행복·매입임대·공공지원 민간임대처럼 보증금·월세를 내고 사는 집 · 분양 = 사서 들어가는 집 (아파트·오피스텔·무순위 포함) · 신혼희망 = 신혼부부·예비 신혼부부용 · 토지·상가 = 땅·상가를 사거나 빌리는 공고</div><div>· 소득·자산 기준과 무주택 조건은 공고마다 달라요. 공고문의 "신청 자격"을 꼭 먼저 보세요.</div></div>
<script>(()=>{let T='';const L=lhl,C=[...L.children];const go=()=>{const q=lq.value.trim().toLowerCase(),r=lr.value,k=lk.value,s=ls.value;let n=0;for(const c of C){const ok=(!s||c.dataset.src===s)&&(!T||c.dataset.t===T)&&(!r||c.dataset.r===r)&&(!k||c.dataset.k===k)&&(!q||c.dataset.q.includes(q));c.hidden=!ok;if(ok)n++}lcnt.textContent=n;lempty.hidden=n>0};
document.querySelectorAll('.srctabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.srctabs button').forEach(x=>x.classList.toggle('on',x===b));T=b.dataset.t;go()});
lq.oninput=go;lr.onchange=go;lk.onchange=go;ls.onchange=go;
const by={end:(a,b)=>a.dataset.end.localeCompare(b.dataset.end),new:(a,b)=>b.dataset.new.localeCompare(a.dataset.new)};
document.querySelectorAll('.sorts button').forEach(bt=>bt.onclick=()=>{document.querySelectorAll('.sorts button').forEach(x=>x.classList.toggle('on',x===bt));C.sort(by[bt.dataset.s]).forEach(c=>L.appendChild(c))});
lreset.onclick=()=>{lq.value='';lr.value='';lk.value='';ls.value='';document.querySelector('.srctabs button').click();document.querySelector('.sorts button').click()};})();</script>`, { on: 'lh', desc: `LH·청약홈 임대·분양 공고 ${all.length}건 마감 순 — 국민임대·행복주택·공공지원 민간임대·아파트 분양` }));
  console.log(`  🏠 청약·임대 공고 ${all.length} (LH ${lhs.length} · 청약홈 ${ahs.length})`);
  return all.length;
};
