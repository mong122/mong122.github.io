// 🧮 계산기 셋 (11/28 사장님 "응 그거 만들어서 추가") — 퇴직금 · 실업급여 · 청약 가점 · build.js 가 부름
//   숫자 출처: 실업급여 = 고용노동부 2026 보도자료·정부24 (site/guides/unemployment-benefit.md 에서 대조한 것)
//              퇴직금 = 근로자퇴직급여 보장법 제4조·제8조·근로기준법 제2조 + 고용노동부 계산기 (상여·연차 3/12) · 청약 가점 = 주택공급에 관한 규칙 별표1 (2026.11.24 개정, 가점표 그대로) — 하루가 원문으로 확인 docs/head/research/계산기 기준 (하루 11-28).md
//   화면 글자는 짧게 (R56) — 속 이야기 X
module.exports = function calcs({ fs, path, OUT, page }) {
  const TABS = [['calc.html', '실수령'], ['severance.html', '퇴직금'], ['unemployment.html', '실업급여'], ['cheongyak.html', '청약 가점']];
  const tabs = (on) => `<div class="srctabs">${TABS.map(([f, n]) => `<a href="${f}" style="flex:none;font-size:15px;font-weight:700;padding:10px 14px;margin-bottom:-2px;border-bottom:3px solid ${f === on ? 'var(--accent)' : 'transparent'};color:${f === on ? 'var(--accent)' : 'var(--sub)'}">${n}</a>`).join('')}</div>`;
  const W = `const $=(i)=>document.getElementById(i),won=(v)=>Math.round(v).toLocaleString('ko-KR')+'원',num=(i)=>+String($(i).value).replace(/[^\\d.]/g,'')||0;`;

  // ── 퇴직금 ──
  fs.writeFileSync(path.join(OUT, 'severance.html'), page('퇴직금 계산기 (2026)', `${tabs('severance.html')}
<h1>퇴직금 계산기</h1>
<div class="box" style="white-space:normal"><div class="calc">
<label>입사일<span class="inwrap"><input id="s1" type="date" value="2022-03-02"></span></label>
<label>마지막 근무일<span class="inwrap"><input id="s2" type="date" value="2026-11-30"></span></label>
<label>월급 (세전, 최근 3개월 평균)<span class="inwrap"><input id="s3" inputmode="numeric" value="300"> 만 원</span></label>
<label>1년 상여금 합계<span class="inwrap"><input id="s4" inputmode="numeric" value="0"> 만 원</span></label>
<label>1년 연차수당<span class="inwrap"><input id="s5" inputmode="numeric" value="0"> 만 원</span></label>
</div></div>
<div class="result"><div class="big"><span>퇴직금 (세전, 대략)</span><b id="sOut">-</b></div><table id="sT"></table></div>
<div class="box" style="white-space:normal;margin-top:16px"><b>어떻게 계산하나요</b>
<div>· 퇴직금 = 1일 평균임금 × 30일 × (재직 일수 ÷ 365)</div>
<div>· 1일 평균임금 = 퇴직 전 3개월 임금 총액 ÷ 그 3개월 일수 · 1년 상여금과 연차수당은 3/12 만큼 더해요.</div>
<div>· 1년 이상 계속 일하고, 4주 평균 주 15시간 이상 일했을 때 받아요.</div>
<div>· 퇴직소득세는 빼지 않은 금액이에요. 평균임금이 통상임금보다 적으면 통상임금으로 계산해요.</div><div>· 3개월 안에 육아휴직·출산휴가 같은 빠지는 기간이 있으면 실제 금액과 달라요.</div></div>
<p class="btns"><a class="btn" href="calc.html">연봉 실수령 계산</a><a class="btn" href="unemployment.html">실업급여 계산</a></p>
<script>(()=>{${W}
function run(){const a=new Date($('s1').value+'T00:00:00'),last=new Date($('s2').value+'T00:00:00');if(isNaN(a)||isNaN(last)||last<a){$('sOut').textContent='날짜를 확인해 주세요';$('sT').innerHTML='';return}
const out=new Date(last);out.setDate(out.getDate()+1);const days=Math.round((out-a)/864e5);
const b=new Date(out);b.setMonth(b.getMonth()-3);const d3=Math.round((out-b)/864e5);
const pay3=num('s3')*1e4*3+num('s4')*1e4*3/12+num('s5')*1e4*3/12,avg=pay3/d3;
if(days<365){$('sOut').textContent='1년이 안 돼 퇴직금이 없어요';$('sT').innerHTML='<tr><th>재직 일수</th><td>'+days.toLocaleString()+'일</td></tr>';return}
const sev=avg*30*days/365;$('sOut').textContent=won(sev);
$('sT').innerHTML='<tr><th>재직 일수</th><td>'+days.toLocaleString()+'일 (약 '+(days/365).toFixed(1)+'년)</td></tr><tr><th>3개월 임금 총액</th><td>'+won(pay3)+' ÷ '+d3+'일</td></tr><tr><th>1일 평균임금</th><td>'+won(avg)+'</td></tr>'}
['s1','s2','s3','s4','s5'].forEach(i=>$(i).addEventListener('input',run));run()})();</script>`, { on: 'calc', desc: '입사일·퇴사일·월급으로 퇴직금을 계산해요. 1일 평균임금 × 30일 × 재직 일수 ÷ 365.' }));

  // ── 실업급여 (2026: 하루 상한 68,100원 · 하한 = 최저임금 10,320원 × 80% × 소정근로시간) ──
  fs.writeFileSync(path.join(OUT, 'unemployment.html'), page('실업급여 계산기 (2026)', `${tabs('unemployment.html')}
<h1>실업급여 계산기 <span class="note">2026년 기준</span></h1>
<div class="box" style="white-space:normal"><div class="calc">
<label>월급 (세전, 퇴직 전 3개월 평균)<span class="inwrap"><input id="u1" inputmode="numeric" value="250"> 만 원</span></label>
<label>하루 일하는 시간<span class="inwrap"><select id="u2"><option>8</option><option>7</option><option>6</option><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select> 시간</span></label>
<label>퇴직할 때 나이<span class="inwrap"><select id="u3"><option value="0">50세 미만</option><option value="1">50세 이상·장애인</option></select></span></label>
<label>고용보험 가입 기간<span class="inwrap"><select id="u4"><option value="0">1년 미만</option><option value="1" selected>1년 이상 3년 미만</option><option value="2">3년 이상 5년 미만</option><option value="3">5년 이상 10년 미만</option><option value="4">10년 이상</option></select></span></label>
</div></div>
<div class="result"><div class="big"><span>모두 받는 돈 (대략)</span><b id="uOut">-</b></div><table id="uT"></table></div>
<div class="box" style="white-space:normal;margin-top:16px"><b>어떻게 계산하나요</b>
<div>· 하루 받는 돈 = 퇴직 전 3개월 1일 평균임금의 60%</div>
<div>· 2026년 하루 상한 68,100원 · 하한 = 최저임금 10,320원의 80% × 하루 일하는 시간 (8시간이면 66,048원)</div>
<div>· 받는 날 수 = 퇴직할 때 나이와 고용보험 가입 기간으로 120~270일</div>
<div>· 비자발적으로 그만두고, 퇴직 전 18개월 동안 고용보험 가입 180일 이상이어야 받아요.</div></div>
<p class="btns"><a class="btn" href="guide/unemployment-benefit.html">실업급여 신청 방법</a><a class="btn" href="severance.html">퇴직금 계산</a></p>
<script>(()=>{${W}
const DAYS=[[120,150,180,210,240],[120,180,210,240,270]],HI=68100,MIN=10320;
function run(){const m=num('u1')*1e4,h=+$('u2').value,age=+$('u3').value,per=+$('u4').value;if(m<=0){$('uOut').textContent='월급을 넣어 주세요';$('uT').innerHTML='';return}
const avg=m*3/91,raw=avg*0.6,lo=Math.floor(MIN*0.8*h),day=Math.min(HI,Math.max(lo,raw)),n=DAYS[age][per];
$('uOut').textContent=won(Math.floor(day)*n);
$('uT').innerHTML='<tr><th>1일 평균임금</th><td>'+won(avg)+'</td></tr><tr><th>하루 받는 돈</th><td>'+won(Math.floor(day))+(raw>HI?' (상한)':raw<lo?' (하한)':'')+'</td></tr><tr><th>받는 날 수</th><td>'+n+'일</td></tr><tr><th>한 달(30일)로 치면</th><td>'+won(Math.floor(day)*30)+'</td></tr>'}
['u1','u2','u3','u4'].forEach(i=>$(i).addEventListener('input',run));run()})();</script>`, { on: 'calc', desc: '2026년 실업급여 하루 상한 68,100원·하한 66,048원 기준으로 하루 받는 돈과 받는 날 수, 모두 받는 돈을 계산해요.' }));

  // ── 청약 가점 (84점) ──
  const opt = (a) => a.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  const NOHOME = [[0, '해당 없음 (집 있음·30세 미만 미혼)'], ...Array.from({ length: 16 }, (_, i) => [Math.min(32, (i + 1) * 2), i === 0 ? '1년 미만' : i === 15 ? '15년 이상' : `${i}년 이상 ${i + 1}년 미만`])];
  const FAM = Array.from({ length: 7 }, (_, i) => [5 + i * 5, i === 6 ? '6명 이상' : `${i}명`]);
  const BANK = [[1, '6개월 미만'], [2, '6개월 이상 1년 미만'], ...Array.from({ length: 15 }, (_, i) => [Math.min(17, i + 3), i === 14 ? '15년 이상' : `${i + 1}년 이상 ${i + 2}년 미만`])];
  fs.writeFileSync(path.join(OUT, 'cheongyak.html'), page('청약 가점 계산기 (84점)', `${tabs('cheongyak.html')}
<h1>청약 가점 계산기</h1>
<div class="box" style="white-space:normal"><div class="calc">
<label>무주택 기간<span class="inwrap"><select id="c1">${opt(NOHOME)}</select></span></label>
<label>부양가족 (본인 빼고)<span class="inwrap"><select id="c2">${opt(FAM)}</select></span></label>
<label>청약통장 가입 기간<span class="inwrap"><select id="c3">${opt(BANK)}</select></span></label>
<label>배우자 청약통장 가입 기간<span class="inwrap"><select id="c4"><option value="0">없음</option><option value="1">1년 미만</option><option value="2">1년 이상 2년 미만</option><option value="3">2년 이상</option></select></span></label>
</div></div>
<div class="result"><div class="big"><span>청약 가점</span><b id="cOut">-</b></div><table id="cT"></table></div>
<div class="box" style="white-space:normal;margin-top:16px"><b>어떻게 계산하나요</b>
<div>· 무주택 기간 32점 + 부양가족 35점 + 청약통장 가입 기간 17점 = 84점 만점</div>
<div>· 무주택 기간은 만 30세부터 셈해요. 그 전에 혼인했으면 혼인신고일부터예요.</div>
<div>· 배우자 통장은 가입 기간의 절반을 같은 표에 넣은 점수를 더해요 (최대 3점, 통장 점수는 17점을 넘지 않아요).</div>
<div>· 공고마다 자격·순위 조건이 달라요. 신청 전 공고문을 꼭 보세요.</div></div>
<p class="btns"><a class="btn p" href="lh.html">청약·임대 공고 보기</a></p>
<script>(()=>{${W}
function run(){const a=+$('c1').value,b=+$('c2').value,s=+$('c4').value,sp=s,c=Math.min(17,+$('c3').value+sp);
$('cOut').textContent=(a+b+c)+'점 / 84점';
$('cT').innerHTML='<tr><th>무주택 기간</th><td>'+a+'점 / 32점</td></tr><tr><th>부양가족</th><td>'+b+'점 / 35점</td></tr><tr><th>청약통장 가입 기간</th><td>'+c+'점 / 17점'+(sp?(+$('c3').value+sp>17?' (배우자 합산 · 17점 상한)':' (배우자 '+sp+'점 포함)'):'')+'</td></tr>'}
['c1','c2','c3','c4'].forEach(i=>$(i).addEventListener('input',run));run()})();</script>`, { on: 'calc', desc: '무주택 기간·부양가족·청약통장 가입 기간으로 청약 가점(84점 만점)을 계산해요. 배우자 통장 가입 기간 50% 합산 포함.' }));
  console.log('  🧮 계산기 셋 (퇴직금 · 실업급여 · 청약 가점)');
  return TABS;
};
