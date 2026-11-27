#!/usr/bin/env node
// 🌐 우리 사이트 시안 (11/26 밤 헤드 — 사장님 "하고 싶은 것 다 해 봐", 계획 docs/head/site-plan.md)
//   node site/build.js   → site/out/ 에 정적 HTML (첫 화면 · 공고 목록 · 공고 한 쪽 · 기관 쪽)
//   재료 = 설치판 저장 칸 (data/p2 = MONG): apiPool:alio (잡알리오 공고 목록) + deskJobs (MONG 이 쓴 채용 글 → 알리오 초임·블로그 주소)
//   바닥층(기계)만 — 문장은 공고에 적힌 그대로, AI 없음 · 아직 어디에도 안 올림 (시안)
const fs = require('fs');
const path = require('path');
// 11/27: 자료는 data/ 폴더의 파일만 읽음 (PC = export.js 가 설치판 저장 칸에서 꺼내 둠 · 깃허브 = fetch.js 가 받음) → 같은 build.js 가 PC 와 깃허브에서 다 돎
const DATA = process.env.SITE_DATA || path.join(__dirname, 'data');
const OUT = process.env.SITE_OUT || path.join(__dirname, 'out');
let BUILD = Date.now().toString(36); // ↓ 아래 CSS 를 만든 뒤 CSS 내용으로 다시 정함 (11/27: 시각으로 하면 4시간마다 모든 쪽이 바뀐 것으로 올라가 저장소가 무거워짐) // CSS 새 판을 바로 받게 (11/27: 깃허브가 CSS 를 10분 묶어 둬 새 쪽 + 옛 모양이 섞여 보임)
const SITE_URL = (process.env.SITE_URL || 'https://mongnote.com').replace(/\/$/, ''); // 도메인 사면 SITE_URL 만 바꿈
const SITE = '몽 채용노트'; // 가칭 — 이름은 사장님이 정함

const rd = (f) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch (e) { return null; } };
const st = {};
for (const k of ['alio', 'gojobs', 'cleaneye', 'w24']) { const p = rd(`pool-${k}.json`); if (p) st['apiPool:' + k] = p; }
st.deskJobs = rd('blog-jobs.json') || []; // MONG 채용 글 (발행 주소·초임·글) — PC 의 export.js 가 내보냄
for (const j of st.deskJobs) if (j.draft) st['draft:' + j.id] = { text: j.draft };
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayMs = 864e5;
const dleft = (ymd) => Math.round((Date.parse(ymd + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / dayMs);
const WEEK = '일월화수목금토';
const md = (ymd) => { const d = new Date(ymd + 'T00:00:00Z'); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WEEK[d.getUTCDay()]})`; };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const slug = (s) => encodeURIComponent(String(s).replace(/\s+/g, '').replace(/[()（）]/g, '')).replace(/%/g, '');

// ── 자료 ──
const SRC = { alio: '공공기관', gojobs: '공무원·공무직', cleaneye: '지방 공기업', w24: '대기업·중견' };
const pool = (k) => ((st['apiPool:' + k] || {}).items || []).filter((x) => x.end && /^\d{4}-\d\d-\d\d$/.test(x.end) && dleft(x.end) >= 0);
const items = [
  ...pool('alio').map((x) => ({ ...x, src: 'alio', n: x.n || x.nope || 0 })),
  ...pool('gojobs').map((x) => ({ ...x, src: 'gojobs', start: x.start || x.posted || '', n: +x.nope || 0, url: x.url })),
  ...pool('cleaneye').map((x) => ({ ...x, src: 'cleaneye', n: +x.nope || 0, region: arr(x.region).map((r) => String(r).replace(/특별자치시|특별자치도|특별시|광역시|도$/g, '').replace(/^(충청|전라|경상)(남|북)$/, (m, a, b) => ({ 충청: '충', 전라: '전', 경상: '경' })[a] + b)) })),
  ...pool('w24').filter((x) => /대기업|중견|외국계/.test(x.se || '')).map((x) => ({ ...x, src: 'w24', n: +x.nope || 0, hire: arr(x.hire).flatMap((h) => String(h).split(/[|·,]/)).map((h) => h.trim()).filter(Boolean) })), // 공기업·공공기관은 잡알리오와 겹쳐서 뺌
]; // 인원 칸 = nope (11/27 하루: 많이 뽑는 순이 안 됨)
const blog = {}; // 공고 번호 → MONG 글
for (const j of st.deskJobs || []) {
  const h = j.hireItem;
  if (!h || !h.id) continue;
  blog[String(h.id)] = { url: j.published && j.published.url, title: j.published && j.published.title, entry: j.entry || null, draft: (st['draft:' + j.id] || {}).text || '' };
}
const entryBy = {}; // 기관 → 알리오 초임 (MONG 글을 쓸 때 받아 둔 것)
for (const [id, b] of Object.entries(blog)) if (b.entry && b.entry.total) { const it = items.find((x) => x.id === id); const inst = it ? it.inst : null; if (inst) entryBy[inst] = b.entry; }
for (const j of st.deskJobs || []) if (j.entry && j.entry.total && j.hireItem && j.hireItem.inst) entryBy[j.hireItem.inst] = entryBy[j.hireItem.inst] || j.entry;
// 💰 모든 기관 초임 = site/entry.js 가 받아 둔 것 (11/27) — MONG 글 때 받은 게 있으면 그게 먼저
const ENTRY_F = path.join(DATA, 'entry.json');
if (fs.existsSync(ENTRY_F)) for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(ENTRY_F, 'utf8')))) if (!v.none && !entryBy[k]) entryBy[k] = v;

const kindOf = (x) => { const h = arr(x.hire).join(' '); return /비정규/.test(h) ? '비정규직' : /무기계약/.test(h) ? '무기계약직' : /인턴/.test(h) ? '청년인턴' : /정규직/.test(h) ? '정규직' : h || '-'; };
const isDoctor = (x) => /의사\(|의사직|별정직 의사|전문의/.test(x.title) || (/전공의|레지던트|전임의|진료|(?:병원|의료원).*인턴|^\s*\S*\s*인턴 모집|치과 인턴/.test(`${x.inst} ${x.title}`) && /병원|의료원/.test(`${x.inst} ${x.title}`) && !/체험형|청년|행정|사무/.test(x.title));
// 고르기 칸 4가지로 묶기 (카드 글자는 그대로) — 기간제·계약직 등은 비정규직 (11/27 대기업·중견 고르기가 0건이던 것)
const kindGroup = (x) => { const k = kindOf(x); return /^(정규직|무기계약직|비정규직|청년인턴)$/.test(k) ? k : /기간제|계약직|시간제|파견|대체|촉탁|비상임/.test(k) ? '비정규직' : k; };
const isPermFresh = (x) => kindOf(x) === '정규직' && (x.se || '') === '신입' && !isDoctor(x) && !/박사|연구책임|연구위원|보훈|수련의|특별채용|경력/.test(x.title); // 11/27 의사 인턴·레지던트는 첫 화면에서 뺌
const regionOf = (x) => arr(x.region).join('·') || '-';
const man = (n) => `${Number(n).toLocaleString('ko-KR')}만 원`;
const mobileUrl = (id) => (/^\d+$/.test(String(id)) ? `https://job.alio.go.kr/mobile2021/recruit/recruitView.do?idx=${id}` : null);
const pcUrl = (id) => (/^\d+$/.test(String(id)) ? `https://job.alio.go.kr/recruitview.do?idx=${id}` : null);
const SRC_NAME = { alio: '잡알리오', gojobs: '나라일터', cleaneye: '클린아이', w24: '고용24' };
const origOf = (x) => (x.src === 'alio' ? pcUrl(x.id) : x.url || '');
const titleClean = (t) => String(t).replace(/^\s*\[[^\]]*\]\s*/, '').trim();


