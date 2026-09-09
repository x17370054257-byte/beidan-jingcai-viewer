let DATA = null;
let DOUBLES = null;
let selectedId = null;
let mode = 'desk';
let deskKind = 'beidan7';

const $ = (id) => document.getElementById(id);

async function load() {
  $('desk-list').innerHTML = `<div class="empty">加载短表…</div>`;
  try {
    const [dayRes, dblRes] = await Promise.all([
      fetch('./public/data/day.json?t=' + Date.now()),
      fetch('./public/data/doubles.json?t=' + Date.now()),
    ]);
    if (!dayRes.ok) throw new Error('day.json ' + dayRes.status);
    DATA = await dayRes.json();
    DOUBLES = dblRes.ok ? await dblRes.json() : null;
  } catch (err) {
    $('desk-list').innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    return;
  }

  $('disclaimer').textContent = DATA.disclaimer || '研究观察 · 不出票 · 非投注建议';
  const n = (DATA.matches || []).length;
  const asOf = (DATA.as_of || DOUBLES?.as_of || '').replace('T', ' ').slice(0, 16);
  $('build').textContent = `1.4 · ${n} 场 · ${asOf || '—'}`;

  document.querySelectorAll('.chip-sw[data-desk]').forEach(btn => {
    btn.onclick = () => {
      deskKind = btn.dataset.desk;
      document.querySelectorAll('.chip-sw[data-desk]').forEach(b => b.classList.toggle('active', b === btn));
      setMode('desk');
    };
  });
  $('tab-all').onclick = () => setMode('all');
  $('back-btn').onclick = () => closeDetail();
  ['q', 'product', 'badge', 'report'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', renderList);
  });

  setMode('desk');
}

function setMode(next) {
  mode = next;
  const desk = mode === 'desk';
  $('desk').hidden = !desk;
  $('toolbar').hidden = desk;
  $('list').hidden = desk;
  document.querySelectorAll('.chip-sw[data-desk]').forEach(b => {
    b.classList.toggle('active', desk && b.dataset.desk === deskKind);
  });
  $('tab-all').classList.toggle('active', !desk);
  if (desk) renderDesk();
  else renderList();
  closeDetail();
}

function renderDesk() {
  if (!DOUBLES) {
    $('desk-list').innerHTML = `<div class="empty">暂无双选短表</div>`;
    return;
  }
  if (deskKind === 'beidan7') {
    const pack = DOUBLES.beidan7;
    $('desk-note').textContent = '';
    $('desk-list').innerHTML = (pack.legs || []).map(deskCardBeidan).join('') || `<div class="empty">无腿</div>`;
  } else {
    const pack = DOUBLES.jingcai;
    $('desk-note').textContent = pack.summary || '';
    $('desk-list').innerHTML = (pack.legs || []).map(deskCardJingcai).join('') || `<div class="empty">无腿</div>`;
  }
  $('desk-list').querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', () => openLeg(JSON.parse(decodeURIComponent(el.getAttribute('data-open')))));
  });
}

function deskCardBeidan(leg) {
  const sp = Array.isArray(leg.sp) ? leg.sp.join(' / ') : '';
  const payload = encodeURIComponent(JSON.stringify(leg));
  const name = leg.match_name || `${leg.home} vs ${leg.away}`;
  return `<button type="button" class="desk-card" data-open="${payload}">
    <div class="desk-top">
      <span class="desk-no">北单 ${escapeHtml(leg.sale_id)}</span>
      <span class="hc">让 ${escapeHtml(leg.handicap)}</span>
    </div>
    <div class="desk-teams">${escapeHtml(name)}</div>
    <div class="desk-double"><em>双选</em>${escapeHtml(leg.double)}</div>
    <div class="odds-row">
      <span class="odds-label">北单让球SP</span>
      ${sp ? `<span class="odds-val">${escapeHtml(sp)}</span>` : `<span class="odds-miss">无SP</span>`}
    </div>
  </button>`;
}

