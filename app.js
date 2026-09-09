let DATA = null;
let DOUBLES = null;
let selectedId = null;
let mode = 'desk'; // desk | all
let deskKind = 'beidan7'; // beidan7 | jingcai

const $ = (id) => document.getElementById(id);

async function load() {
  $('desk-list').innerHTML = `<div class="empty">加载双选短表…</div>`;
  $('detail').innerHTML = `<div class="empty">加载中…</div>`;
  try {
    const [dayRes, dblRes] = await Promise.all([
      fetch('./public/data/day.json?t=' + Date.now()),
      fetch('./public/data/doubles.json?t=' + Date.now()),
    ]);
    if (!dayRes.ok) throw new Error('day.json HTTP ' + dayRes.status);
    DATA = await dayRes.json();
    DOUBLES = dblRes.ok ? await dblRes.json() : null;
  } catch (err) {
    $('desk-list').innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    $('detail').innerHTML = `<div class="empty">请硬刷新</div>`;
    return;
  }

  $('disclaimer').textContent = DATA.disclaimer || '研究观察 · 不出票 · 非投注建议';
  const c = DATA.counts || {};
  const n = (DATA.matches || []).length;
  const asOf = (DATA.as_of || DOUBLES?.as_of || '').replace('T', ' ').slice(0, 19);
  $('build').textContent = `版本 1.4 · 已载入 ${n} 场 · 刷新 ${asOf || '—'}`;

  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.onclick = () => setMode(btn.dataset.mode);
  });
  document.querySelectorAll('.desk-btn').forEach(btn => {
    btn.onclick = () => {
      deskKind = btn.dataset.desk;
      document.querySelectorAll('.desk-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderDesk();
    };
  });
  ['q', 'product', 'badge', 'report'].forEach(id => $(id).addEventListener('input', renderList));

  setMode('desk');
  // auto-open first beidan7 leg detail if match exists
  const first = DOUBLES?.beidan7?.legs?.[0];
  if (first) openLeg(first);
}

function setMode(next) {
  mode = next;
  document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  const desk = mode === 'desk';
  $('desk').hidden = !desk;
  $('toolbar').hidden = desk;
  $('list').hidden = desk;
  if (desk) renderDesk();
  else {
    renderList();
    const rows = filtered();
    const pref = rows.find(m => m.badge === '观察' && m.has_report) || rows.find(m => m.has_report) || rows[0];
    if (pref) selectMatch(pref.id);
  }
}

function renderDesk() {
  if (!DOUBLES) {
    $('desk-list').innerHTML = `<div class="empty">暂无双选短表</div>`;
    return;
  }
  if (deskKind === 'beidan7') {
    const pack = DOUBLES.beidan7;
    $('desk-note').textContent = pack.note || '';
    $('desk-list').innerHTML = pack.legs.map(leg => deskCardBeidan(leg)).join('') || `<div class="empty">无腿</div>`;
  } else {
    const pack = DOUBLES.jingcai;
    $('desk-note').textContent = pack.summary || '';
    $('desk-list').innerHTML = pack.legs.map(leg => deskCardJingcai(leg)).join('') || `<div class="empty">无腿</div>`;
  }
  $('desk-list').querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', () => {
      const raw = el.getAttribute('data-open');
      const leg = JSON.parse(decodeURIComponent(raw));
      openLeg(leg);
    });
  });
}

function deskCardBeidan(leg) {
  const sp = Array.isArray(leg.sp) ? leg.sp.join(' / ') : '';
  const payload = encodeURIComponent(JSON.stringify(leg));
  return `<button type="button" class="desk-card" data-open="${payload}">
    <div class="desk-top">
      <span class="desk-no">#${escapeHtml(String(leg.no))} · 北单 ${escapeHtml(leg.sale_id)}</span>
      <span class="hc">让球 ${escapeHtml(leg.handicap)}</span>
    </div>
    <div class="desk-teams">${escapeHtml(leg.home)} vs ${escapeHtml(leg.away)}</div>
    <div class="desk-double">双选 <strong>${escapeHtml(leg.double)}</strong></div>
    <div class="odds-row">
      <span class="odds-label" title="${escapeHtml(leg.tip || '')}">${escapeHtml(leg.odds_label || '北单让球SP')}</span>
      ${sp ? `<span class="odds-val">${escapeHtml(sp)}</span>` : `<span class="odds-miss">无SP</span>`}
    </div>
    <div class="desk-sub">销售 ${escapeHtml(leg.sell || '—')} · ${escapeHtml(leg.tip || '')}</div>
  </button>`;
}