// 📝 MONG 글에서 우리가 만든 짜임만 (요약 상자 · 표 · 자주 묻는 질문) — 원문 복사가 아닌 "손이 간 내용" (11/26 하루 애드센스 조사)
const unmark = (t) => String(t).replace(/[【】〖〗〔〕]/g, '').trim();
function ours(draft) {
  if (!draft) return '';
  const out = [];
  for (const line of draft.split('\n')) {
    const box = line.match(/^\[상자\s*:\s*(.+)\]\s*$/);
    if (box) { const [h, ...rest] = box[1].split(' / '); out.push(`<div class="box" style="white-space:normal;margin:10px 0"><b>${esc(unmark(h).replace(/^[^\p{L}\p{N}]+/u, '').replace(/MONG N줄 요약|MONG \d+줄 요약/, '한눈에 요약'))}</b>${rest.map((r) => `<div>· ${esc(unmark(r).replace(/^✔\s*/, ''))}</div>`).join('')}</div>`); continue; }
    const tb = line.match(/^\[표\s*:\s*(.+)\]\s*$/);
    if (tb) {
      const rows = tb[1].split(' / ').map((r) => r.split(' | ').map(unmark)).filter((r) => !/^남은 날/.test(r[0]) && r.slice(1).some((c) => c && c !== '-'));
      if (/^항목$/.test(rows[0][0]) && /^내용$/.test(rows[0][1] || '')) continue; // 위 기본 표와 같은 "항목|내용" 표는 뺌 (11/27 제미나이 2: 같은 표 두 번)
      // 3칸 넘는 표 = 목록 (휴대폰에서 찌그러짐) · 첫 칸이 이름, 나머지는 "머리: 값"
      if (rows[0].length >= 3) { out.push(`<div class="box list" style="margin:10px 0"><ul>${rows.slice(1).map((r) => `<li><b>${esc(r[0])}</b>${r.slice(1).map((c, i) => (c && c !== '-' ? ` · ${esc(rows[0][i + 1])} ${esc(c)}` : '')).join('')}</li>`).join('')}</ul></div>`); continue; }
      out.push(`<table style="margin:10px 0"><tr>${rows[0].map((c) => `<th style="width:auto">${esc(c)}</th>`).join('')}</tr>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`); continue;
    }
  }
  const qa = [...draft.matchAll(/^Q\.\s*(.+)\n+A\.\s*([\s\S]+?)(?=\n\s*\n|\nQ\.|$)/gm)].slice(0, 5);
  if (qa.length) out.push(`<h2>자주 묻는 질문</h2>${qa.map((m) => `<div class="box" style="white-space:normal;margin:8px 0"><b>Q. ${esc(unmark(m[1]))}</b><div>${esc(unmark(m[2]).replace(/\n/g, ' '))}</div></div>`).join('')}`);
  return out.length ? `<h2>몽 채용노트 정리</h2><p class="lead">공고문을 하나하나 읽고 정리한 내용이에요.</p>${out.join('')}` : '';
}

// 📝 핵심 3줄 (site/notes.js — 하루가 공고 자료로) 
const NOTES_F = path.join(DATA, 'notes.json');
const NOTES = {}; // 11/27 사장님 "쓸모없어 빼버려" — 핵심 3줄 안 씀

