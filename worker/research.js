import { validateThscode } from './fuyao.js';

const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const numeric = (value) => value === null || value === undefined || value === '' ? null : Number(value);

function average(values) {
  if (!values.length || values.some((value) => !Number.isFinite(value))) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function movingAverage(closes, window) {
  if (closes.length < window) return null;
  return round(average(closes.slice(-window)));
}

function periodReturn(closes, window) {
  if (closes.length < window) return null;
  const sample = closes.slice(-window);
  const first = sample[0];
  const last = sample.at(-1);
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
  return round(((last / first) - 1) * 100);
}

function maxDrawdown(closes, window) {
  const sample = closes.slice(-window);
  if (sample.length < 2) return null;
  let peak = sample[0];
  let worst = 0;
  for (const close of sample) {
    if (!Number.isFinite(close)) continue;
    peak = Math.max(peak, close);
    if (peak !== 0) worst = Math.min(worst, (close / peak) - 1);
  }
  return round(worst * 100);
}

export function calculateMarketSignals(inputBars) {
  const bars = (Array.isArray(inputBars) ? inputBars : [])
    .map((bar) => ({ ...bar, close_price: numeric(bar.close_price), date_ms: numeric(bar.date_ms) }))
    .filter((bar) => Number.isFinite(bar.close_price) && Number.isFinite(bar.date_ms))
    .sort((a, b) => a.date_ms - b.date_ms);
  const closes = bars.map((bar) => bar.close_price);
  const turnover20 = bars.slice(-20).map((bar) => numeric(bar.turnover)).filter(Number.isFinite);
  return {
    points: bars.length,
    range: bars.length ? { start: new Date(bars[0].date_ms).toISOString().slice(0, 10), end: new Date(bars.at(-1).date_ms).toISOString().slice(0, 10) } : null,
    adjustment: 'forward_adjusted',
    lastClose: closes.at(-1) ?? null,
    ma20: movingAverage(closes, 20),
    ma60: movingAverage(closes, 60),
    ma120: movingAverage(closes, 120),
    return20: periodReturn(closes, 20),
    return60: periodReturn(closes, 60),
    return120: periodReturn(closes, 120),
    maxDrawdown60: maxDrawdown(closes, 60),
    averageTurnover20: turnover20.length === 20 ? round(average(turnover20), 0) : null,
    series: bars.map(({ date_ms, open_price, high_price, low_price, close_price, volume, turnover }) => ({
      date_ms, open_price: numeric(open_price), high_price: numeric(high_price), low_price: numeric(low_price), close_price, volume: numeric(volume), turnover: numeric(turnover),
    })),
  };
}

export function reportFromPeriodEnd(value) {
  if (!Number.isFinite(value)) return null;
  const date = new Date(value);
  const month = date.getUTCMonth() + 1;
  const quarter = ({ 3: 1, 6: 2, 9: 3, 12: 4 })[month];
  return quarter ? `${date.getUTCFullYear()}-${quarter}` : null;
}

function settled(result) {
  if (result.status === 'fulfilled') return { status: 'ok', ...result.value };
  return {
    status: 'error',
    error: {
      code: result.reason?.code ?? 'upstream_error',
      message: result.reason?.message ?? 'Upstream request failed',
      requestId: result.reason?.requestId ?? null,
    },
  };
}

function items(module) {
  return module.status === 'ok' && Array.isArray(module.data?.item) ? module.data.item : [];
}

export async function buildResearchBundle(client, thscode, now = Date.now()) {
  const code = validateThscode(thscode);
  const end = Number(now);
  const start = end - 400 * 24 * 60 * 60 * 1000;
  const results = await Promise.allSettled([
    client.snapshot(code),
    client.historical(code, start, end),
    client.incomeStatements(code, 8),
    client.balanceSheets(code, 8),
    client.cashFlowStatements(code, 8),
  ]);
  const [snapshot, historical, income, balance, cashflow] = results.map(settled);

  const marketErrors = [snapshot, historical].filter((part) => part.status === 'error').map((part) => part.error);
  const market = {
    status: marketErrors.length === 0 ? 'ok' : marketErrors.length === 2 ? 'error' : 'partial',
    snapshot: items(snapshot)[0] ?? null,
    timestamp: snapshot.data?.timestamp ?? historical.data?.timestamp ?? null,
    signals: calculateMarketSignals(items(historical)),
    requestIds: [snapshot.requestId, historical.requestId].filter(Boolean),
    errors: marketErrors,
  };

  const financialParts = { income, balance, cashflow };
  const financialErrors = Object.values(financialParts).filter((part) => part.status === 'error').map((part) => part.error);
  const financials = {
    status: financialErrors.length === 0 ? 'ok' : financialErrors.length === 3 ? 'error' : 'partial',
    income: items(income),
    balance: items(balance),
    cashflow: items(cashflow),
    requestIds: Object.values(financialParts).map((part) => part.requestId).filter(Boolean),
    errors: financialErrors,
  };

  const latestPeriod = financials.income.map((item) => numeric(item.period_end_ms ?? item.period_end)).filter(Number.isFinite).sort((a, b) => b - a)[0] ?? null;
  const report = reportFromPeriodEnd(latestPeriod);
  let indicators = { status: 'error', data: null, requestIds: [], errors: [{ code: 'no_report_period', message: 'Cannot determine latest report period', requestId: null }] };
  if (report) {
    const result = settled(await Promise.allSettled([client.indicators(code, report)]).then(([value]) => value));
    indicators = result.status === 'ok'
      ? { status: 'ok', data: result.data, report, requestIds: [result.requestId].filter(Boolean), errors: [] }
      : { status: 'error', data: null, report, requestIds: [], errors: [result.error] };
  }

  return {
    thscode: code,
    generatedAt: new Date(end).toISOString(),
    source: '同花顺扶摇金融数据 API',
    modules: { market, financials, indicators },
  };
}
