const DIRECTIONS=new Set(['positive','negative','conflicting','missing']);
const STATUSES=new Set(['fact','inference','unverified']);
const DIMENSIONS=['operating_quality','financial_trend','valuation','market_characteristics','industry_position','material_events','risk'];

const n=value=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?null:Number(value);
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
  return dates.length?new Date(Math.max(...dates)).toISOString().slice(0,10):null;
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
  const marketPeriod=marketWindow.length?{start:new Date(marketWindow[0].date_ms).toISOString().slice(0,10),end:new Date(marketWindow.at(-1).date_ms).toISOString().slice(0,10)}:marketSignals.range;
  const evidence=[];
  if(revenue!==null)evidence.push(evidenceItem({id:'metric-revenue-growth',label:'营业收入同比增长',value:revenue,unit:'%',fieldName:'calculate_operating_income_yoy_growth_ratio',period,sourceId:indicatorRequest,generatedAt}));
  if(profit!==null)evidence.push(evidenceItem({id:'metric-profit-growth',label:'归母净利润同比增长',value:profit,unit:'%',fieldName:'calculate_parent_holder_net_profit_yoy_growth_ratio',period,sourceId:indicatorRequest,generatedAt}));
  if(cash!==null)evidence.push(evidenceItem({id:'metric-cash-content',label:'每百元利润对应经营现金',value:cash,unit:'元/100元利润',fieldName:'net_profit_cash_content',period,sourceId:indicatorRequest,generatedAt}));
  if(debt!==null)evidence.push(evidenceItem({id:'metric-debt-ratio',label:'资产负债率',value:debt,unit:'%',fieldName:'assets_debt_ratio',period,sourceId:indicatorRequest,generatedAt,scope:'报告期末时点口径'}));
  if(marketSignals.range&&marketSufficient){
    const prices=marketWindow.map(x=>({date:new Date(x.date_ms).toISOString().slice(0,10),close:Number(x.close_price)})).filter(x=>Number.isFinite(x.close));
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
