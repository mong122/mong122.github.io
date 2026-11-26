#!/usr/bin/env node
// 💰 알리오 경영공시 "신입사원 초임" 을 사이트의 모든 기관에서 받기 (11/27 사장님 "알리오 공시 있는데 안 써 놓은 데가 많네")
//   node site/entry.js        → site/data/entry.json { 기관: {year,total,parts,budgetYear,budget,url,at} | {none:true,at} }
//   길 = 설치판 notice.js entryPay 와 같음: 잡알리오 공고 화면 "급여정보" 링크(apbaId) → disclosureNo → itemReportRight 표 (결산 합계, 천 원 → 만 원)
//   7일 안에 받은 기관은 건너뜀 · 공시가 없는 기관(공공기관 아님 등)은 none 으로 적어 두고 7일 뒤 다시
const fs = require('fs');
const path = require('path');
const OUT = path.join(process.env.SITE_DATA || path.join(__dirname, 'data'), 'entry.json');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const cache = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const POOL = path.join(process.env.SITE_DATA || path.join(__dirname, 'data'), 'pool-alio.json'); // 11/27: 설치판 저장 칸 대신 data/ (깃허브에서도 돎)
const items = fs.existsSync(POOL) ? (JSON.parse(fs.readFileSync(POOL, 'utf8')).items || []) : [];
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142 Safari/537.36' };
const get = async (u) => { const r = await fetch(u, { headers: UA }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); };
const txt = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const man = (v) => Math.round(Number(String(v).replace(/[^\d.-]/g, '')) / 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function entryOf(id) {
  const rv = (await get(`https://job.alio.go.kr/recruitview.do?idx=${id}`)).replace(/[\r\n\t]/g, '');
  const pay = (rv.match(/급여정보<\/th>\s*<td>.*?<a href="([^"]+)"/) || [])[1];
  if (!pay) return null;
  const p = await get(pay.replace(/&amp;/g, '&'));
  const no = (p.match(/disclosureNo\s*:\s*["'](\d+)["']/) || [])[1];
  if (!no) return null;
  const h = (await get(`https://alio.go.kr/item/itemReportRight.do?disclosureNo=${no}`)).replace(/[\r\n\t]/g, ' ');
  const at = h.search(/신입사원\s*초임/);
  if (at < 0) return null;
  // "신입사원 초임" 뒤 첫 결산·예산 표
  const tables = [...h.slice(at).matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]);
  const tb = tables.find((t) => /결산|예산/.test(txt(t).slice(0, 300)));
  if (!tb) return null;
  const rows = [...tb.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((m) => [...m[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => txt(c[1])));
  const head = rows.find((r) => r.some((c) => /결산|예산/.test(c)));
  const sum = rows.find((r) => /^합\s*계$/.test(r[0]));
  if (!head || !sum) return null;
  const col = (re) => { for (let i = head.length - 1; i > 0; i--) if (re.test(head[i]) && /\d/.test(sum[i] || '')) return i; return -1; };
  const k = col(/결산/);
  if (k < 0) return null;
  const b = col(/예산/);
  const parts = rows.filter((r) => r !== head && r !== sum && /\d/.test(r[k] || '') && man(r[k]) > 0).map((r) => `${r[0]} ${man(r[k]).toLocaleString()}만`);
  const total = man(sum[k]);
  if (!(total > 1000 && total < 20000)) return null; // 1천만~2억 밖이면 표를 잘못 읽은 것
  return { year: head[k], total, parts, budgetYear: b > 0 ? head[b] : '', budget: b > 0 ? man(sum[b]) : 0, url: pay.replace(/&amp;/g, '&') };
}

(async () => {
  const byInst = {};
  for (const x of items) if (/^\d+$/.test(String(x.id))) (byInst[x.inst] = byInst[x.inst] || []).push(x.id);
  const week = Date.now() - 7 * 864e5;
  let got = 0, none = 0, skip = 0, err = 0;
  for (const [inst, ids] of Object.entries(byInst)) {
    if (cache[inst] && cache[inst].at > week) { skip++; continue; }
    let e = null, bad = '';
    for (const id of ids.slice(0, 2)) { try { e = await entryOf(id); if (e) break; } catch (er) { bad = er.message; } await sleep(300); }
    cache[inst] = e ? { ...e, at: Date.now() } : { none: true, why: bad || '공시 표 없음', at: Date.now() };
    e ? got++ : bad ? err++ : none++;
    await sleep(400);
  }
  fs.writeFileSync(OUT, JSON.stringify(cache, null, 1));
  console.log(`💰 초임: 새로 받음 ${got} · 공시 없음 ${none} · 오류 ${err} · 7일 안이라 건너뜀 ${skip} → ${OUT}`);
})();
