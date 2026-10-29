export class AIAdapterError extends Error {
  constructor(message, code = 'ai_error') {
    super(message);
    this.name = 'AIAdapterError';
    this.code = code;
  }
}

const chartTypes = new Set([
  'time_series', 'grouped_bar_line', 'profit_conversion', 'cash_bridge',
  'balance_flow', 'valuation_anchors', 'peer_scatter', 'event_timeline',
  'risk_tree', 'donut',
]);
const advicePattern = /(?:建议|应当|应该|适合|值得).{0,8}(?:买入|卖出|增持|减持|抄底)|保证收益|目标价|必涨|必跌/i;
const unsafeSeriesKeys = new Set(['data', 'values', 'value', 'points', 'html', 'code', 'script']);

export function createAIResearchContext({ question, sourcePackage, defaultClaims }) {
  const compactFields = (sourcePackage?.fields ?? []).slice(0, 120).map(field => ({
    id: field.id,
    label: field.label,
    value: field.value,
    unit: field.unit,
    period: field.period,
    scope: field.scope,
    status: field.status,
    sourceRefs: field.sourceRefs,
  }));
  const compactSources = (sourcePackage?.sources ?? []).map(source => ({
    id: source.id,
    name: source.name,
    disclosed: source.disclosed,
    period: source.period,
    sourceType: source.sourceType,
  }));
  return {
    task: '选择与研究问题最相关的维度，并把现有可核验判断组织成研究补充草稿。',
    question,
    sourcePackage: {
      version: sourcePackage?.version,
      company: sourcePackage?.company,
      generatedAt: sourcePackage?.generatedAt,
      profile: sourcePackage?.profile,
      fields: compactFields,
      sources: compactSources,
      peers: sourcePackage?.peers ?? [],
    },
    defaultClaims,
  };
}

export async function analyzeResearch(input, fetchFn = globalThis.fetch) {
  let response;
  try {
    response = await fetchFn('/api/ai/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        endpoint: input?.endpoint,
        model: input?.model,
        apiKey: input?.apiKey,
        messages: input?.messages ?? [],
        tools: input?.tools ?? [],
        outputSchema: input?.outputSchema ?? null,
      }),
    });
  } catch {
    throw new AIAdapterError('无法连接研究服务', 'network_error');
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new AIAdapterError('研究服务返回格式异常', 'invalid_response');
  }
  if (!response.ok) {
    throw new AIAdapterError(result?.error?.message ?? '研究请求失败', result?.error?.code ?? 'request_failed');
  }
  if (typeof result?.content !== 'string') throw new AIAdapterError('研究结果缺少内容', 'invalid_response');
  return result;
}

export function validateChartSpec(candidate, sourcePackage) {
  const errors = [];
  const fields = new Set((sourcePackage?.fields ?? []).map(field => field.id));
  const sources = new Set((sourcePackage?.sources ?? []).map(source => source.id));
  if (!candidate || typeof candidate !== 'object') return { ok: false, errors: ['图表定义为空'] };
  if (!candidate.id || typeof candidate.id !== 'string') errors.push('缺少图表 id');
  if (!chartTypes.has(candidate.type)) errors.push('不支持的图表类型');
  if (!candidate.title || typeof candidate.title !== 'string' || advicePattern.test(candidate.title)) errors.push('图表标题无效');
  if (!Array.isArray(candidate.series) || candidate.series.length === 0) errors.push('缺少图表序列');
  const series = (candidate.series ?? []).map(item => {
    if (!item || typeof item !== 'object' || !fields.has(item.fieldId)) errors.push(`未知数据字段：${item?.fieldId ?? ''}`);
    if (Object.keys(item ?? {}).some(key => unsafeSeriesKeys.has(key))) errors.push('图表不得携带替代原始字段的数值');
    return { fieldId: item?.fieldId, label: typeof item?.label === 'string' ? item.label : item?.fieldId };
  });
  const sourceRefs = Array.isArray(candidate.sourceRefs) ? candidate.sourceRefs : [];
  if (sourceRefs.some(id => !sources.has(id))) errors.push('图表包含未知来源');
  if (advicePattern.test(JSON.stringify(candidate))) errors.push('图表包含投资建议');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    spec: {
      id: candidate.id,
      type: candidate.type,
      title: candidate.title,
      series,
      sourceRefs,
      unit: typeof candidate.unit === 'string' ? candidate.unit : '',
    },
  };
}
import { validateResearchClaim } from './research-protocol.js';


const allowedDimensions = new Set(['operating_quality', 'financial_trend', 'valuation', 'market_characteristics', 'industry_position', 'material_events', 'risk']);

export function parseResearchResponse(content) {
  try {
    const normalized = String(content ?? '').trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not-object');
    return parsed;
  } catch {
    throw new AIAdapterError('模型返回的研究结构无法解析', 'invalid_research_json');
  }
}

export function validateResearchPatch(candidate, sourcePackage) {
  const errors = [];
  const fieldIds = new Set((sourcePackage?.fields ?? []).map(field => field.id));
  if (!candidate || typeof candidate !== 'object') return { ok: false, errors: ['研究补丁为空'] };
  const selectedDimensions = Array.isArray(candidate.selectedDimensions)
    ? [...new Set(candidate.selectedDimensions)].filter(id => {
      if (allowedDimensions.has(id)) return true;
      errors.push(`未知研究维度：${id}`);
      return false;
    }).slice(0, 7)
    : [];
  const claims = Array.isArray(candidate.claims) ? candidate.claims.slice(0, 8) : [];
  for (const claim of claims) {
    const result = validateResearchClaim(claim);
    if (!result.ok) errors.push(...result.errors.map(error => `${claim?.id ?? 'claim'}：${error}`));
    const refs = [
      ...(claim?.sourceRefs ?? []),
      ...Object.values(claim?.evidenceGroups ?? {}).flatMap(items => (items ?? []).flatMap(item => item.evidenceRefs ?? [])),
      ...(claim?.drilldowns ?? []).flatMap(item => item.evidenceRefs ?? []),
    ];
    for (const ref of refs) if (!fieldIds.has(ref)) errors.push(`${claim?.id ?? 'claim'} 引用了未知字段 ${ref}`);
  }
  const chartSpecs = [];
  for (const spec of Array.isArray(candidate.chartSpecs) ? candidate.chartSpecs.slice(0, 6) : []) {
    const result = validateChartSpec(spec, sourcePackage);
    if (!result.ok) errors.push(...result.errors.map(error => `${spec?.id ?? 'chart'}：${error}`));
    else chartSpecs.push(result.spec);
  }
  if (!selectedDimensions.length) errors.push('缺少可用研究维度');
  if (!claims.length) errors.push('缺少研究判断');
  return { ok: errors.length === 0, errors, patch: errors.length ? null : { selectedDimensions, claims, chartSpecs } };
}
