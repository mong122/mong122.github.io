// 🏢 기관 정보 글 읽기 (11/27) · build.js 가 부름
//   글 = site/orgs/<기관>.md (맨 위 --- 사이 inst·title·desc·date·sources, 아래 본문 — site/org-write.js 로 하루가 씀) · draft: true 는 건너뜀
//   → { [기관 이름]: { title, desc, date, sources[], html } }  (기관 쪽 org/<기관>.html 맨 위에 붙음)
module.exports = function orgs({ fs, path, esc, ROOT }) {
  const dir = path.join(ROOT, 'orgs');
  const by = {};
  if (!fs.existsSync(dir)) return by;
  const { md } = require('./guides.js').makeMd(esc);
  for (const f of fs.readdirSync(dir).filter((x) => /\.md$/.test(x))) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r/g, '');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!m) continue;
    const meta = Object.fromEntries(m[1].split('\n').map((l) => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map((x) => [x[1], x[2].trim()]));
    if (meta.draft === 'true' || !meta.inst) continue;
    by[meta.inst] = { ...meta, sources: (meta.sources || '').split(/\s*,\s*/).filter(Boolean), html: md(m[2]) };
  }
  return by;
};
