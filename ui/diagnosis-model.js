const DIRECTIONS=new Set(['positive','negative','conflicting','missing']);
const STATUSES=new Set(['fact','inference','unverified']);
const DIMENSIONS=['operating_quality','financial_trend','valuation','market_characteristics','industry_position','material_events','risk'];

const n=value=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?null:Number(value);
const chinaDate=value=>new Date(Number(value)+8*60*60*1000).toISOString().slice(0,10);
const pct=value=>n(value)===null?'未取得':`${n(value)>=0?'+':''}${n(value).toFixed(1)}%`;
const valuesFrom=bundle=>Object.fromEntries((bundle?.modules?.indicators?.data?.abilities||[]).flatMap(group=>(group.indicators||[]).map(item=>[item.index_id,n(item.value)])));
const pick=(values,...keys)=>{for(const key of keys)if(values[key]!==undefined)return values[key];return null};

function intentOf(question=''){
  if(/能买吗|买不买|会涨|涨不涨|目标价|卖出/.test(question))return'investment_boundary';
  if(/行情|走势|涨跌|回撤|均线|价格/.test(question))return'market';
  if(/估值|贵不贵|便宜|市盈率|市净率|同行/.test(question))return'valuation';
  if(/现金流|回款|负债|偿债|杠杆|债务/.test(question))return'cash_debt';
  return'growth';
}

const dimensionLabels={operating_quality:'经营质量',financial_trend:'财务趋势',valuation:'估值',market_characteristics:'行情特征',industry_position:'行业位置',material_events:'重要事件',risk:'风险'};
const dimensionOrders={
  growth:['operating_quality','financial_trend','industry_position','material_events','risk','valuation','market_characteristics'],
  cash_debt:['financial_trend','risk','operating_quality','industry_position','material_events','valuation','market_characteristics'],
  valuation:['valuation','industry_position','financial_trend','risk','market_characteristics','operating_quality','material_events'],
  investment_boundary:['operating_quality','financial_trend','valuation','risk','industry_position','material_events','market_characteristics'],
  market:['market_characteristics','financial_trend','material_events','risk','operating_quality','valuation','industry_position'],
};
const reasons={
  growth:{operating_quality:'问题涉及增长是否形成经营成果',financial_trend:'需要核对收入、利润与现金的变化关系',industry_position:'需要区分公司变化与行业共同变化'},
  cash_debt:{financial_trend:'问题直接涉及现金与负债变化',risk:'需要核对偿债与资金压力',operating_quality:'现金占用可能来自经营环节'},
  valuation:{valuation:'问题直接涉及当前估值',industry_position:'估值需要同口径同行参照',financial_trend:'增长与盈利趋势影响估值解释'},
  investment_boundary:{operating_quality:'只呈现可验证经营事实',financial_trend:'只呈现可验证财务变化',valuation:'买卖判断需要估值证据'},
  market:{market_characteristics:'问题直接涉及历史行情特征',financial_trend:'财务变化用于解释而非预测价格',material_events:'重要事件可能影响历史波动'},
};

const companyTypePolicies={
  bank:{growth:['risk','financial_trend','operating_quality','industry_position','valuation','material_events','market_characteristics'],reason:'银行优先核对资本、资产质量与风险'},
};

function selectedDimensions(intent,bundle,companyType){
  const policy=companyTypePolicies[companyType];
  const order=policy?.[intent]||dimensionOrders[intent]||dimensionOrders.growth;
  return order.map((dimension,index)=>({
    dimension,label:dimensionLabels[dimension],priority:index+1,
    relevanceReason:index===0&&policy?.reason?policy.reason:reasons[intent]?.[dimension]||'作为补充诊断维度保留',
    availability:bundle?.modules&&Object.values(bundle.modules).some(x=>x?.status==='ok')&&!['valuation','industry_position','material_events'].includes(dimension)?'partial':'unavailable',
  }));
}

