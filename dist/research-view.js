const numberOrNull = value => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const periodRank = period => ({ Q1: 1, Q2: 2, Q3: 3, Q4: 4, H1: 2, FY: 4 }[String(period ?? '').toUpperCase()] ?? 0);

function quarterValue(current, previous, field, rank) {
  const currentValue = numberOrNull(current?.[field]);
  if (currentValue === null || rank <= 1) return currentValue;
  const previousValue = numberOrNull(previous?.[field]);
  return previousValue === null ? null : currentValue - previousValue;
}

export function toSingleQuarterSeries(inputRows = []) {
  const rows = [...(Array.isArray(inputRows) ? inputRows : [])].sort((a, b) => {
    const yearDelta = (numberOrNull(a.fiscal_year) ?? 0) - (numberOrNull(b.fiscal_year) ?? 0);
    return yearDelta || periodRank(a.fiscal_period) - periodRank(b.fiscal_period) || (numberOrNull(a.period_end_ms) ?? 0) - (numberOrNull(b.period_end_ms) ?? 0);
  });
  return rows.map((row, index) => {
    const year = numberOrNull(row.fiscal_year) ?? (numberOrNull(row.period_end_ms) ? new Date(Number(row.period_end_ms)).getUTCFullYear() : null);
    const rank = periodRank(row.fiscal_period);
    const previous = index > 0 && (numberOrNull(rows[index - 1].fiscal_year) ?? null) === year ? rows[index - 1] : null;
    return {
      label: year && row.fiscal_period ? `${year}${String(row.fiscal_period).toUpperCase()}` : String(row.fiscal_period ?? ''),
      dateMs: numberOrNull(row.period_end_ms ?? row.period_end),
      revenue: quarterValue(row, previous, 'operating_income', rank),
      parentProfit: quarterValue(row, previous, 'parent_holder_net_profit', rank),
      operatingProfit: quarterValue(row, previous, 'operating_profit', rank),
    };
  });
}

function normalizeIndicators(module) {
  const output = {};
  for (const ability of module?.data?.abilities ?? []) {
    for (const indicator of ability?.indicators ?? []) {
      if (indicator?.index_id) output[indicator.index_id] = numberOrNull(indicator.value);
    }
  }
  return output;
}

function moduleState(module, fallbackStatus = 'unavailable') {
  return {
    status: module?.status ?? fallbackStatus,
    errors: Array.isArray(module?.errors) ? module.errors : [],
  };
}

function disclosureComposition(fallback, companyCode) {
  const matches = fallback?.meta?.symbol === companyCode;
  if (!matches || !Array.isArray(fallback?.segments) || !fallback.segments.length) {
    return { status: 'unavailable', sourceMode: null, period: null, items: [] };
  }
  const total = fallback.segments.reduce((sum, row) => sum + (numberOrNull(row.revenue2025) ?? 0), 0);
  return {
    status: total > 0 ? 'ok' : 'unavailable',
    sourceMode: 'disclosure',
    period: '2025',
    items: fallback.segments.map(row => {
      const amount = numberOrNull(row.revenue2025);
      return {
        name: row.name,
        amount,
        share: amount !== null && total > 0 ? amount / total * 100 : null,
        grossMargin: numberOrNull(row.grossMargin2025),
      };
    }),
  };
}

function fallbackFinancials(fallback) {
  const annualSeries = (fallback?.annual ?? []).map(row => ({
    label: String(row.year),
    dateMs: Date.UTC(row.year, 11, 31),
    revenue: numberOrNull(row.revenue),
    parentProfit: numberOrNull(row.parentProfit),
    cfo: numberOrNull(row.cfo),
  }));
  return {
    status: annualSeries.length ? 'fallback' : 'unavailable',
    quarters: [],
    annualSeries,
    income: [],
    balance: [],
    cashflow: [],
    errors: [],
  };
}

function fallbackIndicators(fallback) {
  const prior = fallback?.half?.[2025];
  const current = fallback?.half?.[2026];
  const balance = fallback?.balance?.[2025];
  const growth = (now, before) => {
    const a = numberOrNull(now);
    const b = numberOrNull(before);
    return a === null || b === null || b === 0 ? null : (a / b - 1) * 100;
  };
  return {
    calculate_operating_income_yoy_growth_ratio: growth(current?.revenue, prior?.revenue),
    calculate_parent_holder_net_profit_yoy_growth_ratio: growth(current?.parentProfit, prior?.parentProfit),
    net_profit_cash_content: numberOrNull(current?.parentProfit) && numberOrNull(current?.cfo) !== null ? current.cfo / current.parentProfit * 100 : null,
    assets_debt_ratio: numberOrNull(balance?.assets) && numberOrNull(balance?.liabilities) !== null ? balance.liabilities / balance.assets * 100 : null,
  };
}

