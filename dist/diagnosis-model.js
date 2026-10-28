const DIRECTIONS=new Set(['positive','negative','conflicting','missing']);
const STATUSES=new Set(['fact','inference','unverified']);
const DIMENSIONS=['operating_quality','financial_trend','valuation','market_characteristics','industry_position','material_events','risk'];

const n=value=>value===null||value===undefined||value===''||!Number.isFinite(Number(value))?null:Number(value);
const pct=value=>n(value)===null?'未取得':`${n(value)>=0?'+':''}${n(value).toFixed(1)}%`;
const valuesFrom=bundle=>Object.fromEntries((bundle?.modules?.indicators?.data?.abilities||[]).flatMap(group=>(group.indicators||[]).map(item=>[item.index_id,n(item.value)])));
const pick=(values,...keys)=>{for(const key of keys)if(values[key]!==undefined)return values[key];return null};

function intentOf(question=''){
  if(/能买吗|买不买|会涨|涨不涨|目标价|卖出/.test(question))return'investment_boundary';
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
};
const reasons={
  growth:{operating_quality:'问题涉及增长是否形成经营成果',financial_trend:'需要核对收入、利润与现金的变化关系',industry_position:'需要区分公司变化与行业共同变化'},
  cash_debt:{financial_trend:'问题直接涉及现金与负债变化',risk:'需要核对偿债与资金压力',operating_quality:'现金占用可能来自经营环节'},
  valuation:{valuation:'问题直接涉及当前估值',industry_position:'估值需要同口径同行参照',financial_trend:'增长与盈利趋势影响估值解释'},
  investment_boundary:{operating_quality:'只呈现可验证经营事实',financial_trend:'只呈现可验证财务变化',valuation:'买卖判断需要估值证据'},
};