function proposition(input){
  if(!DIRECTIONS.has(input.evidenceDirection)||!STATUSES.has(input.epistemicStatus))throw new Error('invalid proposition state');
  return {evidenceRefs:[],limitations:[],...input};
}

function financialPeriod(bundle){
  const dates=[...(bundle?.modules?.financials?.income||[]),...(bundle?.modules?.financials?.balance||[]),...(bundle?.modules?.financials?.cashflow||[])].map(x=>n(x.period_end_ms||x.period_end||x.end_date_ms)).filter(x=>x!==null);
  return dates.length?chinaDate(Math.max(...dates)):null;
}

function periodFromReport(report){
  const match=/^(\d{4})-([1-4])$/.exec(report||'');
  if(!match)return null;
  const month=Number(match[2])*3;
  return `${match[1]}-${String(month).padStart(2,'0')}-${month===3||month===12?'31':'30'}`;
}

function periodType(period){
  if(!period)return'unknown';
  const month=Number(period.slice(5,7));
  return month===6?'half_year_cumulative':month===12?'fiscal_year':'year_to_date';
}

function freshness(period,generatedAt){
  if(!period||!generatedAt)return'unknown';
  const age=(Date.parse(generatedAt)-Date.parse(period))/86400000;
  return age>180?'stale':'current';
}

function evidenceItem({id,label,value,unit,fieldName,period,sourceId,generatedAt,type='financial_field',scope='本期累计口径',adjustment,inputValues}){
  const periodEnd=typeof period==='object'?period?.end:period;
  return {id,type,label,value,unit,period:typeof period==='object'?period:{end:period,periodType:periodType(period)},source:{provider:'同花顺扶摇金融数据 API',retrievedAt:generatedAt||'unknown',requestId:sourceId||null},fieldName,scope,freshness:freshness(periodEnd,generatedAt),...(adjustment?{adjustment}:{}),...(inputValues?{inputValues}:{})};
}