function deskCardJingcai(leg) {
  const payload = encodeURIComponent(JSON.stringify(leg));
  const name = leg.match_name || `${leg.home} vs ${leg.away}`;
  const nspf = Array.isArray(leg.nspf) ? leg.nspf.join(' / ') : '';
  return `<button type="button" class="desk-card" data-open="${payload}">
    <div class="desk-top">
      <span class="desk-no">${escapeHtml(leg.sale_id)}</span>
      <span class="hc">让 ${escapeHtml(leg.handicap)}</span>
    </div>
    <div class="desk-teams">${escapeHtml(name)}</div>
    <div class="desk-double"><em>双选</em>${escapeHtml(leg.double)}</div>
    <div class="odds-row">
      <span class="odds-label">竞彩非让</span>
      ${nspf ? `<span class="odds-val">${escapeHtml(nspf)}</span>` : `<span class="odds-miss">无SP</span>`}
    </div>
  </button>`;
}

function openLeg(leg) {
  const id = leg.id || (String(leg.sale_id).startsWith('周') ? `jingcai:${leg.sale_id}` : `beidan:${leg.sale_id}`);
  const m = (DATA.matches || []).find(x => x.id === id || x.sale_id === leg.sale_id);
  if (m && m.has_report && m.report_file) {
    selectMatch(m.id, leg);
    return;
  }
  showDetail(renderLegDetail(leg));
}

function renderLegDetail(leg) {
  const name = leg.match_name || `${leg.home} vs ${leg.away}`;
  const reasons = leg.view ? [leg.view] : ['本腿以双选短表为主。'];
  const fears = leg.fear ? [leg.fear] : ['销售与价源需临场再核；研究观察，不出票。'];
  let oddsHtml = '';
  if (leg.sp) oddsHtml = oddsBlock('北单让球SP', leg.sp.join(' / '), leg.tip);
  else {
    oddsHtml = oddsBlock('竞彩非让', Array.isArray(leg.nspf) ? leg.nspf.join(' / ') : '', leg.tip_nspf)
      + oddsBlock('竞彩让球', Array.isArray(leg.spf) ? leg.spf.join(' / ') : '', leg.tip_spf);
  }
  return `
    <div class="detail-head">
      <span class="hc big">让球 ${escapeHtml(String(leg.handicap ?? '—'))}</span>
      <h1>${escapeHtml(name)}</h1>
    </div>
    <div class="kv">
      <span>${escapeHtml(String(leg.sale_id).startsWith('周') ? '竞彩' : '北单')} ${escapeHtml(leg.sale_id)}</span>
      <span>双选 ${escapeHtml(leg.double || '—')}</span>
    </div>
    <div class="plain">
      <div class="verdict">
        <div class="verdict-label">研究结论</div>
        <div class="verdict-main">双选：${escapeHtml(leg.double || '—')} · 不出票</div>
        <div class="verdict-sub">短表观察 · 不是投注建议</div>
      </div>
      <div class="section">
        <h3>比赛怎么看</h3>
        <ol>${reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ol>
      </div>
      <div class="section fear-box">
        <h3>我怕什么</h3>
        <ul>${fears.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      </div>
      <div class="section">
        <h3>市场对照</h3>
        ${oddsHtml}
      </div>
    </div>`;
}

function oddsBlock(label, val, tip) {
  if (!val) return `<div class="odds-row"><span class="odds-label">${escapeHtml(label)}</span><span class="odds-miss">无SP</span></div>`;
  return `<div class="odds-row"><span class="odds-label">${escapeHtml(label)}</span><span class="odds-val">${escapeHtml(val)}</span></div>
    ${tip ? `<p class="odds-tip">${escapeHtml(tip)}</p>` : ''}`;
}

function showDetail(html) {
  $('detail-body').innerHTML = html;
  $('detail').hidden = false;
  window.scrollTo(0, 0);
}

