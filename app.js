let DATA = null;
let DOUBLES = null;
let dayPromise = null;
let selectedId = null;
let mode = 'desk';
let deskKind = 'beidan7';
let detailSeq = 0;
const reportCache = new Map();

const $ = (id) => document.getElementById(id);


function parseKickoff(s) {
  if (!s) return null;
  // "2026-09-11 00:45" Asia/Shanghai wall clock
  const m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+08:00`);
}

function minutesToKickoff(leg) {
  let ko = leg && leg.kickoff;
  if (!ko && DATA) {
    const id = leg.id || (String(leg.sale_id || '').startsWith('周') ? `jingcai:${leg.sale_id}` : `beidan:${leg.sale_id}`);
    const m = (DATA.matches || []).find(x => x.id === id || x.sale_id === leg.sale_id);
    ko = m && m.kickoff;
  }
  const d = parseKickoff(ko);
  if (!d) return null;
  return (d.getTime() - Date.now()) / 60000;
}


function resolveMatchPhase(obj) {
  // Prefer fresh clock; use fixture_status when present.
  const LIVE = { '1H':1, '2H':1, HT:1, ET:1, BT:1, P:1, LIVE:1, INT:1, BREAK:1 };
  const FT = { FT:1, AET:1, PEN:1, AWD:1, WO:1, ABD:1, CANC:1, PST:1 };
  const st = String(obj && (obj.fixture_status || obj.status_short) || '').toUpperCase();
  if (st && LIVE[st]) return 'live';
  if (st && FT[st]) return 'ft';
  const mins = minutesToKickoff(obj);
  if (mins === null) return obj && obj.match_phase || 'pre';
  if (mins > 0) return 'pre';
  if (mins <= -150) return 'ft';
  return 'live';
}


function methodAgreeBadge(leg) {
  if (!leg) return '';
  // 冠军核 M1+M5+M6：展示「同意 n/3」，不用全方法7
  if (leg.agree_label) {
    return `<span class="agree" title="冠军核 M1+M5+M6 · 观察向未升权">同意 ${escapeHtml(String(leg.agree_label))}</span>`;
  }
  const n = leg.agree_n ?? leg.champion_agree_n ?? leg.method_agree_n;
  if (n === undefined || n === null || n === '') return '';
  const den = leg.agree_denom ?? leg.agree_den ?? leg.method_agree_den ?? 3;
  return `<span class="agree" title="冠军核 M1+M5+M6 · 观察向未升权">同意 ${escapeHtml(String(n))}/${escapeHtml(String(den))}</span>`;
}

function phaseBadge(obj) {
  const ph = resolveMatchPhase(obj);
  if (ph === 'live') return '<span class="phase live">已开赛</span>';
  if (ph === 'ft') {
    // 完赛且未标定「中」→ 待复盘（hit===true 才算已中）
    if (obj && (obj.hit === true || obj.review_mark === '中' || obj.settled === 'hit')) {
      return '<span class="phase ft">完赛·中</span>';
    }
    return '<span class="phase review">待复盘</span>';
  }
  return '';
}

/** 主选/另选：优先 doubles.primary / alt，否则拆 double */
function pickPrimaryAlt(leg) {
  let pri = leg && leg.primary;
  let alt = leg && leg.alt;
  if (pri && alt) return { primary: String(pri), alt: String(alt) };
  const d = String((leg && leg.double) || '');
  if (d.includes('+')) {
    const parts = d.split('+');
    return { primary: (parts[0] || '').trim(), alt: (parts[1] || '').trim() };
  }
  const map = { H: '主胜', D: '平', A: '客胜' };
  const pp = String((leg && leg.pick_pair) || '');
  if (pp.length >= 2) return { primary: map[pp[0]] || pp[0], alt: map[pp[1]] || pp[1] };
  return { primary: d || '—', alt: '' };
}

function renderPickLines(leg) {
  const { primary, alt } = pickPrimaryAlt(leg);
  const a = primary
    ? `<div class="desk-pick primary"><em>主选</em>${escapeHtml(primary)}</div>`
    : '';
  const b = alt
    ? `<div class="desk-pick alt"><em>另选</em>${escapeHtml(alt)}</div>`
    : '';
  return `<div class="desk-picks">${a}${b}</div>`;
}

function renderHandicapBig(leg) {
  const hc = leg && (leg.handicap ?? leg.line);
  const v = (hc === null || hc === undefined || hc === '') ? '—' : String(hc);
  return `<div class="desk-hc"><em>让球</em><strong>${escapeHtml(v)}</strong></div>`;
}

function hasLiveXi(text) {
  const s = String(text || '');
  // live XI / 已官宣首发 = 高亮更新
  return /live\s*XI/i.test(s) || /已官宣首发/.test(s);
}

/** 卡片场外：未到 T-60 →「首发待临场」；live XI → 高亮 */
function renderOffFieldCard(leg) {
  const raw = String(leg.off_field || '').trim();
  if (!raw || raw === '有' || raw === '空包' || raw === '无') {
    const mins = minutesToKickoff(leg);
    if (mins !== null && mins > 60) {
      return `<div class="desk-off pending"><em>场外</em>首发待临场</div>`;
    }
    return '';
  }
  const live = hasLiveXi(raw);
  const mins = minutesToKickoff(leg);
  let text = raw;
  let cls = 'desk-off';
  if (live) cls += ' live-xi';
  if (mins !== null && mins > 60 && !live) {
    // 未到 T-60 且非 live：不展示 XI 细节，改待临场；伤停等可跟在后
    const tail = raw.replace(/^(?:live|probable|last)\s*XI[^｜|]*[｜|]?/i, '')
      .replace(/^未官宣\s*XI[^｜|]*[｜|]?/i, '')
      .replace(/^XI未抓取[^｜|]*[｜|]?/i, '')
      .trim()
      .replace(/^[｜|]\s*/, '');
    text = tail ? `首发待临场｜${tail}` : '首发待临场';
    cls += ' pending';
  } else if (mins !== null && mins > 60 && live) {
    cls += ' live-xi early';
  }
  return `<div class="${cls}"><em>场外</em>${escapeHtml(text)}</div>`;
}

function strengthBadge(s) {
  const v = String(s || '').trim();
  if (!v) return '';
  const cls = ({ '信': 'xin', '偏信': 'pian', '勉强': 'mian', '不碰': 'bu' })[v] || 'mian';
  const note = v === '信' ? '<span class="str-note" title="结构可信≠更稳/更该买">信≠更稳</span>' : '';
  return `<span class="str ${cls}">${escapeHtml(v)}</span>${note}`;
}

function wireOnce() {
  if (wireOnce.done) return;
  wireOnce.done = true;
  document.querySelectorAll('.chip-sw[data-desk]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (deskKind === btn.dataset.desk && mode === 'desk') return;
      deskKind = btn.dataset.desk;
      setMode('desk');
    });
  });
  $('tab-all').addEventListener('click', () => setMode('all'));
  $('back-btn').addEventListener('click', () => closeDetail());
  ['q', 'product', 'badge', 'report'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', () => { if (mode === 'all') renderList(); });
  });
  // event delegation — avoid rebinding 7 cards each switch
  $('desk-list').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-idx]');
    if (!btn) return;
    const pack = deskKind === 'beidan7' ? DOUBLES?.beidan7 : DOUBLES?.jingcai;
    const leg = pack?.legs?.[Number(btn.dataset.idx)];
    if (leg) openLeg(leg);
  });
  $('list').addEventListener('click', (ev) => {
    const row = ev.target.closest('[data-id]');
    if (row) selectMatch(row.dataset.id);
  });
}

async function load() {
  const t0 = performance.now();
  $('desk-list').innerHTML = `<div class="empty">加载短表…</div>`;
  wireOnce();
  try {
    const dblRes = await fetch('./public/data/doubles.json?t=' + Date.now());
    if (!dblRes.ok) throw new Error('doubles ' + dblRes.status);
    DOUBLES = await dblRes.json();
  } catch (err) {
    $('desk-list').innerHTML = `<div class="empty">短表加载失败：${escapeHtml(err.message)}</div>`;
    return;
  }

  $('disclaimer').textContent = DOUBLES.disclaimer || '研究观察 · 不出票 · 非投注建议';
  const asOf = String(DOUBLES.as_of || '').replace('T', ' ').slice(0, 16);
  $('build').textContent = `1.4 · 短表已载 · ${asOf || '—'}`;
  setMode('desk');
  const ms = Math.round(performance.now() - t0);
  $('build').textContent = `1.4 · 首屏 ${ms}ms · ${asOf || '—'}`;
  // warm day.json in idle — not blocking first paint
  if ('requestIdleCallback' in window) requestIdleCallback(() => ensureDay(), { timeout: 2500 });
  else setTimeout(() => ensureDay(), 800);
}

function ensureDay() {
  if (DATA) return Promise.resolve(DATA);
  if (dayPromise) return dayPromise;
  dayPromise = fetch('./public/data/day.json?t=' + Date.now())
    .then(r => { if (!r.ok) throw new Error('day ' + r.status); return r.json(); })
    .then(d => {
      DATA = d;
      const n = (d.matches || []).length;
      const asOf = String(d.as_of || DOUBLES?.as_of || '').replace('T', ' ').slice(0, 16);
      if (!$('detail')?.hidden) { /* keep */ }
      else $('build').textContent = `1.4 · ${n} 场 · ${asOf || '—'}`;
      return DATA;
    })
    .catch(err => {
      dayPromise = null;
      throw err;
    });
  return dayPromise;
}

function setMode(next) {
  if (mode === next && next === 'desk') {
    // only re-render desk when switching beidan/jingcai
  }
  mode = next;
  const desk = mode === 'desk';
  $('desk').hidden = !desk;
  $('toolbar').hidden = desk;
  $('list').hidden = desk;
  document.querySelectorAll('.chip-sw[data-desk]').forEach(b => {
    b.classList.toggle('active', desk && b.dataset.desk === deskKind);
  });
  $('tab-all').classList.toggle('active', !desk);
  closeDetail();
  if (desk) {
    requestAnimationFrame(renderDesk);
  } else {
    ensureDay().then(() => requestAnimationFrame(renderList)).catch(err => {
      $('list').innerHTML = `<div class="empty">场次加载失败：${escapeHtml(err.message)}</div>`;
    });
  }
}

function renderDesk() {
  if (!DOUBLES) {
    $('desk-list').innerHTML = `<div class="empty">暂无双选短表</div>`;
    return;
  }
  const pack = deskKind === 'beidan7' ? DOUBLES.beidan7 : DOUBLES.jingcai;
  $('desk-note').textContent = deskKind === 'beidan7'
    ? ((DOUBLES.main_survive || DOUBLES.ticket_agree && DOUBLES.ticket_agree.ablation_survive_when_pass)
        ? (`冠军核同意 n/3 · 整票门主数字 ${DOUBLES.main_survive || DOUBLES.ticket_agree.ablation_survive_when_pass} · 未升权`)
        : (pack.note || ''))
    : (pack.summary || '');
  const legs = pack.legs || [];
  const html = legs.map((leg, i) => deskKind === 'beidan7' ? deskCardBeidan(leg, i) : deskCardJingcai(leg, i)).join('');
  $('desk-list').innerHTML = html || `<div class="empty">无腿</div>`;
}

function deskCardBeidan(leg, idx) {
  const sp = Array.isArray(leg.sp) ? leg.sp.join(' / ') : '';
  const name = leg.match_name || `${leg.home} vs ${leg.away}`;
  const hot = leg.hot_fav ? ' hot-fav' : '';
  const off = renderOffFieldCard(leg);
  return `<button type="button" class="desk-card${hot}" data-idx="${idx}">
    <div class="desk-top">
      <span class="desk-no">北单 ${escapeHtml(leg.sale_id)} ${strengthBadge(leg.strength)} ${methodAgreeBadge(leg)} ${phaseBadge(leg)}</span>
    </div>
    <div class="desk-teams">${escapeHtml(name)}</div>
    ${renderHandicapBig(leg)}
    ${renderPickLines(leg)}
    ${off}
    <div class="odds-row">
      <span class="odds-label">北单让球SP</span>
      ${sp ? `<span class="odds-val">${escapeHtml(sp)}</span>` : `<span class="odds-miss">无SP</span>`}
    </div>
  </button>`;
}

function deskCardJingcai(leg, idx) {
  const name = leg.match_name || `${leg.home} vs ${leg.away}`;
  const nspf = Array.isArray(leg.nspf) ? leg.nspf.join(' / ') : '';
  const hot = leg.hot_fav ? ' hot-fav' : '';
  const off = renderOffFieldCard(leg);
  return `<button type="button" class="desk-card${hot}" data-idx="${idx}">
    <div class="desk-top">
      <span class="desk-no">${escapeHtml(leg.sale_id)} ${strengthBadge(leg.strength)} ${methodAgreeBadge(leg)} ${phaseBadge(leg)}</span>
    </div>
    <div class="desk-teams">${escapeHtml(name)}</div>
    ${renderHandicapBig(leg)}
    ${renderPickLines(leg)}
    ${off}
    <div class="odds-row">
      <span class="odds-label">竞彩非让</span>
      ${nspf ? `<span class="odds-val">${escapeHtml(nspf)}</span>` : `<span class="odds-miss">无SP</span>`}
    </div>
  </button>`;
}

function openLeg(leg) {
  const seq = ++detailSeq;
  // 1) instant skeleton from doubles — no day.json / md yet
  showDetail(renderSkeleton(leg));
  // 2) async fill 怎么看 from leg.view first, then richer report if available
  fillDetailAsync(leg, seq);
}

function renderSkeleton(leg) {
  const name = leg.match_name || `${leg.home} vs ${leg.away}`;
  return `
    <div class="detail-head">
      <span class="hc big">让球 ${escapeHtml(String(leg.handicap ?? '—'))}</span>
      <h1>${escapeHtml(name)}</h1>
    </div>
    <div class="kv">
      <span>${escapeHtml(String(leg.sale_id).startsWith('周') ? '竞彩' : '北单')} ${escapeHtml(leg.sale_id)}</span>
      ${(() => { const p=pickPrimaryAlt(leg); return `<span>主选 ${escapeHtml(p.primary || '—')}</span>` + (p.alt ? `<span>另选 ${escapeHtml(p.alt)}</span>` : ''); })()}
      ${leg.strength ? `<span>强度 ${escapeHtml(leg.strength)}</span>` : ''}
      ${(leg.agree_n ?? leg.method_agree_n ?? leg.vote_agree_n) != null ? `<span>${escapeHtml((() => { const n=leg.agree_n ?? leg.method_agree_n ?? leg.vote_agree_n; const d=leg.agree_den ?? leg.method_agree_den ?? leg.agree_denom; return d!=null&&d!=='' ? `同意 ${n}/${d}` : `同意 ${n}`; })())}</span>` : ''}
      ${phaseBadge(leg)}
    </div>
    <div class="plain">
      <div class="verdict">
        <div class="verdict-label">研究结论</div>
        <div class="verdict-main">${leg.strength ? escapeHtml(leg.strength) + ' · ' : ''}${(() => { const p=pickPrimaryAlt(leg); return `主选 ${escapeHtml(p.primary || '—')}` + (p.alt ? ` · 另选 ${escapeHtml(p.alt)}` : ''); })()} · 不出票</div>
        <div class="verdict-sub">短表观察 · 不是投注建议</div>
      </div>
      <div class="section" id="sec-view">
        <h3>比赛怎么看</h3>
        <p class="muted-loading">加载叙述…</p>
      </div>
      <div class="section fear-box" id="sec-fear">
        <h3>我怕什么</h3>
        <p class="muted-loading">加载中…</p>
      </div>
      <div class="section" id="sec-off">
        <h3>场外消息</h3>
        <p>${leg.off_field ? escapeHtml(leg.off_field) : '<span class="muted-loading">加载中…</span>'}</p>
      </div>
      <div class="section" id="sec-market">
        <h3>市场对照</h3>
        ${marketFromLeg(leg)}
      </div>
    </div>`;
}

function marketFromLeg(leg) {
  if (leg.sp) return oddsBlock('北单让球SP', leg.sp.join(' / '), leg.tip || 'okooo · 非500官方');
  return oddsBlock('竞彩非让', Array.isArray(leg.nspf) ? leg.nspf.join(' / ') : '', leg.tip_nspf)
    + oddsBlock('竞彩让球', Array.isArray(leg.spf) ? leg.spf.join(' / ') : '', leg.tip_spf);
}

function oddsBlock(label, val, tip) {
  if (!val) return `<div class="odds-row"><span class="odds-label">${escapeHtml(label)}</span><span class="odds-miss">无SP</span></div>`;
  return `<div class="odds-row"><span class="odds-label">${escapeHtml(label)}</span><span class="odds-val">${escapeHtml(val)}</span></div>
    ${tip ? `<p class="odds-tip">${escapeHtml(tip)}</p>` : ''}`;
}

async function fillDetailAsync(leg, seq) {
  // immediate fill from doubles short text if present
  const viewEl = () => $('detail-body')?.querySelector('#sec-view');
  const fearEl = () => $('detail-body')?.querySelector('#sec-fear');
  if (seq !== detailSeq) return;
  if (leg.view && viewEl()) {
    viewEl().innerHTML = `<h3>比赛怎么看</h3><ol><li>${escapeHtml(leg.view)}</li></ol>`;
  }
  if (leg.fear && fearEl()) {
    fearEl().innerHTML = `<h3>我怕什么</h3><ul><li>${escapeHtml(leg.fear)}</li></ul>`;
  }
  const offEl = () => $('detail-body')?.querySelector('#sec-off');
  if (leg.off_field && offEl()) {
    offEl().innerHTML = `<h3>场外消息</h3><p>${escapeHtml(leg.off_field)}</p>`;
  }

  // try richer report via day.json mapping — lazy
  try {
    await ensureDay();
    if (seq !== detailSeq) return;
    const id = leg.id || (String(leg.sale_id).startsWith('周') ? `jingcai:${leg.sale_id}` : `beidan:${leg.sale_id}`);
    const m = (DATA.matches || []).find(x => x.id === id || x.sale_id === leg.sale_id);
    if (!m?.report_file) return;
    const md = await fetchReport(m.report_file);
    if (seq !== detailSeq) return;
    const rich = plainReport(md, m, leg);
    // replace only narrative sections if parse succeeded
    const tmp = document.createElement('div');
    tmp.innerHTML = rich;
    const rv = tmp.querySelector('.section');
    const sections = tmp.querySelectorAll('.section');
    // plainReport structure: verdict, 怎么看, 我怕, 市场
    const all = tmp.querySelector('.plain');
    if (all) {
      const verdict = $('detail-body')?.querySelector('.verdict');
      const market = $('detail-body')?.querySelector('#sec-market');
      const head = $('detail-body')?.querySelector('.detail-head');
      const kv = $('detail-body')?.querySelector('.kv');
      // keep head/kv/market from skeleton; swap plain body carefully
      const newVerdict = all.querySelector('.verdict');
      const newSecs = all.querySelectorAll('.section');
      if (verdict && newVerdict) verdict.replaceWith(newVerdict);
      if (viewEl() && newSecs[0]) viewEl().replaceWith(newSecs[0]);
      if (fearEl() && newSecs[1]) fearEl().replaceWith(newSecs[1]);
      // keep market from leg unless report has odds talk — optional replace third section
      if (market && newSecs[2] && /市场对照/.test(newSecs[2].innerHTML)) {
        // merge: keep SP from leg, append talk if any
        const talk = newSecs[2].querySelector('.odds-talk');
        if (talk) market.appendChild(talk.cloneNode(true));
      }
    }
  } catch (_) {
    if (seq !== detailSeq) return;
    if (!leg.view && viewEl()) viewEl().innerHTML = `<h3>比赛怎么看</h3><p>本腿以短表为主；研报稍后可再试。</p>`;
    if (!leg.fear && fearEl()) fearEl().innerHTML = `<h3>我怕什么</h3><p>销售与价源需临场再核；研究观察，不出票。</p>`;
  }
}

async function fetchReport(file) {
  if (reportCache.has(file)) return reportCache.get(file);
  const r = await fetch('./public/data/reports/' + encodeURIComponent(file) + '?t=' + Date.now());
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const md = await r.text();
  reportCache.set(file, md);
  return md;
}

function showDetail(html) {
  $('detail-body').innerHTML = html;
  $('detail').hidden = false;
  window.scrollTo(0, 0);
}

function closeDetail() {
  detailSeq++;
  $('detail').hidden = true;
  $('detail-body').innerHTML = '';
}

function badgeRank(m) {
  if (m.badge === '精选') return 0;
  if (m.badge === '观察') return 1;
  if (m.has_report) return 2;
  return 3;
}

function sortedMatches(list) {
  return [...list].sort((a, b) => {
    const d = badgeRank(a) - badgeRank(b);
    if (d) return d;
    return String(a.sale_id || '').localeCompare(String(b.sale_id || ''), 'zh');
  });
}

function filtered() {
  const q = ($('q')?.value || '').trim().toLowerCase();
  const product = $('product')?.value || 'all';
  const badge = $('badge')?.value || 'all';
  const report = $('report')?.value || 'all';
  return sortedMatches(DATA.matches || []).filter(m => {
    if (product !== 'all' && m.product !== product) return false;
    if (badge === 'none' && m.badge) return false;
    if (badge !== 'all' && badge !== 'none' && m.badge !== badge) return false;
    if (report === 'yes' && !m.has_report) return false;
    if (report === 'final' && !(m.report_level === 'final' || m.badge === '观察' || m.badge === '精选')) return false;
    if (!q) return true;
    return [m.sale_id, m.home, m.away, m.league].join(' ').toLowerCase().includes(q);
  });
}

function renderList() {
  if (!DATA) return;
  const rows = filtered();
  $('list').innerHTML = rows.map(m => {
    const b = m.badge ? `<span class="badge ${escapeHtml(m.badge)}">${escapeHtml(m.badge)}</span>` : '';
    const ph = phaseBadge(m);
    return `<div class="item" data-id="${escapeHtml(m.id)}">
      <div class="row1" style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <div class="teams">${escapeHtml(m.home || '?')} vs ${escapeHtml(m.away || '?')}</div>
        <span style="display:inline-flex;gap:6px;align-items:center">${ph}${b}</span>
      </div>
      <div class="sub"><span class="hc-inline">让${escapeHtml(String(m.handicap ?? '—'))}</span>${escapeHtml(m.product === 'jingcai' ? '竞彩' : '北单')} ${escapeHtml(m.sale_id || '')}</div>
    </div>`;
  }).join('') || `<div class="empty">无匹配</div>`;
}

function pickOffField(text, legHint) {
  const fromLeg = legHint && legHint.off_field ? String(legHint.off_field).trim() : '';
  const abs = pick(text, /场外摘要[：:]\s*(.+)/);
  if (abs) {
    let a = abs.replace(/\s+/g, ' ').trim();
    if (a.length > 120) a = a.slice(0, 118) + '…';
    return a;
  }
  if (fromLeg) return fromLeg;
  let s = pick(text, /场外消息[：:]\s*(.+)/) || pick(text, /场外[：:]\s*(.+)/);
  if (!s) return '';
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/^来源[^）]*）\s*[。.]?\s*/, '').replace(/^来源[^。]*。\s*/, '');
  s = s.replace(/天气：暂缺[^。]*。/g, '').replace(/出行：暂缺[^。]*。/g, '').replace(/不以低赔收尾。?/g, '');
  if (/伤停\/停赛[：:].*(unsupported|条目空)/.test(s)) return '伤停通道空，不写满员。';
  const bits = [];
  const inj = s.match(/伤停\s*(.+?)(?=；停赛|；轮换|（计数|$)/);
  const sus = s.match(/停赛\s*(.+?)(?=；轮换|（计数|$)/);
  const cnt = s.match(/（计数\s*([^）]+)）/);
  const names = (chunk) => [...(chunk || '').matchAll(/([A-Za-zÀ-ÿ.]+)\s*（/g)].map(m => m[1]);
  if (inj) {
    const n = names(inj[1]).slice(0, 3);
    bits.push(n.length ? ('伤停 ' + n.join('/')) : '伤停线索有');
  }
  if (sus) {
    const n = names(sus[1]).slice(0, 2);
    if (n.length) bits.push('停赛 ' + n.join('/'));
  }
  if (cnt) bits.push('计' + cnt[1].replace(/\s+/g, ''));
  let out = bits.length ? bits.join('；') : s.slice(0, 52);
  if (out.length > 52) out = out.slice(0, 50) + '…';
  return out;
}

function plainReport(md, m, legHint) {
  let text = String(md || '');
  text = text.replace(/\n---\s*\n(?:后台|规则|验证位)[\s\S]*$/m, '');
  text = text.replace(/\n后台[：:].*/gs, '');
  text = text.replace(/`[^`]+`/g, '');
  text = text.replace(/\*\*/g, '').replace(/\*/g, '');
  text = text.replace(/^#+\s*/gm, '');

  let tendency =
    pick(text, /倾向[：:]\s*(.+)/) ||
    pick(text, /(?<!性质)结论[：:]\s*(.+)/) ||
    guessTendency(text) ||
    (legHint && legHint.double ? `双选观察：${legHint.double}` : '暂无明确方向');
  if (/结论性质|research_observation|market_baseline/.test(tendency)) {
    tendency = pick(text, /倾向[：:]\s*(.+)/) || guessTendency(text) || tendency;
  }
  const action = /不出票|no_bet/i.test(text) || /不出票/.test(tendency) ? '不出票' : '';

  const reasons = [];
  let reasonBlock = text.match(/怎么看[：:]?\s*[\s\S]*?(?=\n足球理由|\n盘口[：:]|\n盘口人话|\n风险|\n销售[：:]|\n结论[：:]|\n我怕|\n最怕|\n动作[：:]|\n证据回放|\n后台|$)/);
  if (!reasonBlock) reasonBlock = text.match(/足球理由[\s\S]*?(?=\n结论|\n动作|\n销售|\n盘口|\n风险|\n证据回放|\n后台|$)/);
  if (reasonBlock) {
    for (const mm of reasonBlock[0].matchAll(/^\d+[\.、]\s*(.+)$/gm)) {
      let line = mm[1].trim().replace(/供应商/g, '数据源');
      if (line) reasons.push(line);
      if (reasons.length >= 4) break;
    }
  }
  if (legHint?.view) reasons.unshift(legHint.view);
  // dedupe similar
  const uniq = [];
  for (const r of reasons) if (!uniq.includes(r)) uniq.push(r);

  let fears = [];
  const fearLine = pick(text, /最怕什么[：:]\s*(.+)/) || pick(text, /我怕什么[：:]\s*(.+)/);
  if (legHint?.fear) fears.push(legHint.fear);
  if (fearLine) fears.push(fearLine);
  for (const r of uniq) if (/怕|防|担心|翻车/.test(r)) fears.push(r);
  fears = [...new Set(fears)].slice(0, 3);
  if (!fears.length) fears.push('销售与价源需临场再核；研究观察，不出票。');
  if (!uniq.length) uniq.push('先看让球与双选方向；细节临场再核。');

  let oddsTalk = simplifyOddsTalk(pick(text, /盘口[：:]\s*(.+)/) || '');

  // 三块：经验复盘 / 数据证据 / 场外
  const exp = pick(text, /经验复盘[：:]\s*(.+)/);
  const dataEv = pick(text, /数据\/?证据[：:]\s*(.+)/);
  const off = pickOffField(text, legHint);
  const tri = [];
  if (exp) tri.push('经验复盘：' + exp);
  if (dataEv) tri.push('数据/证据：' + dataEv);
  const viewItems = tri.length ? tri : uniq.slice(0, 4);

  return `
    <div class="plain">
      <div class="verdict">
        <div class="verdict-label">研究结论</div>
        <div class="verdict-main">${escapeHtml(cleanTendency(tendency))}${action && !/不出票/.test(tendency) ? ' · 不出票' : ''}</div>
        <div class="verdict-sub">${m.badge ? '角标 ' + escapeHtml(m.badge) + ' · ' : ''}仅供研究观察</div>
      </div>
      <div class="section">
        <h3>比赛怎么看</h3>
        <ol>${viewItems.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ol>
      </div>
      <div class="section fear-box">
        <h3>我怕什么</h3>
        <ul>${fears.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      </div>
      <div class="section" id="sec-off">
        <h3>场外消息</h3>
        <p>${off ? escapeHtml(off) : '本场暂无单独场外摘要。'}</p>
      </div>
      <div class="section">
        <h3>市场对照</h3>
        ${oddsTalk ? `<p class="odds-talk">${escapeHtml(oddsTalk)}</p>` : ''}
      </div>
    </div>`;
}

async function selectMatch(id) {
  selectedId = id;
  const seq = ++detailSeq;
  await ensureDay();
  const m = (DATA.matches || []).find(x => x.id === id);
  if (!m) return;
  const name = `${m.home || '?'} vs ${m.away || '?'}`;
  showDetail(`
    <div class="detail-head">
      <span class="hc big">让球 ${escapeHtml(String(m.handicap ?? '—'))}</span>
      <h1>${escapeHtml(name)}</h1>
    </div>
    <div class="kv">
      <span>${escapeHtml(m.product === 'jingcai' ? '竞彩' : '北单')} ${escapeHtml(m.sale_id || '')}</span>
      ${m.badge ? `<span>${escapeHtml(m.badge)}</span>` : ''}
    </div>
    <div class="plain">
      <div class="section" id="sec-view"><h3>比赛怎么看</h3><p class="muted-loading">加载叙述…</p></div>
      <div class="section fear-box" id="sec-fear"><h3>我怕什么</h3><p class="muted-loading">加载中…</p></div>
    </div>`);
  if (!m.report_file) {
    if (seq !== detailSeq) return;
    $('detail-body').querySelector('#sec-view').innerHTML = `<h3>比赛怎么看</h3><p>本场暂无研报。</p>`;
    $('detail-body').querySelector('#sec-fear').innerHTML = `<h3>我怕什么</h3><p>研究观察，不出票。</p>`;
    return;
  }
  try {
    const md = await fetchReport(m.report_file);
    if (seq !== detailSeq) return;
    const body = plainReport(md, m, null);
    const head = $('detail-body').querySelector('.detail-head').outerHTML;
    const kv = $('detail-body').querySelector('.kv').outerHTML;
    $('detail-body').innerHTML = head + kv + body;
  } catch (e) {
    if (seq !== detailSeq) return;
    $('detail-body').querySelector('#sec-view').innerHTML = `<h3>比赛怎么看</h3><p>研报加载失败</p>`;
  }
}

function pick(text, re) {
  const m = text.match(re);
  return m ? m[1].trim() : '';
}
function guessTendency(text) {
  if (/不下方向/.test(text)) return '暂不下方向';
  if (/倾向[：:].*客胜|客胜（研究/.test(text)) return '更看好客胜（观察）';
  if (/倾向[：:].*主胜|主胜（研究|主胜（市场/.test(text)) return '更看好主胜（观察）';
  if (/均势|方向不清/.test(text)) return '比较均势，方向不清';
  return '';
}
function cleanTendency(s) {
  return String(s)
    .replace(/市场基准\s*[·｜|]\s*/g, '')
    .replace(/研究观察\s*[·｜|]\s*/g, '')
    .replace(/数值偏市场基准/g, '')
    .replace(/research_observation|market_baseline/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
function simplifyOddsTalk(s) {
  if (!s) return '';
  let t = String(s).replace(/executable\s*=\s*false/gi, '').trim();
  if (t.length > 100) t = t.slice(0, 98) + '…';
  return t;
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

load();
