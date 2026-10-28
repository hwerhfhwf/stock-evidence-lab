import { buildWorkbench } from '/diagnosis-model.js';
import { BYD_SNAPSHOT, createBydDemoBundle, deriveBydResearch, factsForMode } from '/finscope-data.js';
import { createResearchClient, ResearchClientError } from '/data-client.js';
import { normalizeResearchView } from '/research-view.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const client = createResearchClient(globalThis.fetch.bind(globalThis));
const YI = 100_000_000;
const chartColors = ['#35a9e8', '#42c7a8', '#efbd68', '#a995ef'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const isByd = code => String(code).toUpperCase() === BYD_SNAPSHOT.meta.symbol;

const state = {
  company: { name: '比亚迪', thscode: '002594.SZ', companyType: 'manufacturing' },
  bundle: createBydDemoBundle(BYD_SNAPSHOT),
  view: normalizeResearchView(null, { name: '比亚迪', thscode: '002594.SZ' }, BYD_SNAPSHOT),
  research: deriveBydResearch(BYD_SNAPSHOT),
  mode: 'simple',
  opener: null,
  searchItems: [],
};

const evidenceById = new Map(state.research.evidence.map(item => [item.id, item]));
const sourceById = new Map(BYD_SNAPSHOT.sources.map(item => [item.id, item]));

function formatPrice(value) {
  const n = number(value);
  return n === null ? '—' : n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(value, digits = 2) {
  const n = number(value);
  return n === null ? '暂无数据' : `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

function formatYi(value, digits = 1) {
  const n = number(value);
  return n === null ? '暂无数据' : `${(n / YI).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })} 亿`;
}

function formatTurnover(value) {
  const n = number(value);
  if (n === null) return '—';
  if (Math.abs(n) >= YI) return `${(n / YI).toFixed(1)} 亿`;
  if (Math.abs(n) >= 10_000) return `${(n / 10_000).toFixed(1)} 万`;
  return n.toLocaleString('zh-CN');
}

function formatMetric(value, suffix = '', digits = 2) {
  const n = number(value);
  return n === null ? '暂无数据' : `${n.toFixed(digits)}${suffix}`;
}

function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', withTime ? { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false } : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function reportLabel(row, fallback = '') {
  if (row?.label) return row.label;
  if (row?.fiscal_year && row?.fiscal_period) return `${row.fiscal_year}${row.fiscal_period}`;
  const value = number(row?.period_end_ms ?? row?.period_end ?? row?.dateMs);
  return value === null ? fallback : new Date(value).toISOString().slice(0, 10);
}

function moduleError(module) {
  return module?.errors?.[0]?.message || '该数据暂不可用';
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3000);
}

function emptyState(title, detail = '暂无数据') {
  return `<div class="empty-state"><strong>${esc(title)}</strong><span>${esc(detail)}</span></div>`;
}

function renderModuleStatus() {
  const status = $('#module-status');
  const modules = state.bundle?.modules ?? {};
  const available = ['market', 'financials', 'indicators', 'valuation'].filter(key => ['ok', 'partial'].includes(modules[key]?.status)).length;
  status.className = `module-status ${state.view.sourceState.mode === 'live' ? 'is-live' : 'is-fallback'}`;
  status.innerHTML = state.view.sourceState.mode === 'live'
    ? `<span class="pulse" aria-hidden="true"></span><strong>扶摇实时数据</strong><span>${available}/4 个核心模块可用${state.view.context.status === 'unavailable' ? ' · iFinD 增强未配置' : ''}</span>`
    : '<span class="pulse" aria-hidden="true"></span><strong>公开披露快照</strong><span>实时服务不可用；行情与估值不展示</span>';
}

function renderQuote() {
  const { company, quote, sourceState } = state.view;
  $('#company-name').textContent = company.name;
  $('#company-code').textContent = company.thscode;
  $('#side-company-name').textContent = company.name;
  $('#side-company-code').textContent = company.thscode;
  $('.company-mark').textContent = isByd(company.thscode) ? 'BYD' : company.name.slice(0, 2).toUpperCase();
  $('#company-market').textContent = company.thscode.endsWith('.SH') ? '上交所 · A 股' : company.thscode.endsWith('.BJ') ? '北交所 · A 股' : '深交所 · A 股';
  $('#quote-price').textContent = formatPrice(quote.lastPrice);
  const change = $('#quote-change');
  change.textContent = formatPct(quote.changePct);
  change.className = number(quote.changePct) > 0 ? 'up' : number(quote.changePct) < 0 ? 'down' : '';
  $('#quote-turnover').textContent = formatTurnover(quote.turnover);
  $('#data-time').textContent = formatDate(sourceState.generatedAt, true);
  $('#source-badge').textContent = sourceState.label;
}

function renderBusiness() {
  const byd = isByd(state.view.company.thscode);
  $('#business-summary').textContent = byd
    ? '以新能源汽车为核心，业务延伸至动力电池、储能、光伏与电子制造；汽车及相关产品是主要收入来源。'
    : `${state.view.company.name}的业务构成数据尚未接入当前数据包，财务与行情模块仍可独立研究。`;
  $('#business-scope').textContent = byd ? '集团合并' : '财务报表口径';
  $('#business-lines').textContent = byd ? '汽车 · 电子制造' : '业务构成待披露数据';
  $('#business-listing').textContent = state.view.company.thscode.endsWith('.SH') ? '上交所 A 股' : state.view.company.thscode.endsWith('.BJ') ? '北交所 A 股' : '深交所 A 股';
  $('#composition-period').textContent = state.view.revenueComposition.period ? `${state.view.revenueComposition.period} 年` : '暂无可比口径';
  $('#composition-note').textContent = state.view.revenueComposition.status === 'ok' ? '公开披露 · 按集团分产品收入' : '当前数据包未包含分部收入';
}

export function renderDonutChart(composition) {
  if (composition?.status !== 'ok' || !composition.items?.length) return emptyState('收入构成暂不可用', '需要公司分部收入披露');
  const items = composition.items.filter(item => number(item.share) !== null && number(item.amount) !== null);
  const circumference = 2 * Math.PI * 52;
  let cumulative = 0;
  const arcs = items.map((item, index) => {
    const share = Math.max(0, number(item.share));
    const length = circumference * share / 100;
    const arc = `<circle cx="80" cy="80" r="52" fill="none" stroke="${chartColors[index % chartColors.length]}" stroke-width="18" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-circumference * cumulative / 100}" transform="rotate(-90 80 80)"/>`;
    cumulative += share;
    return arc;
  }).join('');
  const total = items.reduce((sum, item) => sum + number(item.amount), 0);
  const aria = items.map(item => `${item.name}${number(item.share).toFixed(1)}%`).join('，');
  return `<div class="donut-layout"><svg class="donut-svg" viewBox="0 0 160 160" role="img" aria-label="收入构成：${esc(aria)}"><circle cx="80" cy="80" r="52" fill="none" stroke="#17364a" stroke-width="18"/>${arcs}<text class="donut-total" x="80" y="77" text-anchor="middle">${esc(formatYi(total, 0))}</text><text class="donut-sub" x="80" y="97" text-anchor="middle">营业收入</text></svg><div class="donut-legend">${items.map((item, index) => `<div><i style="background:${chartColors[index % chartColors.length]}"></i><span>${esc(item.name)}</span><strong>${number(item.share).toFixed(1)}%</strong></div>`).join('')}</div></div>`;
}

