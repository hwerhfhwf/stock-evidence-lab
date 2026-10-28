import { createServer } from 'node:http';
import worker from '../worker/index.js';

const port = Number(process.env.PORT || 4173);
const server = createServer(async (incoming, outgoing) => {
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  const request = new Request(`http://127.0.0.1:${port}${incoming.url}`, {
    method: incoming.method,
    headers: incoming.headers,
    body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Buffer.concat(chunks),
  });
  const result = await worker.fetch(request, { FUYAO_API_KEY: process.env.FUYAO_API_KEY }, {});
  outgoing.statusCode = result.status;
  result.headers.forEach((value, key) => outgoing.setHeader(key, value));
  outgoing.end(Buffer.from(await result.arrayBuffer()));
});
server.listen(port, '127.0.0.1', () => console.log(`Worker preview http://127.0.0.1:${port}`));
