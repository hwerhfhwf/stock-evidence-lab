import { buildDiagnostics, routeQuestion } from './engine.mjs';
import { mideaSnapshot, sourceRegistry } from './data.mjs';

const state = { mode: 'normal', dimension: 'all', focused: [], diagnostics: [] };
const SCENARIO_MODES = ['normal', 'missing-data', 'provider-error'];
const labels = { positive: '正面', negative: '负面', contradiction: '矛盾', unknown: '未知', neutral: '中性' };
const dimensionLabels = { system: '系统状态', growth: '经营增长', cash: '现金与资产', valuation: '估值', market: '行情特征', industry: '行业位置', events: '事件与风险' };

const byId = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function visibleDiagnostics() {
  const requested = state.focused.length ? state.focused : (state.dimension === 'all' ? [] : [state.dimension]);
  return requested.length ? state.diagnostics.filter((item) => requested.includes(item.dimension) || item.dimension === 'system') : state.diagnostics;
}

function renderSummary(items) {
  const counts = Object.fromEntries(['positive', 'negative', 'contradiction', 'unknown'].map((key) => [key, items.filter((item) => item.state === key).length]));
  byId('evidence-summary').innerHTML = Object.entries(counts).map(([key, value]) => `
    <div class="evidence-pill state-${key}"><i></i><span>${labels[key]}证据</span><strong>${value}</strong></div>`).join('');
}

function cardTemplate(item) {
  const derived = item.derived ? `<div class="derived"><span>${escapeHtml(item.derived.label)}</span><strong>${item.derived.value}${item.derived.unit}</strong></div>` : '';
  return `<article class="diagnostic-card ${item.state}" data-id="${item.id}">
    <div class="card-top"><span class="dimension-label">${dimensionLabels[item.dimension] ?? item.dimension}</span><span class="state-tag">${labels[item.state] ?? item.state}</span></div>
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p>${derived}
    <div class="card-footer"><span class="source-count">${item.evidence.length ? `${item.evidence.length} 条可追溯证据` : '等待数据验证'}</span><button class="drill-button" data-open="${item.id}">查看证据 →</button></div>
  </article>`;
}

function renderQueue(items) {
  const questions = [...new Set(items.flatMap((item) => item.questions ?? []))].slice(0, 4);
  byId('question-queue').innerHTML = questions.map((question, index) => `<div class="queue-item"><span>0${index + 1}</span><p>${escapeHtml(question)}</p><button data-copy="${escapeHtml(question)}">复制</button></div>`).join('');
}

export function renderDiagnostics() {
  state.diagnostics = buildDiagnostics(mideaSnapshot, state.mode);
  const items = visibleDiagnostics();
  renderSummary(items);
  byId('diagnostic-grid').innerHTML = items.map(cardTemplate).join('');
  renderQueue(items);
  byId('signal-strip').hidden = state.mode !== 'normal';
  byId('result-context').textContent = state.mode === 'normal'
    ? '基于 2026H1 公开披露生成，不构成投资建议。'
    : state.mode === 'missing-data' ? '正在演示关键字段缺失：相关结论已暂停。' : '正在演示接口失败：仅保留最后可验证快照。';
}

function metricRow(metric) {
  const source = sourceRegistry[metric.sourceId];
  return `<div class="evidence-row"><header><strong>${escapeHtml(metric.label)}</strong><span class="value">${escapeHtml(metric.value)} ${escapeHtml(metric.unit)}</span></header>
    <p>期次：${escapeHtml(metric.period)}${metric.field ? ` · 原始字段：${escapeHtml(metric.field)}` : ''}</p>
    ${source ? `<a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">${escapeHtml(source.publisher)} · ${escapeHtml(source.publishedAt)} ↗</a>` : '<span class="source-link">来源待补充</span>'}</div>`;
}

export function openDrawer(id) {
  const item = state.diagnostics.find((entry) => entry.id === id);
  if (!item) return;
  byId('drawer-content').innerHTML = `<p class="eyebrow">${dimensionLabels[item.dimension] ?? 'EVIDENCE'}</p><h2 id="drawer-title">${escapeHtml(item.title)}</h2>
    <span class="state-tag ${item.state}">${labels[item.state] ?? item.state}</span><p class="drawer-summary">${escapeHtml(item.summary)}</p>
    <div class="evidence-table">${item.evidence.length ? item.evidence.map(metricRow).join('') : '<div class="evidence-row"><strong>暂无可验证字段</strong><p>系统没有用估算值或模型常识补位。</p></div>'}</div>
    ${item.formula ? `<div class="formula-box"><span>确定性计算口径</span><p>${escapeHtml(item.formula)}</p></div>` : ''}
    <div class="unknown-box"><span>仍待验证</span><ul>${(item.questions ?? []).map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ul></div>`;
  byId('evidence-drawer').classList.add('open');
  byId('evidence-drawer').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDrawer(id) {
  byId(id).classList.remove('open');
  byId(id).setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

byId('question-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const question = byId('question-input').value.trim();
  if (!question) return;
  const routed = routeQuestion(question);
  state.focused = routed.dimensions;
  const route = byId('route-result');
  route.className = `route-result${routed.complianceNotice ? ' alert' : ''}`;
  route.textContent = routed.complianceNotice
    ? '合规边界：本产品不回答“能否买入”或预测涨跌，已改为展示可验证的全景证据。'
    : routed.mode === 'focused' ? `已识别重点：${routed.dimensions.map((key) => dimensionLabels[key]).join('、')}。你仍可查看全部证据。` : '未识别特定维度，已保留全景诊断。';
  renderDiagnostics();
  byId('diagnostic-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => {
  byId('question-input').value = button.dataset.question;
  byId('question-input').focus();
}));

byId('dimension-nav').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-dimension]');
  if (!button) return;
  state.dimension = button.dataset.dimension;
  state.focused = [];
  [...byId('dimension-nav').querySelectorAll('button')].forEach((node) => node.classList.toggle('active', node === button));
  renderDiagnostics();
});

byId('scenario-switcher').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-mode]');
  if (!button) return;
  if (!SCENARIO_MODES.includes(button.dataset.mode)) return;
  state.mode = button.dataset.mode;
  [...byId('scenario-switcher').querySelectorAll('button')].forEach((node) => node.classList.toggle('active', node === button));
  renderDiagnostics();
});

byId('diagnostic-grid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-open]');
  if (button) openDrawer(button.dataset.open);
});

byId('question-queue').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy]');
  if (!button) return;
  await navigator.clipboard?.writeText(button.dataset.copy);
  button.textContent = '已复制';
});

[['drawer-close', 'evidence-drawer'], ['drawer-backdrop', 'evidence-drawer'], ['method-close', 'method-modal'], ['method-backdrop', 'method-modal']].forEach(([trigger, target]) => byId(trigger).addEventListener('click', () => closeDrawer(target)));
byId('method-button').addEventListener('click', () => { byId('method-modal').classList.add('open'); byId('method-modal').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeDrawer('evidence-drawer'); closeDrawer('method-modal'); } });

renderDiagnostics();
