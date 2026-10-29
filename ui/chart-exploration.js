const YI = 100_000_000;
const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function selectChartRange(rows = [], range = 'all') {
  const list = Array.isArray(rows) ? [...rows] : [];
  if (range === 'all') return list;
  const count = Number.parseInt(range, 10);
  return Number.isFinite(count) && count > 0 ? list.slice(-count) : list;
}

function reportLabel(row, fallback = '') {
  if (row?.label) return String(row.label);
  if (row?.fiscal_year && row?.fiscal_period) return `${row.fiscal_year}${row.fiscal_period}`;
  const value = finite(row?.period_end_ms ?? row?.period_end ?? row?.dateMs);
  return value === null ? fallback : new Date(value).toISOString().slice(0, 10);
}

function axisValue(value) {
  const amount = value / YI;
  return amount.toLocaleString('zh-CN', { maximumFractionDigits: Math.abs(amount) < 10 ? 1 : 0 });
}

export function renderOperatingChart(rows = []) {
  if (!rows.length) return '<div class="empty-state"><strong>经营趋势暂不可用</strong><span>缺少同口径财务期次</span></div>';
  const width = 780;
  const height = 250;
  const left = 64;
  const right = 68;
  const top = 34;
  const bottom = 43;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const revenues = rows.map(row => finite(row.revenue));
  const profits = rows.map(row => finite(row.parentProfit));
  const revenueValues = revenues.filter(value => value !== null);
  const profitValues = profits.filter(value => value !== null);
  const maxRevenue = Math.max(1, ...revenueValues.map(Math.abs));
  const profitMin = Math.min(0, ...profitValues);
  const profitMax = Math.max(1, ...profitValues);
  const step = plotWidth / Math.max(1, rows.length);
  const barWidth = Math.min(42, step * .48);
  const revenueY = value => top + plotHeight - Math.abs(value) / maxRevenue * plotHeight;
  const profitY = value => top + (profitMax - value) / Math.max(1, profitMax - profitMin) * plotHeight;
  const points = rows.map((row, index) => finite(row.parentProfit) === null ? null : `${left + step * (index + .5)},${profitY(finite(row.parentProfit))}`).filter(Boolean).join(' ');
  const ticks = [0, .5, 1];
  return `<svg class="chart-svg operating-combo" viewBox="0 0 ${width} ${height}" role="img" tabindex="0" aria-label="营业收入柱状图与归母净利润折线图，共 ${rows.length} 个报告期">
    <text class="axis-title" x="${left}" y="15">营业收入（亿元）</text><text class="axis-title" x="${width - right}" y="15" text-anchor="end">归母净利润（亿元）</text>
    ${ticks.map(ratio => {
      const y = top + plotHeight * ratio;
      const revenueTick = maxRevenue * (1 - ratio);
      const profitTick = profitMax - (profitMax - profitMin) * ratio;
      return `<line class="grid" x1="${left}" x2="${width - right}" y1="${y}" y2="${y}"/><text class="y-axis-label revenue-axis" x="${left - 8}" y="${y + 4}" text-anchor="end">${axisValue(revenueTick)}</text><text class="y-axis-label profit-axis" x="${width - right + 8}" y="${y + 4}">${axisValue(profitTick)}</text>`;
    }).join('')}
    ${rows.map((row, index) => {
      const revenue = finite(row.revenue);
      const x = left + step * (index + .5);
      const y = revenue === null ? top + plotHeight : revenueY(revenue);
      const h = revenue === null ? 0 : top + plotHeight - y;
      const label = reportLabel(row, String(index + 1)).replace(/^20/, '');
      return `<rect class="revenue" x="${x - barWidth / 2}" y="${y}" width="${barWidth}" height="${h}" rx="3" opacity=".82"/><text class="label" x="${x}" y="${height - 17}" text-anchor="middle">${esc(label)}</text>`;
    }).join('')}
    ${points ? `<polyline class="profit-line" points="${points}"/>` : ''}
    ${rows.map((row, index) => finite(row.parentProfit) === null ? '' : `<circle cx="${left + step * (index + .5)}" cy="${profitY(finite(row.parentProfit))}" r="3.5" fill="#F5B642"/>`).join('')}
    <g transform="translate(${width - 230} 18)"><rect width="10" height="10" rx="2" class="revenue"/><text class="axis" x="15" y="10">营业收入</text><line x1="92" x2="111" y1="5" y2="5" class="profit-line"/><text class="axis" x="118" y="10">归母净利润</text></g>
  </svg>`;
}