function operatingSeries() {
  const quarterRows = state.view.financials.quarters?.filter(row => number(row.revenue) !== null || number(row.parentProfit) !== null) ?? [];
  if (quarterRows.length) return quarterRows.slice(-8);
  return (state.view.financials.annualSeries ?? []).slice(-8);
}

export function renderOperatingChart(rows) {
  if (!rows?.length) return emptyState('经营趋势暂不可用', moduleError(state.bundle?.modules?.financials));
  const width = 760;
  const height = 225;
  const left = 50;
  const right = 28;
  const top = 22;
  const bottom = 43;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const revenues = rows.map(row => number(row.revenue));
  const profits = rows.map(row => number(row.parentProfit));
  const maxRevenue = Math.max(1, ...revenues.filter(value => value !== null).map(Math.abs));
  const profitValues = profits.filter(value => value !== null);
  const profitMin = Math.min(0, ...profitValues);
  const profitMax = Math.max(1, ...profitValues);
  const step = plotWidth / Math.max(1, rows.length);
  const barWidth = Math.min(42, step * .48);
  const revenueY = value => top + plotHeight - Math.abs(value) / maxRevenue * plotHeight;
  const profitY = value => top + (profitMax - value) / Math.max(1, profitMax - profitMin) * plotHeight;
  const points = rows.map((row, index) => number(row.parentProfit) === null ? null : `${left + step * (index + .5)},${profitY(number(row.parentProfit))}`).filter(Boolean).join(' ');
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="营业收入柱状图与归母净利润折线图，共 ${rows.length} 个报告期">
    <line class="grid" x1="${left}" x2="${width - right}" y1="${top + plotHeight}" y2="${top + plotHeight}"/>
    <line class="grid" x1="${left}" x2="${width - right}" y1="${top + plotHeight / 2}" y2="${top + plotHeight / 2}"/>
    <text class="axis" x="${left}" y="14">金额 · 亿元</text>
    ${rows.map((row, index) => {
      const revenue = number(row.revenue);
      const x = left + step * (index + .5);
      const y = revenue === null ? top + plotHeight : revenueY(revenue);
      const h = revenue === null ? 0 : top + plotHeight - y;
      const label = reportLabel(row, String(index + 1)).replace(/^20/, '');
      return `<rect class="revenue" x="${x - barWidth / 2}" y="${y}" width="${barWidth}" height="${h}" rx="3" opacity=".82"/><text class="label" x="${x}" y="${height - 18}" text-anchor="middle">${esc(label)}</text>`;
    }).join('')}
    ${points ? `<polyline class="profit-line" points="${points}"/>` : ''}
    ${rows.map((row, index) => number(row.parentProfit) === null ? '' : `<circle cx="${left + step * (index + .5)}" cy="${profitY(number(row.parentProfit))}" r="3.5" fill="#42c7a8"/>`).join('')}
    <g transform="translate(${width - 188} 10)"><rect width="10" height="10" rx="2" class="revenue"/><text class="axis" x="15" y="10">营业收入</text><line x1="86" x2="105" y1="5" y2="5" class="profit-line"/><text class="axis" x="112" y="10">归母净利润</text></g>
  </svg>`;
}

function indicatorValue(id) {
  return number(state.view.indicators.values?.[id]);
}

function renderOperating() {
  const rows = operatingSeries();
  $('#operating-chart').innerHTML = renderOperatingChart(rows);
  const revenueGrowth = indicatorValue('calculate_operating_income_yoy_growth_ratio');
  const profitGrowth = indicatorValue('calculate_parent_holder_net_profit_yoy_growth_ratio');
  const cashContent = indicatorValue('net_profit_cash_content');
  const debtRatio = indicatorValue('assets_debt_ratio');
  const kpis = [
    { label: '营业收入同比', value: formatPct(revenueGrowth), raw: revenueGrowth, note: state.view.indicators.report || '最新报告期' },
    { label: '归母净利润同比', value: formatPct(profitGrowth), raw: profitGrowth, note: state.view.indicators.report || '最新报告期' },
    { label: '净利润现金含量', value: formatMetric(cashContent, '%', 1), raw: cashContent, note: '经营现金 / 净利润' },
    { label: '资产负债率', value: formatMetric(debtRatio, '%', 1), raw: debtRatio, note: '最新财务指标' },
  ];
  $('#operating-kpis').innerHTML = kpis.map(item => `<div class="kpi-card"><span>${item.label}</span><strong class="${number(item.raw) > 0 && /同比/.test(item.label) ? 'up' : number(item.raw) < 0 ? 'down' : ''}">${item.value}</strong><small>${esc(item.note)}</small></div>`).join('');
  $('#operating-period').textContent = rows.length ? `${reportLabel(rows[0])} — ${reportLabel(rows.at(-1))} · ${state.view.financials.quarters?.length ? '单季换算' : '年度口径'}` : '报告期数据不可用';
  const insight = $('#operating-insight');
  if (revenueGrowth !== null && profitGrowth !== null) {
    const gap = profitGrowth - revenueGrowth;
    insight.innerHTML = `<strong>利润与收入增速差</strong><span>${profitGrowth.toFixed(1)}% − ${revenueGrowth.toFixed(1)}% = <b class="${gap < 0 ? 'down' : 'up'}">${gap > 0 ? '+' : ''}${gap.toFixed(1)} 个百分点</b></span>`;
  } else {
    insight.textContent = rows.length ? '图中金额可核对；同比财务指标暂不完整。' : '财务报表模块暂不可用。';
  }
}

function cashRows() {
  const live = state.view.financials.cashflow ?? [];
  if (live.length) return [...live].sort((a, b) => number(a.period_end_ms ?? a.period_end) - number(b.period_end_ms ?? b.period_end)).slice(-6).map(row => ({ label: reportLabel(row), value: number(row.act_cash_flow_net) }));
  return (state.view.financials.annualSeries ?? []).slice(-6).map(row => ({ label: row.label, value: number(row.cfo) }));
}

function renderCashChart(rows) {
  if (!rows.length || !rows.some(row => row.value !== null)) return emptyState('经营现金流暂不可用');
  const width = 690;
  const height = 195;
  const left = 56;
  const bottom = 40;
  const mid = 86;
  const max = Math.max(1, ...rows.map(row => Math.abs(row.value ?? 0)));
  const step = (width - left - 18) / rows.length;
  const barWidth = Math.min(48, step * .5);
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="最近 ${rows.length} 个报告期经营活动现金流净额"><line class="grid" x1="${left}" x2="${width - 18}" y1="${mid}" y2="${mid}"/><text class="axis" x="4" y="${mid + 4}">0</text>${rows.map((row, index) => {
    const value = row.value;
    const size = value === null ? 0 : Math.abs(value) / max * 68;
    const y = value !== null && value >= 0 ? mid - size : mid;
    const x = left + step * (index + .5) - barWidth / 2;
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${size}" rx="3" fill="${value !== null && value >= 0 ? '#42c7a8' : '#ff788c'}" opacity=".8"/><text class="value" x="${x + barWidth / 2}" y="${value !== null && value >= 0 ? y - 7 : y + size + 15}" text-anchor="middle">${value === null ? '—' : formatYi(value, 0)}</text><text class="label" x="${x + barWidth / 2}" y="${height - 13}" text-anchor="middle">${esc(row.label.replace(/^20/, ''))}</text>`;
  }).join('')}</svg>`;
}

function latestBalance() {
  const rows = [...(state.view.financials.balance ?? [])].sort((a, b) => number(a.period_end_ms ?? a.period_end) - number(b.period_end_ms ?? b.period_end));
  return rows.at(-1) ?? null;
}

function renderFinance() {
  const cRows = cashRows();
  $('#cash-chart').innerHTML = renderCashChart(cRows);
  const balance = latestBalance();
  if (!balance) {
    const fallback = isByd(state.view.company.thscode) ? BYD_SNAPSHOT.balance[2025] : null;
    if (fallback) {
      renderBalanceRows({ assets: fallback.assets, liabilities: fallback.liabilities, currentAssets: fallback.currentAssets, cash: fallback.cash });
    } else $('#balance-chart').innerHTML = emptyState('资产负债数据暂不可用');
  } else {
    renderBalanceRows({
      assets: number(balance.assets_total ?? balance.total_assets),
      liabilities: number(balance.total_debt ?? balance.total_liabilities ?? balance.liabilities_total),
      currentAssets: number(balance.total_current_assets ?? balance.current_assets_total),
      cash: number(balance.cash ?? balance.currency_funds),
    });
  }
  const rows = state.view.financials.income ?? [];
  $('#finance-table').innerHTML = rows.length ? `<table><thead><tr><th>报告期</th><th>营业收入</th><th>归母净利润</th></tr></thead><tbody>${rows.slice(-8).map(row => `<tr><td>${esc(reportLabel(row))}</td><td>${formatYi(row.operating_income)}</td><td>${formatYi(row.parent_holder_net_profit)}</td></tr>`).join('')}</tbody></table>` : '';
}

function renderBalanceRows(values) {
  const assets = number(values.assets);
  const liabilities = number(values.liabilities);
  const rows = [
    { label: '资产总额', value: assets, ratio: 100 },
    { label: '负债总额', value: liabilities, ratio: assets && liabilities !== null ? liabilities / assets * 100 : null },
    { label: '流动资产', value: number(values.currentAssets), ratio: assets && number(values.currentAssets) !== null ? number(values.currentAssets) / assets * 100 : null },
    { label: '货币资金', value: number(values.cash), ratio: assets && number(values.cash) !== null ? number(values.cash) / assets * 100 : null },
  ];
  $('#balance-chart').innerHTML = `<div class="balance-list">${rows.map(row => `<div class="balance-row"><span>${row.label}</span><div class="balance-track"><i style="width:${Math.max(0, Math.min(100, row.ratio ?? 0))}%"></i></div><strong>${formatYi(row.value, 0)}</strong></div>`).join('')}</div>`;
}

function renderValuation() {
  const metrics = [
    { label: '市盈率', key: 'peTtm', suffix: '×', basis: 'PE · TTM' },
    { label: '市净率', key: 'pbMrq', suffix: '×', basis: 'PB · MRQ' },
    { label: '市销率', key: 'psTtm', suffix: '×', basis: 'PS · TTM' },
    { label: '市现率', key: 'pcfTtm', suffix: '×', basis: 'PCF · TTM' },
  ];
  $('#valuation-strip').innerHTML = metrics.map(metric => `<div class="valuation-card"><span>${metric.label}</span><strong>${formatMetric(state.view.valuation[metric.key], metric.suffix, 2)}</strong><small>${metric.basis}${state.view.valuation.timestamp ? ` · ${formatDate(state.view.valuation.timestamp)}` : ''}</small></div>`).join('');
  $('#industry-state').textContent = state.view.industry.status === 'ok' ? '行业数据已接入。' : '行业映射尚未接入，暂不生成同行排名。';
}

export function renderMarketChart(series) {
  const rows = (series ?? []).filter(row => number(row.close_price) !== null && number(row.date_ms) !== null).slice(-180);
  if (rows.length < 2) return emptyState('行情序列暂不可用', state.view.market.status === 'unavailable' ? '当前为公开披露快照' : moduleError(state.bundle?.modules?.market));
  const width = 870;
  const height = 245;
  const left = 54;
  const right = 24;
  const top = 18;
  const priceBottom = 174;
  const volumeTop = 188;
  const volumeBottom = 224;
  const closes = rows.map(row => number(row.close_price));
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const volumes = rows.map(row => number(row.turnover ?? row.volume) ?? 0);
  const maxVolume = Math.max(1, ...volumes);
  const x = index => left + index / (rows.length - 1) * (width - left - right);
  const y = value => top + (max - value) / Math.max(.0001, max - min) * (priceBottom - top);
  const points = rows.map((row, index) => `${x(index)},${y(number(row.close_price))}`).join(' ');
  const area = `${left},${priceBottom} ${points} ${width - right},${priceBottom}`;
  const tickIndexes = [0, Math.floor((rows.length - 1) / 2), rows.length - 1];
  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${rows.length} 个交易日的前复权收盘价和成交量">
    <defs><linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#35a9e8" stop-opacity=".28"/><stop offset="1" stop-color="#35a9e8" stop-opacity=".02"/></linearGradient></defs>
    <line class="grid" x1="${left}" x2="${width - right}" y1="${top}" y2="${top}"/><line class="grid" x1="${left}" x2="${width - right}" y1="${priceBottom}" y2="${priceBottom}"/>
    <text class="axis" x="4" y="${top + 4}">${max.toFixed(2)}</text><text class="axis" x="4" y="${priceBottom}">${min.toFixed(2)}</text>
    <polygon class="price-area" points="${area}"/><polyline class="price-line" points="${points}"/>
    ${rows.map((row, index) => `<rect class="volume" x="${x(index)}" y="${volumeBottom - volumes[index] / maxVolume * (volumeBottom - volumeTop)}" width="${Math.max(1, (width - left - right) / rows.length * .72)}" height="${volumes[index] / maxVolume * (volumeBottom - volumeTop)}"/>`).join('')}
    ${tickIndexes.map(index => `<text class="label" x="${x(index)}" y="241" text-anchor="${index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle'}">${formatDate(rows[index].date_ms)}</text>`).join('')}
  </svg>`;
}

