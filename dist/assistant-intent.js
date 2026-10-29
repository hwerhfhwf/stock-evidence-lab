const DIMENSION_LABELS = {
  operating_quality: '经营与盈利',
  financial_trend: '财务与现金',
  valuation: '估值与预期',
  market_characteristics: '市场表现',
  industry_position: '行业位置',
  material_events: '重要事件',
  risk: '风险变量',
};

const cleanText = value => String(value ?? '').trim().replace(/[。！!？?，,]+$/g, '').trim();

export function normalizeAshareCode(value) {
  const match = cleanText(value).toUpperCase().match(/^(\d{6})(?:\.(SZ|SH|BJ))?$/);
  if (!match) return null;
  if (match[2]) return `${match[1]}.${match[2]}`;
  const exchange = /^[48]/.test(match[1]) ? 'BJ' : /^[569]/.test(match[1]) ? 'SH' : 'SZ';
  return `${match[1]}.${exchange}`;
}

export function classifyAssistantInput(value) {
  const text = cleanText(value);
  if (!text || /^(你好|您好|嗨|哈喽|hi|hello|在吗)$/i.test(text)) return { type: 'greeting' };
  const directCode = normalizeAshareCode(text);
  if (directCode) return { type: 'company_switch', query: directCode };
  const switchMatch = text.match(/(?:请|帮我|我想|现在)?(?:换成|切换到|切换成|换到|查看|研究一下|看一下)\s*(.+?)(?:这家公司|公司|股票|这只股票)?$/);
  if (switchMatch?.[1]) return { type: 'company_switch', query: cleanText(switchMatch[1]) };
  return { type: 'research', question: text };
}

export function buildEvidenceReply({ companyName = '', claims = [], selectedDimensions = [] } = {}) {
  const selected = new Set(selectedDimensions);
  const relevant = claims.filter(claim => !selected.size || selected.has(claim.dimension)).slice(0, 3);
  const pending = [...new Set(relevant.flatMap(claim => claim.evidenceGroups?.unknown ?? []).map(item => item.label).filter(Boolean))].slice(0, 3);
  return {
    type: 'evidence',
    companyName,
    scope: selectedDimensions.map(id => DIMENSION_LABELS[id] ?? id).join(' · ') || '公司研究',
    dimensions: selectedDimensions.map(id => ({ id, label: DIMENSION_LABELS[id] ?? id })),
    findings: relevant.map(claim => ({ status: claim.epistemicStatus ?? 'unverified', text: claim.statement })),
    pending,
  };
}
