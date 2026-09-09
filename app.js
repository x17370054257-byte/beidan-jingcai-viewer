let DATA = null;
let selectedId = null;

const $ = (id) => document.getElementById(id);

async function load() {
  $('list').innerHTML = `<div class="empty">加载场次中…</div>`;
  $('detail').innerHTML = `<div class="empty">加载研报中…</div>`;
  try {
    const res = await fetch('./public/data/day.json?t=' + Date.now());
    if (!res.ok) throw new Error('day.json HTTP ' + res.status);
    DATA = await res.json();
  } catch (err) {
    $('list').innerHTML = `<div class="empty">场次加载失败：${escapeHtml(err.message)}</div>`;
    $('detail').innerHTML = `<div class="empty">请硬刷新或检查 data/day.json</div>`;
    return;
  }
  $('disclaimer').textContent = DATA.disclaimer || '研究观察 · 不出票 · 非投注建议';
  const c = DATA.counts || {};
  const n = (DATA.matches || []).length;
  $('meta').innerHTML = [
    chip('日期 ' + (DATA.date || '')),
    chip('共 ' + n + ' 场'),
    chip('竞彩 ' + (c.jingcai ?? 0)),
    chip('北单 ' + (c.beidan ?? 0)),
    chip('精选 ' + (c.selected ?? 0)),
    chip('观察 ' + (c.observe ?? 0)),
    chip('有研报 ' + (c.with_report ?? 0)),
  ].join('');
  if ($('build')) {
    $('build').textContent = '版本 1.3 · 先足球后市场 · 研究观察 · 已载入 ' + n + ' 场';
  }
  renderList();
  const rows = sortedMatches(DATA.matches || []);
  const pref =
    rows.find(m => m.sale_id === '周三008') ||
    rows.find(m => m.badge === '观察' && m.has_report) ||
    rows.find(m => m.has_report) ||
    rows[0];
  if (pref) selectMatch(pref.id);
  else $('detail').innerHTML = `<div class="empty">今日暂无场次</div>`;
}

function chip(t) { return `<span class="chip">${escapeHtml(t)}</span>`; }

