export function percentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
}

export function classifyEvidence({ value = 1, positive = false, negative = false } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'unknown';
  if (positive && negative) return 'contradiction';
  if (positive) return 'positive';
  if (negative) return 'negative';
  return 'neutral';
}

const ROUTES = [
  ['growth', /增长|营收|利润|业绩|放缓|业务/],
  ['cash', /现金|应收|存货|回款|负债|周转/],
  ['valuation', /估值|市盈率|PE|贵|便宜/i],
  ['market', /股价|走势|波动|行情|回撤/],
  ['industry', /同行|行业|格力|海尔|位置/],
  ['events', /事件|公告|回购|分红|新闻/],
];

export function routeQuestion(question = '') {
  const text = String(question).trim();
  const dimensions = ROUTES.filter(([, pattern]) => pattern.test(text)).map(([key]) => key);
  return {
    dimensions,
    mode: dimensions.length ? 'focused' : 'overview',
    complianceNotice: /能买吗|买入|卖出|目标价|涨停|收益/.test(text),
  };
}

function metric(snapshot, id) {
  return snapshot?.metrics?.[id] ?? null;
}

export function buildDiagnostics(snapshot, mode = 'normal') {
  if (mode === 'provider-error') {
    return [{
      id: 'provider-error', dimension: 'system', state: 'unknown', severity: 'high',
      title: '实时数据接口暂不可用',
      summary: '接口失败，当前仅保留已标时点的可验证快照；未生成替代数字。',
      evidence: [], questions: ['接口恢复后重新核对行情、估值与最新公告。'],
    }];
  }

  const revenue = metric(snapshot, 'revenue_h1');
  const profit = metric(snapshot, 'net_profit_h1');
  const adjusted = metric(snapshot, 'adjusted_profit_h1');
  const cashflow = metric(snapshot, 'operating_cashflow_h1');
  const receivables = metric(snapshot, 'receivables');
  const inventory = metric(snapshot, 'inventory');
  const leverage = metric(snapshot, 'debt_ratio');
  const valuation = metric(snapshot, 'pe_ttm');
  const priceReturn = metric(snapshot, 'price_return_60d');

  const diagnostics = [
    {
      id: 'growth-quality', dimension: 'growth',
      state: classifyEvidence({ value: revenue?.value, positive: (revenue?.yoy ?? -1) > 0, negative: (adjusted?.yoy ?? 0) < -10 }),
      severity: 'high', title: '增长仍在，但利润质量出现分化',
      summary: revenue && profit && adjusted
        ? `营收同比 ${revenue.yoy.toFixed(2)}%，归母净利润同比 ${profit.yoy.toFixed(2)}%，但扣非净利润同比 ${adjusted.yoy.toFixed(2)}%。`
        : '缺少营收或利润关键字段，无法验证增长质量。',
      evidence: [revenue, profit, adjusted].filter(Boolean),
      formula: '增长质量 = 营收同比、归母净利润同比与扣非净利润同比的方向一致性',
      questions: ['扣非下降中汇兑损失与经营因素各占多少？', '下半年收入增速能否重新高于费用增速？'],
    },
    {
      id: 'cash-conversion', dimension: 'cash',
      state: classifyEvidence({ value: cashflow?.value, positive: (cashflow?.value ?? 0) > (profit?.value ?? Infinity), negative: (receivables?.change ?? 0) > 30 }),
      severity: 'high', title: '现金流覆盖利润，但应收扩张需要解释',
      summary: cashflow && profit && receivables
        ? `经营现金流 ${cashflow.value.toFixed(2)} 亿元，高于归母净利润；应收账款较年初增长 ${receivables.change.toFixed(2)}%。`
        : '缺少现金流或应收账款字段，无法验证现金转化。',
      evidence: [cashflow, profit, receivables].filter(Boolean),
      formula: '现金覆盖倍数 = 经营活动现金流量净额 ÷ 归母净利润',
      derived: cashflow && profit ? { label: '现金覆盖倍数', value: Number((cashflow.value / profit.value).toFixed(2)), unit: 'x' } : null,
      questions: ['应收增加来自账期变化、业务结构还是并表因素？', '应收账款账龄与坏账准备是否同步恶化？'],
    },
    {
      id: 'working-capital', dimension: 'cash',
      state: classifyEvidence({ value: inventory?.value, positive: (inventory?.change ?? 1) < 0, negative: (leverage?.changePp ?? 0) > 3 }),
      severity: 'medium', title: '去库存与杠杆抬升同时发生',
      summary: inventory && leverage
        ? `存货较年初变化 ${inventory.change.toFixed(2)}%，资产负债率升至 ${leverage.value.toFixed(2)}%，较年初 +${leverage.changePp.toFixed(2)} 个百分点。`
        : '营运资本字段不完整，暂不下结论。',
      evidence: [inventory, leverage].filter(Boolean),
      questions: ['可转债与海外融资对负债率的影响有多大？'],
    },
    {
      id: 'valuation', dimension: 'valuation',
      state: valuation ? 'unknown' : 'unknown', severity: 'medium', title: '估值需要同一时点的同行分位',
      summary: valuation ? `当前快照市盈率为 ${valuation.value}${valuation.unit}，但缺少同一交易日的可比公司分位，暂不判断高低。` : '演示快照未接入实时估值，拒绝用过期价格计算。',
      evidence: valuation ? [valuation] : [],
      questions: ['接入扶摇后补齐美的、格力、海尔的同日 PE/PB/EV-EBITDA 分位。'],
    },
    {
      id: 'market', dimension: 'market', state: priceReturn ? 'neutral' : 'unknown', severity: 'low',
      title: '行情特征受数据时点限制',
      summary: priceReturn ? `近 60 交易日收益 ${priceReturn.value}%（仅描述，不预测）。` : '未接入最新复权 K 线，无法验证波动、回撤与相对强弱。',
      evidence: priceReturn ? [priceReturn] : [],
      questions: ['补充相对沪深 300 与家电板块的 20/60/120 日超额收益。'],
    },
    {
      id: 'industry', dimension: 'industry', state: 'unknown', severity: 'medium',
      title: '同行位置尚缺统一口径',
      summary: '已知公司业务横跨智能家居与商业工业方案，单用家电公司口径比较会失真；当前不生成伪排名。',
      evidence: [], questions: ['分部层面分别选择白电、楼宇科技、机器人与工业技术可比公司。'],
    },
    {
      id: 'events', dimension: 'events', state: 'positive', severity: 'low',
      title: '回购与中期分红是已披露的资本动作',
      summary: '回购和分红是客观事件，但不能单独推导未来股价方向。',
      evidence: snapshot?.events ?? [], questions: ['持续跟踪回购执行进度、均价与注销安排。'],
    },
  ];

  if (mode === 'missing-data') {
    return diagnostics.map((item, index) => index < 2 ? { ...item, state: 'unknown', summary: '关键字段缺失：该维度暂停生成结论。', evidence: [] } : item);
  }
  return diagnostics;
}