export function normalizeResearchView(bundle, company = {}, fallback = null) {
  const hasLiveBundle = Boolean(bundle && bundle.modules && bundle.thscode && bundle.sourceMode !== 'disclosure_snapshot');
  const code = String(bundle?.company?.thscode ?? bundle?.thscode ?? company?.thscode ?? fallback?.meta?.symbol ?? '').toUpperCase();
  const name = bundle?.company?.name ?? company?.name ?? fallback?.meta?.company ?? code;
  const modules = bundle?.modules ?? {};
  const financialModule = modules.financials;
  const financials = hasLiveBundle ? {
    ...moduleState(financialModule),
    quarters: toSingleQuarterSeries(financialModule?.income),
    annualSeries: [],
    income: Array.isArray(financialModule?.income) ? financialModule.income : [],
    balance: Array.isArray(financialModule?.balance) ? financialModule.balance : [],
    cashflow: Array.isArray(financialModule?.cashflow) ? financialModule.cashflow : [],
  } : fallbackFinancials(fallback);
  const market = hasLiveBundle ? {
    ...moduleState(modules.market),
    series: Array.isArray(modules.market?.signals?.series) ? modules.market.signals.series : [],
    signals: modules.market?.signals ?? {},
  } : { status: 'unavailable', series: [], signals: {}, errors: [] };
  const quoteData = hasLiveBundle ? modules.market?.snapshot ?? {} : {};
  const valuationData = hasLiveBundle ? modules.valuation?.data ?? {} : {};

  return {
    company: { name, thscode: code },
    sourceState: {
      mode: hasLiveBundle ? 'live' : 'fallback',
      label: hasLiveBundle ? '扶摇实时数据' : '公开披露快照',
      generatedAt: hasLiveBundle ? bundle.generatedAt ?? null : fallback?.meta?.informationCutoff ?? null,
    },
    providers: hasLiveBundle ? bundle.providers ?? {} : { fuyao: 'unavailable', ifind: 'unavailable' },
    quote: {
      lastPrice: numberOrNull(quoteData.last_price),
      changePct: numberOrNull(quoteData.price_change_ratio_pct),
      change: numberOrNull(quoteData.price_change),
      turnover: numberOrNull(quoteData.turnover),
      volume: numberOrNull(quoteData.volume),
    },
    market,
    financials,
    indicators: hasLiveBundle ? {
      ...moduleState(modules.indicators),
      report: modules.indicators?.report ?? null,
      values: normalizeIndicators(modules.indicators),
    } : {
      status: fallback ? 'fallback' : 'unavailable',
      errors: [],
      report: modules.indicators?.report ?? fallback?.meta?.financialThrough ?? null,
      values: fallbackIndicators(fallback),
    },
    valuation: {
      ...moduleState(modules.valuation),
      timestamp: modules.valuation?.timestamp ?? null,
      peTtm: numberOrNull(valuationData.pe_ttm),
      peMrq: numberOrNull(valuationData.pe_mrq),
      pbMrq: numberOrNull(valuationData.pb_mrq),
      psTtm: numberOrNull(valuationData.ps_ttm),
      pcfTtm: numberOrNull(valuationData.pcf_ttm),
    },
    industry: { ...moduleState(modules.industry), data: modules.industry?.data ?? null },
    context: { ...moduleState(modules.context), data: modules.context?.data ?? null },
    profile: {
      ...moduleState(modules.profile),
      name: modules.profile?.data?.name ?? name,
      industry: modules.profile?.data?.industry ?? null,
      summary: modules.profile?.data?.summary ?? null,
      businessScope: modules.profile?.data?.businessScope ?? null,
      source: modules.profile?.source ?? null,
    },
    revenueComposition: disclosureComposition(fallback, code),
    sources: fallback?.meta?.symbol === code && Array.isArray(fallback?.sources) ? fallback.sources : [],
  };
}
