import test from 'node:test';
import assert from 'node:assert/strict';

import { GrafanaMcpClient, GeminiClient } from '../src/runtime-clients.mjs';

test('Grafana client connects over Streamable HTTP and forwards runtime tool calls', async () => {
  const seen = {};
  class FakeTransport {
    constructor(url, options) {
      seen.url = String(url);
      seen.options = options;
    }
  }
  class FakeClient {
    async connect(transport) { seen.transport = transport; }
    async callTool(request) { seen.request = request; return { content: [] }; }
    async close() { seen.closed = true; }
  }
  const client = new GrafanaMcpClient({
    endpoint: 'https://mcp.grafana.com/mcp',
    grafanaUrl: 'https://dreamnet.grafana.net',
    bearerToken: 'secret',
    sdk: { Client: FakeClient, StreamableHTTPClientTransport: FakeTransport },
  });

  await client.connect();
  await client.callTool('query_prometheus', { expr: 'up' });
  await client.close();

  assert.equal(seen.url, 'https://mcp.grafana.com/mcp');
  assert.equal(seen.options.requestInit.headers['X-Grafana-URL'], 'https://dreamnet.grafana.net');
  assert.equal(seen.options.requestInit.headers.Authorization, 'Bearer secret');
  assert.deepEqual(seen.request, { name: 'query_prometheus', arguments: { expr: 'up' } });
  assert.equal(seen.closed, true);
});

test('Gemini client sends the incident prompt to the configured Gemini model', async () => {
  const seen = {};
  class FakeGoogleGenAI {
    constructor(options) { seen.options = options; }
    models = {
      generateContent: async (request) => {
        seen.request = request;
        return { text: 'bounded recovery' };
      },
    };
  }
  const client = new GeminiClient({
    model: 'gemini-2.5-flash',
    apiKey: 'key',
    GoogleGenAI: FakeGoogleGenAI,
  });

  assert.equal(await client.generate('incident evidence'), 'bounded recovery');
  assert.equal(seen.request.model, 'gemini-2.5-flash');
  assert.equal(seen.request.contents, 'incident evidence');
});
