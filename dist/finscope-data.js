const YI = 100_000_000;

export const BYD_SNAPSHOT = Object.freeze({
  meta: {
    symbol: '002594.SZ',
    company: '比亚迪',
    security: 'A股 · 深交所',
    financialThrough: '2026-06-30',
    informationCutoff: '2026-08-29',
    scope: '比亚迪集团合并口径；归母利润另列',
    live: false,
  },
  sources: [
    { id: 'AR25', name: '比亚迪 2025 年年度报告', publisher: '比亚迪股份有限公司 / 巨潮资讯', url: 'https://static.cninfo.com.cn/finalpage/2026-03-28/1225045351.PDF', disclosed: '2026-03-28', period: '2025-01-01—2025-12-31', unitNote: '主要财务指标为元；财务报表为千元，进入本快照时已换算为元。' },
    { id: 'Q126', name: '比亚迪 2026 年第一季度报告', publisher: '比亚迪股份有限公司 / 巨潮资讯', url: 'https://static.cninfo.com.cn/finalpage/2026-04-29/1225233071.PDF', disclosed: '2026-04-29', period: '2026-01-01—2026-03-31', unitNote: '金额为元；2025Q1 为报告中的同季比较值。' },
    { id: 'H126', name: '比亚迪 2026 年半年度报告摘要', publisher: '比亚迪股份有限公司 / 巨潮资讯', url: 'https://static.cninfo.com.cn/finalpage/2026-08-29/1225531834.PDF', disclosed: '2026-08-29', period: '2026-01-01—2026-06-30', unitNote: '金额为元；与上年上半年比较。' },
    { id: 'JUN26', name: '2026 年 6 月产销快报', publisher: '比亚迪股份有限公司 / 香港交易所披露易', url: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0701/2026070100033.pdf', disclosed: '2026-07-01', period: '2026-06', unitNote: '车辆单位为辆；月度与累计值分列。' },
    { id: 'JUL26', name: '2026 年 7 月产销快报', publisher: '比亚迪股份有限公司 / 香港交易所披露易', url: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0802/2026080200027.pdf', disclosed: '2026-08-02', period: '2026-07', unitNote: '车辆单位为辆；月度与累计值分列。' },
  ],
  annual: [
    { year: 2023, revenue: 602_315_354_000, parentProfit: 30_040_811_000, adjustedProfit: 28_462_432_000, cfo: 169_725_025_000, roe: 24.4 },
    { year: 2024, revenue: 777_102_455_000, parentProfit: 40_254_346_000, adjustedProfit: 36_982_887_000, cfo: 133_453_873_000, roe: 26.05, cost: 626_046_616_000, capexCash: 97_359_768_000 },
    { year: 2025, revenue: 803_964_958_000, parentProfit: 32_619_022_000, adjustedProfit: 29_445_703_000, cfo: 59_135_544_000, roe: 15.31, cost: 661_305_161_000, capexCash: 156_807_853_000 },
  ],
  half: {
    2025: { revenue: 371_280_948_000, parentProfit: 15_510_533_000, adjustedProfit: 13_599_741_000, cfo: 31_833_471_000, roe: 7.43 },
    2026: { revenue: 344_815_421_000, parentProfit: 12_325_408_000, adjustedProfit: 12_373_343_000, cfo: 37_334_744_000, roe: 4.86 },
  },
  q1: {
    2025: { revenue: 170_360_448_000, parentProfit: 9_154_985_000, adjustedProfit: 8_171_627_000, cfo: 8_580_961_000, cost: 136_175_385_000 },
    2026: { revenue: 150_225_314_000, parentProfit: 4_084_551_000, adjustedProfit: 4_147_574_000, cfo: 2_790_305_000, cost: 121_973_620_000 },
  },
  regions: {
    2024: { domestic: 555_217_682_000, overseas: 221_884_773_000 },
    2025: { domestic: 493_223_970_000, overseas: 310_740_988_000 },
  },
  segments: [
    { name: '汽车及相关产品', revenue2024: 617_381_935_000, revenue2025: 648_645_636_000, grossMargin2025: 20.49, grossMarginDeltaPp: -1.82 },
    { name: '手机部件及组装', revenue2024: 159_608_576_000, revenue2025: 155_236_528_000, grossMargin2025: 6.29, grossMarginDeltaPp: -2.06 },
    { name: '其他', revenue2024: 111_944_000, revenue2025: 82_794_000, grossMargin2025: null, grossMarginDeltaPp: null },
  ],
  cashFlow: {
    2024: { inflows: 814_817_630_000, outflows: 681_363_757_000, cfo: 133_453_873_000, investing: -129_082_282_000, financing: -10_267_547_000, capexCash: 97_359_768_000 },
    2025: { inflows: 861_740_107_000, outflows: 802_604_563_000, cfo: 59_135_544_000, investing: -197_463_109_000, financing: 104_613_870_000, capexCash: 156_807_853_000 },
  },
  balance: {
    2024: { assets: 783_355_855_000, liabilities: 584_667_646_000, currentAssets: 370_572_244_000, currentLiabilities: 495_985_176_000, inventory: 116_036_237_000, cash: 102_738_734_000 },
    2025: { assets: 883_729_883_000, liabilities: 625_190_698_000, currentAssets: 371_467_558_000, currentLiabilities: 468_451_357_000, inventory: 138_420_580_000, cash: 75_424_747_000 },
  },
  sales: [
    { month: '2026-06', units: 403_472, priorUnits: 382_585, ytd: 1_808_511, priorYtd: 2_145_954, exportUnits: 175_349, sourceId: 'JUN26' },
    { month: '2026-07', units: 419_211, priorUnits: 344_296, ytd: 2_227_722, priorYtd: 2_490_250, exportUnits: 180_538, sourceId: 'JUL26' },
  ],
});

const round = (value, digits = 2) => Number(value.toFixed(digits));
const growthPct = (current, prior) => round(((current / prior) - 1) * 100);
const yi = (value) => round(value / YI);

function evidence(id, label, period, sourceId, pages, rawValues, unit = '元', scope = '集团合并口径') {
  return { id, label, period, sourceId, pages, rawValues, unit, scope };
}

export function deriveBydResearch(snapshot = BYD_SNAPSHOT) {
  const annual2024 = snapshot.annual.find((row) => row.year === 2024);
  const annual2025 = snapshot.annual.find((row) => row.year === 2025);
  const h1_2025 = snapshot.half[2025];
  const h1_2026 = snapshot.half[2026];
  const evidenceItems = [
    evidence('annual-revenue', '营业收入', '2024—2025', 'AR25', [11], [annual2024.revenue, annual2025.revenue]),
    evidence('annual-parent-profit', '归母净利润', '2024—2025', 'AR25', [11], [annual2024.parentProfit, annual2025.parentProfit]),
    evidence('annual-cfo', '经营活动现金流量净额', '2024—2025', 'AR25', [11, 130], [annual2024.cfo, annual2025.cfo]),
    evidence('regions', '分地区营业收入', '2024—2025', 'AR25', [29, 30], [snapshot.regions[2024].domestic, snapshot.regions[2024].overseas, snapshot.regions[2025].domestic, snapshot.regions[2025].overseas]),
    evidence('segments', '分产品营业收入及毛利率', '2024—2025', 'AR25', [29, 30], snapshot.segments.flatMap((segment) => [segment.revenue2024, segment.revenue2025, segment.grossMargin2025]), '元 / %'),
    evidence('cash-structure', '经营、投资与筹资现金流', '2024—2025', 'AR25', [130, 131], [snapshot.cashFlow[2024].cfo, snapshot.cashFlow[2024].investing, snapshot.cashFlow[2024].financing, snapshot.cashFlow[2025].cfo, snapshot.cashFlow[2025].investing, snapshot.cashFlow[2025].financing]),
    evidence('h1-revenue', '营业收入', '2025H1—2026H1', 'H126', [1, 2], [h1_2025.revenue, h1_2026.revenue]),
    evidence('h1-parent-profit', '归母净利润', '2025H1—2026H1', 'H126', [1, 2], [h1_2025.parentProfit, h1_2026.parentProfit]),
    evidence('h1-cfo', '经营活动现金流量净额', '2025H1—2026H1', 'H126', [1, 2], [h1_2025.cfo, h1_2026.cfo]),
  ];
  const metrics = {
    annualRevenueGrowthPct: growthPct(annual2025.revenue, annual2024.revenue),
    annualParentProfitGrowthPct: growthPct(annual2025.parentProfit, annual2024.parentProfit),
    annualCfoGrowthPct: growthPct(annual2025.cfo, annual2024.cfo),
    h1RevenueGrowthPct: growthPct(h1_2026.revenue, h1_2025.revenue),
    h1ParentProfitGrowthPct: growthPct(h1_2026.parentProfit, h1_2025.parentProfit),
    h1OperatingCashGrowthPct: growthPct(h1_2026.cfo, h1_2025.cfo),
    ttmParentProfitYi: yi(annual2025.parentProfit - h1_2025.parentProfit + h1_2026.parentProfit),
    ttmParentProfitOperandsYi: { fiscal2025: yi(annual2025.parentProfit), h1_2025: yi(h1_2025.parentProfit), h1_2026: yi(h1_2026.parentProfit) },
    overseasGrowthPct: growthPct(snapshot.regions[2025].overseas, snapshot.regions[2024].overseas),
    domesticDeltaYi: yi(snapshot.regions[2025].domestic - snapshot.regions[2024].domestic),
    overseasDeltaYi: yi(snapshot.regions[2025].overseas - snapshot.regions[2024].overseas),
    totalRegionalDeltaYi: yi((snapshot.regions[2025].domestic + snapshot.regions[2025].overseas) - (snapshot.regions[2024].domestic + snapshot.regions[2024].overseas)),
    fundingGapYi: yi(annual2025.cfo - annual2025.capexCash),
    debtRatio2025Pct: round(snapshot.balance[2025].liabilities / snapshot.balance[2025].assets * 100),
    currentRatio2025: round(snapshot.balance[2025].currentAssets / snapshot.balance[2025].currentLiabilities),
  };
  const claims = [
    { id: 'annual-direction', title: '收入增长，归母利润下降', evidenceDirection: 'conflicting', epistemicStatus: 'fact', evidenceRefs: ['annual-revenue', 'annual-parent-profit'] },
    { id: 'overseas-offset', title: '境外增长抵消境内下滑', evidenceDirection: 'positive', epistemicStatus: 'inference', evidenceRefs: ['regions'] },
    { id: 'cash-pressure', title: '经营现金支出增长快于流入', evidenceDirection: 'negative', epistemicStatus: 'fact', evidenceRefs: ['annual-cfo', 'cash-structure'] },
    { id: 'funding-gap', title: '经营净现金未覆盖购建长期资产现金支出', evidenceDirection: 'conflicting', epistemicStatus: 'inference', evidenceRefs: ['annual-cfo', 'cash-structure'] },
    { id: 'h1-divergence', title: '中报利润下降，经营现金改善', evidenceDirection: 'conflicting', epistemicStatus: 'fact', evidenceRefs: ['h1-parent-profit', 'h1-cfo'] },
    { id: 'valuation-unknown', title: '缺少同日价格与同行估值', evidenceDirection: 'missing', epistemicStatus: 'unverified', evidenceRefs: [], missingReason: '当前快照没有可核对的同日 A 股价格、历史估值和同行样本。' },
    { id: 'market-unknown', title: '行情特征尚无法计算', evidenceDirection: 'missing', epistemicStatus: 'unverified', evidenceRefs: [], missingReason: '当前快照没有前复权收盘价序列。' },
    { id: 'drivers-unknown', title: '价格、销量与产品组合贡献尚未分离', evidenceDirection: 'missing', epistemicStatus: 'unverified', evidenceRefs: [], missingReason: '合并财报不足以分离单车价格、销量和车型结构的独立贡献。' },
  ];
  return { metrics, evidence: evidenceItems, claims };
}

export function createBydDemoBundle(snapshot = BYD_SNAPSHOT) {
  const metric = deriveBydResearch(snapshot).metrics;
  const at = (date) => Date.parse(`${date}T00:00:00+08:00`);
  return {
    thscode: snapshot.meta.symbol,
    generatedAt: `${snapshot.meta.informationCutoff}T12:00:00+08:00`,
    source: '比亚迪定期报告与产销快报快照',
    modules: {
      market: { status: 'error', snapshot: null, signals: { points: 0, range: null, adjustment: 'forward_adjusted', series: [] }, requestIds: [], errors: [{ code: 'market_not_connected', message: '前复权 A 股行情尚未接入；不生成示意价格。', requestId: null }] },
      financials: {
        status: 'ok',
        income: [
          { period_end_ms: at('2025-06-30'), operating_income: snapshot.half[2025].revenue, parent_holder_net_profit: snapshot.half[2025].parentProfit },
          { period_end_ms: at('2026-06-30'), operating_income: snapshot.half[2026].revenue, parent_holder_net_profit: snapshot.half[2026].parentProfit },
        ],
        balance: [
          { period_end_ms: at('2024-12-31'), total_assets: snapshot.balance[2024].assets, total_liabilities: snapshot.balance[2024].liabilities },
          { period_end_ms: at('2025-12-31'), total_assets: snapshot.balance[2025].assets, total_liabilities: snapshot.balance[2025].liabilities },
        ],
        cashflow: [
          { period_end_ms: at('2025-06-30'), act_cash_flow_net: snapshot.half[2025].cfo },
          { period_end_ms: at('2026-06-30'), act_cash_flow_net: snapshot.half[2026].cfo },
        ],
        requestIds: ['H126', 'AR25'], errors: [],
      },
      indicators: {
        status: 'ok', report: '2026-2', requestIds: ['H126'], errors: [],
        data: { abilities: [{ indicators: [
          { index_id: 'calculate_operating_income_yoy_growth_ratio', value: metric.h1RevenueGrowthPct },
          { index_id: 'calculate_parent_holder_net_profit_yoy_growth_ratio', value: metric.h1ParentProfitGrowthPct },
          { index_id: 'net_profit_cash_content', value: round(snapshot.half[2026].cfo / snapshot.half[2026].parentProfit * 100) },
          { index_id: 'assets_debt_ratio', value: metric.debtRatio2025Pct },
          { index_id: 'current_ratio', value: metric.currentRatio2025 },
        ] }] },
      },
    },
  };
}
