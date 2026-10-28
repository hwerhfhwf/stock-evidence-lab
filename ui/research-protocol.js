const EVIDENCE_DIRECTIONS = ['positive', 'negative', 'conflicting', 'unknown'];
const EPISTEMIC_STATES = new Set(['fact', 'inference', 'unverified']);
const DRILLDOWN_TYPES = new Set(['financial_period', 'market_interval', 'peer_comparison', 'verification_question']);
const ADVICE_PATTERN = /买入|卖出|建仓|减仓|目标价|保证.{0,6}收益|稳赚|必涨|必跌/;

const DIMENSION_LABELS = {
  operating_quality: '经营与盈利',
  financial_trend: '财务与现金',
  valuation: '估值与预期',
  market_characteristics: '市场表现',
  industry_position: '行业位置',
  material_events: '重要事件',
  risk: '风险变量',
};

const BASE_ORDERS = {
  manufacturing: ['operating_quality', 'financial_trend', 'industry_position', 'risk', 'valuation', 'market_characteristics', 'material_events'],
  bank: ['risk', 'financial_trend', 'operating_quality', 'industry_position', 'valuation', 'material_events', 'market_characteristics'],
  general_corporate: ['operating_quality', 'financial_trend', 'industry_position', 'risk', 'valuation', 'market_characteristics', 'material_events'],
  general: ['operating_quality', 'financial_trend', 'industry_position', 'risk', 'valuation', 'market_characteristics', 'material_events'],
};

const QUESTION_PRIORITIES = [
  { pattern: /行情|股价|走势|回撤|波动|均线|成交量/, order: ['market_characteristics', 'material_events', 'financial_trend', 'risk'] },
  { pattern: /估值|市盈率|市净率|贵不贵|便宜|同行|定价/, order: ['valuation', 'industry_position', 'financial_trend', 'risk'] },
  { pattern: /利润|毛利|费用|收入|增长|转化|单车/, order: ['operating_quality', 'financial_trend', 'industry_position', 'risk'] },
  { pattern: /现金|回款|资本开支|负债|偿债|杠杆/, order: ['financial_trend', 'risk', 'operating_quality', 'material_events'] },
  { pattern: /公告|报告|新闻|政策|事件/, order: ['material_events', 'risk', 'operating_quality', 'market_characteristics'] },
];

const numberOrNull = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));

function reportLabel(report) {
  const match = /^(\d{4})-([1-4])$/.exec(String(report ?? ''));
  if (!match) return report || null;
  return `${match[1]}${({ 1: 'Q1', 2: 'H1', 3: 'Q3', 4: 'FY' })[Number(match[2])]}`;
}

function makeField({ id, label, value, unit, period, scope, sourceRefs, status = 'available', fieldName = id }) {
  return { id, label, value: numberOrNull(value), unit, period, scope, sourceRefs: [...new Set(sourceRefs.filter(Boolean))], status, fieldName };
}

function sourceById(sources, id) {
  return sources.some(source => source.id === id) ? id : sources[0]?.id;
}