export function buildDiagnosisReport(bundle,company,question=''){
  const intent=intentOf(question);
  const companyType=company?.companyType||'general_corporate';
  const limitations=companyType==='general_corporate'?['公司类型待验证，当前使用通用公司诊断顺序。']:[];
  const values=valuesFrom(bundle);
  const revenue=pick(values,'calculate_operating_income_yoy_growth_ratio','operating_income_yoy_growth_ratio');
  const profit=pick(values,'calculate_parent_holder_net_profit_yoy_growth_ratio','net_profit_yoy_growth_ratio');
  const cash=pick(values,'net_profit_cash_content');
  const debt=pick(values,'assets_debt_ratio');
  const growthKnown=revenue!==null&&profit!==null;
  const period=periodFromReport(bundle?.modules?.indicators?.report)||financialPeriod(bundle);
  const generatedAt=bundle?.generatedAt||null;
  const indicatorRequest=bundle?.modules?.indicators?.requestIds?.[0]||null;
  const marketSignals=bundle?.modules?.market?.signals||{};
  const marketRequest=bundle?.modules?.market?.requestIds?.at(-1)||null;
  const marketSeries=bundle?.modules?.market?.signals?.series||[];
  const marketWindow=marketSeries.slice(-60);
  const marketObservations=Number.isFinite(Number(marketSignals.points))?Number(marketSignals.points):marketSeries.length|| (n(marketSignals.return60)!==null?60:0);
  const marketSufficient=marketObservations>=60&&n(marketSignals.return60)!==null&&n(marketSignals.maxDrawdown60)!==null;
  const marketPeriod=marketWindow.length?{start:chinaDate(marketWindow[0].date_ms),end:chinaDate(marketWindow.at(-1).date_ms)}:marketSignals.range;
  const evidence=[];
  if(revenue!==null)evidence.push(evidenceItem({id:'metric-revenue-growth',label:'营业收入同比增长',value:revenue,unit:'%',fieldName:'calculate_operating_income_yoy_growth_ratio',period,sourceId:indicatorRequest,generatedAt}));
  if(profit!==null)evidence.push(evidenceItem({id:'metric-profit-growth',label:'归母净利润同比增长',value:profit,unit:'%',fieldName:'calculate_parent_holder_net_profit_yoy_growth_ratio',period,sourceId:indicatorRequest,generatedAt}));
  if(cash!==null)evidence.push(evidenceItem({id:'metric-cash-content',label:'每百元利润对应经营现金',value:cash,unit:'元/100元利润',fieldName:'net_profit_cash_content',period,sourceId:indicatorRequest,generatedAt}));
  if(debt!==null)evidence.push(evidenceItem({id:'metric-debt-ratio',label:'资产负债率',value:debt,unit:'%',fieldName:'assets_debt_ratio',period,sourceId:indicatorRequest,generatedAt,scope:'报告期末时点口径'}));
  if(marketSignals.range&&marketSufficient){
    const prices=marketWindow.map(x=>({date:chinaDate(x.date_ms),close:Number(x.close_price)})).filter(x=>Number.isFinite(x.close));
    const endpoints=prices.length?[prices[0],prices.at(-1)]:[];
    evidence.push(evidenceItem({id:'market-60d',label:'近 60 个观测点区间收益',value:marketSignals.return60,unit:'%',fieldName:'close_price',period:marketPeriod,sourceId:marketRequest,generatedAt,type:'market_series',scope:'最近 60 个有效交易日收盘价',adjustment:marketSignals.adjustment||'forward_adjusted',inputValues:endpoints}));
    evidence.push(evidenceItem({id:'market-drawdown-60d',label:'近 60 个观测点最大回撤',value:marketSignals.maxDrawdown60,unit:'%',fieldName:'close_price',period:marketPeriod,sourceId:marketRequest,generatedAt,type:'market_series',scope:'最近 60 个有效交易日收盘价',adjustment:marketSignals.adjustment||'forward_adjusted',inputValues:prices}));
  }
  const calculations=[];
  if(growthKnown)calculations.push({id:'growth-gap',metricName:'利润与收入增速差',formula:'归母净利润同比增长 - 营业收入同比增长',inputEvidenceIds:['metric-profit-growth','metric-revenue-growth'],result:Number((profit-revenue).toFixed(1)),unit:'个百分点',roundingRule:'四舍五入保留 1 位小数'});
  if(marketSignals.range&&marketSufficient){
    calculations.push({id:'market-return-60d',metricName:'近 60 个观测点区间收益',formula:'(期末收盘价 / 期初收盘价 - 1) × 100%',inputEvidenceIds:['market-60d'],result:marketSignals.return60,unit:'%',roundingRule:'四舍五入保留 2 位小数'});
    calculations.push({id:'market-drawdown-60d-calc',metricName:'近 60 个观测点最大回撤',formula:'min(收盘价 / 之前峰值 - 1) × 100%',inputEvidenceIds:['market-drawdown-60d'],result:marketSignals.maxDrawdown60,unit:'%',roundingRule:'四舍五入保留 2 位小数'});
  }
  const propositions=[];
  const financialCurrent=['metric-revenue-growth','metric-profit-growth'].every(id=>evidence.find(x=>x.id===id)?.freshness==='current');

  if(growthKnown&&financialCurrent){
    const direction=revenue>=0&&profit>=0?'positive':revenue*profit<0?'conflicting':'negative';
    propositions.push(proposition({id:'growth-fact',dimension:'operating_quality',title:'收入与利润的变化方向',statement:`营业收入同比 ${pct(revenue)}，归母净利润同比 ${pct(profit)}。`,evidenceDirection:direction,epistemicStatus:'fact',evidenceRefs:['metric-revenue-growth','metric-profit-growth']}));
    propositions.push(proposition({id:'growth-inference',dimension:'operating_quality',title:'增长关系的分析解释',statement:revenue*profit<0?'收入与利润方向不一致，增长结构需要进一步核对。':profit<revenue?'利润增速低于收入增速，需要核对成本与费用变化。':'收入与利润方向一致，但仍需同行数据确认相对位置。',evidenceDirection:direction,epistemicStatus:'inference',evidenceRefs:['metric-revenue-growth','metric-profit-growth'],limitations:['未取得同口径同行增速']}));
  }else propositions.push(proposition({id:'growth-missing',dimension:'operating_quality',title:'收入与利润变化',statement:growthKnown?'已有数据已过期，无法作为当前经营判断。':'最新收入或利润增速未完整取得。',evidenceDirection:'missing',epistemicStatus:'unverified',evidenceRefs:growthKnown?['metric-revenue-growth','metric-profit-growth']:[],limitations:[growthKnown?'财务指标已过期':'指标模块缺失或获取失败']}));

  if(cash!==null&&evidence.find(x=>x.id==='metric-cash-content')?.freshness==='current')propositions.push(proposition({id:'cash-fact',dimension:'financial_trend',title:'利润与经营现金的对应关系',statement:`每 100 元利润对应约 ${cash.toFixed(0)} 元经营现金。`,evidenceDirection:cash>=100?'positive':'negative',epistemicStatus:'fact',evidenceRefs:['metric-cash-content']}));
  else propositions.push(proposition({id:'cash-missing',dimension:'financial_trend',title:'利润与经营现金的对应关系',statement:'经营现金与利润的同口径数据未取得。',evidenceDirection:'missing',epistemicStatus:'unverified',limitations:['现金质量指标缺失']}));
  if(debt!==null&&evidence.find(x=>x.id==='metric-debt-ratio')?.freshness==='current')propositions.push(proposition({id:'debt-fact',dimension:'risk',title:'资产负债关系',statement:`每 100 元资产中约有 ${debt.toFixed(1)} 元负债。`,evidenceDirection:debt>70?'negative':'positive',epistemicStatus:'fact',evidenceRefs:['metric-debt-ratio'],limitations:['资产负债率不区分经营性负债与有息负债']}));

  if(bundle?.modules?.market?.status==='ok'&&marketSignals.range&&marketSufficient&&evidence.find(x=>x.id==='market-60d')?.freshness==='current')propositions.push(proposition({id:'market-fact',dimension:'market_characteristics',title:'历史行情区间',statement:`近 60 个观测点收益 ${pct(marketSignals.return60)}，最大回撤 ${pct(marketSignals.maxDrawdown60)}。`,evidenceDirection:n(marketSignals.return60)>=0?'positive':'negative',epistemicStatus:'fact',evidenceRefs:['market-60d','market-drawdown-60d'],limitations:['历史行情不构成未来价格预测']}));
  else propositions.push(proposition({id:'market-unverified',dimension:'market_characteristics',title:'行情特征',statement:bundle?.modules?.market?.status==='ok'&&marketObservations<60?`行情历史仅有 ${marketObservations} 个有效观测点，不足 60 个，暂不计算 60 日收益与回撤。`:'行情数据获取失败、过期或不足，当前无法验证区间收益与回撤。',evidenceDirection:'missing',epistemicStatus:'unverified',limitations:[marketObservations<60?'有效观测点不足 60 个':'行情数据获取失败或过期']}));

  propositions.push(proposition({id:'industry-unverified',dimension:'industry_position',title:'同行位置',statement:'同日、同口径的同行数据尚未取得。',evidenceDirection:'missing',epistemicStatus:'unverified',limitations:['缺少可比公司样本与比较日期']}));
  propositions.push(proposition({id:'valuation-unverified',dimension:'valuation',title:'估值位置',statement:'同日估值与历史分位尚未取得。',evidenceDirection:'missing',epistemicStatus:'unverified',limitations:['不能使用过期价格替代当前估值']}));

  const summary=intent==='investment_boundary'
    ?'本产品不提供买卖建议，也不能预测确定性涨跌；以下仅整理可验证的经营、财务与估值证据。'
    :growthKnown&&!financialCurrent?'财务指标已经过期，保留历史数据供核对，但无法作为当前诊断结论。'
    :growthKnown?`已确认收入同比 ${pct(revenue)}、归母净利润同比 ${pct(profit)}；同行、估值与事件证据仍需补充。`:'关键财务证据未完整取得，当前只展示可验证内容和缺失项。';
  return {
    company,companyType,intent,question,
    asOf:{generatedAt,financialPeriod:period},
    selectedDimensions:selectedDimensions(intent,bundle,companyType),summary,propositions,
    verificationQuestions:['补充同口径同行增速后确认相对位置','核对最新公告中是否存在一次性影响','取得同日估值与历史分位'],
    limitations,evidence,calculations,
  };
}