function deskCardJingcai(leg) {
  const payload = encodeURIComponent(JSON.stringify(leg));
  const nspf = Array.isArray(leg.nspf) ? leg.nspf.join(' / ') : '';
  const spf = Array.isArray(leg.spf) ? leg.spf.join(' / ') : '';
  return `<button type="button" class="desk-card" data-open="${payload}">
    <div class="desk-top">
      <span class="desk-no">竞彩 ${escapeHtml(leg.sale_id)}</span>
      <span class="hc">让球 ${escapeHtml(leg.handicap)}</span>
    </div>
    <div class="desk-teams">${escapeHtml(leg.home)} vs ${escapeHtml(leg.away)}</div>
    <div class="desk-double">双选 <strong>${escapeHtml(leg.double)}</strong></div>
    <div class="odds-row">
      <span class="odds-label" title="${escapeHtml(leg.tip_nspf || '')}">${escapeHtml(leg.odds_label_nspf || '竞彩非让')}</span>
      ${nspf ? `<span class="odds-val">${escapeHtml(nspf)}</span>` : `<span class="odds-miss">无SP</span>`}
    </div>
    <div class="odds-row">
      <span class="odds-label" title="${escapeHtml(leg.tip_spf || '')}">${escapeHtml(leg.odds_label_spf || '竞彩让球')}</span>
      ${spf ? `<span class="odds-val">${escapeHtml(spf)}</span>` : `<span class="odds-miss">无SP</span>`}
    </div>
    ${leg.view ? `<div class="desk-sub">怎么看：${escapeHtml(leg.view)}</div>` : ''}
    ${leg.fear ? `<div class="desk-sub fear">怕：${escapeHtml(leg.fear)}</div>` : ''}
  </button>`;
}

function openLeg(leg) {
  // prefer day.json match
  const id = leg.id || (leg.sale_id?.startsWith('周') ? `jingcai:${leg.sale_id}` : `beidan:${leg.sale_id}`);
  const m = (DATA.matches || []).find(x => x.id === id || x.sale_id === leg.sale_id);
  if (m && m.has_report) {
    selectMatch(m.id);
    return;
  }
  // fallback: render desk leg as manager card without report file
  selectedId = id;
  const hc = leg.handicap ?? '—';
  let oddsHtml = '';
  if (leg.sp) {
    oddsHtml = oddsBlock('北单让球SP', leg.sp.join(' / '), leg.tip);
  } else {
    oddsHtml = [
      oddsBlock('竞彩非让', Array.isArray(leg.nspf) ? leg.nspf.join(' / ') : '', leg.tip_nspf),
      oddsBlock('竞彩让球', Array.isArray(leg.spf) ? leg.spf.join(' / ') : '', leg.tip_spf),
    ].join('');
  }
  $('detail').innerHTML = `
    <div class="detail-head">
      <h1>${escapeHtml(leg.home)} vs ${escapeHtml(leg.away)}</h1>
      <span class="hc big">让球 ${escapeHtml(String(hc))}</span>
    </div>
    <div class="kv">
      <span>${escapeHtml(id.startsWith('jingcai') ? '竞彩' : '北单')} ${escapeHtml(leg.sale_id)}</span>
      <span>双选 ${escapeHtml(leg.double || '—')}</span>
    </div>
    <div class="plain">
      <div class="verdict">
        <div class="verdict-label">研究结论</div>
        <div class="verdict-main">双选观察：${escapeHtml(leg.double || '—')} · 不出票</div>
        <div class="verdict-sub">工作台短表 · 仅供研究观察，不是投注建议</div>
      </div>
      <div class="section">
        <h3>比赛怎么看</h3>
        <p>${escapeHtml(leg.view || '本腿以双选短表为主；完整叙事见对应研报（若有）。')}</p>
      </div>
      <div class="section fear-box">
        <h3>我怕什么</h3>
        <p>${escapeHtml(leg.fear || '销售暂停/价源非官方；方向只作研究对照。')}</p>
      </div>
      <div class="section">
        <h3>市场对照</h3>
        ${oddsHtml}
      </div>
    </div>`;
}