export function buildSourcePackage(view, fallback = null) {
  const sources = (fallback?.sources ?? []).map(source => ({
    id: source.id,
    name: source.name,
    publisher: source.publisher,
    url: source.url,
    disclosed: source.disclosed,
    period: source.period,
    unitNote: source.unitNote,
    sourceType: 'primary_disclosure',
  }));
  const generatedAt = view?.sourceState?.generatedAt ?? fallback?.meta?.informationCutoff ?? null;
  if (!sources.length) {
    sources.push({
      id: 'FUYAO',
      name: '同花顺扶摇金融数据 API',
      publisher: '同花顺',
      url: 'https://fuyao.aicubes.cn/docs/',
      disclosed: generatedAt,
      period: generatedAt,
      unitNote: '字段单位随接口元数据返回。',
      sourceType: 'market_data_api',
    });
  }
  const report = reportLabel(view?.indicators?.report) ?? fallback?.meta?.financialThrough ?? null;
  const indicatorSource = sourceById(sources, fallback?.meta?.symbol === view?.company?.thscode ? 'H126' : 'FUYAO');
  const values = view?.indicators?.values ?? {};
  const fields = [];
  const add = input => fields.push(makeField(input));
  const commonIndicator = { period: report, scope: fallback?.meta?.scope ?? '公司合并口径', sourceRefs: [indicatorSource] };
  add({ id: 'metric:revenue-growth', label: '营业收入同比', value: values.calculate_operating_income_yoy_growth_ratio, unit: '%', fieldName: 'calculate_operating_income_yoy_growth_ratio', ...commonIndicator });
  add({ id: 'metric:profit-growth', label: '归母净利润同比', value: values.calculate_parent_holder_net_profit_yoy_growth_ratio, unit: '%', fieldName: 'calculate_parent_holder_net_profit_yoy_growth_ratio', ...commonIndicator });
  add({ id: 'metric:cash-content', label: '每百元归母利润对应经营现金', value: values.net_profit_cash_content, unit: '元/100元利润', fieldName: 'net_profit_cash_content', ...commonIndicator });
  add({ id: 'metric:debt-ratio', label: '资产负债率', value: values.assets_debt_ratio, unit: '%', fieldName: 'assets_debt_ratio', period: report, scope: '报告期末时点口径', sourceRefs: [indicatorSource] });

  if (fallback?.half?.[2025] && fallback?.half?.[2026]) {
    const prior = fallback.half[2025];
    const current = fallback.half[2026];
    add({ id: 'metric:operating-cash-growth', label: '经营现金同比', value: (current.cfo / prior.cfo - 1) * 100, unit: '%', period: '2026H1', scope: fallback.meta.scope, sourceRefs: [sourceById(sources, 'H126')], fieldName: 'act_cash_flow_net' });
    add({ id: 'metric:parent-margin-prior', label: '归母净利率', value: prior.parentProfit / prior.revenue * 100, unit: '%', period: '2025H1', scope: fallback.meta.scope, sourceRefs: [sourceById(sources, 'H126')], fieldName: 'parent_holder_net_profit / operating_income' });
    add({ id: 'metric:parent-margin-current', label: '归母净利率', value: current.parentProfit / current.revenue * 100, unit: '%', period: '2026H1', scope: fallback.meta.scope, sourceRefs: [sourceById(sources, 'H126')], fieldName: 'parent_holder_net_profit / operating_income' });
  }

  const valuationSource = sourceById(sources, 'FUYAO');
  for (const [key, label] of [['peTtm', 'PE'], ['pbMrq', 'PB'], ['psTtm', 'PS'], ['pcfTtm', 'PCF']]) {
    if (view?.valuation?.[key] !== null && view?.valuation?.[key] !== undefined) {
      add({ id: `valuation:${key}`, label, value: view.valuation[key], unit: '倍', period: view.valuation.timestamp ?? generatedAt, scope: '当前价格倍数', sourceRefs: [valuationSource], fieldName: key });
    }
  }
  if (view?.market?.signals?.return60 !== null && view?.market?.signals?.return60 !== undefined) {
    add({ id: 'market:return-60', label: '近60个交易日收益', value: view.market.signals.return60, unit: '%', period: view.market.signals.range?.end ?? generatedAt, scope: '前复权收盘价', sourceRefs: [valuationSource], fieldName: 'close_price' });
  }
  if (view?.market?.signals?.maxDrawdown60 !== null && view?.market?.signals?.maxDrawdown60 !== undefined) {
    add({ id: 'market:drawdown-60', label: '近60个交易日最大回撤', value: view.market.signals.maxDrawdown60, unit: '%', period: view.market.signals.range?.end ?? generatedAt, scope: '前复权收盘价', sourceRefs: [valuationSource], fieldName: 'close_price' });
  }

  return {
    version: '1.0',
    company: {
      name: view?.company?.name ?? fallback?.meta?.company ?? '',
      thscode: view?.company?.thscode ?? fallback?.meta?.symbol ?? '',
      companyType: view?.company?.companyType ?? fallback?.meta?.companyType ?? 'general_corporate',
    },
    generatedAt,
    providers: view?.providers ?? {},
    fields: fields.map(field => field.value === null ? { ...field, status: 'unavailable' } : { ...field, value: round(field.value) }),
    marketSeries: Array.isArray(view?.market?.series) ? view.market.series.map(point => ({ ...point })) : [],
    peers: Array.isArray(view?.industry?.data?.peers) ? view.industry.data.peers.map(peer => ({ ...peer })) : [],
    sources,
  };
}

