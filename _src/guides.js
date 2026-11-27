// 📘 가이드 글 (11/27 — 애드센스 "직접 쓴 쓸모 있는 글" 칸) · build.js 가 부름
//   글 = site/guides/<주소>.md (맨 위 --- 사이 title·desc·cat·date·sources, 아래 본문) → guide/<주소>.html + guides.html (목록) · 검색에 보임
//   본문 표기 (작은 마크다운): ## 소제목 · ### 작은 제목 · - 목록 · 1. 번호 목록 · | 표 | · **굵게** · [글자](주소) · > 알림 상자 · 빈 줄 = 문단
function makeMd(esc) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\.{0,2}\/?[\w\-./]+\.html)\)/g, (m, t, u) => `<a href="${u}" style="text-decoration:underline"${/^https?:/.test(u) ? ' rel="nofollow noreferrer" target="_blank"' : ''}>${t}</a>`);
  const md = (src) => {
    const out = [];
    const L = src.replace(/\r/g, '').split('\n');
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      if (!l.trim()) continue;
      if (/^## /.test(l)) { out.push(`<h2>${inline(l.slice(3))}</h2>`); continue; }
      if (/^### /.test(l)) { out.push(`<h3>${inline(l.slice(4))}</h3>`); continue; }
      if (/^> /.test(l)) { const b = []; while (i < L.length && /^> /.test(L[i])) b.push(inline(L[i++].slice(2))); i--; out.push(`<div class="keynote">${b.map((x) => `<div>${x}</div>`).join('')}</div>`); continue; }
      if (/^\|/.test(l)) {
        const rows = []; while (i < L.length && /^\|/.test(L[i])) rows.push(L[i++]); i--;
        const cells = rows.filter((r) => !/^\|\s*-/.test(r)).map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim())));
        out.push(`<table style="margin:10px 0"><tr>${cells[0].map((c) => `<th style="width:auto">${c}</th>`).join('')}</tr>${cells.slice(1).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`);
        continue;
      }
      if (/^\s*[-*] /.test(l)) { const b = []; while (i < L.length && /^\s*[-*] /.test(L[i])) b.push(inline(L[i++].replace(/^\s*[-*] /, ''))); i--; out.push(`<ul class="glist">${b.map((x) => `<li>${x}</li>`).join('')}</ul>`); continue; }
      if (/^\s*\d+[.)] /.test(l)) { const b = []; while (i < L.length && /^\s*\d+[.)] /.test(L[i])) b.push(inline(L[i++].replace(/^\s*\d+[.)] /, ''))); i--; out.push(`<ol class="glist">${b.map((x) => `<li>${x}</li>`).join('')}</ol>`); continue; }
      const p = [l]; while (i + 1 < L.length && L[i + 1].trim() && !/^(#|>|\||\s*[-*] |\s*\d+[.)] )/.test(L[i + 1])) p.push(L[++i]);
      out.push(`<p>${inline(p.join(' '))}</p>`);
    }
    return out.join('\n');
  };
  return { md, inline };
}
module.exports = function guides({ fs, path, OUT, page, esc, ROOT }) {
  const dir = path.join(ROOT, 'guides');
  if (!fs.existsSync(dir)) return [];
  const list = [];
  const { md } = makeMd(esc);
  fs.mkdirSync(path.join(OUT, 'guide'), { recursive: true });
  for (const f of fs.readdirSync(dir).filter((x) => /\.md$/.test(x)).sort()) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) || raw.replace(/\r/g, '').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) continue;
    const meta = Object.fromEntries(m[1].split('\n').map((l) => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map((x) => [x[1], x[2].trim()]));
    if (meta.draft === 'true') continue;
    const slug = f.replace(/\.md$/, '');
    const sources = (meta.sources || '').split(/\s*,\s*/).filter(Boolean);
    list.push({ slug, ...meta });
    fs.writeFileSync(path.join(OUT, 'guide', slug + '.html'), page(meta.title, `
<div class="crumb"><a href="../index.html">처음</a> › <a href="../guides.html">가이드</a> › ${esc(meta.cat || '')}</div>
<h1>${esc(meta.title)}</h1><p class="lead">${esc(meta.desc || '')}</p><p class="note">${esc(meta.date || '')} 정리 · 몽 채용노트</p>
<article class="guide">${md(m[2])}</article>
${sources.length ? `<h2>출처</h2><div class="box" style="white-space:normal">${sources.map((u) => `<div>· <a href="${esc(u)}" rel="nofollow noreferrer" target="_blank" style="text-decoration:underline">${esc(u.replace(/^https?:\/\//, '').slice(0, 70))}</a></div>`).join('')}</div>` : ''}
<p class="note">공식 자료를 읽고 정리한 글이에요. 금액·기한은 바뀔 수 있으니 신청 전에 출처의 원문을 꼭 확인하세요.</p>
<p><a class="btn" href="../guides.html">가이드 더 보기</a> <a class="btn" href="../benefits.html">지원금 찾기</a></p>`, { depth: 1, desc: meta.desc || meta.title }));
  }
  list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const cats = [...new Set(list.map((x) => x.cat || '기타'))];
  fs.writeFileSync(path.join(OUT, 'guides.html'), page('가이드 — 지원금·환급·취업 정보 정리', `<h1>가이드</h1><p class="lead">지원금·환급금·취업 정보를 공식 자료로 하나씩 정리했어요.</p>
${list.length ? cats.map((c) => `<h2>${esc(c)}</h2><div class="grid">${list.filter((x) => (x.cat || '기타') === c).map((x) => `<a class="card" href="guide/${x.slug}.html" style="min-height:0"><span class="org-name" style="white-space:normal">${esc(x.title)}</span><span class="sub">${esc(x.desc || '')}</span><span class="foot"><span class="open">${esc(x.date || '')}</span><span class="go">읽기 →</span></span></a>`).join('')}</div>`).join('') : '<p class="note">곧 첫 글이 올라와요.</p>'}`, { on: 'guides', noindex: !list.length, desc: '지원금·환급금·취업 정보를 공식 자료로 정리한 가이드 모음' }));
  console.log(`  📘 가이드: ${list.length}편`);
  return list;
};
module.exports.makeMd = makeMd; // 🏢 기관 정보 글도 같은 표기
