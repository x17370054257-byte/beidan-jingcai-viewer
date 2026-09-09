let DATA = null;
let selectedId = null;

const $ = (id) => document.getElementById(id);

async function load() {
  const res = await fetch('./public/data/day.json?t=' + Date.now());
  DATA = await res.json();
  $('disclaimer').textContent = DATA.disclaimer || '研究观察 · 不出票 · 非投注建议';
  const c = DATA.counts || {};
  $('meta').innerHTML = [
    chip('日期 ' + (DATA.date || '')),
    chip('竞彩 ' + (c.jingcai ?? 0)),
    chip('北单 ' + (c.beidan ?? 0)),
    chip('精选 ' + (c.selected ?? 0)),
    chip('观察 ' + (c.observe ?? 0)),
  ].join('');
  renderList();
  const pref = (DATA.matches || []).find(m => m.sale_id === '周三008') || (DATA.matches || [])[0];
  if (pref) selectMatch(pref.id);
}

function chip(t) { return `<span class="chip">${escapeHtml(t)}</span>`; }

function filtered() {
  const q = $('q').value.trim().toLowerCase();
  const product = $('product').value;
  const badge = $('badge').value;
  const report = $('report').value;
  return (DATA.matches || []).filter(m => {
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
    return `<div class="item ${active}" data-id="${escapeHtml(m.id)}">
      <div class="row1">
        <div class="teams">${escapeHtml(m.home || '?')} vs ${escapeHtml(m.away || '?')}</div>
        ${b}
      </div>
      <div class="sub">${escapeHtml(m.product === 'jingcai' ? '竞彩' : '北单')} ${escapeHtml(m.sale_id || '')} · ${escapeHtml(m.league || '')} · 让${escapeHtml(String(m.handicap ?? '—'))}</div>
    </div>`;
  }).join('') || `<div class="empty">无匹配场次</div>`;
  $('list').querySelectorAll('.item').forEach(el => {
    el.addEventListener('click', () => selectMatch(el.dataset.id));
  });
}

/** 把研报原文收成大白话卡片 */
function plainReport(md, m) {
  let text = String(md || '');
  // cut backend / rules footers
  text = text.split(/\n---\s*\n/)[0];
  text = text.replace(/\n后台[：:].*/gs, '');
  text = text.replace(/\n规则[：:].*/gs, '');
  text = text.replace(/`[^`]+`/g, '');
  text = text.replace(/\*\*/g, '').replace(/\*/g, '');
  text = text.replace(/^#+\s*/gm, '');

  const tendency = pick(text, /倾向[：:]\s*(.+)/) || guessTendency(text) || '暂无明确方向';
  const action = /不出票|no_bet/i.test(text) ? '不出票' : '';

  // odds one-liner: prefer 盘口人话 first bullet, else simple from match chips
  let oddsTalk = '';
  const oddsBlock = text.match(/盘口人话[\s\S]*?(?=\n市场参考|\n足球理由|\n结论|$)/);
  if (oddsBlock) {
    const bullets = [...oddsBlock[0].matchAll(/^[\-\d\.、]+\s*(.+)$/gm)].map(x => x[1].trim());
    const good = bullets.find(b => !/缺同公司|样本不足|初盘→临盘|executable|去水|百分点/.test(b));
    oddsTalk = simplifyOddsTalk(good || bullets[0] || '');
  }
  if (!oddsTalk) {
    const nspf = Array.isArray(m.nspf) ? m.nspf.join('/') : '';
    oddsTalk = nspf
      ? `渠道参考胜平负大约 ${nspf}（只作对照，不是可买价）。`
      : '盘口细节不多，先看比赛本身。';
  }

  const reasons = [];
  const reasonBlock = text.match(/足球理由[\s\S]*?(?=\n结论|\n动作|\n后台|$)/);
  if (reasonBlock) {
    for (const mm of reasonBlock[0].matchAll(/^\d+[\.、]\s*(.+)$/gm)) {
      let line = mm[1].trim();
      line = line.replace(/fixture\s*\d+/gi, '').replace(/evidence[^。]*/gi, '');
      line = line.replace(/供应商|去水|market_baseline|research_observation|production_weight/gi, '');
      line = line.replace(/\s{2,}/g, ' ').trim();
      if (line && !/待填/.test(line)) reasons.push(line);
      if (reasons.length >= 3) break;
    }
  }
  if (!reasons.length) {
    reasons.push('证据包还在自动补采：会拉阵容伤停与盘口对照，补齐后刷新本页。');
  }

  const sell = simplifySell(m.sell_status);
  const badge = m.badge ? `角标：${m.badge}` : '';

  return `
    <div class="plain">
      <div class="verdict">
        <div class="verdict-main">${escapeHtml(cleanTendency(tendency))}${action ? ' · ' + escapeHtml(action) : ''}</div>
        <div class="verdict-sub">${escapeHtml(badge || '未打精选角标')} · 仅供研究观察，不是投注建议</div>
      </div>
      <div class="section">
        <h3>盘口一句话</h3>
        <p>${escapeHtml(oddsTalk)}</p>
      </div>
      <div class="section">
        <h3>怎么看这场</h3>
        <ol>${reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ol>
      </div>
      <div class="section soft">
        <p>销售：${escapeHtml(sell)} · 让球 ${escapeHtml(String(m.handicap ?? '—'))}${Array.isArray(m.nspf) ? ' · 参考赔率 ' + escapeHtml(m.nspf.join('/')) : ''}</p>
      </div>
    </div>
  `;
}

function pick(text, re) {
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function guessTendency(text) {
  if (/不下方向/.test(text)) return '暂不下方向';
  if (/倾向[：:].*客胜|客胜（研究/.test(text)) return '更看好客胜（观察）';
  if (/倾向[：:].*主胜|主胜（研究/.test(text)) return '更看好主胜（观察）';
  if (/均势|方向不清/.test(text)) return '比较均势，方向不清';
  return '';
}

function cleanTendency(s) {
  return String(s)
    .replace(/研究观察\s*[｜|]\s*数值偏市场基准/g, '观察')
    .replace(/research_observation|market_baseline|blocked_price|decision_gate/gi, '')
    .replace(/[（(]\s*[）)]/g, '')
    .replace(/\s{2,}/g, ' ')
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
  // shorten if too long
  if (t.length > 90) t = t.slice(0, 88) + '…';
  return t;
}

function simplifySell(s) {
  const t = String(s || '待核验');
  if (/ended|截止|isend/i.test(t)) return '渠道显示已截止（官方以体彩为准）';
  if (/在售/.test(t)) return '渠道显示在售（官方以体彩为准）';
  if (/暂停/.test(t)) return '渠道提示暂停/待核验';
  return t.length > 40 ? '销售状态待核验' : t;
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
      const md = await r.text();
      body = plainReport(md, m);
    } catch (e) {
      body = `<div class="empty">研报加载失败</div>`;
    }
  }

  $('detail').innerHTML = `
    <h1>${escapeHtml(m.home || '?')} vs ${escapeHtml(m.away || '?')}</h1>
    <div class="kv">
      <span>${escapeHtml(m.product === 'jingcai' ? '竞彩' : '北单')} ${escapeHtml(m.sale_id || '')}</span>
      <span>${escapeHtml(m.league || '—')}</span>
      <span>${escapeHtml(m.kickoff || '时间待定')}</span>
      ${m.badge ? `<span>${escapeHtml(m.badge)}</span>` : ''}
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