function reasonFor(dimension, companyType, question) {
  if (dimension === 'operating_quality') return companyType === 'manufacturing' ? '制造业优先核对收入、毛利、费用与利润转化' : '问题涉及收入与利润如何形成经营成果';
  if (dimension === 'financial_trend') return '需要连接利润、经营现金、营运资本与资本开支';
  if (dimension === 'risk' && companyType === 'bank') return '银行优先核对资本、资产质量、息差与流动性风险';
  if (dimension === 'market_characteristics') return '问题直接涉及价格、波动或回撤的历史区间';
  if (dimension === 'valuation') return '需要把当前市场定价放回财务锚点、历史与同行';
  if (dimension === 'industry_position') return '需要区分公司自身变化与行业共同变化';
  if (dimension === 'material_events') return '报告、公告和外部事件用于解释变化时点';
  return question ? '作为当前问题的补充验证维度' : '作为基础研究维度保留';
}

export function selectDiagnosisDimensions({ companyType = 'general_corporate', question = '', availableDimensions = Object.keys(DIMENSION_LABELS) } = {}) {
  const base = BASE_ORDERS[companyType] ?? BASE_ORDERS.general_corporate;
  const match = QUESTION_PRIORITIES.find(item => item.pattern.test(question));
  const companyLead = companyType === 'bank' && !/行情|股价|估值|市盈率|市净率/.test(question) ? ['risk', 'financial_trend'] : [];
  const ordered = [...new Set([...companyLead, ...(match?.order ?? []), ...base])].filter(id => availableDimensions.includes(id));
  return ordered.map((id, index) => ({
    id,
    label: DIMENSION_LABELS[id],
    priority: index + 1,
    reason: reasonFor(id, companyType, question),
    availability: availableDimensions.includes(id) ? 'available' : 'unavailable',
  }));
}

function emptyGroups() {
  return { positive: [], negative: [], conflicting: [], unknown: [] };
}

function fieldMap(sourcePackage) {
  return new Map(sourcePackage.fields.map(field => [field.id, field]));
}

function evidenceItem(id, label, evidenceRefs, extra = {}) {
  return { id, label, evidenceRefs, ...extra };
}

function claim(input) {
  return { sourceRefs: [], limitations: [], ...input };
}

