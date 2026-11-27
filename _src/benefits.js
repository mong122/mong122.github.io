// 🎁 지원금 허브 (11/27 — ddolbestory "지원금 검색기"를 보고 우리 식으로: 그쪽은 손 관리 목록, 우리는 정부24 보조금24 창구를 깃허브가 4시간마다 받음)
//   build.js 가 부름: require('./benefits.js')(ctx) → benefits.html (찾기·거르기, 검색에 보임) + benefits-data.json (많이 찾는 3,000개) + benefit/<id>.html (위 600개, noindex — 정부24 글 그대로라)
module.exports = function benefits({ fs, path, OUT, DATA, page, esc, today, BUILD }) {
  const f = path.join(DATA, 'pool-gov24.json');
  if (!fs.existsSync(f)) { console.log('  🎁 지원금: 자료 없음 (깃허브가 받으면 생김)'); return 0; }
  const all = (JSON.parse(fs.readFileSync(f, 'utf8')).items || []).filter((x) => /개인|가구|소상공인/.test(x.user));
  all.sort((a, b) => b.views - a.views);
  const top = all.slice(0, 3000);
  const PAGES = 600;
  const users = (u) => String(u || '').split('||').filter((x) => x !== '법인/시설/단체');
  const fields = [...new Set(top.map((x) => x.field).filter(Boolean))];
  const types = [...new Set(top.map((x) => x.type).filter(Boolean))].slice(0, 12);
  const views = (n) => (n >= 10000 ? `${Math.round(n / 10000).toLocaleString('ko-KR')}만` : n.toLocaleString('ko-KR'));
  // 목록 자료 (짧게)
  fs.writeFileSync(path.join(OUT, 'benefits-data.json'), JSON.stringify(top.map((x, i) => [x.id, x.name, x.sum, x.org, x.field, x.type, users(x.user).join('·'), x.views, x.when, i < PAGES ? 1 : 0, x.url])));
  // 상세 쪽 (위 600개)
  fs.mkdirSync(path.join(OUT, 'benefit'), { recursive: true });
  const box = (h, t) => (t ? `<h2>${h}</h2><div class="box" style="white-space:normal">${esc(t).replace(/\s*(○|□|ㅇ|※|-\s)/g, '<br>$1').replace(/^<br>/, '')}</div>` : '');
  top.slice(0, PAGES).forEach((x, i) => {
    fs.writeFileSync(path.join(OUT, 'benefit', x.id + '.html'), page(`${x.name} 신청`, `
<div class="crumb"><a href="../index.html">처음</a> › <a href="../benefits.html">지원금 찾기</a> › ${esc(x.field)}</div>
<h1>${esc(x.name)}</h1><p class="lead">${esc(x.org)} · ${esc(x.field)} · ${esc(x.type)} · 정부24 조회 ${views(x.views)}회 (많이 찾는 ${i + 1}위)</p>
<div class="keynote" style="background:#fff7e6"><b>한 줄 요약</b><div>${esc(x.sum)}</div></div>
<table>${[['대상', users(x.user).join(', ')], ['신청 기한', x.when], ['신청 방법', String(x.how || '').replace(/\|\|/g, ', ')], ['담당', x.org], ['정보 바뀐 날', x.upd]].filter(([, v]) => v).map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>
<div class="btns"><a class="btn p" href="${esc(x.url)}" rel="nofollow noreferrer" target="_blank">정부24에서 자세히 보고 신청하기</a></div>
${box('누가 받나요', x.who)}${box('무엇을 받나요', x.what)}
<p class="note">정부24(보조금24) 공개 정보를 옮긴 것이라 글자 수가 잘려 있을 수 있어요. 신청 전에 정부24 원문을 꼭 확인하세요.</p>`, { depth: 1, noindex: true, desc: `${x.name} — ${x.sum}` }));
  });
  // 숨은 돈 찾기 바로가기 (공식 누리집만 · 11/27 주소 열리는지 확인)
  const HIDDEN = [
    ['숨은 보험금', '내가 가입한 보험의 안 찾아간 보험금·만기금', 'https://cont.insure.or.kr', '내보험찾아줌'],
    ['휴면 예금', '오래 안 쓴 은행 계좌에 남은 돈', 'https://www.sleepmoney.or.kr', '휴면계좌 통합조회'],
    ['카드 포인트', '카드사마다 흩어진 포인트를 한 번에 현금으로', 'https://www.cardpoint.or.kr', '카드포인트 통합조회'],
    ['잠든 계좌', '내 이름 계좌 전부 조회·작은 잔액 옮기기', 'https://www.payinfo.or.kr', '계좌정보통합관리'],
    ['통신비 미환급금', '해지한 통신사에 남은 돈', 'https://www.smartchoice.or.kr/smc/', '스마트초이스'],
    ['국세 환급금', '더 낸 세금 돌려받기', 'https://www.hometax.go.kr', '홈택스'],
    ['지방세 환급금', '자동차세·재산세 등 더 낸 지방세', 'https://www.wetax.go.kr', '위택스'],
    ['건강보험 환급금', '본인부담상한제·더 낸 보험료', 'https://www.nhis.or.kr', '국민건강보험공단'],
  ];
  fs.writeFileSync(path.join(OUT, 'benefits.html'), page('정부 지원금 찾기', `
<section class="hero" style="background:linear-gradient(135deg,#0f7b4b,#22a06b)"><h1>정부 지원금, 많이 찾는 것부터</h1><p>정부24 보조금24에 올라온 지원금 가운데 사람들이 많이 찾아본 ${top.length.toLocaleString('ko-KR')}개를 모았어요. 분야·대상으로 고르고 이름으로 찾아보세요.</p>
<form class="herosearch" onsubmit="event.preventDefault();bq.value=this.q.value;go()"><input name="q" placeholder="지원금 이름이나 낱말로 찾기"><button>찾기</button></form></section>
<h2>숨은 돈 찾기 바로가기</h2><p class="lead">이름만 넣으면 조회되는 공식 누리집이에요. 몰라서 안 찾아간 돈이 있는지 한 번씩 확인해 보세요.</p>
<div class="grid">${HIDDEN.map(([t, d, u, s]) => `<a class="card" href="${u}" rel="nofollow noreferrer" target="_blank"><span class="org-name">${t}</span><span class="sub">${d}</span><span class="foot"><span class="open">${s}</span><span class="go">바로가기 →</span></span></a>`).join('')}</div>
<h2>지원금 찾기</h2>
<div class="srctabs" id="ftabs"><button data-f="" class="on">전체</button>${fields.map((x) => `<button data-f="${esc(x)}">${esc(x)}</button>`).join('')}</div>
<div class="filters"><input id="bq" placeholder="이름·내용으로 찾기" style="flex:1 1 220px"><select id="bu"><option value="">모든 대상</option><option>개인</option><option>가구</option><option>소상공인</option></select><select id="bt"><option value="">모든 지원 방식</option>${types.map((x) => `<option>${esc(x)}</option>`).join('')}</select></div>
<p class="note" id="bcnt"></p><div class="grid" id="blist"></div><p style="text-align:center;margin:18px 0"><button class="btn" id="bmore" type="button">더 보기</button></p>
<p class="note">정부24(보조금24) 공개 자료를 깃허브가 4시간마다 새로 받아요 (${today} 기준). 금액·기한은 바뀔 수 있으니 신청 전 정부24에서 꼭 확인하세요.</p>
<script>(async()=>{const D=await (await fetch('benefits-data.json?v=${BUILD}')).json();let F='',N=30,L=[];const V=n=>n>=1e4?Math.round(n/1e4).toLocaleString('ko-KR')+'만':n.toLocaleString('ko-KR');
const e=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const card=x=>'<a class="card" href="'+(x[9]?'benefit/'+x[0]+'.html':e(x[10]))+'"'+(x[9]?'':' target="_blank" rel="nofollow noreferrer"')+'><span class="org-name">'+e(x[1])+'</span><span class="sub">'+e(x[2])+'</span><span class="chips"><span class="c c-kind">'+e(x[4])+'</span><span class="c c-se">'+e(x[6])+'</span><span class="c">'+e(x[5])+'</span></span><span class="when"><span>'+e(x[3])+'</span><b style="font-size:13px;color:var(--sub)">조회 '+V(x[7])+'</b></span><span class="foot"><span class="open">'+e((x[8]||'').slice(0,24)||'기한 확인')+'</span><span class="go">자세히 →</span></span></a>';
window.go=()=>{const q=bq.value.trim().toLowerCase(),u=bu.value,t=bt.value;L=D.filter(x=>(!F||x[4]===F)&&(!u||x[6].includes(u))&&(!t||x[5]===t)&&(!q||(x[1]+' '+x[2]+' '+x[3]).toLowerCase().includes(q)));N=30;draw()};
const draw=()=>{blist.innerHTML=L.slice(0,N).map(card).join('');bcnt.textContent='맞는 지원금 '+L.length.toLocaleString('ko-KR')+'개 · 많이 찾는 순';bmore.hidden=N>=L.length};
bmore.onclick=()=>{N+=30;draw()};document.querySelectorAll('#ftabs button').forEach(b=>b.onclick=()=>{F=b.dataset.f;document.querySelectorAll('#ftabs button').forEach(x=>x.classList.toggle('on',x===b));go()});
bq.oninput=go;bu.onchange=go;bt.onchange=go;const qs=new URLSearchParams(location.search);if(qs.get('q'))bq.value=qs.get('q');go()})()</script>`, { on: 'benefits', desc: `정부 지원금 ${top.length}개를 많이 찾는 순으로 — 분야·대상별로 찾고 숨은 돈(보험금·휴면예금·카드포인트·환급금) 조회 바로가기` }));
  console.log(`  🎁 지원금: 목록 ${top.length} · 쪽 ${Math.min(PAGES, top.length)} (전체 ${all.length})`);
  return top.length;
};