function oddsBlock(label, val, tip) {
  if (!val) return `<div class="odds-row"><span class="odds-label">${escapeHtml(label)}</span><span class="odds-miss">无SP</span></div>`;
  return `<div class="odds-row"><span class="odds-label" title="${escapeHtml(tip || '')}">${escapeHtml(label)}</span><span class="odds-val">${escapeHtml(val)}</span></div>
    ${tip ? `<p class="odds-tip">${escapeHtml(tip)}</p>` : ''}`;
}

function chip(t) { return `<span class="chip">${escapeHtml(t)}</span>`; }

function badgeRank(m) {
  if (m.badge === '精选') return 0;
  if (m.badge === '观察') return 1;
  if (m.has_report) return 2;
  if (m.product === 'beidan') return 3;
  return 4;
}

function sortedMatches(list) {
  return [...list].sort((a, b) => {
    const d = badgeRank(a) - badgeRank(b);
    if (d) return d;
    return String(a.sale_id || '').localeCompare(String(b.sale_id || ''), 'zh');
  });
}

function filtered() {
  const q = $('q').value.trim().toLowerCase();
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
    const bag = [m.sale_id, m.home, m.away, m.league, m.product].join(' ').toLowerCase();
    return bag.includes(q);
  });
}

function renderList() {
  const rows = filtered();
  $('list').innerHTML = rows.map(m => {
    const active = m.id === selectedId ? 'active' : '';
    const b = m.badge ? `<span class="badge ${escapeHtml(m.badge)}">${escapeHtml(m.badge)}</span>` : '';
    const kick = m.kickoff ? String(m.kickoff).replace(/^2026-/, '') : '时间待定';
    return `<div class="item ${active}" data-id="${escapeHtml(m.id)}">
      <div class="row1">
        <div class="teams">${escapeHtml(m.home || '?')} vs ${escapeHtml(m.away || '?')}</div>
        ${b}
      </div>
      <div class="sub">
        <span class="hc-inline">让${escapeHtml(String(m.handicap ?? '—'))}</span>
        ${escapeHtml(m.product === 'jingcai' ? '竞彩' : '北单')} ${escapeHtml(m.sale_id || '')} · ${escapeHtml(m.league || '')} · ${escapeHtml(kick)}
      </div>
      ${oddsMini(m)}
    </div>`;
  }).join('') || `<div class="empty">无匹配场次</div>`;
  $('list').querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', () => selectMatch(el.dataset.id));
  });
}

function oddsMini(m) {
  if (m.product === 'beidan') {
    const sp = Array.isArray(m.spf) ? m.spf : (Array.isArray(m.nspf) ? m.nspf : null);
    if (!sp) return `<div class="odds-mini"><span class="odds-label">北单让球SP</span><span class="odds-miss">无SP</span></div>`;
    return `<div class="odds-mini"><span class="odds-label" title="让胜/让平/让负">北单让球SP</span><span class="odds-val">${escapeHtml(sp.join('/'))}</span></div>`;
  }
  const nspf = Array.isArray(m.nspf) ? m.nspf.join('/') : '';
  const spf = Array.isArray(m.spf) ? m.spf.join('/') : '';
  return `<div class="odds-mini">
    <div><span class="odds-label" title="主胜/平/客胜，不含让球">竞彩非让</span>${nspf ? `<span class="odds-val">${escapeHtml(nspf)}</span>` : `<span class="odds-miss">无SP</span>`}</div>
    <div><span class="odds-label" title="让胜/让平/让负">竞彩让球</span>${spf ? `<span class="odds-val">${escapeHtml(spf)}</span>` : `<span class="odds-miss">无SP</span>`}</div>
  </div>`;
}