function closeDetail() {
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
  const q = ($('q').value || '').trim().toLowerCase();
  const product = $('product').value;
  const badge = $('badge').value;
  const report = $('report').value;
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
  const rows = filtered();
  $('list').innerHTML = rows.map(m => {
    const b = m.badge ? `<span class="badge ${escapeHtml(m.badge)}">${escapeHtml(m.badge)}</span>` : '';
    return `<div class="item" data-id="${escapeHtml(m.id)}">
      <div class="row1" style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <div class="teams">${escapeHtml(m.home || '?')} vs ${escapeHtml(m.away || '?')}</div>
        ${b}
      </div>
      <div class="sub"><span class="hc-inline">让${escapeHtml(String(m.handicap ?? '—'))}</span>${escapeHtml(m.product === 'jingcai' ? '竞彩' : '北单')} ${escapeHtml(m.sale_id || '')}</div>
    </div>`;
  }).join('') || `<div class="empty">无匹配</div>`;
  $('list').querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', () => selectMatch(el.dataset.id));
  });
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
  if (legHint && legHint.view) reasons.unshift(legHint.view);
  if (!reasons.length) reasons.push('先看让球与双选方向；细节临场再核。');

  let fears = [];
  const fearLine = pick(text, /最怕什么[：:]\s*(.+)/) || pick(text, /我怕什么[：:]\s*(.+)/);
  if (legHint && legHint.fear) fears.push(legHint.fear);
  if (fearLine) fears.push(fearLine);
  for (const r of reasons) if (/怕|防|担心/.test(r)) fears.push(r);
  fears = [...new Set(fears)].slice(0, 3);
  if (!fears.length) fears.push('销售与价源需临场再核；研究观察，不出票。');

  let oddsTalk = pick(text, /盘口[：:]\s*(.+)/) || '';
  oddsTalk = simplifyOddsTalk(oddsTalk);

  return `
    <div class="plain">
      <div class="verdict">
        <div class="verdict-label">研究结论</div>
        <div class="verdict-main">${escapeHtml(cleanTendency(tendency))}${action && !/不出票/.test(tendency) ? ' · 不出票' : ''}</div>
        <div class="verdict-sub">${m.badge ? '角标 ' + escapeHtml(m.badge) + ' · ' : ''}仅供研究观察</div>
      </div>
      <div class="section">
        <h3>比赛怎么看</h3>
        <ol>${reasons.slice(0, 4).map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ol>
      </div>
      <div class="section fear-box">
        <h3>我怕什么</h3>
        <ul>${fears.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      </div>
      <div class="section">
        <h3>市场对照</h3>
        ${marketBlocks(m, oddsTalk, legHint)}
      </div>
    </div>`;
}

function marketBlocks(m, oddsTalk, legHint) {
  const bits = [];
  if (legHint && legHint.sp) bits.push(oddsBlock('北单让球SP', legHint.sp.join(' / '), 'okooo · 非500官方'));
  else if (m.product === 'beidan') {
    const sp = Array.isArray(m.spf) ? m.spf.join(' / ') : (Array.isArray(m.nspf) ? m.nspf.join(' / ') : '');
    bits.push(oddsBlock('北单让球SP', sp, '让胜/让平/让负 · 非成交价'));
  } else {
    bits.push(oddsBlock('竞彩非让', Array.isArray(m.nspf) ? m.nspf.join(' / ') : '', '主胜/平/客胜'));
    bits.push(oddsBlock('竞彩让球', Array.isArray(m.spf) ? m.spf.join(' / ') : '', '让胜/让平/让负'));
  }
  if (oddsTalk) bits.push(`<p class="odds-talk">${escapeHtml(oddsTalk)}</p>`);
  return bits.join('');
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

async function selectMatch(id, legHint) {
  selectedId = id;
  const m = (DATA.matches || []).find(x => x.id === id);
  if (!m) return;
  let body = '<div class="empty">本场暂无研报</div>';
  if (m.report_file) {
    try {
      const r = await fetch('./public/data/reports/' + encodeURIComponent(m.report_file) + '?t=' + Date.now());
      if (!r.ok) throw new Error('HTTP ' + r.status);
      body = plainReport(await r.text(), m, legHint);
    } catch (e) {
      body = legHint ? renderLegDetail(legHint) : `<div class="empty">研报加载失败</div>`;
    }
  } else if (legHint) {
    body = renderLegDetail(legHint).replace(/^[\s\S]*?<div class="plain">/, '<div class="plain">');
    // simpler: just use leg detail full
    showDetail(renderLegDetail(legHint));
    return;
  }
  const name = `${m.home || '?'} vs ${m.away || '?'}`;
  showDetail(`
    <div class="detail-head">
      <span class="hc big">让球 ${escapeHtml(String(m.handicap ?? '—'))}</span>
      <h1>${escapeHtml(name)}</h1>
    </div>
    <div class="kv">
      <span>${escapeHtml(m.product === 'jingcai' ? '竞彩' : '北单')} ${escapeHtml(m.sale_id || '')}</span>
      ${m.badge ? `<span>${escapeHtml(m.badge)}</span>` : ''}
      ${legHint && legHint.double ? `<span>双选 ${escapeHtml(legHint.double)}</span>` : ''}
    </div>
    ${body}`);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

load();