export function buildResearchClaims(sourcePackage) {
  const fields = fieldMap(sourcePackage);
  const revenue = fields.get('metric:revenue-growth');
  const profit = fields.get('metric:profit-growth');
  const cashGrowth = fields.get('metric:operating-cash-growth');
  const marginPrior = fields.get('metric:parent-margin-prior');
  const marginCurrent = fields.get('metric:parent-margin-current');
  const growthKnown = revenue?.status === 'available' && profit?.status === 'available';
  const groups = emptyGroups();
  const growthRefs = growthKnown ? [revenue.id, profit.id] : [];
  if (growthKnown && profit.value < revenue.value) {
    groups.negative.push(evidenceItem('profit-below-revenue', `归母净利润增速低于营业收入 ${round(revenue.value - profit.value, 1)}pp`, growthRefs));
  }
  if (cashGrowth?.status === 'available' && cashGrowth.value > 0) {
    groups.positive.push(evidenceItem('cash-improved', `经营现金同比 ${cashGrowth.value > 0 ? '+' : ''}${cashGrowth.value.toFixed(1)}%`, [cashGrowth.id]));
  }
  if (growthKnown && profit.value < 0 && cashGrowth?.value > 0) {
    groups.conflicting.push(evidenceItem('profit-cash-divergence', '归母利润下降与经营现金改善方向分化', [profit.id, cashGrowth.id], { conflictType: 'metric_divergence' }));
  }
  if (!growthKnown) {
    groups.unknown.push(evidenceItem('missing-growth', '收入与归母利润同口径增速不完整', growthRefs, { requiredFields: ['revenue_growth', 'parent_profit_growth'] }));
  }
  groups.unknown.push(evidenceItem('unseparated-drivers', '价格、销量、产品结构与费用贡献尚未完全分离', [], { requiredFields: ['single_vehicle_profit', 'expense_ratio', 'product_mix'] }));
  const gap = growthKnown ? round(profit.value - revenue.value, 1) : null;
  const marginText = marginPrior?.status === 'available' && marginCurrent?.status === 'available'
    ? `；归母净利率 ${marginPrior.value.toFixed(2)}% → ${marginCurrent.value.toFixed(2)}%`
    : '';
  const operating = claim({
    id: 'operating-conversion',
    dimension: 'operating_quality',
    question: '收入变化如何转化为归母利润与经营现金？',
    statement: growthKnown ? `归母净利润增速较营业收入低 ${Math.abs(gap).toFixed(1)}pp${marginText}。` : '收入与归母利润的同口径数据尚不完整。',
    epistemicStatus: growthKnown ? 'fact' : 'unverified',
    evidenceGroups: groups,
    sourceRefs: [...new Set([...groups.positive, ...groups.negative, ...groups.conflicting].flatMap(item => item.evidenceRefs))],
    drilldowns: [
      { type: 'financial_period', label: '查看 2026H1 财务期次', period: revenue?.period ?? profit?.period ?? '2026H1', evidenceRefs: growthRefs },
      { type: 'verification_question', label: '待验证：费用率、单车盈利与产品结构', requiredFields: ['expense_ratio', 'single_vehicle_profit', 'product_mix'] },
    ],
    limitations: ['指标方向分化不等于来源内容冲突'],
  });

  const cashGroups = emptyGroups();
  const cashContent = fields.get('metric:cash-content');
  if (cashContent?.status === 'available') cashGroups.positive.push(evidenceItem('cash-content', `每100元归母利润对应约 ${cashContent.value.toFixed(0)} 元经营现金`, [cashContent.id]));
  else cashGroups.unknown.push(evidenceItem('cash-content-missing', '利润与经营现金同口径数据缺失', [], { requiredFields: ['operating_cash', 'parent_profit'] }));
  const cashClaim = claim({
    id: 'cash-conversion', dimension: 'financial_trend', question: '利润是否形成经营现金，现金如何投入长期资产？',
    statement: cashContent?.status === 'available' ? `每100元归母利润对应约 ${cashContent.value.toFixed(0)} 元经营现金；资本开支覆盖需继续核对。` : '利润与经营现金的同口径关系暂无法验证。',
    epistemicStatus: cashContent?.status === 'available' ? 'fact' : 'unverified', evidenceGroups: cashGroups,
    sourceRefs: cashContent?.status === 'available' ? [cashContent.id] : [],
    drilldowns: [{ type: 'financial_period', label: '查看现金流期次', period: cashContent?.period ?? 'unknown', evidenceRefs: cashContent ? [cashContent.id] : [] }],
  });

  const valuationFields = sourcePackage.fields.filter(field => field.id.startsWith('valuation:') && field.status === 'available');
  const valuationGroups = emptyGroups();
  if (valuationFields.length) valuationGroups.positive.push(evidenceItem('valuation-snapshot', '当前价格倍数已取得', valuationFields.map(field => field.id)));
  valuationGroups.unknown.push(evidenceItem('valuation-context-missing', '历史分位与同口径同行仍需补充', [], { requiredFields: ['historical_valuation', 'peer_valuation'] }));
  const valuation = claim({
    id: 'valuation-context', dimension: 'valuation', question: '当前市场定价对应怎样的基本面，处于什么相对位置？',
    statement: valuationFields.length ? '当前价格倍数已取得；历史位置与同行位置尚未完整验证。' : '当前价格倍数、历史位置或同行位置尚未完整取得。',
    epistemicStatus: valuationFields.length ? 'fact' : 'unverified', evidenceGroups: valuationGroups,
    sourceRefs: valuationFields.map(field => field.id),
    drilldowns: [{ type: 'peer_comparison', label: '查看同口径同行比较', peerIds: sourcePackage.peers.map(peer => peer.thscode ?? peer.id).filter(Boolean), status: sourcePackage.peers.length ? 'available' : 'unknown' }],
  });

  const marketFields = sourcePackage.fields.filter(field => field.id.startsWith('market:') && field.status === 'available');
  const marketGroups = emptyGroups();
  if (marketFields.length) marketGroups.positive.push(evidenceItem('market-history', '行情区间数据已取得', marketFields.map(field => field.id)));
  else marketGroups.unknown.push(evidenceItem('market-history-missing', '有效行情区间不足或接口不可用', [], { requiredFields: ['adjusted_close_series'] }));
  const market = claim({
    id: 'market-path', dimension: 'market_characteristics', question: '价格、波动和回撤在所选区间如何变化？',
    statement: marketFields.length ? '所选行情区间的收益与回撤可复算；历史表现不构成未来预测。' : '当前缺少足够的前复权行情序列，无法验证区间收益与回撤。',
    epistemicStatus: marketFields.length ? 'fact' : 'unverified', evidenceGroups: marketGroups,
    sourceRefs: marketFields.map(field => field.id),
    drilldowns: [{ type: 'market_interval', label: '查看行情区间', range: sourcePackage.marketSeries.length ? [sourcePackage.marketSeries[0]?.date_ms, sourcePackage.marketSeries.at(-1)?.date_ms] : null, adjustment: 'forward_adjusted', status: sourcePackage.marketSeries.length ? 'available' : 'unknown' }],
    limitations: ['历史行情不构成未来价格预测'],
  });

  const reportGroups = emptyGroups();
  reportGroups.positive.push(...groups.positive);
  reportGroups.negative.push(...groups.negative);
  reportGroups.conflicting.push(...groups.conflicting);
  reportGroups.unknown.push(...groups.unknown);
  const reportRisk = claim({
    id: 'report-risk-variables', dimension: 'risk', question: '最新报告暴露了哪些需要继续监测的变量？',
    statement: '报告中的收入、利润、现金和利润率变化已结构化；持续性仍需后续期次与产销数据验证。',
    epistemicStatus: 'inference', evidenceGroups: reportGroups, sourceRefs: operating.sourceRefs,
    drilldowns: [{ type: 'verification_question', label: '下一期验证毛利率、费用率、单车盈利与产销', requiredFields: ['gross_margin', 'expense_ratio', 'single_vehicle_profit', 'sales_volume'] }],
  });

  return [operating, cashClaim, valuation, market, reportRisk];
}

