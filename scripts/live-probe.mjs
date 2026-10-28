import { createFuyaoClient } from '../worker/fuyao.js';
import { buildResearchBundle } from '../worker/research.js';

async function runProbe(key) {
  try {
    const client = createFuyaoClient(fetch, key);
    const search = await client.search('美的集团', 3);
    const bundle = await buildResearchBundle(client, '000333.SZ');
    const summary = {
      searchRequestId: search.requestId,
      searchShape: Array.isArray(search.data) ? 'array' : Object.keys(search.data ?? {}),
      searchCount: Array.isArray(search.data) ? search.data.length : (search.data?.item?.length ?? search.data?.items?.length ?? 0),
      searchFields: Object.keys((Array.isArray(search.data) ? search.data[0] : search.data?.item?.[0] ?? search.data?.items?.[0]) ?? {}),
      modules: Object.fromEntries(Object.entries(bundle.modules).map(([name, module]) => [name, {
        status: module.status,
        requestCount: module.requestIds?.length ?? 0,
        errors: (module.errors ?? []).map((error) => error.code),
      }])),
      snapshotFields: Object.keys(bundle.modules.market.snapshot ?? {}),
      barCount: bundle.modules.market.signals.points,
      incomeFields: Object.keys(bundle.modules.financials.income[0] ?? {}),
      balanceFields: Object.keys(bundle.modules.financials.balance[0] ?? {}),
      cashflowFields: Object.keys(bundle.modules.financials.cashflow[0] ?? {}),
      indicatorAbilities: bundle.modules.indicators.data?.abilities?.map((ability) => ability.ability) ?? [],
    };
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ code: error.code ?? 'probe_error', message: error.message, requestId: error.requestId ?? null }));
  } finally {
    key.replace(/./g, '0');
  }
}

if (process.env.FUYAO_API_KEY) {
  runProbe(process.env.FUYAO_API_KEY);
} else {
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', (chunk) => runProbe(chunk.trim()));
}