function renderMarket() {
  $('#market-chart').innerHTML = renderMarketChart(state.view.market.series);
  const signals = state.view.market.signals ?? {};
  const metrics = [
    ['20 日收益', formatPct(signals.return20)],
    ['60 日收益', formatPct(signals.return60)],
    ['60 日最大回撤', formatPct(signals.maxDrawdown60)],
    ['20 日均线', formatPrice(signals.ma20)],
    ['60 日均线', formatPrice(signals.ma60)],
  ];
  $('#market-kpis').innerHTML = metrics.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('#market-period').textContent = signals.range ? `前复权日线 · ${signals.range.start} — ${signals.range.end}` : '前复权日线 · 区间数据不可用';
}

function renderEvents() {
  const sourceEvents = state.view.sources.slice().sort((a, b) => String(b.disclosed).localeCompare(String(a.disclosed))).slice(0, 3);
  const cards = sourceEvents.map(source => `<button class="event-card" data-source="${esc(source.id)}" aria-expanded="false"><time>${esc(source.disclosed)}</time><h3>${esc(source.name)}</h3><p>${esc(source.period)} · ${esc(source.publisher)}</p><span class="status-pill fact">客观事实</span></button>`);
  if (state.view.context.status === 'unavailable') cards.push('<article class="event-card"><time>外部信息</time><h3>新闻、政策与宏观数据未接入</h3><p>iFinD 服务端配置不可用；不生成事件解释或影响判断。</p><span class="status-pill unknown">暂无法验证</span></article>');
  if (state.view.industry.status === 'unavailable') cards.push('<article class="event-card"><time>行业位置</time><h3>同行样本与行业分位缺失</h3><p>缺少已核对的行业映射和同日可比口径。</p><span class="status-pill unknown">暂无法验证</span></article>');
  $('#event-list').innerHTML = cards.length ? cards.join('') : emptyState('事件数据暂不可用');
}

