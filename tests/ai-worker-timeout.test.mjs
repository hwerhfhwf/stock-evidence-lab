import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWithAI } from '../worker/ai.js';

test('AI gateway aborts a stalled provider with a safe timeout error', async () => {
  const stalledFetch = async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('provider socket detail')));
  });
  await assert.rejects(
    analyzeWithAI(stalledFetch, {
      endpoint: 'https://api.example.com/v1',
      model: 'example-model',
      apiKey: 'session-key',
      messages: [{ role: 'user', content: 'test' }],
    }, { timeoutMs: 5 }),
    error => error.code === 'ai_timeout' && !error.message.includes('socket'),
  );
});