export { DIMENSIONS };

// Stable questions describe the research framework; coverage counts data, never prose.
const FRAMEWORK=[
  ['operating_quality','经营质量','生意做得怎么样？',['增长协调性','盈利能力','现金兑现','运营效率']],
  ['financial_trend','财务趋势','变化是一时还是持续？',['收入变化','利润变化','现金变化']],
  ['valuation','估值','价格对应怎样的预期？',['当前估值','历史位置','同行比较']],
  ['market_characteristics','行情特征','股价经历了什么？',['价格路径','区间涨跌','回撤幅度']],
  ['industry_position','行业位置','放在同行中怎么看？',['可比公司','增长比较','盈利比较']],
  ['material_events','重要事件','什么事情可能改变判断？',['公告核对','影响路径','兑现进度']],
  ['risk','风险','哪些地方还要小心？',['负债结构','短期偿债','证据缺口']],
];
export function buildWorkbench(bundle,company,question=''){
  const report=buildDiagnosisReport(bundle,company,question);
  const values=valuesFrom(bundle), fs=bundle?.modules?.financials||{};
  const dateOf=row=>n(row.period_end_ms??row.period_end);
  const financialSeries=(fs.income||[]).filter(row=>dateOf(row)!==null).map(row=>{
    const time=dateOf(row), cash=(fs.cashflow||[]).find(x=>dateOf(x)===time);
    return {time,date:chinaDate(time),revenue:n(row.operating_income),profit:n(row.parent_holder_net_profit??row.net_profit_parent_company),cash:n(cash?.act_cash_flow_net??cash?.net_cash_flow_operating)};
  }).sort((a,b)=>a.time-b.time);
  const marketSeries=(bundle?.modules?.market?.signals?.series||[]).filter(x=>n(x.date_ms)!==null&&n(x.close_price)!==null).sort((a,b)=>a.date_ms-b.date_ms);
  const dimensions=FRAMEWORK.map(([id,label,question,labels])=>({id,label,question,covered:0,checks:labels.map(label=>({label,available:false,fact:'尚未取得所需证据',meaning:'当前不能判断',next:'补充同日期、同口径数据后再比较',refs:[]}))}));
  function fill(d,i,data){Object.assign(dimensions[d].checks[i],data);}
  const missingDetails={
    2:[['市场为盈利支付多少价格？','缺少同日总市值及滚动年度盈利，不能计算可靠市盈率。','取得同日市值与最近四季净利润'],['相对自己的历史，估值处在哪里？','单日估值不足以判断历史高低，需要连续同口径样本。','补充历史估值序列并核对亏损时期'],['相似公司获得怎样的定价？','成长速度、业务结构和盈利口径不同，会影响估值可比性。','确定可比公司后获取同日估值']],
    4:[['哪些公司真正可比？','相同行业名称不代表产品、客户与地区结构相同。','按主营业务和收入结构筛选同行'],['增长来自行业还是公司自身？','没有同行同期数据，无法区分行业景气与竞争份额变化。','比较同行收入、利润及报告期'],['盈利水平高低由什么决定？','毛利率需要结合产品结构、品牌和渠道模式解释。','对齐同行毛利率与业务结构']],
    5:[['最近披露了哪些重要变化？','尚未接入公告原文，不能确认事件完整性。','获取交易所公告并核对披露时间'],['事件通过什么影响经营？','公告消息不等于利润已经兑现。','核对订单、产能、费用或现金的影响路径'],['此前计划是否已经兑现？','需要将计划、执行进展和实际结果连接起来。','追踪后续公告与财报中的实际变化']],
  };
  for(const [d,checks] of Object.entries(missingDetails))checks.forEach(([why,meaning,next],i)=>fill(Number(d),i,{why,meaning,next}));
  const current=id=>report.evidence.find(e=>e.id===id)?.freshness==='current';
  const revenue=pick(values,'calculate_operating_income_yoy_growth_ratio','operating_income_yoy_growth_ratio');
  const profit=pick(values,'calculate_parent_holder_net_profit_yoy_growth_ratio','net_profit_yoy_growth_ratio');
  const roundedOperandsAgree=revenue!==null&&profit!==null&&(Number(profit.toFixed(1))-Number(revenue.toFixed(1))).toFixed(1)===(profit-revenue).toFixed(1);
  const digits=roundedOperandsAgree?1:3;
  const growthEquation=revenue!==null&&profit!==null?`${profit.toFixed(digits)}% − ${revenue.toFixed(digits)}% ${roundedOperandsAgree?'=':'≈'} ${(profit-revenue).toFixed(1).replace('-','−')} 个百分点`:null;
  const fact=report.propositions.find(x=>x.id==='growth-fact'), inference=report.propositions.find(x=>x.id==='growth-inference');
  fill(0,0,{why:'收入扩大后，利润有没有跟上？',fact:fact?.statement||report.propositions.find(x=>x.id==='growth-missing')?.statement,meaning:inference?.statement||'证据不足，暂不解释增长关系。',next:'核对毛利率、销售费用和一次性损益',available:!!fact,refs:fact?.evidenceRefs||[],equation:fact?growthEquation:null});
  function indicator(id,label,field,unit){const value=pick(values,field);if(value===null)return null;const e=evidenceItem({id,label,value,unit,fieldName:field,period:report.asOf.financialPeriod,sourceId:bundle?.modules?.indicators?.requestIds?.[0],generatedAt:bundle?.generatedAt});report.evidence.push(e);return e.freshness==='current'?e:null;}
  const margin=indicator('gross-margin','毛利率','sale_gross_margin','%');
  fill(0,1,{why:'每卖出 100 元产品，扣除直接成本后剩多少？',available:!!margin,fact:margin?`毛利率 ${margin.value.toFixed(2)}%，即每 100 元收入留下约 ${margin.value.toFixed(2)} 元毛利。`:'毛利率未取得或已过期',meaning:'毛利还要支付销售、管理、研发等费用，不能当作净利润。',next:'与上年同期及同业务同行比较',refs:margin?[margin.id]:[]});
  const cash=report.evidence.find(e=>e.id==='metric-cash-content');
  fill(0,2,{why:'账面利润有没有对应的现金流入？',available:current('metric-cash-content'),fact:current('metric-cash-content')?`每 100 元利润对应 ${cash.value.toFixed(1)} 元经营现金。`:'现金质量指标未取得或已过期',meaning:'现金与利润存在时间差；现金多也可能来自预收款或延后付款。',next:'核对回款、存货和应付款的变动',refs:cash?[cash.id]:[]});
  const turnover=indicator('inventory-turnover','存货周转率','inventory_turnover_ratio','次');
  fill(0,3,{why:'货物占用的资金周转得快不快？',available:!!turnover,fact:turnover?`本报告期存货周转 ${turnover.value.toFixed(2)} 次。`:'存货周转率未取得或已过期',meaning:'同口径下次数越高通常表示周转越快，不能跨行业直接判断优劣。',next:'补充上年同期周转率及存货明细',refs:turnover?[turnover.id]:[]});
  const latest=financialSeries.at(-1), comparable=latest?financialSeries.filter(x=>x.date.slice(5)===latest.date.slice(5)):[];
  ['revenue','profit','cash'].forEach((key,i)=>{const rows=comparable.filter(x=>x[key]!==null), a=rows.at(-2),b=rows.at(-1),valid=!!a&&!!b&&freshness(b.date,bundle?.generatedAt)==='current';const change=valid?(a[key]>0?`${((b[key]/a[key]-1)*100).toFixed(1)}%`:`由 ${(a[key]/1e8).toFixed(2)} 亿元变为 ${(b[key]/1e8).toFixed(2)} 亿元（基期非正，不计算增长率）`):'';fill(1,i,{available:valid,why:'把相同长度的报告期放在一起比较。',fact:valid?`${a.date} → ${b.date}：${change}`:'同报告期历史样本不足或已过期',meaning:'这是累计口径的同期变化，不是连续单季度增速。',next:'结合成本、回款与一次性因素核对变化原因',seriesKey:key});});
  const signals=bundle?.modules?.market?.signals||{};
  fill(3,0,{available:marketSeries.length>=2&&freshness(chinaDate(marketSeries.at(-1).date_ms),bundle?.generatedAt)==='current',why:'先看完整路径，避免只看一天的涨跌。',fact:marketSeries.length?`已取得 ${marketSeries.length} 个交易日观测点。`:'行情历史未取得',meaning:'图表使用前复权收盘价，历史走势不能推断未来。',next:'结合当期公告核对波动背景'});
  const marketFact=report.propositions.find(x=>x.id==='market-fact');
  fill(3,1,{available:!!marketFact,why:'区间终点相对起点变化多少？',fact:marketFact?`近 60 个观测点收益 ${pct(signals.return60)}`:'有效行情不足或已过期',meaning:'区间收益取决于起止日期，不等于长期回报。',next:'更换区间观察结论是否稳定',refs:marketFact?['market-60d']:[]});
  fill(3,2,{available:!!marketFact,why:'区间中从峰值最多跌了多少？',fact:marketFact?`近 60 个观测点最大回撤 ${pct(signals.maxDrawdown60)}`:'有效行情不足或已过期',meaning:'反映已发生的价格波动，不是未来最大可能损失。',next:'核对回撤发生时的公司和行业事件',refs:marketFact?['market-drawdown-60d']:[]});
  const debt=report.evidence.find(e=>e.id==='metric-debt-ratio');
  fill(6,0,{available:current('metric-debt-ratio'),why:'资产中有多少由负债支持？',fact:current('metric-debt-ratio')?`资产负债率 ${debt.value.toFixed(1)}%`:'资产负债率未取得或已过期',meaning:'包含经营性负债，不能直接等同于借款压力。',next:'拆分有息负债、应付款和到期期限',refs:debt?[debt.id]:[]});
  const liquidity=indicator('current-ratio','流动比率','current_ratio','倍');
  fill(6,1,{available:!!liquidity,why:'短期资产能覆盖多少短期负债？',fact:liquidity?`流动资产 / 流动负债 = ${liquidity.value.toFixed(2)} 倍`:'流动比率未取得或已过期',meaning:'流动资产中可能有难以迅速变现的存货和应收款。',next:'继续核对现金、短期借款与授信',refs:liquidity?[liquidity.id]:[]});
  fill(6,2,{why:'哪些证据缺失会改变结论？',fact:'同行、估值与公告证据尚未接入',meaning:'经营数据不能替代估值和风险事件判断。',next:'取得最新公告、同日估值及可比公司样本'});
  dimensions.forEach(d=>{d.covered=d.checks.filter(x=>x.available).length;});
  return {report,dimensions,financialSeries,marketSeries,growthEquation,period:report.asOf.financialPeriod};
}
