#!/usr/bin/env node
// 📡 공고 받기 — 깃허브 자동 작업(4시간마다)이 혼자 돌리는 판 (11/27 — 설치판 apis.js·w24api.js 와 같은 칸으로)
//   node fetch.js   → data/pool-alio.json · pool-gojobs.json · pool-cleaneye.json · pool-w24.json
//   키 (깃허브 Secrets → 환경 변수): DATA_GO_KR_KEY = 공공데이터포털 (잡알리오·나라일터·클린아이) · WORK24_KEY = 고용24 공채속보
//   키가 없거나 한 창구가 실패하면 그 창구 파일은 그대로 둠 (PC 가 올려 둔 자료로 사이트는 계속 만들어짐)
const fs = require('fs');
const path = require('path');
const DATA = process.env.SITE_DATA || path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
const GOV = (process.env.DATA_GO_KR_KEY || '').trim();
const W24 = (process.env.WORK24_KEY || '').trim();
const toIso = (s) => { const m = String(s || '').match(/(\d{4})[-.]?(\d{2})[-.]?(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : ''; };
const list = (s) => String(s || '').split(/[,·]/).map((x) => x.trim()).filter(Boolean);
const kst = (d) => new Date(Date.now() + 9 * 3600e3 + d * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
const dec = (s) => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim();
const items = (xml, tag = 'item') => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => Object.fromEntries([...m[1].matchAll(/<(\w+)>([\s\S]*?)<\/\1>/g)].map((f) => [f[1], dec(f[2])])));
const one = (xml, tag) => { const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)); return m ? dec(m[1]) : ''; };
const get = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'mong-jobs-site/1.0' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); };
const authErr = (xml) => one(xml, 'returnAuthMsg') || one(xml, 'errMsg');
const save = (k, arr) => { fs.writeFileSync(path.join(DATA, `pool-${k}.json`), JSON.stringify({ at: Date.now(), by: 'github', items: arr })); console.log(`✔ ${k} ${arr.length}`); };

async function alio() {
  const all = [];
  let total = Infinity;
  for (let page = 1; all.length < total && page <= 30; page++) {
    const u = new URL('https://apis.data.go.kr/1051000/recruitment/list');
    for (const [k, v] of Object.entries({ serviceKey: GOV, numOfRows: '100', pageNo: String(page), resultType: 'json', ongoingYn: 'Y' })) u.searchParams.set(k, v);
    const t = await get(u);
    if (t.trim().startsWith('<')) throw new Error('잡알리오: ' + (authErr(t) || t.slice(0, 120)));
    const j = JSON.parse(t);
    const rows = j.result || (j.response && j.response.body && j.response.body.items) || [];
    if (!rows.length) break;
    total = Number(j.totalCount ?? (j.response && j.response.body && j.response.body.totalCount)) || rows.length;
    all.push(...rows);
  }
  const seen = new Set();
  return all.map((x) => ({
    id: String(x.recrutPblntSn ?? x.recrutPbancSn ?? x.pblntSn ?? `${x.instNm}|${x.recrutPbancTtl}`),
    inst: x.instNm || '', title: x.recrutPbancTtl || x.pbancTtl || '', start: toIso(x.pbancBgngYmd), end: toIso(x.pbancEndYmd),
    hire: list(x.hireTypeNmLst || x.hireTypeNm), region: list(x.workRgnNmLst || x.workRgnNm), se: x.recrutSeNm || '', nope: x.recrutNope ?? '',
    acbg: x.acbgCondNmLst || '', ncs: x.ncsCdNmLst || '', rep: String(x.replmprYn || '').toUpperCase() === 'Y',
    qual: x.aplyQlfcCn || '', pref: x.prefCondCn || '', prefMore: x.prefCn || '', screen: x.scrnprcdrMthdExpln || '', url: String(x.srcUrl || '').trim(),
  })).filter((x) => x.title && !seen.has(x.id) && seen.add(x.id));
}