function renderAll() {
  renderModuleStatus();
  renderQuote();
  renderBusiness();
  $('#composition-chart').innerHTML = renderDonutChart(state.view.revenueComposition);
  renderOperating();
  renderFinance();
  renderValuation();
  renderMarket();
  renderEvents();
}

function rawValue(value) {
  if (value === null || value === undefined) return '未披露';
  return typeof value === 'number' && Math.abs(value) >= 1_000_000 ? formatYi(value) : String(value);
}

function evidenceCard(item) {
  const source = sourceById.get(item.sourceId);
  return `<article class="evidence-item"><h3>${esc(item.label)}</h3><div class="evidence-meta"><span>${esc(item.period)}</span><span>第 ${item.pages.join('、')} 页</span><span>${esc(item.scope)}</span><span>${esc(item.unit)}</span></div><div class="raw-values">${item.rawValues.map((value, index) => `<code>原值 ${index + 1} · ${esc(rawValue(value))}</code>`).join('')}</div>${source ? `<a href="${esc(source.url)}" target="_blank" rel="noreferrer">打开原报告 ↗</a>` : ''}</article>`;
}

function sourceCard(source) {
  return `<article class="evidence-item"><h3>${esc(source.name)}</h3><div class="evidence-meta"><span>${esc(source.disclosed)}</span><span>${esc(source.period)}</span></div><p>${esc(source.publisher)}</p><p>${esc(source.unitNote)}</p><a href="${esc(source.url)}" target="_blank" rel="noreferrer">打开原报告 ↗</a></article>`;
}