export function validateResearchClaim(claimValue) {
  const errors = [];
  if (!claimValue || typeof claimValue !== 'object') return { ok: false, errors: ['claim 必须是对象'] };
  for (const key of ['id', 'question', 'statement']) if (typeof claimValue[key] !== 'string' || !claimValue[key].trim()) errors.push(`缺少 ${key}`);
  if (!EPISTEMIC_STATES.has(claimValue.epistemicStatus)) errors.push('epistemicStatus 无效');
  if (!claimValue.evidenceGroups || typeof claimValue.evidenceGroups !== 'object') errors.push('缺少 evidenceGroups');
  for (const direction of EVIDENCE_DIRECTIONS) if (!Array.isArray(claimValue.evidenceGroups?.[direction])) errors.push(`缺少 ${direction} 证据槽位`);
  if (!Array.isArray(claimValue.drilldowns)) errors.push('drilldowns 必须为数组');
  else for (const item of claimValue.drilldowns) if (!DRILLDOWN_TYPES.has(item?.type)) errors.push(`无效钻取类型 ${item?.type ?? ''}`);
  if (ADVICE_PATTERN.test(claimValue.statement ?? '')) errors.push('包含投资建议或确定性承诺');
  return { ok: errors.length === 0, errors };
}

export { DIMENSION_LABELS, DRILLDOWN_TYPES, EPISTEMIC_STATES, EVIDENCE_DIRECTIONS };