function selectedDimensions(intent,bundle){
  const order=dimensionOrders[intent]||dimensionOrders.growth;
  return order.map((dimension,index)=>({
    dimension,label:dimensionLabels[dimension],priority:index+1,
    relevanceReason:reasons[intent]?.[dimension]||'作为补充诊断维度保留',
    availability:['valuation','industry_position','material_events'].includes(dimension)?'unavailable':bundle?.modules?'partial':'unavailable',
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

function evidenceItem({id,label,value,unit,fieldName,period,sourceId,generatedAt,type='financial_field',scope='本期累计口径',adjustment}){
  return {id,type,label,value,unit,period:typeof period==='object'?period:{end:period,periodType:periodType(period)},source:{provider:'同花顺扶摇金融数据 API',retrievedAt:generatedAt||'unknown',requestId:sourceId||null},fieldName,scope,freshness:typeof period==='object'?'current':freshness(period,generatedAt),...(adjustment?{adjustment}:{})};
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
  const period=financialPeriod(bundle);
  const generatedAt=bundle?.generatedAt||null;
  const indicatorRequest=bundle?.modules?.indicators?.requestIds?.[0]||null;
  const marketSignals=bundle?.modules?.market?.signals||{};
  const marketRequest=bundle?.modules?.market?.requestIds?.[0]||null;
  const evidence=[];
  if(revenue!==null)evidence.push(evidenceItem({id:'metric-revenue-growth',label:'营业收入同比增长',value:revenue,unit:'%',fieldName:'calculate_operating_income_yoy_growth_ratio',period,sourceId:indicatorRequest,generatedAt}));
  if(profit!==null)evidence.push(evidenceItem({id:'metric-profit-growth',label:'归母净利润同比增长',value:profit,unit:'%',fieldName:'calculate_parent_holder_net_profit_yoy_growth_ratio',period,sourceId:indicatorRequest,generatedAt}));
  if(cash!==null)evidence.push(evidenceItem({id:'metric-cash-content',label:'每百元利润对应经营现金',value:cash,unit:'元/100元利润',fieldName:'net_profit_cash_content',period,sourceId:indicatorRequest,generatedAt}));
  if(debt!==null)evidence.push(evidenceItem({id:'metric-debt-ratio',label:'资产负债率',value:debt,unit:'%',fieldName:'assets_debt_ratio',period,sourceId:indicatorRequest,generatedAt,scope:'报告期末时点口径'}));
  if(marketSignals.range)evidence.push(evidenceItem({id:'market-60d',label:'行情区间',value:marketSignals.return60,unit:'%',fieldName:'close_price',period:marketSignals.range,sourceId:marketRequest,generatedAt,type:'market_series',scope:'交易日收盘价区间',adjustment:marketSignals.adjustment||'forward_adjusted'}));
  const calculations=[];
  if(growthKnown)calculations.push({id:'growth-gap',metricName:'利润与收入增速差',formula:'归母净利润同比增长 - 营业收入同比增长',inputEvidenceIds:['metric-profit-growth','metric-revenue-growth'],result:Number((profit-revenue).toFixed(1)),unit:'个百分点',roundingRule:'四舍五入保留 1 位小数'});
  const propositions=[];

  if(growthKnown){
    const direction=revenue>=0&&profit>=0?'positive':revenue*profit<0?'conflicting':'negative';
    propositions.push(proposition({id:'growth-fact',dimension:'operating_quality',title:'收入与利润的变化方向',statement:`营业收入同比 ${pct(revenue)}，归母净利润同比 ${pct(profit)}。`,evidenceDirection:direction,epistemicStatus:'fact',evidenceRefs:['metric-revenue-growth','metric-profit-growth']}));
    propositions.push(proposition({id:'growth-inference',dimension:'operating_quality',title:'增长关系的分析解释',statement:revenue*profit<0?'收入与利润方向不一致，增长结构需要进一步核对。':profit<revenue?'利润增速低于收入增速，需要核对成本与费用变化。':'收入与利润方向一致，但仍需同行数据确认相对位置。',evidenceDirection:direction,epistemicStatus:'inference',evidenceRefs:['metric-revenue-growth','metric-profit-growth'],limitations:['未取得同口径同行增速']}));
  }else propositions.push(proposition({id:'growth-missing',dimension:'operating_quality',title:'收入与利润变化',statement:'最新收入或利润增速未完整取得。',evidenceDirection:'missing',epistemicStatus:'unverified',limitations:['指标模块缺失或获取失败']}));

  if(cash!==null)propositions.push(proposition({id:'cash-fact',dimension:'financial_trend',title:'利润与经营现金的对应关系',statement:`每 100 元利润对应约 ${cash.toFixed(0)} 元经营现金。`,evidenceDirection:cash>=100?'positive':'negative',epistemicStatus:'fact',evidenceRefs:['metric-cash-content']}));
  else propositions.push(proposition({id:'cash-missing',dimension:'financial_trend',title:'利润与经营现金的对应关系',statement:'经营现金与利润的同口径数据未取得。',evidenceDirection:'missing',epistemicStatus:'unverified',limitations:['现金质量指标缺失']}));
  if(debt!==null)propositions.push(proposition({id:'debt-fact',dimension:'risk',title:'资产负债关系',statement:`每 100 元资产中约有 ${debt.toFixed(1)} 元负债。`,evidenceDirection:debt>70?'negative':'positive',epistemicStatus:'fact',evidenceRefs:['metric-debt-ratio'],limitations:['资产负债率不区分经营性负债与有息负债']}));

  if(bundle?.modules?.market?.status==='ok'&&marketSignals.range)propositions.push(proposition({id:'market-fact',dimension:'market_characteristics',title:'历史行情区间',statement:`所选区间收益 ${pct(marketSignals.return60)}，最大回撤 ${pct(marketSignals.maxDrawdown60)}。`,evidenceDirection:n(marketSignals.return60)===null?'missing':n(marketSignals.return60)>=0?'positive':'negative',epistemicStatus:'fact',evidenceRefs:['market-60d'],limitations:['历史行情不构成未来价格预测']}));
  else propositions.push(proposition({id:'market-unverified',dimension:'market_characteristics',title:'行情特征',statement:'行情数据获取失败，当前无法验证区间收益与回撤。',evidenceDirection:'missing',epistemicStatus:'unverified',limitations:['行情数据获取失败或过期']}));

  propositions.push(proposition({id:'industry-unverified',dimension:'industry_position',title:'同行位置',statement:'同日、同口径的同行数据尚未取得。',evidenceDirection:'missing',epistemicStatus:'unverified',limitations:['缺少可比公司样本与比较日期']}));
  propositions.push(proposition({id:'valuation-unverified',dimension:'valuation',title:'估值位置',statement:'同日估值与历史分位尚未取得。',evidenceDirection:'missing',epistemicStatus:'unverified',limitations:['不能使用过期价格替代当前估值']}));

  const summary=intent==='investment_boundary'
    ?'本产品不提供买卖建议，也不能预测确定性涨跌；以下仅整理可验证的经营、财务与估值证据。'
    :growthKnown?`已确认收入同比 ${pct(revenue)}、归母净利润同比 ${pct(profit)}；同行、估值与事件证据仍需补充。`:'关键财务证据未完整取得，当前只展示可验证内容和缺失项。';
  return {
    company,companyType,intent,question,
    asOf:{generatedAt,financialPeriod:period},
    selectedDimensions:selectedDimensions(intent,bundle),summary,propositions,
    verificationQuestions:['补充同口径同行增速后确认相对位置','核对最新公告中是否存在一次性影响','取得同日估值与历史分位'],
    limitations,evidence,calculations,
  };
}

export { DIMENSIONS };
