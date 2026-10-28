const STATUS = {
  positive: '表现较稳',
  negative: '需要留意',
  mixed: '出现分化',
  unknown: '暂无结论',
};

const number = value => value === null || value === undefined || value === '--' || !Number.isFinite(Number(value)) ? null : Number(value);
const pct = value => number(value) === null ? '—' : `${number(value) >= 0 ? '+' : ''}${number(value).toFixed(1)}%`;

function indicators(bundle) {
  const abilities = bundle?.modules?.indicators?.data?.abilities || [];
  return Object.fromEntries(abilities.flatMap(group => (group.indicators || []).map(item => [item.index_id, number(item.value)])));
}

function metric(map, names) {
  for (const name of names) if (map[name] !== undefined) return map[name];
  return null;
}

function step({ key, number, question, why, state, conclusion, interpretation, primaryEvidence, detailTarget }) {
  return { key, number, question, why, state, label: STATUS[state], conclusion, interpretation, primaryEvidence, detailTarget };
}

export function buildHealthReport(bundle, company) {
  const modules = bundle?.modules || {};
  const values = indicators(bundle);
  const revenue = metric(values, ['calculate_operating_income_yoy_growth_ratio', 'operating_income_yoy_growth_ratio']);
  const profit = metric(values, ['calculate_parent_holder_net_profit_yoy_growth_ratio', 'net_profit_yoy_growth_ratio']);
  const cash = metric(values, ['net_profit_cash_content']);
  const debt = metric(values, ['assets_debt_ratio']);
  const market = modules.market || {};
  const return60 = number(market.signals?.return60);
  const drawdown = number(market.signals?.maxDrawdown60);

  const growthState = revenue === null || profit === null ? 'unknown' : revenue >= 0 && profit >= 0 ? 'positive' : revenue * profit < 0 ? 'mixed' : 'negative';
  const cashState = cash === null ? 'unknown' : cash >= 100 ? 'positive' : cash >= 60 ? 'mixed' : 'negative';
  const debtState = debt === null ? 'unknown' : debt <= 60 ? 'positive' : debt <= 70 ? 'mixed' : 'negative';
  const marketState = return60 === null || drawdown === null ? 'unknown' : return60 >= 0 && drawdown > -15 ? 'positive' : return60 < 0 ? 'negative' : 'mixed';

  const steps = [
    step({ key: 'earning', number: '01', question: '生意还在增长吗？', why: '收入说明生意规模，利润说明增长有没有真正留下来；两者要一起看。', state: growthState, conclusion: growthState === 'unknown' ? '关键增长数据还不完整' : growthState === 'positive' ? '收入和利润仍在同向增长' : growthState === 'mixed' ? '收入与利润的方向出现分化' : '收入和利润都面临增长压力', interpretation: growthState === 'positive' ? '增长方向一致，但还需继续观察增速是否放缓。' : growthState === 'mixed' ? '只看收入或利润都会失真，需要检查成本、毛利和一次性项目。' : growthState === 'negative' ? '当前增长承压，不代表未来一定继续下降。' : '没有足够证据时，不用旧数据代替最新判断。', primaryEvidence: `收入同比 ${pct(revenue)} · 归母净利润同比 ${pct(profit)}`, detailTarget: 'financial' }),
    step({ key: 'cash', number: '02', question: '赚到的钱真的收到现金了吗？', why: '利润是会计结果，现金是实际流入；现金跟不上时，利润质量可能需要进一步核实。', state: cashState, conclusion: cash === null ? '暂时无法判断利润的现金含量' : cashState === 'positive' ? '经营现金能够较好覆盖利润' : cashState === 'mixed' ? '利润和现金基本匹配，但不算充裕' : '利润转成现金的能力偏弱', interpretation: cashState === 'positive' ? '每 100 元利润对应的经营现金不少于 100 元，现金质量相对扎实。' : cashState === 'unknown' ? '需要经营现金流与净利润的同口径数据。' : '需要继续检查应收账款、存货和付款节奏。', primaryEvidence: `每 100 元利润对应经营现金 ${cash === null ? '—' : cash.toFixed(0) + ' 元'}`, detailTarget: 'financial' }),
    step({ key: 'safety', number: '03', question: '公司的财务负担重吗？', why: '负债不是越少越好，但过高会降低公司应对行业波动的余地。', state: debtState, conclusion: debt === null ? '暂时无法判断负债水平' : debtState === 'positive' ? '整体负债水平相对温和' : debtState === 'mixed' ? '负债水平需要结合行业理解' : '负债水平偏高，需要重点核实', interpretation: debtState === 'mixed' ? '制造业常有经营性负债，不能只凭一个比例判定风险。' : debtState === 'positive' ? '当前比例留有一定缓冲，但仍要看短期偿债和利息压力。' : debtState === 'negative' ? '需要进一步区分有息负债与经营性负债。' : '缺失时保持未知，不用行业印象代替数据。', primaryEvidence: `每 100 元资产中负债 ${debt === null ? '—' : debt.toFixed(1) + ' 元'}`, detailTarget: 'financial' }),
    step({ key: 'market', number: '04', question: '市场最近怎么看它？', why: '价格反映市场近期态度，不等于公司价值；趋势和回撤要放在一起看。', state: marketState, conclusion: return60 === null ? '近期市场数据暂不可用' : marketState === 'positive' ? '近期价格表现相对平稳' : marketState === 'negative' ? '近期价格表现偏弱' : '价格有表现，但波动也较明显', interpretation: '这是历史市场表现，不是未来涨跌预测；请和基本面变化对照阅读。', primaryEvidence: `近 60 日 ${pct(return60)} · 最大回撤 ${pct(drawdown)}`, detailTarget: 'market' }),
    step({ key: 'unknowns', number: '05', question: '还有哪些事现在不能下结论？', why: '好的研究不仅说知道什么，也要明确哪些关键证据仍然缺失。', state: 'unknown', conclusion: '估值、同行位置和最新事件仍待补充', interpretation: '没有同日估值、可比公司分位和公告原文时，不判断“贵不贵”或事件影响。', primaryEvidence: '3 类关键证据尚未接入', detailTarget: 'lineage' }),
  ];

  const counts = steps.reduce((acc, item) => ({ ...acc, [item.state]: (acc[item.state] || 0) + 1 }), {});
  const incomplete = [modules.market, modules.financials, modules.indicators].some(module => !module || module.status !== 'ok');
  const attention = steps.filter(item => item.state === 'negative' || item.state === 'mixed');
  const vitalUnknowns = steps.slice(0, 4).filter(item => item.state === 'unknown').length;
  const financialDates = [...(modules.financials?.income || []), ...(modules.financials?.balance || []), ...(modules.financials?.cashflow || [])]
    .map(row => row?.period_end_ms || row?.period_end || row?.end_date_ms).filter(Boolean).map(Number).filter(Number.isFinite);
  const financialPeriod = financialDates.length ? new Date(Math.max(...financialDates)).toISOString().slice(0, 10) : null;
  const summary = vitalUnknowns >= 2
    ? `${company.name} 目前不足以概括基本面，先补齐关键体征再判断。`
    : incomplete
    ? `${company.name} 的证据还不完整，先看已确认部分，再补齐缺失数据。`
    : attention.length
      ? `${company.name} 的基本面有支撑，但有 ${attention.length} 项值得继续核实。`
      : `${company.name} 当前几项核心体征较平稳，但仍有未知信息需要补充。`;
  const actions = [
    ...(incomplete ? ['补齐未成功返回的数据模块，再更新体检结论。'] : []),
    ...attention.slice(0, 2).map(item => `继续核实「${item.question.replace('？', '')}」背后的变化原因。`),
    '补充同行估值和最新公告后，再形成更完整判断。',
  ].slice(0, 3);

  return { company, summary, counts, steps, actions, financialPeriod };
}
