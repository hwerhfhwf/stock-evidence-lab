import { buildWorkbench } from '/diagnosis-model.js';
import {
  BYD_SNAPSHOT,
  createBydDemoBundle,
  deriveBydResearch,
  factsForMode,
} from '/finscope-data.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const YI = 100_000_000;
const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const yi = (value, digits = 2) => `${(Number(value) / YI).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })} 亿元`;
const pct = (value, digits = 2) => `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(digits)}%`;
const growth = (current, prior) => ((current / prior) - 1) * 100;
const signedYi = (value) => `${Number(value) > 0 ? '+' : ''}${(Number(value) / YI).toFixed(2)} 亿元`;

const state = {
  mode: 'simple',
  period: 'half',
  cashView: 'structure',
  research: deriveBydResearch(BYD_SNAPSHOT),
  bundle: createBydDemoBundle(BYD_SNAPSHOT),
  workbench: null,
  opener: null,
};
state.workbench = buildWorkbench(state.bundle, { name: '比亚迪', thscode: '002594.SZ', companyType: 'manufacturing' }, $('#research-question').value);

const evidenceById = new Map(state.research.evidence.map((item) => [item.id, item]));
const sourceById = new Map(BYD_SNAPSHOT.sources.map((item) => [item.id, item]));
const claimById = new Map(state.research.claims.map((item) => [item.id, item]));

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 2800);
}

function statusLabel(status) {
  return ({ fact: '客观事实', inference: '分析推断', unverified: '暂无法验证' })[status] || status;
}

function directionLabel(direction) {
  return ({ positive: '支持', negative: '反向', conflicting: '方向分化', missing: '证据缺口' })[direction] || direction;
}