const GO_TYPE = { e01: '공개경쟁', e02: '경력경쟁', e03: '계약직', e04: '공무직·기간제', e05: '개방형', e06: '공모직위', e08: '공공기관', e10: '교원·학교' };
const GO_INST = { g01: '국가공무원', g02: '지방공무원', g03: '공공기관', g04: '교육청' };
const AREA = { '00': '전국', 11: '서울', 12: '전남광주', 26: '부산', 27: '대구', 28: '인천', 29: '광주', 30: '대전', 31: '울산', 36: '세종', 41: '경기', 42: '강원', 51: '강원', 43: '충북', 44: '충남', 45: '전북', 52: '전북', 46: '전남', 47: '경북', 48: '경남', 50: '제주' };
async function gojobs() {
  const all = [];
  let total = Infinity;
  for (let page = 1; all.length < total && page <= 40; page++) {
    const u = new URL('https://apis.data.go.kr/1760000/PblJobService/getList');
    for (const [k, v] of Object.entries({ serviceKey: GOV, pageNo: String(page), numOfRows: '100', Begin_de: kst(-30), End_de: kst(0) })) u.searchParams.set(k, v);
    const t = await get(u);
    if (authErr(t)) throw new Error('나라일터: ' + authErr(t));
    const rows = items(t);
    if (!rows.length) break;
    total = Number(one(t, 'totalCount')) || rows.length;
    all.push(...rows);
  }
  const seen = new Set();
  return all.map((x) => ({
    id: 'go' + x.idx, idx: x.idx, inst: x.insttname || '', title: x.title || '', start: toIso(x.begindate), end: toIso(x.enddate),
    posted: toIso(x.regdate || x.regdt || x.rgsde || ''), hire: [GO_TYPE[x.type01] || x.type01].filter(Boolean), se: GO_INST[x.type02] || x.type02 || '', nope: '',
    region: [...new Set(String(x.areacode || '').split(',').map((c) => AREA[c.trim().slice(0, 2)] || '').filter(Boolean))],
    views: Number(x.readnum) || 0, url: x.idx ? `https://www.gojobs.go.kr/apmView.do?empmnsn=${encodeURIComponent(x.idx)}` : '',
  })).filter((x) => x.title && !/합격자|최종\s*합격|명단|면접\s*(전형\s*)?일정|결과\s*(공고|발표)|추가\s*합격/.test(x.title) && !seen.has(x.id) && seen.add(x.id));
}