function openDrawer(content, trigger) {
  const drawer = $('#evidence-drawer');
  state.opener = trigger || document.activeElement;
  if (state.opener?.setAttribute) state.opener.setAttribute('aria-expanded', 'true');
  $('#drawer-content').innerHTML = content;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  $('aside', drawer).focus();
}

function openEvidence(refs, trigger) {
  const items = String(refs || '').split(',').map(id => evidenceById.get(id.trim())).filter(Boolean);
  openDrawer(items.length ? items.map(evidenceCard).join('') : '<div class="evidence-item">该结论尚无可核对的披露原值。</div>', trigger);
}

function openSources(ids, trigger) {
  const sources = ids.map(id => sourceById.get(id)).filter(Boolean);
  openDrawer(sources.length ? sources.map(sourceCard).join('') : '<div class="evidence-item">当前公司没有可用的披露来源。</div>', trigger);
}

function openModuleEvidence(name, trigger) {
  const module = state.bundle?.modules?.[name];
  const labels = { market: '行情数据', financials: '财务报表', valuation: '估值快照', indicators: '财务指标' };
  const requestIds = module?.requestIds ?? [];
  const errorRows = module?.errors ?? [];
  openDrawer(`<article class="evidence-item"><h3>${labels[name] || name}</h3><div class="evidence-meta"><span>来源：${state.view.sourceState.label}</span><span>状态：${esc(module?.status || 'unavailable')}</span><span>数据时间：${esc(formatDate(state.view.sourceState.generatedAt, true))}</span></div>${requestIds.length ? `<div class="raw-values">${requestIds.map(id => `<code>requestId · ${esc(id)}</code>`).join('')}</div>` : ''}${errorRows.length ? `<p>${errorRows.map(item => esc(item.message)).join('；')}</p>` : '<p>该模块已返回数据；图表保留原始缺失值，不补零。</p>'}</article>`, trigger);
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

function setBusy(busy, label = '') {
  $('#main-content').setAttribute('aria-busy', String(busy));
  if (busy) $('#module-status').innerHTML = `<span class="pulse" aria-hidden="true"></span><strong>${esc(label || '正在加载')}</strong><span>行情、财务与估值分别加载</span>`;
}

async function loadCompany(company, { initial = false } = {}) {
  setBusy(true, `正在加载${company.name || company.thscode}`);
  try {
    const bundle = await client.research(company);
    state.company = { ...company, companyType: isByd(company.thscode) ? 'manufacturing' : 'general' };
    state.bundle = bundle;
    state.view = normalizeResearchView(bundle, company, isByd(company.thscode) ? BYD_SNAPSHOT : null);
    $('#stock-search').value = `${state.view.company.name} · ${state.view.company.thscode}`;
  } catch (error) {
    if (initial && isByd(company.thscode)) {
      state.company = { ...company, companyType: 'manufacturing' };
      state.bundle = createBydDemoBundle(BYD_SNAPSHOT);
      state.view = normalizeResearchView(null, company, BYD_SNAPSHOT);
      showToast('实时数据暂不可用，已切换为公开披露快照');
    } else {
      showToast(error instanceof ResearchClientError ? error.message : '公司数据加载失败');
      return;
    }
  } finally {
    setBusy(false);
    renderAll();
  }
}

function renderSearchResults(items, query) {
  const results = $('#search-results');
  results.hidden = false;
  $('#stock-search').setAttribute('aria-expanded', 'true');
  results.innerHTML = items.length ? items.map((item, index) => `<button type="button" role="option" aria-selected="${index === 0}" data-code="${esc(item.thscode)}" data-name="${esc(item.name)}"><span><strong>${esc(item.name)}</strong><br><small>${esc(item.market || 'A 股')}</small></span><small>${esc(item.thscode)}</small></button>`).join('') : `<div class="search-empty">未找到“${esc(query)}”对应的 A 股公司</div>`;
}

async function runSearch(query) {
  const clean = query.trim();
  if (!clean) {
    $('#search-results').hidden = true;
    return;
  }
  try {
    state.searchItems = await client.search(clean);
    renderSearchResults(state.searchItems, clean);
  } catch (error) {
    renderSearchResults([], clean);
    showToast(error instanceof ResearchClientError ? error.message : '搜索服务暂不可用');
  }
}

function setMode(mode, options = {}) {
  state.mode = mode === 'professional' ? 'professional' : 'simple';
  factsForMode(state.research, state.mode);
  document.body.classList.toggle('mode-professional', state.mode === 'professional');
  $$('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
  if (!options.silent) showToast(state.mode === 'professional' ? '已展开财务原值' : '已收起财务原值');
}

const sectionByDimension = { operating_quality: 'operating', financial_trend: 'finance', valuation: 'valuation', market_characteristics: 'market', industry_position: 'valuation', material_events: 'events', risk: 'events' };

$('#research-task').addEventListener('submit', event => {
  event.preventDefault();
  const question = $('#research-question').value.trim();
  const workbench = buildWorkbench(state.bundle, state.company, question);
  const selected = workbench.report.selectedDimensions.slice(0, 3);
  $('#priority-result').innerHTML = `<strong>${esc(question || '公司研究')}</strong><ol>${selected.map(item => `<li><a href="#${sectionByDimension[item.dimension]}">${esc(item.label)}</a>：${esc(item.relevanceReason)}</li>`).join('')}</ol>`;
  $('#priority-result').hidden = false;
  document.getElementById(sectionByDimension[selected[0]?.dimension] || 'operating')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const searchInput = $('#stock-search');
searchInput.addEventListener('input', () => {
  clearTimeout(runSearch.timer);
  runSearch.timer = setTimeout(() => runSearch(searchInput.value.replace(/·.*$/, '').trim()), 260);
});
searchInput.addEventListener('focus', () => searchInput.select());
$('#company-search').addEventListener('submit', event => {
  event.preventDefault();
  if (state.searchItems[0]) loadCompany(state.searchItems[0]);
  else runSearch(searchInput.value.replace(/·.*$/, '').trim());
});
$('#search-results').addEventListener('click', event => {
  const option = event.target.closest('[data-code]');
  if (!option) return;
  $('#search-results').hidden = true;
  searchInput.setAttribute('aria-expanded', 'false');
  loadCompany({ name: option.dataset.name, thscode: option.dataset.code });
});

$$('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#company-search')) {
    $('#search-results').hidden = true;
    searchInput.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('click', event => {
  const evidenceTrigger = event.target.closest('[data-evidence]');
  const sourceTrigger = event.target.closest('[data-source]');
  const moduleTrigger = event.target.closest('[data-module]');
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (evidenceTrigger) return openEvidence(evidenceTrigger.dataset.evidence, evidenceTrigger);
  if (sourceTrigger) return openSources([sourceTrigger.dataset.source], sourceTrigger);
  if (moduleTrigger) return openModuleEvidence(moduleTrigger.dataset.module, moduleTrigger);
  if (event.target.closest('[data-close]')) return closeDrawer();
  if (action === 'sources') return openSources(state.view.sources.map(source => source.id), event.target.closest('[data-action]'));
  if (action === 'print') return window.print();
  if (action === 'favorite') {
    const button = $('#favorite-button');
    const pressed = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(pressed));
    button.textContent = pressed ? '✓ 已关注' : '＋ 关注';
  }
  if (action === 'export') {
    const payload = { company: state.view.company, generatedAt: state.view.sourceState.generatedAt, providers: state.view.providers, modules: state.bundle?.modules ?? {}, disclosureSources: state.view.sources };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `finscope-${state.view.company.thscode}.json` });
    link.click();
    URL.revokeObjectURL(url);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('#evidence-drawer').classList.contains('open')) closeDrawer();
  if (event.key === 'Tab' && $('#evidence-drawer').classList.contains('open')) {
    const focusable = $$('a[href],button:not([disabled]),[tabindex="0"]', $('#evidence-drawer')).filter(node => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

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
$$('.primary-nav a').forEach(link => link.addEventListener('click', () => setMenu(false)));

const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  $$('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === visible.target.id));
}, { rootMargin: '-20% 0px -65% 0px', threshold: [0, .2, .6] });
$$('.section-anchor').forEach(section => observer.observe(section));

renderAll();
setMode('simple', { silent: true });
loadCompany({ name: '比亚迪', thscode: '002594.SZ' }, { initial: true });
