import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceReply, classifyAssistantInput, normalizeAshareCode } from '../ui/assistant-intent.js';

test('assistant distinguishes greeting, A-share switch and research questions', () => {
  assert.deepEqual(classifyAssistantInput('你好'), { type: 'greeting' });
  assert.deepEqual(classifyAssistantInput('换成美的集团'), { type: 'company_switch', query: '美的集团' });
  assert.deepEqual(classifyAssistantInput('000333.SZ'), { type: 'company_switch', query: '000333.SZ' });
  assert.deepEqual(classifyAssistantInput('分析利润转化与经营现金'), { type: 'research', question: '分析利润转化与经营现金' });
});

test('assistant normalizes common six digit A-share codes without guessing names', () => {
  assert.equal(normalizeAshareCode('000333'), '000333.SZ');
  assert.equal(normalizeAshareCode('600519'), '600519.SH');
  assert.equal(normalizeAshareCode('830799'), '830799.BJ');
  assert.equal(normalizeAshareCode('美的集团'), null);
});

test('assistant reply uses trusted claims and keeps unknown evidence visible', () => {
  const reply = buildEvidenceReply({
    companyName: '比亚迪',
    selectedDimensions: ['operating_quality'],
    claims: [{
      id: 'c1', dimension: 'operating_quality', statement: '归母净利率由 4.18% 降至 3.57%。', epistemicStatus: 'fact',
      evidenceGroups: { positive: [], negative: [{ id: 'n1' }], conflicting: [], unknown: [{ id: 'u1', label: '费用贡献待验证' }] },
    }],
  });
  assert.equal(reply.companyName, '比亚迪');
  assert.deepEqual(reply.findings, [{ status: 'fact', text: '归母净利率由 4.18% 降至 3.57%。' }]);
  assert.deepEqual(reply.pending, ['费用贡献待验证']);
  assert.match(reply.scope, /经营与盈利/);
});
