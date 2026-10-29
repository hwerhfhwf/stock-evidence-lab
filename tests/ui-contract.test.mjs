import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../ui/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../ui/styles.css', import.meta.url), 'utf8');
const delivery = `${html}\n${app}`;

test('workbench structure expresses the company research relationship', () => {
  for (const id of ['research-task', 'business', 'operating', 'finance', 'valuation', 'market', 'events', 'evidence-drawer']) {
    assert.ok(delivery.includes(`id="${id}"`) || delivery.includes(`id='${id}'`) || delivery.includes(`id=${id}`), id);
  }
  for (const copy of ['公司与业务', '企业基本面', '经营与盈利', '财务与现金', '估值与预期', '市场表现', '事件与风险']) {
    assert.match(delivery, new RegExp(copy), copy);
  }
});

test('workbench removes product narration and tutorial repair copy', () => {
  for (const banned of ['当前重点', '证据怎么读', '一分钟读懂', '如何读这份体检', '分析覆盖，而不是虚假的全能', '官方披露已核对', '本次使用了什么']) {
    assert.doesNotMatch(delivery, new RegExp(banned), banned);
  }
});

test('client keeps the compliance boundary and does not expose secrets', () => {
  assert.doesNotMatch(delivery, /综合评分|目标价|建议买入|建议卖出|X-api-key|sk-fuyao/);
  assert.match(delivery, /不构成投资建议/);
});

test('dense layout remains keyboard and small-screen operable', () => {
  for (const token of [':focus-visible', 'prefers-reduced-motion', '@media (max-width: 640px)', 'overflow-x: hidden', 'min-height: 44px']) {
    assert.ok(css.includes(token), token);
  }
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?(input|textarea)[^{]*\{[^}]*font-size:\s*16px/);
});

test('first viewport follows the approved research hierarchy instead of equal cards', () => {
  for (const id of ['quote-strip', 'business-hero', 'composition-chart', 'operating-chart', 'operating-kpis', 'market-chart', 'valuation-strip', 'module-status']) {
    assert.ok(delivery.includes(`id="${id}"`) || delivery.includes(`id='${id}'`) || delivery.includes(`id=${id}`), id);
  }
  assert.match(css, /--text-sm:\s*13px/);
  assert.match(css, /--text-md:\s*15px/);
  assert.match(css, /--text-lg:\s*16px/);
  assert.match(css, /grid-template-columns:\s*repeat\(12,/);
});

test('charts are accessible svg views with direct labels and explicit unavailable states', () => {
  for (const token of ['renderDonutChart', 'renderOperatingChart', 'renderMarketChart', 'role="img"', '暂无数据']) {
    assert.ok(app.includes(token), token);
  }
  assert.match(app, /aria-label=/);
});

test('operating and market charts expose keyboard operable time ranges', () => {
  assert.match(html, /role="group" aria-label="经营图表区间"/);
  assert.match(html, /data-operating-range="4"/);
  assert.match(html, /data-operating-range="all"/);
  assert.match(html, /role="group" aria-label="行情图表区间"/);
  assert.match(html, /data-market-range="20"/);
  assert.match(html, /data-market-range="all"/);
  assert.match(app, /selectChartRange/);
  assert.match(css, /\.range-switch button\[aria-pressed="true"\]/);
});

test('continuous canvas exposes one compact context bar and six linked research dimensions', () => {
  for (const token of ['context-bar', 'research-canvas', 'canvas-section', 'dimension-rail', 'company-context']) {
    assert.match(html, new RegExp(token), token);
  }
  for (const id of ['business', 'operating', 'finance', 'valuation', 'market', 'events']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) ?? []).length, 1, id);
  }
  assert.match(css, /\.research-canvas\s*\{[^}]*grid-template-columns:\s*repeat\(12,/s);
});

test('AI research assistant has a visible identity, honest state and explicit action', () => {
  for (const id of ['research-question', 'run-diagnosis', 'ai-settings', 'ai-connection-state']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  for (const copy of ['AI 研究助手', '未连接模型', '连接 Gemini / 兼容模型', '定位研究重点', '生成证据关系与图表']) {
    assert.match(html, new RegExp(copy), copy);
  }
  assert.match(html, /class="ai-assistant-icon"[\s\S]*?<svg/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /AI 驱动|智能投研革命|全能|一键洞察/);
});

test('palette assigns distinct semantic variables without gradients as decoration', () => {
  for (const token of ['--revenue:', '--profit:', '--cash:', '--assets:', '--liabilities:', '--equity:', '--valuation:', '--positive:', '--negative:', '--conflicting:', '--unknown:']) {
    assert.ok(css.includes(token), token);
  }
  assert.doesNotMatch(css, /background:\s*(?:linear|radial)-gradient/);
});

test('claim layer and report risk map are visible research structures', () => {
  for (const id of ['research-claims', 'report-timeline', 'risk-map']) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(css, /\.evidence-direction\.conflicting/);
  assert.match(css, /\.epistemic-marker\.inference/);
});
