const finite = value => value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const refs = values => esc((values ?? []).join(','));

export function buildProfitConversion(rows = []) {
  const normalized = rows.map(row => {
    const revenue = finite(row.revenue);
    const parentProfit = finite(row.parentProfit);
    return {
      label: String(row.label ?? ''),
      revenue,
      parentProfit,
      per100: revenue > 0 && parentProfit !== null ? round(parentProfit / revenue * 100) : null,
    };
  });
  const comparable = normalized.filter(row => row.per100 !== null);
  const deltaPp = comparable.length > 1 ? round(comparable.at(-1).per100 - comparable.at(-2).per100) : null;
  return { rows: normalized, deltaPp, unit: '每100元营业收入留下的归母净利润（元）' };
}

function conversionCells(value, y) {
  const filled = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  return Array.from({ length: 100 }, (_, index) => {
    const col = index % 50;
    const row = Math.floor(index / 50);
    const x = 116 + col * 10.3;
    const fill = index < filled ? '#F5B642' : '#19384C';
    return `<rect x="${x}" y="${y + row * 12}" width="7.4" height="7.4" rx="1.5" fill="${fill}"/>`;
  }).join('');
}

export function renderProfitConversionChart(model, sourceRefs = []) {
  const rows = model?.rows ?? [];
  if (!rows.some(row => row.per100 !== null)) return '<div class="empty-state"><strong>利润转化暂不可用</strong><span>缺少同口径收入或归母净利润</span></div>';
  return `<svg class="chart-svg conversion-chart" viewBox="0 0 680 126" role="img" tabindex="0" data-source-ref="${refs(sourceRefs)}" aria-label="每 100 元收入转化为归母净利润的变化">
    <text x="0" y="12" class="axis">每 100 元收入中，黄色代表归属于母公司股东的净利润</text>
    ${rows.slice(-2).map((row, index) => {
      const y = 36 + index * 43;
      return `<text x="0" y="${y + 10}" class="label">${esc(row.label)}</text>${conversionCells(row.per100, y)}<text x="642" y="${y + 12}" text-anchor="end" class="conversion-value">${row.per100 === null ? '—' : `${row.per100.toFixed(2)} 元`}</text>`;
    }).join('')}
    ${model.deltaPp === null ? '' : `<text x="642" y="120" text-anchor="end" class="conversion-delta">转化率 ${model.deltaPp < 0 ? '下降' : '上升'} ${Math.abs(model.deltaPp).toFixed(2)}pp</text>`}
  </svg>`;
}

export function buildBalanceFlow(values = {}) {
  const assets = finite(values.assets);
  const liabilities = finite(values.liabilities);
  const currentAssets = finite(values.currentAssets);
  const cash = finite(values.cash);
  if (!(assets > 0) || liabilities === null) return null;
  const equity = round(assets - liabilities);
  const safeCurrent = currentAssets === null ? null : Math.max(0, Math.min(assets, currentAssets));
  const safeCash = cash === null || safeCurrent === null ? null : Math.max(0, Math.min(safeCurrent, cash));
  const uses = {
    cash: safeCash,
    otherCurrent: safeCurrent === null || safeCash === null ? null : round(safeCurrent - safeCash),
    nonCurrent: safeCurrent === null ? null : round(assets - safeCurrent),
  };
  const sourceWidths = { liabilities: round(liabilities / assets * 100), equity: round(equity / assets * 100) };
  const useWidths = Object.fromEntries(Object.entries(uses).map(([key, value]) => [key, value === null ? null : round(value / assets * 100)]));
  return { assets, liabilities, equity, sources: { liabilities, equity }, uses, sourceWidths, useWidths };
}