// ── 껍데기 ──
const CSS = `
:root{--ink:#16202e;--sub:#5b6676;--line:#e6e9ee;--bg:#f6f7f9;--card:#fff;--accent:#1f4fd1;--accent-soft:#eaf0ff;--warn:#d1331f;--ok:#0f7b4b}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:960px;margin:0 auto;padding:0 18px}
header.top{background:var(--card);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
header.top .wrap{display:flex;align-items:center;gap:18px;height:58px}
.logo{font-weight:800;font-size:19px;letter-spacing:-.02em;white-space:nowrap}.logo b{color:var(--accent)}
nav{display:flex;overflow-x:auto;white-space:nowrap;scrollbar-width:none}nav a{font-size:15px;color:var(--sub);margin-right:14px}nav a:hover,nav a.on{color:var(--ink)}
h1{font-size:26px;letter-spacing:-.03em;margin:28px 0 6px}h2{font-size:19px;letter-spacing:-.02em;margin:34px 0 12px}
.lead{color:var(--sub);margin:0 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.card{position:relative;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 20px 16px;display:flex;flex-direction:column;transition:border-color .15s,box-shadow .15s}
.card .org-name{font-size:19px;font-weight:800;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card .org-name::after{content:"";position:absolute;inset:0;border-radius:16px}
.card .sub{font-size:14px;color:var(--sub);line-height:1.5;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.c{font-size:12.5px;font-weight:600;border-radius:7px;padding:4px 9px;background:#f1f3f6;color:#4b5563}
.c-kind{background:#e8efff;color:#1f4fd1}.c-se{background:#e7f7ee;color:#0f7b4b}.c-rg{background:#f3ecff;color:#6b3fc9}.c-big{background:#ffecec;color:#c62828}
a.c-more{position:relative;z-index:1;background:#fff7e6;color:#b45309;border:1px solid #f6d9a8}a.c-more:hover{background:#ffefcc}
.card .when{margin-top:auto;padding-top:16px;display:flex;justify-content:space-between;align-items:center;font-size:13.5px;color:var(--sub)}.card .when b{font-size:17px;color:var(--accent)}.card .when b.soon{color:var(--warn)}
.card .foot{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-size:13.5px}
.card .foot .pay{color:var(--ok);font-weight:700}.card .foot .open{color:var(--sub)}.card .foot .open::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#22a55a;margin-right:6px;vertical-align:1px}.card .foot .soon2{color:#b45309;font-weight:700}nav{max-width:100%;min-width:0}header.top .wrap{min-width:0}
.card .foot .go{color:var(--accent);font-weight:700}
.card:hover{border-color:#c9d3e3;box-shadow:0 4px 14px rgba(20,40,80,.06)}
.card .top{display:flex;justify-content:space-between;align-items:center;gap:8px}.card .org{font-size:13px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card .tt{font-weight:700;font-size:16px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:2.9em}.card .meta{height:1.5em;font-size:13.5px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card .meta b{color:var(--accent);font-weight:700}.card .pay{margin-top:auto;font-size:13.5px;font-weight:600;color:var(--ok)}.card .pay.none{color:#a3abb7;font-weight:400}
.tags{display:flex;flex-wrap:wrap;gap:6px}.tag{font-size:12.5px;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:2px 9px;color:var(--sub)}
.tag.k{background:var(--accent-soft);border-color:transparent;color:var(--accent);font-weight:600}
.dd{font-size:12.5px;font-weight:700;border-radius:6px;padding:2px 7px;background:#fff1ee;color:var(--warn)}.dd.far{background:var(--bg);color:var(--sub)}
.row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px}
.money{font-size:13px;color:var(--ok);font-weight:600}
.hero{background:linear-gradient(135deg,#1f4fd1,#3b6cf0);color:#fff;border-radius:18px;padding:26px 24px;margin-top:22px}
.hero h1{margin:0 0 6px;color:#fff}.hero p{margin:0;opacity:.9}
.stats{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}.stat{background:rgba(255,255,255,.14);border-radius:12px;padding:10px 14px;min-width:120px}.stat b{display:block;font-size:22px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
th,td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--line);font-size:15px;vertical-align:top}th{width:28%;color:var(--sub);font-weight:600;background:#fafbfc}
.box.list{white-space:normal}.box ul{margin:0;padding-left:18px}.box li{margin:3px 0}.box li.hd{list-style:none;margin:12px 0 4px -18px;font-weight:700}.box li.hd:first-child{margin-top:0}.box li.nt{list-style:none;margin-left:-18px;font-size:13.5px;color:var(--sub)}
.box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;white-space:pre-wrap;font-size:15px}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.btn{display:inline-block;border-radius:10px;padding:10px 16px;font-weight:700;font-size:15px;border:1px solid var(--line);background:var(--card)}.btn.p{background:var(--accent);color:#fff;border-color:var(--accent)}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.filters select,.filters input{font:inherit;font-size:14px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fff}
.sorts{display:flex;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;align-items:center;gap:4px;background:#eef2fb;border-radius:999px;padding:4px;width:max-content;max-width:100%;margin:4px 0 14px}.sorts button{flex:none;font:inherit;font-size:13.5px;font-weight:600;border:0;background:transparent;color:var(--sub);padding:7px 14px;border-radius:999px;cursor:pointer}.sorts button.on{background:var(--accent);color:#fff}.sorts .reset{font-size:13px;color:var(--sub);padding:0 10px;cursor:pointer;text-decoration:underline}
.herosearch{display:flex;gap:8px;margin-top:16px}.herosearch input{flex:1;font:inherit;font-size:15px;padding:11px 14px;border-radius:12px;border:0}.herosearch button{font:inherit;font-weight:700;padding:0 18px;border-radius:12px;border:0;background:#0f2f8f;color:#fff;cursor:pointer}
.rank th,.rank td{width:auto;padding:10px 12px;background:none}.rank tr:first-child th{background:#fafbfc}.rank td:first-child{width:44px;color:var(--sub);text-align:center}.rank .yr{display:block;font-size:12px;color:var(--sub)}
.rank.olist td:first-child{width:auto;text-align:left;color:inherit}.rank.olist th:not(:first-child),.rank.olist td:not(:first-child){width:1%;white-space:nowrap;text-align:right}
@media(max-width:600px){.rank .now{display:none}.rank .yr{display:none}}
.card .star.mini{position:absolute;top:14px;right:14px;z-index:2;border:0;background:none;font-size:20px;line-height:1;color:#c3c9d4;cursor:pointer;padding:4px}.card .star.mini.on{color:#f5a524}.card .org-name{padding-right:28px}
.btn.star{cursor:pointer;font:inherit;font-weight:700}.btn.star.on{background:#fff7e6;border-color:#f6d9a8;color:#b45309}
#savedCnt{color:var(--accent)}
.regionbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:18px 0 0}.regionbar span{font-size:13.5px;color:var(--sub);margin-right:4px}.regionbar a{font-size:13.5px;border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 11px}.regionbar a small{color:var(--sub)}
details.orig{margin:26px 0 0}details.orig summary{cursor:pointer;font-size:19px;font-weight:700;letter-spacing:-.02em;list-style:none}details.orig summary::-webkit-details-marker{display:none}details.orig summary::after{content:" ▾";color:var(--sub);font-size:15px}details.orig[open] summary::after{content:" ▴"}details.orig .box{margin-top:12px}
.floatgo{display:none}@media(max-width:600px){.floatgo{display:block;position:fixed;left:12px;right:12px;bottom:12px;z-index:9}.floatgo .btn{display:block;text-align:center;box-shadow:0 6px 20px rgba(20,40,80,.25)}body{padding-bottom:70px}}
.calc{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.calc label{display:flex;flex-direction:column;gap:6px;font-size:14px;color:var(--sub);font-weight:600}.inwrap{display:flex;align-items:center;gap:6px;color:var(--ink)}.calc input,.calc select{font:inherit;font-size:16px;padding:9px 11px;border:1px solid var(--line);border-radius:10px;width:100%;max-width:200px}
.result{margin-top:16px}.result .big{background:linear-gradient(135deg,#1f4fd1,#3b6cf0);color:#fff;border-radius:16px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px}.result .big b{font-size:26px}
.keynote{background:var(--accent-soft);border-radius:16px;padding:16px 18px;margin:14px 0}.keynote>b{display:block;margin-bottom:8px}.keynote div{margin:5px 0;font-size:15px}.keynote span{display:inline-block;min-width:74px;font-weight:700;color:var(--accent)}.keynote .note{margin:8px 0 0}@media(max-width:600px){.keynote span{display:block;min-width:0;font-size:13px}}
.srctabs{display:flex;gap:4px;border-bottom:2px solid var(--line);margin:6px 0 14px;overflow-x:auto;scrollbar-width:none}.srctabs button{flex:none;font:inherit;font-size:15px;font-weight:700;color:var(--sub);background:none;border:0;padding:10px 14px;margin-bottom:-2px;border-bottom:3px solid transparent;cursor:pointer}.srctabs button.on{color:var(--accent);border-bottom-color:var(--accent)}.srctabs small{color:#9aa3b1;font-weight:600}
article.guide{font-size:16.5px;line-height:1.8}article.guide h2{margin-top:30px}article.guide h3{font-size:17px;margin:20px 0 6px}article.guide p{margin:10px 0}.glist{padding-left:22px;margin:8px 0}.glist li{margin:4px 0}
.note{font-size:13px;color:var(--sub);margin-top:10px}
.ad{border:1px dashed #c8ced8;border-radius:12px;color:#9aa3b1;font-size:13px;text-align:center;padding:22px;margin:22px 0;background:#fbfbfc}
footer{margin:50px 0 30px;font-size:13px;color:var(--sub);border-top:1px solid var(--line);padding-top:18px}
.crumb{font-size:13px;color:var(--sub);margin-top:20px}.crumb a{text-decoration:underline}
@media(max-width:600px){h1{font-size:22px}header.top .wrap{height:auto;flex-direction:column;align-items:flex-start;gap:4px;padding:10px 18px}nav a{margin-right:14px;font-size:14px}th{width:34%}.hero{padding:22px 18px}.stat{min-width:0;flex:1 1 40%}}
`;
const page = (title, body, { depth = 0, on = '', desc = '', noindex = false } = {}) => {
  const up = '../'.repeat(depth);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | ${SITE}</title><meta name="description" content="${esc(desc || title)}"><meta name="naver-site-verification" content="df52554a05ebd239836020e9067fc5e6100e513e">${noindex ? '<meta name="robots" content="noindex,follow">' : ''}<link rel="stylesheet" href="${up}site.css?v=${BUILD}"><link rel="icon" href="${up}favicon.svg" type="image/svg+xml"><meta property="og:site_name" content="${SITE}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc || title)}"><meta property="og:image" content="${SITE_URL}/og.png"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"></head><body>
<header class="top"><div class="wrap"><a class="logo" href="${up}index.html">몽 <b>채용노트</b></a>
<nav><a href="${up}index.html" class="${on === 'home' ? 'on' : ''}">이번 주 마감</a><a href="${up}jobs.html" class="${on === 'jobs' ? 'on' : ''}">전체 공고</a><a href="${up}benefits.html" class="${on === 'benefits' ? 'on' : ''}">지원금 찾기</a><a href="${up}lh.html" class="${on === 'lh' ? 'on' : ''}">LH 집 공고</a>${fs.existsSync(path.join(DATA, 'pool-rates.json')) ? `<a href="${up}rates.html" class="${on === 'rates' ? 'on' : ''}">예적금 금리</a>` : ''}<a href="${up}guides.html" class="${on === 'guides' ? 'on' : ''}">가이드</a><a href="${up}orgs.html" class="${on === 'orgs' ? 'on' : ''}">기관 정보</a><a href="${up}calc.html" class="${on === 'calc' ? 'on' : ''}">실수령 계산기</a><a href="${up}saved.html" class="${on === 'saved' ? 'on' : ''}">찜한 공고 <b id="savedCnt"></b></a></nav></div></header>
<main class="wrap">${body}</main><script src="${up}site.js?v=${BUILD}"></script>
<footer class="wrap">공고 정보는 잡알리오(공공기관 채용정보시스템) 자료예요. 지원 전에 꼭 원문 공고를 확인하세요. · <a href="${up}about.html" style="text-decoration:underline">소개</a> · <a href="${up}privacy.html" style="text-decoration:underline">개인정보처리방침</a> · ${today} 기준</footer></body></html>`;
};
const regionShort = (x) => { const r = arr(x.region); return r.length > 1 ? `${r[0]} 외 ${r.length - 1}곳` : r[0] || (x.src === 'w24' ? '' : '지역 미정'); };
const titleShort = (x) => { let t = titleClean(x.title).replace(/^㈜\s*/, '').replace(/^\(주\)\s*/, ''); for (const k of [x.inst, x.inst.replace(/\(주\)|\(재\)/g, '').trim()]) if (k && t.startsWith(k)) { t = t.slice(k.length).replace(/^(\s|\(주\))+/, ''); break; } return t || titleClean(x.title); };
const ddTxt = (d) => (d > 400 ? '상시 채용' : d === 0 ? '오늘 마감' : `D-${d}`);
// 카드 = 늘 같은 다섯 줄 (11/27 사장님 "눈으로 보기에 일관성이 없어") — 기관·마감 / 제목 두 줄 / 고용·경력·인원·지역 한 줄 / 초봉 (없으면 회색 한 줄)
// 카드 v3 (11/27 사장님이 보여 준 채용 나침반 짜임 — 문구·색은 우리 것): 기관 이름(굵게) / 공고 제목 두 줄 / 색 딱지 / ── 바닥에 붙는 두 줄: 접수 기간·D-day · 초봉·자세히
//   딱지 줄만 늘었다 줄었다 하고, 날짜·아래 줄은 같은 줄 카드끼리 늘 같은 높이 (grid 가 카드 높이를 맞추고 margin-top:auto 로 바닥에 붙임)
const dot = (ymd) => String(ymd || '').replace(/-0?/g, '.').replace(/^(\d{4})\./, '$1.');
const payOk = (x) => /정규직|무기계약직/.test(kindOf(x)) && kindOf(x) !== '비정규직' && !isDoctor(x) && !/수련의|전공의|레지던트|인턴/.test(x.title);
const card = (x, up = '') => {
  const d = dleft(x.end);
  const e = payOk(x) ? entryBy[x.inst] : null;
  const before = x.start && dleft(x.start) > 0;
  const many = (orgs[x.inst] || []).length;
  const chips = [
    `<span class="c c-kind">${esc(kindOf(x))}</span>`,
    x.se ? `<span class="c ${x.src === 'alio' ? 'c-se' : ''}">${esc(x.se)}</span>` : '',
    regionShort(x) ? `<span class="c c-rg">${esc(regionShort(x))}</span>` : '',
    x.n >= 10 ? `<span class="c c-big">${x.n}명 채용</span>` : x.n ? `<span class="c">${x.n}명</span>` : '',
    many > 1 ? `<a class="c c-more" href="${up}org/${slug(x.inst)}.html">이 기관 공고 ${many}건 ›</a>` : '',
  ].join('');
  return `<div class="card" data-end="${x.end}" data-start="${x.start || ''}"><button class="star mini" type="button" data-id="${x.id}" data-t="${esc(titleShort(x))}" data-o="${esc(x.inst)}" data-end="${x.end}" aria-label="찜하기">☆</button><a class="org-name" href="${up}job/${x.id}.html">${esc(x.inst)}</a><div class="sub">${esc(titleShort(x))}</div><div class="chips">${chips}</div>
<div class="when"><span>${dot(x.start)} ~ ${dot(x.end)}</span><b class="dday ${d <= 3 ? 'soon' : ''}">${ddTxt(d)}</b></div>
<div class="foot"><span class="${e ? 'pay' : before ? 'soon2' : 'open'}">${e ? `신입 초임 약 ${man(e.total)}` : before ? `${md(x.start)} 접수 시작` : '접수 중'}</span><span class="go">자세히 보기 →</span></div></div>`;
};

// ── 쪽 만들기 ──
// 🗄 마감 공고 보관 (11/27): 전에 만든 archive.json 을 지우기 전에 읽어 둠 → 마감돼도 60일 동안 "마감된 공고" 쪽을 남김 (검색에서 온 사람이 없는 쪽을 안 만나게)
const ARCH_PREV = [path.join(OUT, 'archive.json'), path.join(__dirname, '..', 'archive.json'), path.join(DATA, 'archive.json')].find((f) => fs.existsSync(f));
const archive = ARCH_PREV ? (() => { try { return JSON.parse(fs.readFileSync(ARCH_PREV, 'utf8')); } catch (e) { return {}; } })() : {};
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'job'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'org'), { recursive: true });
BUILD = require('crypto').createHash('sha1').update(CSS + 'js3').digest('hex').slice(0, 8); // CSS·site.js 가 바뀔 때만 바뀜 (site.js 고치면 'js3' 숫자 올리기)
fs.writeFileSync(path.join(OUT, 'site.css'), CSS);
for (const f of ['favicon.svg', 'og.png']) if (fs.existsSync(path.join(__dirname, 'assets', f))) fs.copyFileSync(path.join(__dirname, 'assets', f), path.join(OUT, f)); // 🖼 탭 아이콘 · 공유 미리보기 그림
// ⭐ 찜하기 (11/27 제미나이 2 "출퇴근길에 폰으로 훑고 나중에 지원") — 이 기기 localStorage 만, 서버·로그인 없음
fs.writeFileSync(path.join(OUT, 'site.js'), `(()=>{const K='mongSaved';const get=()=>{try{return JSON.parse(localStorage.getItem(K)||'{}')}catch(e){return {}}};const put=v=>localStorage.setItem(K,JSON.stringify(v));
const base=(document.querySelector('link[rel=stylesheet]').getAttribute('href')||'').replace(/site\.css.*$/,'');
const dl=e=>{const d=Math.round((Date.parse(e+'T00:00:00+09:00')-Date.now())/864e5+0.5);return d<0?'마감':d===0?'오늘 마감':'D-'+d};
function paint(){const s=get();document.querySelectorAll('.star').forEach(b=>{const on=!!s[b.dataset.id];b.classList.toggle('on',on);b.textContent=b.classList.contains('mini')?(on?'★':'☆'):(on?'★ 찜함':'☆ 찜하기')});const c=document.getElementById('savedCnt');if(c){const n=Object.keys(s).length;c.textContent=n?n:''}
const box=document.getElementById('savedList');if(box){const v=Object.entries(s).sort((a,b)=>a[1].end.localeCompare(b[1].end));box.innerHTML=v.length?v.map(([id,x])=>'<a class="card" style="margin:10px 0" href="'+base+'job/'+id+'.html"><span class="org-name">'+x.o+'</span><span class="sub">'+x.t+'</span><span class="when"><span>'+x.end.replace(/-/g,'.')+' 마감</span><b>'+dl(x.end)+'</b></span></a>').join(''):'<p class="note">찜한 공고가 없어요.</p>'}}
document.addEventListener('click',e=>{const b=e.target.closest('.star');if(!b)return;e.preventDefault();e.stopPropagation();const s=get();if(s[b.dataset.id])delete s[b.dataset.id];else s[b.dataset.id]={t:b.dataset.t,o:b.dataset.o,end:b.dataset.end,at:Date.now()};put(s);paint()},true);paint();
const today=new Date(Date.now()+9*36e5).toISOString().slice(0,10),dd=e=>Math.round((Date.parse(e)-Date.parse(today))/864e5);document.querySelectorAll('.card[data-end]').forEach(c=>{const d=dd(c.dataset.end);if(d<0){c.hidden=true;return}const b=c.querySelector('.dday');if(b&&d<=400){b.textContent=d===0?'오늘 마감':'D-'+d;b.classList.toggle('soon',d<=3)}const st=c.dataset.start;const o=c.querySelector('.foot .open, .foot .soon2');if(o&&st){if(dd(st)>0){o.className='soon2';o.textContent=(+st.slice(5,7))+'월 '+(+st.slice(8,10))+'일 접수 시작'}else if(o.classList.contains('soon2')){o.className='open';o.textContent='접수 중'}}});})();`);

const byEnd = [...items].sort((a, b) => a.end.localeCompare(b.end));
const week = byEnd.filter((x) => dleft(x.end) <= 7);
const fresh = items.filter((x) => x.start && dleft(x.start) >= -1).sort((a, b) => b.start.localeCompare(a.start));
const pf = byEnd.filter(isPermFresh);
const uniqOrg = (l) => { const seen = new Set(); return l.filter((x) => !seen.has(x.inst) && seen.add(x.inst)); }; // 첫 화면 칸은 기관마다 하나
const orgs = {};
for (const x of items) (orgs[x.inst] = orgs[x.inst] || []).push(x);

const regionsTop = Object.entries(items.reduce((m, x) => { for (const r of arr(x.region)) m[r] = (m[r] || 0) + 1; return m; }, {})).sort((p, q) => q[1] - p[1]).slice(0, 12);
// 첫 화면
fs.writeFileSync(path.join(OUT, 'index.html'), page('공공기관 채용 이번 주 마감', `
<section class="hero"><h1>공공기관 채용, 마감 전에 한눈에</h1><p>공공기관·공무원·공무직 공고를 매일 모아 마감이 가까운 순으로 보여 드려요.</p>
<form class="herosearch" action="jobs.html"><input name="q" placeholder="기관 이름이나 직무로 찾기"><button>찾기</button></form>
<div class="stats"><div class="stat"><b>${items.length}건</b>지원할 수 있는 공고</div><div class="stat"><b>${week.length}건</b>7일 안 마감</div><div class="stat"><b>${pf.length}건</b>정규직 신입</div><div class="stat"><b>${fresh.length}건</b>새로 올라온 공고</div></div></section>
<div class="grid" style="margin-top:16px"><a class="card" href="benefits.html" style="min-height:0"><span class="org-name">정부 지원금 찾기</span><span class="sub">많이 찾는 지원금 3,000개를 분야·대상으로 · 매일 새로</span></a><a class="card" href="benefits.html#hidden" style="min-height:0"><span class="org-name">숨은 돈 찾기</span><span class="sub">안 찾아간 보험금·휴면예금·카드포인트·환급금 조회</span></a><a class="card" href="pay-rank.html" style="min-height:0"><span class="org-name">공공기관 초임 순위</span><span class="sub">지금 공고 낸 기관 신입 초임 높은 순</span></a></div>
<div class="regionbar"><span>지역으로 보기 <small>(여러 지역 공고는 지역마다 셈)</small></span>${regionsTop.map(([r, n]) => `<a href="jobs.html?r=${encodeURIComponent(r)}">${esc(r)} <small>${n}</small></a>`).join('')}</div>
<h2>마감 임박 (3일 안)</h2><div class="grid">${uniqOrg(byEnd.filter((x) => dleft(x.end) <= 3 && !isDoctor(x))).slice(0, 12).map((x) => card(x)).join('')}</div>
<h2>정규직 신입 모음</h2><p class="lead">신입만 뽑는 정규직 자리예요.</p><div class="grid">${uniqOrg(pf).slice(0, 12).map((x) => card(x)).join('')}</div>
<h2>어제·오늘 새로 올라온 공고</h2><div class="grid">${uniqOrg(fresh.filter((x) => !isDoctor(x))).slice(0, 12).map((x) => card(x)).join('')}</div>
<p style="margin-top:22px"><a class="btn p" href="jobs.html">전체 공고 ${items.length}건 보기</a></p>`, { on: 'home', desc: `공공기관 채용 이번 주 마감 공고 ${week.length}건, 정규직 신입 ${pf.length}건을 마감 순으로 정리했어요.` }));

// 전체 목록 (거르기는 화면 안에서)
const regions = [...new Set(items.flatMap((x) => arr(x.region)))].sort();
fs.writeFileSync(path.join(OUT, 'jobs.html'), page('공공기관 채용 전체 공고', `
<h1>전체 공고</h1>
<div class="srctabs"><button data-src="" class="on">전체 <small>${items.length}</small></button>${Object.entries(SRC).filter(([k]) => items.some((x) => x.src === k)).map(([k, v]) => `<button data-src="${k}">${v} <small>${items.filter((x) => x.src === k).length}</small></button>`).join('')}</div><p class="lead">공고 <b id="cnt">${items.length}</b>건</p>
<div class="filters"><input id="fq" placeholder="기관·직무 찾기" style="flex:1 1 220px"><select id="fr"><option value="">모든 지역</option>${regions.map((r) => `<option>${esc(r)}</option>`).join('')}</select>
<select id="fk"><option value="">모든 고용 형태</option><option>정규직</option><option>무기계약직</option><option>비정규직</option><option>청년인턴</option></select>
<select id="fs"><option value="">신입·경력 모두</option><option value="신입">신입 받는 곳</option></select>
<select id="fe"><option value="">학력 모두</option><option value="학력무관">학력 무관</option><option value="고졸">고졸 가능</option></select></div>
<div class="sorts"><button data-s="end" class="on">마감 임박순</button><button data-s="new">새로 올라온 순</button><button data-s="pay">초임 높은 순</button><button data-s="n">많이 뽑는 순</button><span class="reset" id="rs">조건 초기화</span></div>
<div class="grid" id="list">${byEnd.map((x) => card(x).replace('<div class="card"', `<div class="card" data-src="${x.src}" data-r="${esc(arr(x.region).join(' '))}" data-k="${esc(kindGroup(x))}" data-s="${esc(x.se || '')}" data-e="${esc(x.acbg || '')}" data-end="${x.end}" data-new="${x.start || ''}" data-pay="${payOk(x) ? (entryBy[x.inst] || {}).total || 0 : 0}" data-n="${x.n || 0}" data-q="${esc((x.inst + ' ' + x.title + ' ' + (x.ncs || '')).toLowerCase())}"`)).join('')}</div>
<p class="note" id="empty" hidden>맞는 공고가 없어요.</p>
<script>
const L=document.getElementById('list'),cards=[...L.children];
let SRCF='';document.querySelectorAll('.srctabs button').forEach(b=>b.onclick=()=>{SRCF=b.dataset.src;document.querySelectorAll('.srctabs button').forEach(x=>x.classList.toggle('on',x===b));f();});
const f=()=>{const r=fr.value,k=fk.value,s=fs.value,e=fe.value,q=fq.value.trim().toLowerCase();let n=0;for(const c of cards){const ok=(!SRCF||c.dataset.src===SRCF)&&(!r||c.dataset.r.includes(r))&&(!k||c.dataset.k===k)&&(!s||c.dataset.s.includes(s))&&(!e||(e==='고졸'?/무관|고졸|고등/.test(c.dataset.e):c.dataset.e.includes(e)))&&(!q||c.dataset.q.includes(q));c.hidden=!ok;if(ok)n++}cnt.textContent=n;empty.hidden=n>0;};
const by={end:(a,b)=>a.dataset.end.localeCompare(b.dataset.end),new:(a,b)=>b.dataset.new.localeCompare(a.dataset.new),pay:(a,b)=>b.dataset.pay-a.dataset.pay,n:(a,b)=>b.dataset.n-a.dataset.n};
document.querySelectorAll('.sorts button').forEach(bt=>bt.onclick=()=>{document.querySelectorAll('.sorts button').forEach(x=>x.classList.toggle('on',x===bt));cards.sort(by[bt.dataset.s]).forEach(c=>L.appendChild(c));});
[fr,fk,fs,fe].forEach(x=>x.onchange=f);fq.oninput=f;rs.onclick=()=>{[fr,fk,fs,fe].forEach(x=>x.value='');fq.value='';f();};
const qs=new URLSearchParams(location.search);if(qs.get('q'))fq.value=qs.get('q');if(qs.get('r'))fr.value=qs.get('r');if(qs.get('k'))fk.value=qs.get('k');if(qs.get('s')){const b=document.querySelector('.srctabs button[data-src="'+qs.get('s')+'"]');if(b){SRCF=qs.get('s');document.querySelectorAll('.srctabs button').forEach(x=>x.classList.toggle('on',x===b))}}f();
</script>`, { on: 'jobs' }));

// 🏢 기관 정보 글 (11/27 — 하루가 공식 자료로 쓴 기관 소개 · site/orgs/*.md)
const ORGW = require('./orgs.js')({ fs, path, esc, ROOT: __dirname });
const orgMore = (inst, up = '../') => (ORGW[inst] ? `<a class="card" href="${up}org/${slug(inst)}.html" style="min-height:0;margin:14px 0;background:var(--accent-soft);border-color:transparent"><span class="org-name" style="white-space:normal">${esc(inst)} 더 알아보기</span><span class="sub">${esc(ORGW[inst].desc || '전형 절차·필기시험·가산점·초임을 정리했어요')}</span><span class="foot"><span class="open">기관 정보</span><span class="go">읽기 →</span></span></a>` : '');

// 공고 한 쪽
for (const x of items) {
  const d = dleft(x.end);
  const b = blog[x.id];
  const e = entryBy[x.inst];
  const others = (orgs[x.inst] || []).filter((y) => y.id !== x.id);
  const eShow = payOk(x) ? e : null;
  const rows = [
    ['기관', `<a href="../org/${slug(x.inst)}.html" style="text-decoration:underline">${esc(x.inst)}</a>`],
    ['고용 형태', esc(arr(x.hire).join(', '))],
    [x.src === 'gojobs' ? '기관 구분' : '신입·경력', esc(x.se || '')],
    ['뽑는 인원', x.n ? `${x.n}명` : ''],
    ['근무 지역', esc(arr(x.region).join('·'))],
    ['학력', esc(x.acbg || '')],
    ['직무 분야', esc(String(x.ncs || '').replace(/\./g, '·'))],
    ['접수 기간', `${md(x.start)} ~ ${md(x.end)} <span class="dd ${d > 7 ? 'far' : ''}">${d === 0 ? '오늘 마감' : `D-${d}`}</span>`],
    ...(eShow ? [['신입 초임 (알리오 공시)', `약 ${man(e.total)} <span class="note">${esc(e.year || '')} 대졸·사무직 신입 기준 · 직무·직급마다 다를 수 있어요 · <a href="../calc.html?y=${e.total}" style="text-decoration:underline">실수령 계산</a></span>`]] : []),
  ];
  // 공고문 글을 읽기 좋게 (11/27 사장님 "글자 이상해") — 번호·□·ㅇ·- 기호 떼고 점 목록 · <소제목>은 굵게 · ※ 는 작은 주의 글
  const sec = (h, t) => {
    if (!t) return '';
    const ls = String(t).replace(/\r/g, '').split('\n').map((l) => l.trim()).filter((l) => l && !/자세한 사항은 채용공고문을 참조/.test(l));
    const html = ls.map((l) => {
      if (/^[<\[〈【].+[>\]〉】]$/.test(l)) return `<li class="hd">${esc(l.replace(/^[<\[〈【]\s*|\s*[>\]〉】]$/g, ''))}</li>`;
      if (/^[※*]/.test(l)) return `<li class="nt">${esc(l.replace(/^[※*]\s*/, ''))}</li>`;
      return `<li>${esc(l.replace(/^(?:\d{1,2}[.)]|[가-하][.)]|[①-⑳]|[□■ㅇ○●•·\-–→]|\(\d+\))\s*/, ''))}</li>`;
    }).join('');
    // 원문은 접기/펴기 (11/27 제미나이 2: 위에서 정리했는데 아래 원문이 길게) — 우리 정리가 없는 쪽은 펼친 채로
    return `<details class="orig"${b && b.draft ? '' : ' open'}><summary>${h} <span class="note">공고문 원문</span></summary><div class="box list"><ul>${html}</ul></div></details>`;
  };
  fs.writeFileSync(path.join(OUT, 'job', x.id + '.html'), page(`${x.inst} 채용 ${titleClean(x.title)}`, `