function badgeRank(m) {
  if (m.badge === '精选') return 0;
  if (m.badge === '观察') return 1;
  if (m.has_report) return 2;
  if (m.product === 'jingcai') return 3;
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
      <div class="sub">${escapeHtml(m.product === 'jingcai' ? '竞彩' : '北单')} ${escapeHtml(m.sale_id || '')} · ${escapeHtml(m.league || '')} · 让${escapeHtml(String(m.handicap ?? '—'))} · ${escapeHtml(kick)}</div>
    </div>`;
  }).join('') || `<div class="empty">无匹配场次（试试「全部角标」或清空搜索）</div>`;
  $('list').querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', () => selectMatch(el.dataset.id));
  });
}

/** 把研报原文收成大白话卡片；兼容新「结论/盘口/怎么看」与旧「倾向/盘口人话/足球理由」 */
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

  // 盘口：新段落优先，其次旧「盘口人话」列表，再回退赔率芯片
  let oddsTalk = '';
  const oddsLine = pick(text, /盘口[：:]\s*(.+)/);
  if (oddsLine) {
    oddsTalk = simplifyOddsTalk(oddsLine);
  } else {
    const oddsBlock = text.match(/盘口人话[\s\S]*?(?=\n市场参考|\n足球理由|\n怎么看|\n结论|$)/);
    if (oddsBlock) {
      const bullets = [...oddsBlock[0].matchAll(/^[\-\d\.、]+\s*(.+)$/gm)].map(x => x[1].trim());
      const good = bullets.find(b => !/缺同公司|样本不足|初盘→临盘|executable|去水|百分点/.test(b));
      oddsTalk = simplifyOddsTalk(good || bullets[0] || '');
    }
  }
  if (!oddsTalk) {
    const nspf = Array.isArray(m.nspf) ? m.nspf.join('/') : '';
    oddsTalk = nspf
      ? `渠道参考胜平负大约 ${nspf}（只作对照，不是可买价）。`
      : '盘口细节不多，先看比赛本身。';
  }

  const reasons = [];
  let reasonBlock = text.match(/怎么看[：:]?\s*[\s\S]*?(?=\n足球理由|\n盘口[：:]|\n盘口人话|\n风险|\n销售[：:]|\n结论[：:]|\n动作[：:]|\n证据回放|\n后台|$)/);
  if (!reasonBlock) {
    reasonBlock = text.match(/足球理由[\s\S]*?(?=\n结论|\n动作|\n销售|\n盘口|\n风险|\n证据回放|\n后台|$)/);
  }
  if (reasonBlock) {
    for (const mm of reasonBlock[0].matchAll(/^\d+[\.、]\s*(.+)$/gm)) {
      let line = mm[1].trim();
      line = line.replace(/fixture\s*\d+/gi, '').replace(/evidence[^。]*/gi, '');
      line = line.replace(/供应商|去水|market_baseline|research_observation|production_weight/gi, (s) => {
        if (s === '供应商') return '数据源';
        return '';
      });
      line = line.replace(/\s{2,}/g, ' ').trim();
      if (line && !/待填/.test(line)) reasons.push(line);
      if (reasons.length >= 5) break;
    }
  }
  if (!reasons.length) {
    reasons.push('本场研报尚无展开足球叙事，先看编号、让球与结论卡；证据补齐后会刷新。');
  }

  const sell = simplifySell(pick(text, /销售[：:]\s*(.+)/) || m.sell_status);
  const risks = buildRisks(text, m, action, sell);

  const badgeLabel = m.badge ? `角标：${m.badge}` : '未打精选/观察角标';

  return `
    <div class="plain">
      <div class="verdict">
        <div class="verdict-label">研究结论</div>
        <div class="verdict-main">${escapeHtml(cleanTendency(tendency))}${action && !/不出票/.test(tendency) ? ' · ' + escapeHtml(action) : ''}</div>
        <div class="verdict-sub">${escapeHtml(badgeLabel)} · 仅供研究观察，不是投注建议</div>
      </div>
      <div class="section">
        <h3>比赛怎么看</h3>
        <ol>${reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ol>
      </div>
      <div class="section">
        <h3>盘口对照</h3>
        <p>${escapeHtml(oddsTalk)}</p>
      </div>
      <div class="section risk">
        <h3>风险与边界</h3>
        <ul>${risks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      </div>
      <div class="section soft">
        <p>销售：${escapeHtml(sell)} · 让球 ${escapeHtml(String(m.handicap ?? '—'))}${Array.isArray(m.nspf) ? ' · 参考赔率 ' + escapeHtml(m.nspf.join('/')) : ''}</p>
      </div>
    </div>
  `;
}

function buildRisks(text, m, action, sell) {
  const risks = ['研究观察 · 不出票 · 非投注建议，不构成购彩指引。'];
  if (action || /不出票/.test(text)) risks.push('发布层默认不出票，方向只作对照。');
  if (/首发|阵容|伤停|名单/.test(text)) risks.push('阵容/首发线索需临场再核，不等于官宣。');
  if (/待核|截止|paused|ended|官方/.test(String(sell) + text)) risks.push('销售状态以官方体彩渠道为准，页面仅作研究对照。');
  if (!m.has_report) risks.push('本场尚无完整研报。');
  return risks.slice(0, 4);
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
    .replace(/研究观察\s*[｜|·]\s*数值偏市场基准/g, '观察')
    .replace(/市场基准\s*[·｜|]\s*/g, '')
    .replace(/研究观察\s*[·｜|]\s*/g, '')
    .replace(/research_observation|market_baseline|blocked_price|decision_gate/gi, '')
    .replace(/[（(]\s*[）)]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[·｜|]{2,}/g, '·')
    .trim();
}

function simplifyOddsTalk(s) {
  if (!s) return '';
  let t = s
    .replace(/executable\s*=\s*false/gi, '')
    .replace(/去水[^。；]*/g, '')
    .replace(/隐含概率/g, '市场看法')
    .replace(/不等于更值得买/g, '不等于就该买')
    .replace(/跨产品不能叫「?降水」?/g, '两边口径不一样，不能直接比升降水')
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
  renderList();
  const m = (DATA.matches || []).find(x => x.id === id);
  if (!m) return;

  let body = '<div class="empty">本场暂无研报，先看编号和让球即可。</div>';
  if (m.report_file) {
    try {
      const r = await fetch('./public/data/reports/' + encodeURIComponent(m.report_file) + '?t=' + Date.now());
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const md = await r.text();
      body = plainReport(md, m);
    } catch (e) {
      body = `<div class="empty">研报加载失败：${escapeHtml(e.message)}</div>`;
    }
  }

  const badgeHtml = m.badge
    ? `<span class="badge big ${escapeHtml(m.badge)}">${escapeHtml(m.badge)}</span>`
    : '';

  $('detail').innerHTML = `
    <div class="detail-head">
      <h1>${escapeHtml(m.home || '?')} vs ${escapeHtml(m.away || '?')}</h1>
      ${badgeHtml}
    </div>
    <div class="kv">
      <span>${escapeHtml(m.product === 'jingcai' ? '竞彩' : '北单')} ${escapeHtml(m.sale_id || '')}</span>
      <span>${escapeHtml(m.league || '—')}</span>
      <span>${escapeHtml(m.kickoff || '时间待定')}</span>
      <span>让球 ${escapeHtml(String(m.handicap ?? '—'))}</span>
    </div>
    ${body}
  `;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

['q','product','badge','report'].forEach(id => $(id).addEventListener('input', renderList));
load().catch(err => {
  $('detail').innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
});