export function renderBalanceFlowChart(model, sourceRefs = []) {
  if (!model) return '<div class="empty-state"><strong>资产负债结构暂不可用</strong><span>缺少可核对的资产或负债</span></div>';
  const yi = value => `${Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} 亿`;
  const x0 = 44;
  const width = 632;
  const liabilityWidth = width * model.sourceWidths.liabilities / 100;
  const cashWidth = model.useWidths.cash === null ? 0 : width * model.useWidths.cash / 100;
  const currentWidth = model.useWidths.otherCurrent === null ? 0 : width * model.useWidths.otherCurrent / 100;
  return `<svg class="chart-svg balance-flow" viewBox="0 0 720 184" role="img" tabindex="0" data-source-ref="${refs(sourceRefs)}" aria-label="资产配置与负债权益资金来源">
    <text x="44" y="16" class="axis">资产配置</text><text x="676" y="16" text-anchor="end" class="axis">合计 ${yi(model.assets)}</text>
    <rect x="${x0}" y="29" width="${cashWidth}" height="34" fill="#2DD4BF"/><rect x="${x0 + cashWidth}" y="29" width="${currentWidth}" height="34" fill="#6C91FF"/><rect x="${x0 + cashWidth + currentWidth}" y="29" width="${width - cashWidth - currentWidth}" height="34" fill="#345B91"/>
    <text x="${x0 + 5}" y="51" class="flow-label">现金 ${model.uses.cash === null ? '—' : yi(model.uses.cash)}</text><text x="${x0 + cashWidth + 6}" y="51" class="flow-label">其他流动资产</text><text x="${x0 + cashWidth + currentWidth + 6}" y="51" class="flow-label">非流动资产</text>
    <path d="M44 82H676" stroke="#315166" stroke-dasharray="3 4"/><text x="360" y="91" text-anchor="middle" class="identity">资产 = 负债 + 权益</text>
    <text x="44" y="118" class="axis">资金来源</text>
    <rect x="${x0}" y="130" width="${liabilityWidth}" height="34" fill="#A78BFA"/><rect x="${x0 + liabilityWidth}" y="130" width="${width - liabilityWidth}" height="34" fill="#38C6C3"/>
    <text x="${x0 + 6}" y="152" class="flow-label">负债 ${yi(model.liabilities)} · ${model.sourceWidths.liabilities.toFixed(1)}%</text><text x="${x0 + liabilityWidth + 6}" y="152" class="flow-label">权益 ${yi(model.equity)} · ${model.sourceWidths.equity.toFixed(1)}%</text>
  </svg>`;
}

export function buildCashCoverage(values = {}) {
  const cfo = finite(values.cfo);
  const capex = finite(values.capex);
  if (cfo === null || capex === null || capex < 0) return null;
  const usableCash = Math.max(0, cfo);
  const covered = round(Math.min(usableCash, capex));
  const uncovered = round(Math.max(0, capex - usableCash));
  return { cfo: round(cfo), capex: round(capex), covered, uncovered, coveragePct: capex === 0 ? null : round(cfo / capex * 100), periodLabel: String(values.periodLabel ?? '') };
}

export function renderCashCoverageChart(model, sourceRefs = []) {
  if (!model) return '<div class="empty-state"><strong>现金覆盖暂不可用</strong><span>缺少经营现金流或资本开支</span></div>';
  const total = Math.max(model.capex, model.cfo, 1);
  const width = 520;
  const coveredWidth = width * model.covered / total;
  const uncoveredWidth = width * model.uncovered / total;
  return `<svg class="chart-svg cash-coverage" viewBox="0 0 620 150" role="img" tabindex="0" data-source-ref="${refs(sourceRefs)}" aria-label="经营现金流对资本开支的覆盖">
    <text x="22" y="18" class="axis">${model.periodLabel ? `${model.periodLabel} · ` : ''}亿元</text><text x="598" y="18" text-anchor="end" class="axis">经营现金 / 资本开支 = ${model.coveragePct === null ? '—' : `${model.coveragePct.toFixed(1)}%`}</text>
    <text x="22" y="53" class="label">资本开支</text><rect x="78" y="34" width="${width}" height="28" rx="3" fill="#17364A"/><rect x="78" y="34" width="${coveredWidth}" height="28" rx="3" fill="#2DD4BF"/><rect x="${78 + coveredWidth}" y="34" width="${uncoveredWidth}" height="28" fill="#F59E0B" opacity=".72"/>
    <text x="78" y="86" class="label">经营现金 ${model.cfo.toFixed(1)}</text><text x="598" y="86" text-anchor="end" class="label">资本开支 ${model.capex.toFixed(1)}</text>
    <line x1="78" x2="598" y1="102" y2="102" stroke="#284A60"/><text x="78" y="126" class="flow-label">已覆盖 ${model.covered.toFixed(1)}</text><text x="598" y="126" text-anchor="end" class="negative-label">未覆盖 ${model.uncovered.toFixed(1)}</text>
  </svg>`;
}