<div class="crumb"><a href="../index.html">처음</a> › <a href="../jobs.html">전체 공고</a> › ${esc(x.inst)}</div>
<h1>${esc(titleShort(x))}</h1><p class="lead">${esc(x.inst)} · ${esc(kindOf(x))}${x.n ? ` ${x.n}명` : ''} · ${md(x.end)} 마감</p>
${NOTES[x.id] ? `<div class="keynote"><b>핵심 3줄</b>${NOTES[x.id].lines.map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join('')}<p class="note">공고 자료를 읽고 정리했어요. 지원 전에 원문 공고를 꼭 확인하세요.</p></div>` : ''}
<table>${rows.filter(([, v]) => v).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>
<div class="btns"><a class="btn p" id="go-orig" href="${origOf(x)}" data-m="${mobileUrl(x.id) || origOf(x)}" rel="nofollow noreferrer" target="_blank">${SRC_NAME[x.src]}에서 원문 공고 보기</a>${x.url && x.src === 'alio' ? `<a class="btn" href="${esc(x.url)}" rel="nofollow noreferrer" target="_blank">기관 채용 사이트</a>` : ''}<button class="btn star" data-id="${x.id}" data-t="${esc(titleShort(x))}" data-o="${esc(x.inst)}" data-end="${x.end}" type="button">☆ 찜하기</button><a class="btn" download="${x.id}-마감.ics" href="data:text/calendar;charset=utf-8,${encodeURIComponent(['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//mong//jobs//KO','BEGIN:VEVENT',`UID:${x.id}@mongnote.com`,`DTSTART;VALUE=DATE:${x.end.replace(/-/g, '')}`,`SUMMARY:[마감] ${x.inst} ${titleShort(x).slice(0, 40)}`,`URL:${SITE_URL}/job/${x.id}.html`,'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:내일 마감','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n'))}">달력에 마감일 넣기</a></div>
${x.src === 'w24' ? '<p class="note">정보출처 고용24 · 본 자료는 고용노동부 고용24(www.work24.go.kr)에서 제공된 정보이며, 무단복제 및 배포를 금지합니다.</p>' : ''}
<div class="floatgo"><a class="btn p" id="go-float" href="${origOf(x)}" rel="nofollow noreferrer" target="_blank">원문 공고 보기 · ${ddTxt(d)}</a></div>
<script>if(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)){for(const a of [document.getElementById('go-orig'),document.getElementById('go-float')])a.href=document.getElementById('go-orig').dataset.m;}</script>
${b && b.url ? `<div class="box" style="background:var(--accent-soft);border-color:transparent;white-space:normal"><b>자세한 정리 글이 있어요</b><br>공고문을 하나하나 읽어 일정·자격·전형을 정리했어요. <a href="${esc(b.url)}" style="text-decoration:underline">${esc(b.title || '블로그 글 보기')}</a></div>` : ''}
${b && b.draft ? ours(b.draft) : ''}
${orgMore(x.inst)}
${sec('지원 자격', x.qual)}${sec('우대 사항', x.prefMore || x.pref)}
${sec('전형 절차', x.screen)}
${others.length ? `<h2>${esc(x.inst)}의 다른 공고</h2><div class="grid">${others.slice(0, 6).map((y) => card(y, '../')).join('')}</div>` : ''}`, { depth: 1, noindex: !((b && b.url) || NOTES[x.id]), desc: `${x.inst} ${kindOf(x)} ${x.n ? x.n + '명' : ''} 채용, ${md(x.end)} 마감. 지원 자격·전형 절차·초봉 정리.` }));
}

// 🗄 마감된 공고 쪽 (60일)
{
  const now = new Set(items.map((x) => String(x.id)));
  for (const x of items) archive[x.id] = { inst: x.inst, title: titleShort(x), end: x.end, src: x.src, url: x.src === 'alio' ? pcUrl(x.id) : x.url || '' };
  let kept = 0;
  for (const [id, a] of Object.entries(archive)) {
    if (now.has(id)) continue;
    if (!a.end || dleft(a.end) < -60) { delete archive[id]; continue; }
    const same = (orgs[a.inst] || []).slice(0, 6);
    fs.writeFileSync(path.join(OUT, 'job', id + '.html'), page(`${a.inst} 채용 (마감)`, `
