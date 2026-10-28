export const sourceRegistry = {
  midea2026h1: {
    id: 'midea2026h1',
    title: '美的集团股份有限公司 2026 年半年度报告全文',
    publisher: '巨潮资讯网 / 美的集团',
    publishedAt: '2026-08-28',
    accessedAt: '2026-10-28',
    tier: 'primary',
    url: 'https://static.cninfo.com.cn/finalpage/2026-08-28/1225533135.PDF',
    note: '半年度财务报告未经审计；金额单位为人民币千元。',
  },
  midea2025ar: {
    id: 'midea2025ar',
    title: '美的集团股份有限公司 2025 年年度报告全文',
    publisher: '香港交易所披露易 / 美的集团',
    publishedAt: '2026-03-30',
    accessedAt: '2026-10-28',
    tier: 'primary',
    url: 'https://www.hkexnews.hk/listedco/listconews/sehk/2026/0330/2026033002440_c.pdf',
    note: '用于年度基线与年初余额核对。',
  },
  midea2026h1summary: {
    id: 'midea2026h1summary',
    title: '美的集团股份有限公司 2026 年半年度报告摘要',
    publisher: '新浪财经公告镜像 / 美的集团',
    publishedAt: '2026-08-29',
    accessedAt: '2026-10-28',
    tier: 'secondary-mirror',
    url: 'https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=12572218&stockid=000333',
    note: '用于中期分红方案展示；最终以交易所原始公告为准。',
  },
  buyback2025: {
    id: 'buyback2025',
    title: '关于回购股份进展暨回购期限届满实施结果的公告',
    publisher: '巨潮资讯网 / 美的集团',
    publishedAt: '2025-05-28',
    accessedAt: '2026-10-28',
    tier: 'primary',
    url: 'https://static.cninfo.com.cn/finalpage/2025-05-28/1223696877.PDF',
    note: '资本动作事件证据；不作为股价方向证据。',
  },
};

const m = (label, value, unit, period, sourceId, extras = {}) => ({
  label, value, unit, period, sourceId, ...extras,
});

export const mideaSnapshot = {
  asOf: '2026-08-28',
  company: {
    name: '美的集团',
    code: '000333.SZ',
    industry: '家用电器 / 商业及工业解决方案',
    profile: '多业务全球制造集团',
  },
  metrics: {
    revenue_h1: m('营业收入', 2600.4249, '亿元', '2026H1', 'midea2026h1', { yoy: 3.55, field: '营业收入（千元）' }),
    net_profit_h1: m('归母净利润', 264.46037, '亿元', '2026H1', 'midea2026h1', { yoy: 1.66, field: '归属于上市公司股东的净利润（千元）' }),
    adjusted_profit_h1: m('扣非归母净利润', 195.95179, '亿元', '2026H1', 'midea2026h1', { yoy: -25.31, field: '归属于上市公司股东的扣除非经常性损益的净利润（千元）' }),
    operating_cashflow_h1: m('经营现金流净额', 375.5209, '亿元', '2026H1', 'midea2026h1', { yoy: 0.73, field: '经营活动产生的现金流量净额（千元）' }),
    receivables: m('应收账款', 619.54826, '亿元', '2026-06-30', 'midea2026h1', { change: 53.16, baseline: 404.50097, baselinePeriod: '2025-12-31', field: '应收账款' }),
    inventory: m('存货', 554.40969, '亿元', '2026-06-30', 'midea2026h1', { change: -14.22, baseline: 646.28834, baselinePeriod: '2025-12-31', field: '存货' }),
    debt_ratio: m('资产负债率', 64.89, '%', '2026-06-30', 'midea2026h1', { changePp: 3.72, baseline: 61.17, baselinePeriod: '2025-12-31', field: '资产负债率' }),
    roe_weighted: m('加权平均净资产收益率', 11.33, '%', '2026H1', 'midea2026h1', { yoyPp: 0.04, field: '加权平均净资产收益率' }),
  },
  segments: [
    { name: '智能家居', revenue: 1743.41, unit: '亿元', yoy: 4.27, grossMargin: 27.95, sourceId: 'midea2026h1' },
    { name: '商业及工业解决方案', revenue: 666.66, unit: '亿元', yoy: 3.30, grossMargin: 20.84, sourceId: 'midea2026h1' },
  ],
  events: [
    { label: '2026 年中期分红方案', value: 5, unit: '元/10股', period: '2026H1', sourceId: 'midea2026h1summary' },
    { label: 'A 股回购实施结果', value: 2025, unit: '公告年度', period: '2025-05-28', sourceId: 'buyback2025' },
  ],
};

export const benchmarkNotes = [
  { product: 'Koyfin', borrowed: '多维研究工作区与可组合视图', limit: '不是证据状态产品' },
  { product: 'Simply Wall St', borrowed: '低认知成本的一眼概览', limit: '避免把复杂判断压成单一图形评分' },
  { product: 'OpenBB', borrowed: '数据源可替换与研究工作台思想', limit: '首版不引入重型数据基础设施' },
];