function setMode(mode, options = {}) {
  state.mode = mode === 'professional' ? 'professional' : 'simple';
  factsForMode(state.research, state.mode);
  document.body.classList.toggle('mode-professional', state.mode === 'professional');
  $$('[data-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
  if (!options.silent) showToast(state.mode === 'professional' ? '已展开财务原值表' : '已收起财务原值表');
}

function renderSegments() {
  const total = BYD_SNAPSHOT.segments.reduce((sum, segment) => sum + segment.revenue2025, 0);
  const shares = BYD_SNAPSHOT.segments.map((segment) => segment.revenue2025 / total * 100);
  $('#segment-chart').innerHTML = `
    <div class="segment-bar" role="img" aria-label="汽车及相关产品 ${shares[0].toFixed(2)}%，手机部件及组装 ${shares[1].toFixed(2)}%，其他 ${shares[2].toFixed(2)}%">
      ${shares.map((share) => `<span style="width:${share}%"></span>`).join('')}
    </div>
    <div class="segment-legend">
      ${BYD_SNAPSHOT.segments.slice(0, 2).map((segment, index) => `<div><i></i><span>${esc(segment.name)}</span><strong>${shares[index].toFixed(2)}%</strong></div>`).join('')}
    </div>`;
}

function periodView(period) {
  if (period === 'annual') {
    const prior = BYD_SNAPSHOT.annual.find((row) => row.year === 2024);
    const current = BYD_SNAPSHOT.annual.find((row) => row.year === 2025);
    return {
      label: '2024 / 2025 · 年度口径 · 同比变化',
      priorLabel: '2024', currentLabel: '2025', prior, current,
      refs: 'annual-revenue,annual-parent-profit,annual-cfo',
      values: [
        { label: '营业收入', value: state.research.metrics.annualRevenueGrowthPct, amount: current.revenue },
        { label: '归母净利润', value: state.research.metrics.annualParentProfitGrowthPct, amount: current.parentProfit },
        { label: '经营净现金', value: state.research.metrics.annualCfoGrowthPct, amount: current.cfo },
      ],
      claim: 'annual-direction',
      conclusion: '2025 年收入同比增长 3.46%，归母净利润下降 18.96%，经营净现金下降 55.69%。',
    };
  }
  if (period === 'q1') {
    const prior = BYD_SNAPSHOT.q1[2025];
    const current = BYD_SNAPSHOT.q1[2026];
    return {
      label: '2025Q1 / 2026Q1 · 累计口径 · 同比变化',
      priorLabel: '2025Q1', currentLabel: '2026Q1', prior, current,
      refs: 'q1-revenue,q1-parent-profit,q1-cfo',
      values: [
        { label: '营业收入', value: growth(current.revenue, prior.revenue), amount: current.revenue },
        { label: '归母净利润', value: growth(current.parentProfit, prior.parentProfit), amount: current.parentProfit },
        { label: '经营净现金', value: growth(current.cfo, prior.cfo), amount: current.cfo },
      ],
      claim: null,
      conclusion: '2026Q1 收入、归母净利润与经营净现金均低于上年同期。',
    };
  }
  const prior = BYD_SNAPSHOT.half[2025];
  const current = BYD_SNAPSHOT.half[2026];
  return {
    label: '2025H1 / 2026H1 · 累计口径 · 同比变化',
    priorLabel: '2025H1', currentLabel: '2026H1', prior, current,
    refs: 'h1-revenue,h1-parent-profit,h1-cfo',
    values: [
      { label: '营业收入', value: state.research.metrics.h1RevenueGrowthPct, amount: current.revenue },
      { label: '归母净利润', value: state.research.metrics.h1ParentProfitGrowthPct, amount: current.parentProfit },
      { label: '经营净现金', value: state.research.metrics.h1OperatingCashGrowthPct, amount: current.cfo },
    ],
    claim: 'h1-divergence',
    conclusion: '2026H1 收入与归母净利润下降，经营净现金同比增加 17.28%。',
  };
}

function changeChart(items) {
  const width = 520;
  const height = 205;
  const plotTop = 31;
  const plotBottom = 158;
  const min = Math.min(-10, ...items.map((item) => item.value)) - 5;
  const max = Math.max(10, ...items.map((item) => item.value)) + 5;
  const y = (value) => plotTop + ((max - value) / (max - min)) * (plotBottom - plotTop);
  const zeroY = y(0);
  const barWidth = 72;
  const gap = 80;
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="收入、归母净利润和经营净现金同比变化">
    <line class="zero" x1="24" x2="500" y1="${zeroY}" y2="${zeroY}" />
    <text class="axis" x="4" y="${zeroY + 3}">0%</text>
    ${items.map((item, index) => {
      const x = 58 + index * (barWidth + gap);
      const valueY = y(item.value);
      const top = Math.min(zeroY, valueY);
      const barHeight = Math.max(2, Math.abs(zeroY - valueY));
      const color = item.value >= 0 ? 'var(--green)' : 'var(--red)';
      const marker = item.value >= 0 ? '▲' : '▼';
      return `<rect x="${x}" y="${top}" width="${barWidth}" height="${barHeight}" rx="3" fill="${color}" opacity=".78" />
        <text class="value" x="${x + barWidth / 2}" y="${item.value >= 0 ? top - 10 : top + barHeight + 18}" text-anchor="middle">${marker} ${pct(item.value)}</text>
        <text class="label" x="${x + barWidth / 2}" y="185" text-anchor="middle">${item.label}</text>`;
    }).join('')}
  </svg>`;
}

function renderOperating() {
  const view = periodView(state.period);
  $('#operating-chart').innerHTML = changeChart(view.values);
  $('#operating-period').textContent = view.label;
  const sourceButton = $('#operating-period').nextElementSibling;
  sourceButton.dataset.evidence = view.refs;
  $('#operating-metric').innerHTML = view.values.map((item) => `<div><span>${esc(item.label)}</span><strong class="${item.value >= 0 ? 'up' : 'down'}">${pct(item.value)}</strong><small>${yi(item.amount)}</small></div>`).join('');
  const conclusion = $('#operating-conclusion');
  conclusion.dataset.claim = view.claim || '';
  conclusion.dataset.evidence = view.claim ? '' : view.refs;
  conclusion.innerHTML = `<span class="status-chip ${view.values.some((item) => item.value >= 0) && view.values.some((item) => item.value < 0) ? 'conflicting' : 'negative'}">${view.values.some((item) => item.value >= 0) && view.values.some((item) => item.value < 0) ? '方向分化' : '同比下降'}</span><strong>${esc(view.conclusion)}</strong><span aria-hidden="true">↗</span>`;
  conclusion.setAttribute('aria-expanded', 'false');
  $('#operating-table').innerHTML = `<table><thead><tr><th>指标</th><th>${view.priorLabel}</th><th>${view.currentLabel}</th><th>同比</th></tr></thead><tbody>${view.values.map((item) => {
    const key = item.label === '营业收入' ? 'revenue' : item.label === '归母净利润' ? 'parentProfit' : 'cfo';
    return `<tr><td>${item.label}</td><td>${yi(view.prior[key])}</td><td>${yi(view.current[key])}</td><td>${pct(item.value)}</td></tr>`;
  }).join('')}</tbody></table>`;
}

function renderProfit() {
  const a2024 = BYD_SNAPSHOT.annual.find((row) => row.year === 2024);
  const a2025 = BYD_SNAPSHOT.annual.find((row) => row.year === 2025);
  const grossDelta = (a2025.revenue - a2025.cost) - (a2024.revenue - a2024.cost);
  const parentDelta = a2025.parentProfit - a2024.parentProfit;
  const otherDelta = parentDelta - grossDelta;
  const rows = [
    { label: '毛利变化', value: grossDelta, color: 'var(--red)' },
    { label: '其他损益净影响', value: otherDelta, color: 'var(--green)' },
    { label: '归母利润变化', value: parentDelta, color: 'var(--red)' },
  ];
  const max = Math.max(...rows.map((row) => Math.abs(row.value)));
  $('#profit-chart').innerHTML = `<svg class="chart-svg" viewBox="0 0 430 174" role="img" aria-label="2025 年利润变化分解">
    ${rows.map((row, index) => {
      const y = 25 + index * 50;
      const bar = Math.abs(row.value) / max * 215;
      return `<text class="label" x="8" y="${y + 11}">${row.label}</text><line class="grid" x1="130" x2="365" y1="${y + 7}" y2="${y + 7}"/><rect x="130" y="${y}" width="${bar}" height="14" rx="3" fill="${row.color}" opacity=".78"/><text class="value" x="${Math.min(415, 140 + bar)}" y="${y + 11}">${signedYi(row.value)}</text>`;
    }).join('')}
    <text class="axis" x="8" y="170">其他损益为毛利变化与归母利润变化之间的合计差额</text>
  </svg>`;
}

function renderCash() {
  const rows = [
    { label: '经营净现金', a: BYD_SNAPSHOT.cashFlow[2024].cfo, b: BYD_SNAPSHOT.cashFlow[2025].cfo },
    { label: '投资净现金', a: BYD_SNAPSHOT.cashFlow[2024].investing, b: BYD_SNAPSHOT.cashFlow[2025].investing },
    { label: '筹资净现金', a: BYD_SNAPSHOT.cashFlow[2024].financing, b: BYD_SNAPSHOT.cashFlow[2025].financing },
  ];
  const max = Math.max(...rows.flatMap((row) => [Math.abs(row.a), Math.abs(row.b)]));
  const chartRows = state.cashView === 'structure' ? rows : rows.map((row) => ({ label: row.label, a: row.b - row.a, b: row.b }));
  $('#cash-chart').innerHTML = `<div class="cash-list">${chartRows.map((row) => `<div class="cash-row"><span>${row.label}</span><div class="dual-bar" aria-label="${state.cashView === 'structure' ? `2024 ${yi(row.a)}，2025 ${yi(row.b)}` : `同比变化 ${yi(row.a)}，2025 ${yi(row.b)}`}"><i style="width:${Math.abs(row.a) / max * 100}%"></i><i style="width:${Math.abs(row.b) / max * 100}%"></i></div><strong>${state.cashView === 'structure' ? yi(row.b, 1) : signedYi(row.a)}</strong></div>`).join('')}</div>`;
}

function renderBalance() {
  const b24 = BYD_SNAPSHOT.balance[2024];
  const b25 = BYD_SNAPSHOT.balance[2025];
  const rows = [
    { label: '资产负债率', before: b24.liabilities / b24.assets * 100, after: b25.liabilities / b25.assets * 100, max: 100, unit: '%' },
    { label: '流动比率', before: b24.currentAssets / b24.currentLiabilities, after: b25.currentAssets / b25.currentLiabilities, max: 1.2, unit: '×' },
    { label: '货币资金', before: b24.cash / YI, after: b25.cash / YI, max: 1200, unit: '亿' },
  ];
  $('#balance-chart').innerHTML = `<div class="liquidity-list">${rows.map((row) => `<div class="liquidity-row"><label>${row.label}</label><div class="track"><i style="width:${Math.min(100, row.after / row.max * 100)}%"></i></div><strong>${row.before.toFixed(row.unit === '亿' ? 1 : 2)} → ${row.after.toFixed(row.unit === '亿' ? 1 : 2)}${row.unit}</strong></div>`).join('')}</div>`;
  $('#finance-table').innerHTML = `<table><thead><tr><th>指标</th><th>2024</th><th>2025</th></tr></thead><tbody>
    <tr><td>资产总额</td><td>${yi(b24.assets)}</td><td>${yi(b25.assets)}</td></tr>
    <tr><td>负债总额</td><td>${yi(b24.liabilities)}</td><td>${yi(b25.liabilities)}</td></tr>
    <tr><td>流动资产</td><td>${yi(b24.currentAssets)}</td><td>${yi(b25.currentAssets)}</td></tr>
    <tr><td>流动负债</td><td>${yi(b24.currentLiabilities)}</td><td>${yi(b25.currentLiabilities)}</td></tr>
    <tr><td>货币资金</td><td>${yi(b24.cash)}</td><td>${yi(b25.cash)}</td></tr>
  </tbody></table>`;
}

function renderValuation() {
  const { ttmParentProfitYi, ttmParentProfitOperandsYi } = state.research.metrics;
  $('#ttm-formula').innerHTML = `<div class="formula"><div class="equation">326.19 − 155.11 + 123.25<br>= <strong>${ttmParentProfitYi.toFixed(2)} 亿元</strong></div><small>2025 年归母利润 − 2025H1 + 2026H1</small></div>`;
  const multiples = [15, 20, 25, 30, 35, 40];
  $('#valuation-grid').innerHTML = `<div class="sensitivity-grid">${multiples.map((multiple) => `<div><span>${multiple}× PE 假设</span><strong>${Math.round(ttmParentProfitYi * multiple).toLocaleString('zh-CN')} 亿元</strong></div>`).join('')}</div>`;
  void ttmParentProfitOperandsYi;
}

function renderEvents() {
  const events = [
    { date: '2026-08-29', title: '2026 年中报', text: '收入同比 -7.13%，归母净利润 -20.54%，经营净现金 +17.28%。', refs: 'h1-revenue,h1-parent-profit,h1-cfo', type: 'fact' },
    { date: '2026-08-02', title: '7 月产销快报', text: '当月销量 419,211 辆；累计 2,227,722 辆，仍低于上年同期。', source: 'JUL26', type: 'fact' },
    { date: '2026-07-01', title: '6 月产销快报', text: '当月销量 403,472 辆；累计 1,808,511 辆，仍低于上年同期。', source: 'JUN26', type: 'fact' },
    { date: '2026-04-29', title: '2026 年一季报', text: 'Q1 收入、归母净利润与经营净现金均同比下降。', refs: 'q1-revenue,q1-parent-profit,q1-cfo', type: 'negative' },
    { date: '尚缺', title: '经营驱动拆分', text: '价格、销量与产品结构对收入的独立贡献尚未分离。', claim: 'drivers-unknown', type: 'unknown' },
  ];
  $('#event-list').innerHTML = events.map((event) => `<button class="event-card" ${event.refs ? `data-evidence="${event.refs}"` : ''} ${event.source ? `data-source="${event.source}"` : ''} ${event.claim ? `data-claim="${event.claim}"` : ''} aria-expanded="false"><time>${event.date}</time><h3>${event.title}</h3><p>${event.text}</p><span class="status-chip ${event.type}">${event.type === 'unknown' ? '暂无法验证' : event.type === 'negative' ? '反向证据' : '客观事实'}</span></button>`).join('');
}

function rawValue(value) {
  if (value === null || value === undefined) return '未披露';
  if (typeof value === 'number' && Math.abs(value) >= 1_000_000) return yi(value);
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString('zh-CN') : String(value);
}

function evidenceCard(item) {
  const source = sourceById.get(item.sourceId);
  return `<article class="evidence-item"><header><h3>${esc(item.label)}</h3><span>${esc(item.sourceId)}</span></header><div class="evidence-meta"><span>${esc(item.period)}</span><span>第 ${item.pages.join('、')} 页</span><span>${esc(item.scope)}</span><span>${esc(item.unit)}</span></div><div class="raw-values">${item.rawValues.map((value, index) => `<code>原值 ${index + 1} · ${esc(rawValue(value))}</code>`).join('')}</div>${source ? `<a href="${esc(source.url)}" target="_blank" rel="noreferrer">打开原报告 ↗</a>` : ''}</article>`;
}

function sourceCard(source) {
  return `<article class="evidence-item"><header><h3>${esc(source.name)}</h3><span>${esc(source.id)}</span></header><div class="evidence-meta"><span>${esc(source.disclosed)}</span><span>${esc(source.period)}</span></div><p>${esc(source.publisher)}</p><p>${esc(source.unitNote)}</p><a href="${esc(source.url)}" target="_blank" rel="noreferrer">打开原报告 ↗</a></article>`;
}

function openEvidence(refs, trigger, options = {}) {
  const drawer = $('#evidence-drawer');
  const content = $('#drawer-content');
  state.opener = trigger || document.activeElement;
  if (state.opener?.setAttribute) state.opener.setAttribute('aria-expanded', 'true');
  const ids = String(refs || '').split(',').map((id) => id.trim()).filter(Boolean);
  const items = ids.map((id) => evidenceById.get(id)).filter(Boolean);
  const sources = (options.sourceIds || []).map((id) => sourceById.get(id)).filter(Boolean);
  const header = options.title ? `<div class="evidence-summary"><h3>${esc(options.title)}</h3>${options.summary ? `<p>${esc(options.summary)}</p>` : ''}</div>` : '';
  content.innerHTML = `${header}${items.map(evidenceCard).join('')}${sources.map(sourceCard).join('')}${!items.length && !sources.length ? `<div class="empty-evidence">${esc(options.empty || '该判断尚无可核对的原值与出处。')}</div>` : ''}`;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  $('aside', drawer).focus();
}

function openClaim(id, trigger) {
  const claim = claimById.get(id);
  if (!claim) return;
  const summary = `${statusLabel(claim.epistemicStatus)} · ${directionLabel(claim.evidenceDirection)}${claim.missingReason ? `。${claim.missingReason}` : ''}`;
  openEvidence(claim.evidenceRefs.join(','), trigger, { title: claim.title, summary, empty: claim.missingReason });
}

function closeDrawer() {
  const drawer = $('#evidence-drawer');
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (state.opener?.setAttribute) state.opener.setAttribute('aria-expanded', 'false');
  if (state.opener?.focus) state.opener.focus();
  state.opener = null;
}

function renderAll() {
  renderSegments();
  renderOperating();
  renderProfit();
  renderCash();
  renderBalance();
  renderValuation();
  renderEvents();
}

const sectionByDimension = {
  operating_quality: 'operating', financial_trend: 'finance', valuation: 'valuation',
  market_characteristics: 'market', industry_position: 'peers', material_events: 'events', risk: 'events',
};

$('#research-task').addEventListener('submit', (event) => {
  event.preventDefault();
  const question = $('#research-question').value.trim();
  state.workbench = buildWorkbench(state.bundle, { name: '比亚迪', thscode: '002594.SZ', companyType: 'manufacturing' }, question);
  const selected = state.workbench.report.selectedDimensions.slice(0, 3);
  $('#priority-result').innerHTML = `<strong>${esc(question || '公司研究')}</strong><ul>${selected.map((item) => `<li><a href="#${sectionByDimension[item.dimension]}">${esc(item.label)}</a>：${esc(item.relevanceReason)}</li>`).join('')}</ul>`;
  $('#priority-result').hidden = false;
  const target = document.getElementById(sectionByDimension[selected[0].dimension]);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$$('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
$$('[data-period]').forEach((button) => button.addEventListener('click', () => {
  state.period = button.dataset.period;
  $$('[data-period]').forEach((item) => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  renderOperating();
}));
$$('[data-cash-view]').forEach((button) => button.addEventListener('click', () => {
  state.cashView = button.dataset.cashView;
  $$('[data-cash-view]').forEach((item) => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  renderCash();
}));

document.addEventListener('click', (event) => {
  const evidenceTrigger = event.target.closest('[data-evidence]');
  const claimTrigger = event.target.closest('[data-claim]');
  const sourceTrigger = event.target.closest('[data-source]');
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (claimTrigger?.dataset.claim) { openClaim(claimTrigger.dataset.claim, claimTrigger); return; }
  if (evidenceTrigger?.dataset.evidence) { openEvidence(evidenceTrigger.dataset.evidence, evidenceTrigger); return; }
  if (sourceTrigger?.dataset.source) { openEvidence('', sourceTrigger, { sourceIds: [sourceTrigger.dataset.source] }); return; }
  if (event.target.closest('[data-close]')) { closeDrawer(); return; }
  if (action === 'peers') document.getElementById('peers').scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (action === 'events') document.getElementById('events').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (action === 'assistant') { document.getElementById('research-task').scrollIntoView({ behavior: 'smooth' }); $('#research-question').focus(); }
  if (action === 'sources') openEvidence('', event.target.closest('[data-action]'), { sourceIds: BYD_SNAPSHOT.sources.map((source) => source.id), title: '披露文件', summary: '每个指标和判断仍绑定到具体页码与原值。' });
  if (action === 'favorite') {
    const button = $('#favorite-button');
    const next = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(next));
    button.textContent = next ? '已关注' : '关注';
  }
  if (action === 'print') window.print();
  if (action === 'export') {
    const payload = { meta: BYD_SNAPSHOT.meta, metrics: state.research.metrics, claims: state.research.claims, evidence: state.research.evidence, sources: BYD_SNAPSHOT.sources };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'finscope-byd-research.json' });
    link.click();
    URL.revokeObjectURL(url);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && $('#evidence-drawer').classList.contains('open')) closeDrawer();
  if (event.key === 'Tab' && $('#evidence-drawer').classList.contains('open')) {
    const focusable = $$('a[href],button:not([disabled]),[tabindex="0"]', $('#evidence-drawer')).filter((node) => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

const searchInput = $('#stock-search');
const searchResults = $('#search-results');
searchInput.addEventListener('focus', () => { searchResults.hidden = false; searchResults.innerHTML = '<button type="button"><strong>比亚迪</strong><br><small>002594.SZ · 当前研究快照</small></button>'; searchInput.setAttribute('aria-expanded', 'true'); });
searchInput.addEventListener('input', () => { searchResults.hidden = false; searchResults.innerHTML = /比亚迪|002594/i.test(searchInput.value) ? '<button type="button"><strong>比亚迪</strong><br><small>002594.SZ · 当前研究快照</small></button>' : '<button type="button" disabled>当前演示仅包含比亚迪快照</button>'; });
searchResults.addEventListener('click', () => { searchInput.value = '比亚迪 · 002594.SZ'; searchResults.hidden = true; searchInput.setAttribute('aria-expanded', 'false'); });
document.addEventListener('pointerdown', (event) => { if (!event.target.closest('#company-search')) { searchResults.hidden = true; searchInput.setAttribute('aria-expanded', 'false'); } });

const menu = $('#research-nav');
const menuButton = $('#mobile-menu');
const navBackdrop = $('#nav-backdrop');
function setMenu(open) {
  menu.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  navBackdrop.hidden = !open;
}
menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
navBackdrop.addEventListener('click', () => setMenu(false));
$$('.primary-nav a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

const observer = new IntersectionObserver((entries) => {
  const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  $$('[data-nav]').forEach((link) => link.classList.toggle('active', link.dataset.nav === visible.target.id));
}, { rootMargin: '-20% 0px -65% 0px', threshold: [0, .2, .6] });
$$('.section-anchor').forEach((section) => observer.observe(section));

renderAll();
setMode('simple', { silent: true });