<div class="crumb"><a href="../index.html">처음</a> › <a href="../jobs.html">전체 공고</a> › ${esc(a.inst)}</div>
<h1>${esc(a.title)}</h1><p class="lead">${esc(a.inst)} · <b style="color:var(--warn)">${md(a.end)} 마감된 공고예요</b></p>
<div class="keynote" style="background:#fff1ee"><b>이 공고는 접수가 끝났어요</b><div>같은 기관의 지금 받는 공고나 비슷한 공고를 아래에서 보세요.</div></div>
${same.length ? `<h2>${esc(a.inst)}에서 지금 받는 공고</h2><div class="grid">${same.map((y) => card(y, '../')).join('')}</div>` : ''}
<p class="btns"><a class="btn p" href="../jobs.html">지금 받는 공고 전체 보기</a>${a.url ? `<a class="btn" href="${esc(a.url)}" rel="nofollow noreferrer" target="_blank">원문 공고 (보관)</a>` : ''}</p>`, { depth: 1, noindex: true, desc: `${a.inst} 채용 공고 (마감)` }));
    kept++;
  }
  fs.writeFileSync(path.join(OUT, 'archive.json'), JSON.stringify(archive));
  console.log(`  🗄 마감된 공고 쪽 ${kept} (60일 보관)`);
}

// 기관 쪽 (11/27: 초임 내역 표 + 공공기관 초임 순위 몇 위 — 우리가 계산한 값)
const payRank = Object.entries(entryBy).filter(([k, v]) => v && v.total && (orgs[k] || []).length).sort((p, q) => q[1].total - p[1].total);
const rankOf = (inst) => { const i = payRank.findIndex(([k]) => k === inst); return i < 0 ? null : i + 1; };
for (const inst of new Set([...Object.keys(orgs), ...Object.keys(ORGW)])) {
  const list = orgs[inst] || [];
  const w = ORGW[inst];
  const e = entryBy[inst];
  const rk = rankOf(inst);
  const past = (st.deskJobs || []).filter((j) => j.hireItem && j.hireItem.inst === inst && j.published && j.published.url);
  const payBox = e ? `<h2>신입 초임 (알리오 경영공시)</h2><table><tr><th>${esc(e.year || '')} 합계</th><td><b>약 ${man(e.total)}</b>${rk ? ` <span class="note">· 이 사이트 공공기관 ${payRank.length}곳 가운데 ${rk}위 (<a href="../pay-rank.html" style="text-decoration:underline">순위 보기</a>)</span>` : ''}</td></tr>${arr(e.parts).map((p) => { const m = String(p).match(/^(.*?)\s+([\d,]+)만$/); return m ? `<tr><th>${esc(m[1])}</th><td>${m[2]}만 원</td></tr>` : ''; }).join('')}${e.budget ? `<tr><th>${esc(e.budgetYear)} (예산)</th><td>약 ${man(e.budget)}</td></tr>` : ''}</table><p class="note">대졸·사무직·무경력 신입 기준 공시예요. 뽑는 직무·직급에 따라 실제 급여는 다를 수 있어요. <a href="../calc.html?y=${e.total}" style="text-decoration:underline">이 초임으로 실수령 계산해 보기</a></p>` : '';
  fs.writeFileSync(path.join(OUT, 'org', slug(inst) + '.html'), page(w ? w.title : `${inst} 채용`, `