const CE_SIDO = ['007001', '007002', '007003', '007004', '007005', '007006', '007007', '007008', '007009', '007010', '007011', '007012', '007013', '007014', '007015', '007016', '007017'];
const CE_HIRE = { 일반정규직: '정규직', 상용정규직: '정규직', 기간제: '기간제', 인턴: '청년인턴', 전문계약직: '계약직', 일반계약직: '계약직' };
async function cleaneye() {
  const out = [];
  for (const sido of CE_SIDO) {
    const u = new URL('https://apis.data.go.kr/B551982/openApiEmployInfo/openXmlEmployInfo');
    for (const [k, v] of Object.entries({ serviceKey: GOV, sidoCd: sido, type: 'xml' })) u.searchParams.set(k, v);
    const t = await get(u);
    if (authErr(t)) throw new Error('클린아이: ' + authErr(t));
    for (const g of items(t)) {
      if (g.STATUS && g.STATUS !== '모집중') continue;
      const urlIn = `${g.ACCUSATION || ''} ${g.JOB_SEEK_ETC || ''}`.match(/https?:\/\/[^\s"'<>)]+/);
      out.push({ id: 'ce' + g.NO, inst: g.ENT_NAME || '', title: g.ENT_TITLE || '', hire: [CE_HIRE[g.JOB_TYPE] || g.JOB_TYPE].filter(Boolean), se: g.EMPLOY_GB || '', nope: g.EMPLOY_NUM || '', region: [g.SIDO_CD || g.SIDO_NM].filter(Boolean), start: toIso(g.PUB_DATE), end: toIso(g.PUB_END_DATE), url: urlIn ? urlIn[0] : g.URL || '', income: g.YEARINCOME || '', ceUrl: g.URL || '' });
    }
  }
  return out.filter((x) => x.title);
}

async function w24() {
  const out = [];
  for (let p = 1; p <= 5; p++) {
    const q = new URLSearchParams({ authKey: W24, returnType: 'XML', callTp: 'L', startPage: p, display: 100, coClcd: '10|20|30|40|50', sortField: 'regDt', sortOrderBy: 'desc' });
    const t = await get(`https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L21.do?${q}`);
    const err = one(t, 'error') || one(t, 'errMsg') || one(t, 'message');
    if (err && !/<total>/.test(t)) throw new Error('고용24: ' + err);
    const rows = items(t, 'dhsOpenEmpInfo');
    for (const e of rows) out.push({ id: `w${e.empSeqno}`, seq: e.empSeqno, inst: e.empBusiNm || '', title: e.empWantedTitle || '', se: e.coClcdNm || '', hire: e.empWantedTypeNm ? e.empWantedTypeNm.split(/[,·\s]+/).filter(Boolean) : [], start: toIso(e.empWantedStdt), end: toIso(e.empWantedEndt), url: e.empWantedHomepgDetail || '', region: [], nope: '' });
    if (rows.length < 100) break;
  }
  return out;
}

// 🏠 LH 분양·임대 공고 (공고중) — 사이트 "LH 공고" 칸 (11/27, 설치판 apis.js lh 와 같은 칸)
async function lh() {
  const all = [];
  let total = Infinity;
  for (let page = 1; all.length < total && page <= 10; page++) {
    const u = new URL('https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1');
    for (const [k, v] of Object.entries({ serviceKey: GOV, PG_SZ: '100', PAGE: String(page), PAN_SS: '공고중' })) u.searchParams.set(k, v);
    const t = await get(u);
    if (t.trim().startsWith('<')) throw new Error('LH: ' + (authErr(t) || t.slice(0, 120)));
    const j = JSON.parse(t);
    const box = (Array.isArray(j) ? j : [j]).find((x) => x && x.dsList) || {};
    const rows = box.dsList || [];
    if (!rows.length) break;
    total = Number((rows[0] || {}).ALL_CNT) || rows.length;
    all.push(...rows);
  }
  const seen = new Set();
  return all.filter((x) => x.PAN_ID && !seen.has(x.PAN_ID) && seen.add(x.PAN_ID)).map((x) => ({ id: x.PAN_ID, title: x.PAN_NM || '', inst: x.CNP_CD_NM || x.AIS_TP_CD_NM || '', end: toIso(x.CLSG_DT), url: x.DTL_URL || x.DTL_URL_MOB || '', type: x.AIS_TP_CD_NM || '', upp: x.UPP_AIS_TP_NM || '', region: x.CNP_CD_NM || '', start: toIso(x.PAN_NT_ST_DT), state: x.PAN_SS || '' }));
}

// 🎁 정부24 공공서비스(보조금24) 전체 — 지원금 허브 (11/27) · 같은 공공데이터 키 · 1,000개씩
async function gov24() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const u = new URL('https://api.odcloud.kr/api/gov24/v3/serviceList');
    for (const [k, v] of Object.entries({ page: String(page), perPage: '1000', serviceKey: GOV })) u.searchParams.set(k, v);
    const t = await get(u);
    if (t.trim().startsWith('<')) throw new Error('보조금24: ' + (authErr(t) || t.slice(0, 120)));
    const j = JSON.parse(t);
    const rows = j.data || [];
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  const cut = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  return all.map((x) => ({
    id: x['서비스ID'], name: cut(x['서비스명'], 80), sum: cut(x['서비스목적요약'], 120), org: cut(x['소관기관명'], 40), field: x['서비스분야'] || '', type: x['지원유형'] || '', user: x['사용자구분'] || '',
    who: cut(x['지원대상'], 220), what: cut(x['지원내용'], 260), how: cut(x['신청방법'], 120), when: cut(x['신청기한'], 80), url: x['상세조회URL'] || '', views: Number(x['조회수']) || 0, upd: toIso(x['수정일시'] || x['등록일시']),
  })).filter((x) => x.id && x.name);
}

(async () => {
  const jobs = [['alio', alio, GOV], ['gojobs', gojobs, GOV], ['cleaneye', cleaneye, GOV], ['w24', w24, W24], ['gov24', gov24, GOV], ['lh', lh, GOV]];
  let fail = 0;
  for (const [k, fn, key] of jobs) {
    if (!key) { console.log(`- ${k}: 키 없음 → 전에 받은 자료 그대로`); continue; }
    try { const a = await fn(); if (a.length) save(k, a); else console.log(`- ${k}: 0건 → 전에 받은 자료 그대로`); }
    catch (e) { fail++; console.log(`✘ ${k}: ${e.message} → 전에 받은 자료 그대로`); }
  }
  if (fail) process.exitCode = 0; // 한 창구 실패로 사이트 만들기를 막지 않음
})();