export function buildMarketTracks(rows = []) {
  const sorted = [...rows].sort((a, b) => Number(a.date_ms) - Number(b.date_ms));
  let peak = null;
  let previous = null;
  const returns = [];
  const price = [];
  const drawdown = [];
  const volatility = [];
  for (const row of sorted) {
    const date = finite(row.date_ms);
    const close = finite(row.close_price);
    price.push({ date, value: close });
    if (close === null) {
      drawdown.push({ date, value: null });
      volatility.push({ date, value: null });
      continue;
    }
    peak = peak === null ? close : Math.max(peak, close);
    drawdown.push({ date, value: round((close / peak - 1) * 100) });
    if (previous !== null) returns.push(Math.log(close / previous));
    previous = close;
    const window = returns.slice(-20);
    if (window.length < 2) volatility.push({ date, value: null });
    else {
      const mean = window.reduce((sum, value) => sum + value, 0) / window.length;
      const variance = window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (window.length - 1);
      volatility.push({ date, value: round(Math.sqrt(variance) * Math.sqrt(250) * 100) });
    }
  }
  return { price, drawdown, volatility, range: { start: price[0]?.date ?? null, end: price.at(-1)?.date ?? null } };
}

export function renderMarketTracksChart(tracks, sourceRefs = []) {
  const usable = tracks?.price?.filter(point => point.value !== null) ?? [];
  if (usable.length < 2) return '<div class="empty-state unknown-chart"><strong>行情区间暂不可用</strong><span>连接扶摇后显示价格、波动与回撤</span></div>';
  const width = 860;
  const left = 62;
  const right = 16;
  const inner = width - left - right;
  const x = index => left + index / Math.max(1, tracks.price.length - 1) * inner;
  const paths = (series, top, height) => {
    const values = series.filter(point => point.value !== null).map(point => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const y = value => top + (max - value) / Math.max(.0001, max - min) * height;
    let path = '';
    let drawing = false;
    series.forEach((point, index) => {
      if (point.value === null) { drawing = false; return; }
      path += `${drawing ? 'L' : 'M'}${x(index).toFixed(1)} ${y(point.value).toFixed(1)} `;
      drawing = true;
    });
    return path.trim();
  };
  return `<svg class="chart-svg market-tracks" viewBox="0 0 860 300" role="img" tabindex="0" data-source-ref="${refs(sourceRefs)}" aria-label="同一行情区间的价格、年化波动率和回撤">
    <text x="8" y="42" class="axis">价格</text><text x="8" y="145" class="axis">波动率</text><text x="8" y="244" class="axis">回撤</text>
    <line x1="${left}" x2="${width-right}" y1="92" y2="92" class="grid"/><line x1="${left}" x2="${width-right}" y1="194" y2="194" class="grid"/><line x1="${left}" x2="${width-right}" y1="286" y2="286" class="grid"/>
    <path d="${paths(tracks.price, 14, 72)}" class="price-line"/><path d="${paths(tracks.volatility, 112, 67)}" class="volatility-line"/><path d="${paths(tracks.drawdown, 214, 58)}" class="drawdown-line"/>
    <text x="${left}" y="298" class="label">${esc(tracks.range.start)}</text><text x="${width-right}" y="298" text-anchor="end" class="label">${esc(tracks.range.end)}</text>
  </svg>`;
}

export function renderValuationAnchors(metrics = [], sourceRefs = []) {
  const explanations = { PE: '每 1 元归母净利润', PB: '每 1 元账面净资产', PS: '每 1 元营业收入', PCF: '每 1 元经营现金流' };
  return `<div class="valuation-anchors" data-source-ref="${refs(sourceRefs)}">${metrics.map(metric => `<button type="button" class="valuation-anchor" data-evidence="${esc(metric.evidenceRef ?? '')}"><span>${esc(metric.key)}</span><strong>${metric.value === null ? '—' : `${Number(metric.value).toFixed(2)}×`}</strong><small>${esc(explanations[metric.key] ?? '')}对应的市场定价</small></button>`).join('')}</div>`;
}