function plainReport(md, m) {
  let text = String(md || '');
  text = text.split(/\n---\s*\n/)[0];
  text = text.replace(/\n后台[：:].*/gs, '');
  text = text.replace(/\n规则[：:].*/gs, '');
  text = text.replace(/`[^`]+`/g, '');
  text = text.replace(/\*\*/g, '').replace(/\*/g, '');
  text = text.replace(/^#+\s*/gm, '');

  let tendency =
    pick(text, /结论[：:]\s*(.+)/) ||
    pick(text, /倾向[：:]\s*(.+)/) ||
    guessTendency(text) ||
    '暂无明确方向';
  const action = /不出票|no_bet/i.test(text) || /不出票/.test(tendency) ? '不出票' : '';

  let oddsTalk = '';
  const oddsLine = pick(text, /盘口[：:]\s*(.+)/);
  if (oddsLine) oddsTalk = simplifyOddsTalk(oddsLine);
  else {
    const oddsBlockMd = text.match(/盘口人话[\s\S]*?(?=\n市场参考|\n足球理由|\n怎么看|\n结论|\n风险|$)/);
    if (oddsBlockMd) {
      const bullets = [...oddsBlockMd[0].matchAll(/^[\-\d\.、]+\s*(.+)$/gm)].map(x => x[1].trim());
      oddsTalk = simplifyOddsTalk(bullets[0] || '');
    }
  }

  const reasons = [];
  let reasonBlock = text.match(/怎么看[：:]?\s*[\s\S]*?(?=\n足球理由|\n盘口[：:]|\n盘口人话|\n风险|\n销售[：:]|\n结论[：:]|\n我怕|\n最怕|\n动作[：:]|\n证据回放|\n后台|$)/);
  if (!reasonBlock) reasonBlock = text.match(/足球理由[\s\S]*?(?=\n结论|\n动作|\n销售|\n盘口|\n风险|\n证据回放|\n后台|$)/);
  if (reasonBlock) {
    for (const mm of reasonBlock[0].matchAll(/^\d+[\.、]\s*(.+)$/gm)) {
      let line = mm[1].trim();
      line = line.replace(/fixture\s*\d+/gi, '');
      line = line.replace(/market_baseline|research_observation|production_weight/gi, '');
      line = line.replace(/供应商/g, '数据源');
      line = line.replace(/\s{2,}/g, ' ').trim();
      if (line && !/待填/.test(line)) reasons.push(line);
      if (reasons.length >= 5) break;
    }
  }
  if (!reasons.length) reasons.push('本场研报尚无展开足球叙事，先看让球与结论。');

  // 我怕什么：explicit 最怕/我怕 / lines containing 怕的是
  let fears = [];
  const fearLine = pick(text, /最怕什么[：:]\s*(.+)/) || pick(text, /我怕什么[：:]\s*(.+)/);
  if (fearLine) fears.push(fearLine);
  for (const r of reasons) {
    if (/怕|防|风险|担心/.test(r)) fears.push(r);
  }
  if (!fears.length) {
    const risk = pick(text, /风险与声明[：:]\s*(.+)/);
    if (risk) fears.push(simplifyOddsTalk(risk));
  }
  if (!fears.length) fears.push('销售与价源需临场再核；研究观察，不出票。');
  // dedupe
  fears = [...new Set(fears)].slice(0, 3);

  const sell = simplifySell(pick(text, /销售[：:]\s*(.+)/) || m.sell_status);

  return `
    <div class="plain">
      <div class="verdict">
        <div class="verdict-label">研究结论</div>
        <div class="verdict-main">${escapeHtml(cleanTendency(tendency))}${action && !/不出票/.test(tendency) ? ' · ' + escapeHtml(action) : ''}</div>
        <div class="verdict-sub">${m.badge ? '角标：' + escapeHtml(m.badge) + ' · ' : ''}仅供研究观察，不是投注建议</div>
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
        ${marketBlocks(m, oddsTalk)}
      </div>
      <div class="section soft">
        <p>销售：${escapeHtml(sell)}</p>
      </div>
    </div>`;
}

function marketBlocks(m, oddsTalk) {
  const bits = [];
  if (m.product === 'beidan') {
    const sp = Array.isArray(m.spf) ? m.spf.join(' / ') : (Array.isArray(m.nspf) ? m.nspf.join(' / ') : '');
    bits.push(oddsBlock('北单让球SP', sp, '让胜/让平/让负 · 渠道快照 · 非成交价'));
  } else {
    bits.push(oddsBlock('竞彩非让', Array.isArray(m.nspf) ? m.nspf.join(' / ') : '', '主胜/平/客胜，不含让球 · 非成交价'));
    bits.push(oddsBlock('竞彩让球', Array.isArray(m.spf) ? m.spf.join(' / ') : '', '让胜/让平/让负 · 非成交价'));
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
  if (/结论[：:].*客胜|倾向[：:].*客胜|客胜（研究/.test(text)) return '更看好客胜（观察）';
  if (/结论[：:].*主胜|倾向[：:].*主胜|主胜（研究|主胜（市场/.test(text)) return '更看好主胜（观察）';
  if (/均势|方向不清/.test(text)) return '比较均势，方向不清';
  return '';
}

function cleanTendency(s) {
  return String(s)
    .replace(/市场基准\s*[·｜|]\s*/g, '')
    .replace(/研究观察\s*[·｜|]\s*/g, '')
    .replace(/research_observation|market_baseline|blocked_price|decision_gate/gi, '')
    .replace(/[（(]\s*[）)]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function simplifyOddsTalk(s) {
  if (!s) return '';
  let t = String(s)
    .replace(/executable\s*=\s*false/gi, '')
    .replace(/去水[^。；]*/g, '')
    .replace(/隐含概率/g, '市场看法')
    .trim();
  if (t.length > 120) t = t.slice(0, 118) + '…';
  return t;
}

function simplifySell(s) {
  const t = String(s || '待核验');
  if (/ended|截止|isend/i.test(t)) return '渠道显示已截止（官方以体彩为准）';
  if (/在售|on_sale/i.test(t)) return '渠道显示在售（官方以体彩为准）';
  if (/暂停|paused/i.test(t)) return '渠道提示暂停/待核验';
  return t.length > 60 ? t.slice(0, 58) + '…' : t;
}

async function selectMatch(id) {
  selectedId = id;
  if (mode === 'all') renderList();
  const m = (DATA.matches || []).find(x => x.id === id);
  if (!m) return;

  let body = '<div class="empty">本场暂无研报，先看编号和让球。</div>';
  if (m.report_file) {
    try {
      const r = await fetch('./public/data/reports/' + encodeURIComponent(m.report_file) + '?t=' + Date.now());
      if (!r.ok) throw new Error('HTTP ' + r.status);
      body = plainReport(await r.text(), m);
    } catch (e) {
      body = `<div class="empty">研报加载失败：${escapeHtml(e.message)}</div>`;
    }
  }

  const badgeHtml = m.badge ? `<span class="badge big ${escapeHtml(m.badge)}">${escapeHtml(m.badge)}</span>` : '';
  $('detail').innerHTML = `
    <div class="detail-head">
      <h1>${escapeHtml(m.home || '?')} vs ${escapeHtml(m.away || '?')}</h1>
      <span class="hc big">让球 ${escapeHtml(String(m.handicap ?? '—'))}</span>
    </div>
    <div class="kv">
      <span>${escapeHtml(m.product === 'jingcai' ? '竞彩' : '北单')} ${escapeHtml(m.sale_id || '')}</span>
      <span>${escapeHtml(m.league || '—')}</span>
      <span>${escapeHtml(m.kickoff || '时间待定')}</span>
      ${badgeHtml}
    </div>
    ${body}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

load();