<div class="crumb"><a href="../index.html">처음</a> › <a href="../orgs.html">기관 정보</a> › ${esc(inst)}</div>
<h1>${esc(w ? w.title : inst + ' 채용')}</h1><p class="lead">${w ? esc(w.desc || '') + '<br>' : ''}지금 받는 공고 ${list.length}건${e ? ` · 신입 초임 약 ${man(e.total)}` : ''}</p>
${list.length ? `<p class="btns"><a class="btn p" href="#now">지금 받는 공고 ${list.length}건 보기</a></p>` : ''}
${w ? `<article class="guide">${w.html}</article><p class="note">${esc(w.date || '')} 정리 · 공식 자료를 읽고 정리했어요. 전형·과목은 공고마다 바뀔 수 있으니 지원할 공고문을 꼭 확인하세요.</p>` : ''}
${payBox}
<h2 id="now">지금 받는 공고</h2>${list.length ? `<div class="grid">${list.sort((p, q) => p.end.localeCompare(q.end)).map((y) => card(y, '../')).join('')}</div>` : `<p class="note">지금 받는 공고가 없어요. 새 공고가 올라오면 여기에 저절로 보여요.</p>`}
${past.length ? `<h2>몽 채용노트 정리 글</h2><div class="box" style="white-space:normal">${past.map((j) => `<div>· <a href="${esc(j.published.url)}" style="text-decoration:underline" rel="noreferrer" target="_blank">${esc(j.published.title)}</a></div>`).join('')}</div>` : ''}
${w && w.sources.length ? `<h2>출처</h2><div class="box" style="white-space:normal">${w.sources.map((u) => `<div>· <a href="${esc(u)}" rel="nofollow noreferrer" target="_blank" style="text-decoration:underline">${esc(u.replace(/^https?:\/\//, '').slice(0, 70))}</a></div>`).join('')}</div>` : ''}
<p class="btns"><a class="btn" href="../orgs.html">다른 기관 보기</a><a class="btn" href="../pay-rank.html">초임 순위</a>${e ? `<a class="btn" href="../calc.html?y=${e.total}">이 초임 실수령 계산</a>` : ''}</p>`, { depth: 1, noindex: !(w || past.length), desc: w ? w.desc : `${inst} 채용 공고 ${list.length}건 · 신입 초임 정리` }));
}

// 💰 공공기관 신입 초임 순위 (11/27 — 사이트 계획 "공공기관 초봉 순위", 우리가 모아 줄 세운 표 = 손이 간 내용)
fs.writeFileSync(path.join(OUT, 'pay-rank.html'), page('공공기관 신입 초임 순위', `<h1>공공기관 신입 초임 순위</h1><p class="lead">공공기관 ${payRank.length}곳 신입 초임 · 알리오 공시 ${esc((payRank[0] || [, {}])[1].year || '')} 기준</p>
<div class="box" style="white-space:normal;margin:12px 0"><b>초임 숫자 읽는 법</b><div>· 알리오 경영공시의 "신입사원 초임"이에요. 대학 졸업·사무직·군 미필·경력 없는 사람이 가장 낮은 직급으로 들어갈 때 1년 동안 받는 돈(세금 떼기 전)이에요.</div><div>· 기본급에 각종 수당과 성과급이 들어 있어요. 성과급은 기관 평가에 따라 해마다 달라져요.</div><div>· 기술직·연구직·의료직처럼 직무가 다르거나 경력이 있으면 실제 급여는 달라요. 지원할 공고의 보수 칸을 꼭 함께 보세요.</div><div>· 한 달에 실제로 얼마 받는지는 <a href="calc.html" style="text-decoration:underline">실수령 계산기</a>로 대략 볼 수 있어요.</div></div>
<div class="filters"><input id="pq" placeholder="기관 찾기" style="flex:1 1 220px"></div>
<table id="pt" class="rank"><tr><th>순위</th><th>기관</th><th>신입 초임</th><th class="now">지금 공고</th></tr>${payRank.map(([k, v], i) => `<tr data-q="${esc(k.toLowerCase())}"><td>${payRank.findIndex(([, w]) => w.total === v.total) + 1}</td><td><a href="org/${slug(k)}.html" style="text-decoration:underline">${esc(k)}</a> </td><td style="white-space:nowrap"><b>약 ${man(v.total)}</b></td><td class="now">${(orgs[k] || []).length ? `${orgs[k].length}건` : '-'}</td></tr>`).join('')}</table>
<p class="note">초임은 공시 기준이라 실제 급여와 다를 수 있어요. 지원 전 공고문의 보수를 꼭 확인하세요.</p>
<script>pq.oninput=()=>{const q=pq.value.trim().toLowerCase();for(const r of pt.querySelectorAll('tr[data-q]'))r.hidden=q&&!r.dataset.q.includes(q)}</script>`, { on: 'orgs', desc: `공공기관 ${payRank.length}곳 신입 초임 순위 — 알리오 경영공시 기준` }));

// 🏢 기관 정보 게시판 (11/27 — 메뉴 "초임 순위" 자리 · 정리한 기관 + 공고 낸 기관 전체)
{
  const W = Object.keys(ORGW).sort((a, b) => (orgs[b] || []).length - (orgs[a] || []).length);
  const all = Object.keys(orgs).sort((a, b) => orgs[b].length - orgs[a].length || a.localeCompare(b, 'ko'));
  const wCard = (k) => `<a class="card" href="org/${slug(k)}.html" style="min-height:0"><span class="org-name" style="white-space:normal">${esc(k)}</span><span class="sub">${esc(ORGW[k].desc || '')}</span><span class="foot"><span class="open">지금 공고 ${(orgs[k] || []).length}건${entryBy[k] ? ' · 초임 약 ' + man(entryBy[k].total) : ''}</span><span class="go">읽기 →</span></span></a>`;
  const row = (k) => `<tr data-q="${esc(k.toLowerCase())}"><td><a href="org/${slug(k)}.html" style="text-decoration:underline">${esc(k)}</a>${ORGW[k] ? ' <span class="note">정리 글</span>' : ''}</td><td>${orgs[k].length}건</td><td>${entryBy[k] ? '약 ' + man(entryBy[k].total) : '-'}</td></tr>`;
  fs.writeFileSync(path.join(OUT, 'orgs.html'), page('기관 정보 — 공공기관 채용 전형·필기·초임', `<h1>기관 정보</h1><p class="lead">기관마다 전형·필기·초임을 정리했어요.</p>
<p class="btns"><a class="btn p" href="pay-rank.html">공공기관 신입 초임 순위</a></p>
${W.length ? `<h2>정리한 기관</h2><div class="grid">${W.map(wCard).join('')}</div>` : ''}
<h2>공고 낸 기관 전체 (${all.length}곳)</h2><div class="filters"><input id="oq" placeholder="기관 찾기" style="flex:1 1 220px"></div>
<table id="ot" class="rank olist"><tr><th>기관</th><th>지금 공고</th><th>신입 초임</th></tr>${all.map(row).join('')}</table>
<script>oq.oninput=()=>{const q=oq.value.trim().toLowerCase();for(const r of ot.querySelectorAll('tr[data-q]'))r.hidden=q&&!r.dataset.q.includes(q)}</script>`, { on: 'orgs', desc: '공공기관 채용 전형·필기시험·신입 초임 정리와 기관별 지금 공고' }));
  console.log(`  🏢 기관 정보: 정리 글 ${W.length} · 공고 낸 기관 ${all.length}`);
}

fs.writeFileSync(path.join(OUT, 'saved.html'), page('찜한 공고', `<h1>찜한 공고</h1><p class="lead">이 기기에만 저장돼요.</p><div id="savedList"></div>`, { on: 'saved', noindex: true }));

// 개인정보처리방침 (11/26 하루 조사: 애드센스는 쿠키 안내 세 가지가 꼭 — support.google.com/adsense/answer/1348695)
fs.writeFileSync(path.join(OUT, 'privacy.html'), page('개인정보처리방침', `<h1>개인정보처리방침</h1><div class="box" style="white-space:normal">
<p>이 사이트는 회원 가입이 없고, 이름·연락처 같은 개인정보를 받지 않아요.</p>
<p><b>광고와 쿠키</b></p>
<p>· Google 을 포함한 제3자 광고 업체는 쿠키를 써서 이용자가 이 사이트나 다른 사이트를 방문한 기록을 바탕으로 광고를 보여 줄 수 있어요.</p>
<p>· Google 은 광고 쿠키를 써서 Google 과 파트너가 이 사이트와 인터넷의 다른 사이트 방문 기록을 바탕으로 광고를 게재할 수 있어요.</p>
<p>· 맞춤 광고는 <a href="https://adssettings.google.com" style="text-decoration:underline">Google 광고 설정</a>에서 끌 수 있어요.</p>
<p><b>방문 통계</b> — 사이트를 고치기 위해 방문 수·많이 본 쪽 같은 통계를 모을 수 있어요 (누구인지 알 수 있는 정보는 모으지 않아요).</p>
</div>`));

// 🧮 실수령 계산기 (11/27) — 화면 = site/assets/calc-body.html · 계산 = site/assets/calc.js · 소득세 표 = site/data/tax.json (국세청 간이세액표, 없으면 소득세는 "준비 중" — 지어내지 않음)
const TAX_F = path.join(DATA, 'tax.json');
const TAX = fs.existsSync(TAX_F) ? JSON.parse(fs.readFileSync(TAX_F, 'utf8')) : null;
fs.copyFileSync(path.join(__dirname, 'assets', 'calc.js'), path.join(OUT, 'calc.js'));
fs.writeFileSync(path.join(OUT, 'calc.html'), page('연봉 실수령액 계산기 (2026)', fs.readFileSync(path.join(__dirname, 'assets', 'calc-body.html'), 'utf8') + '<script>window.TAX=' + JSON.stringify(TAX) + ';</script><script src="calc.js?v=' + BUILD + '"></script>', { on: 'calc', noindex: !TAX, desc: '2026년 연봉 실수령액 계산기 — 4대 보험·소득세를 빼고 한 달에 받는 돈' }));

// 📘 가이드 글
require('./guides.js')({ fs, path, OUT, page, esc, ROOT: __dirname });

// 💹 예적금 금리
const RATES_N = require('./rates.js')({ fs, path, OUT, DATA, page, esc });

// 🏠 LH 집 공고
require('./lh.js')({ fs, path, OUT, DATA, page, esc, dleft, md });

// 🎁 지원금 허브
require('./benefits.js')({ fs, path, OUT, DATA, page, esc, today, BUILD });

// 소개 (11/27 — 하루 조사: 운영자 배경·출처를 밝히는 쪽 = 신뢰 신호)
fs.writeFileSync(path.join(OUT, 'about.html'), page('소개', `<h1>몽 채용노트는</h1><div class="box" style="white-space:normal">
<p>공공기관 채용 공고를 매일 모아 <b>마감 순·고용 형태·초봉</b>으로 한눈에 볼 수 있게 정리하는 곳이에요.</p>
<p><b>어디서 가져오나</b> — 공고는 잡알리오(공공기관 채용정보시스템), 신입 초임은 알리오 경영공시에서 가져와요. 매일 새로 받아 마감 지난 공고는 내려요.</p>
<p><b>몽 채용노트 정리</b> — 네이버 블로그 "MONG 생활노트"에서 공고문을 하나하나 읽고 일정·자격·전형을 정리한 공고는 그 정리를 함께 보여 드려요.</p>
<p><b>꼭 확인하세요</b> — 공고는 바뀔 수 있어요. 지원 전에 각 쪽의 "공고문 원문" 단추로 원문을 확인해 주세요.</p>
<p><b>블로그</b> — <a href="https://blog.naver.com/eleode123" style="text-decoration:underline">MONG 생활노트</a></p></div>`, { desc: '공공기관 채용 공고를 매일 모아 마감 순으로 정리하는 몽 채용노트 소개' }));
fs.writeFileSync(path.join(OUT, '404.html'), page('없는 쪽', `<h1>찾는 쪽이 없어요</h1><p class="lead">마감이 지나 내려간 공고일 수 있어요.</p><p><a class="btn p" href="/index.html">이번 주 마감 공고 보기</a></p>`, { noindex: true }));

// 🔎 검색 엔진용 (sitemap = 검색에 보일 쪽만 · noindex 쪽은 뺌) · SITE_URL = 올릴 주소 (도메인 사면 바꿈)
const BASE = (process.env.SITE_URL || 'https://mongnote.com').replace(/\/$/, '');
const indexable = [];
for (const rel of ['index.html', 'jobs.html', 'about.html', 'calc.html', 'pay-rank.html', 'orgs.html', 'benefits.html', 'guides.html', 'lh.html', 'rates.html', ...(fs.existsSync(path.join(OUT, 'guide')) ? fs.readdirSync(path.join(OUT, 'guide')).map((f) => 'guide/' + f) : []), ...fs.readdirSync(path.join(OUT, 'job')).map((f) => 'job/' + f), ...fs.readdirSync(path.join(OUT, 'org')).map((f) => 'org/' + f)]) {
  if (!fs.existsSync(path.join(OUT, rel))) continue;
  const h = fs.readFileSync(path.join(OUT, rel), 'utf8');
  if (!/name="robots" content="noindex/.test(h)) indexable.push(rel);
}
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((r) => `<url><loc>${BASE}/${r === 'index.html' ? '' : r}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`  검색에 보일 쪽 ${indexable.length} (sitemap) · 주소 ${BASE}`);

console.log(`✔ ${OUT} — 공고 ${items.length}쪽 · 기관 ${Object.keys(orgs).length}쪽 · 7일 안 마감 ${week.length} · 정규직 신입 ${pf.length} · MONG 글 이어진 공고 ${items.filter((x) => blog[x.id] && blog[x.id].url).length}`);
