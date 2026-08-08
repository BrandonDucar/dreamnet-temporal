import test from 'node:test';
import assert from 'node:assert/strict';

import { investigateStudioIncident } from '../src/studio-guardian.mjs';

test('investigation queries live Grafana metrics and logs before Gemini decides', async () => {
  const calls = [];
  const grafana = {
    async callTool(name, args) {
      calls.push({ name, args });
      if (name === 'list_datasources') {
        return { content: [{ type: 'text', text: JSON.stringify([
          { uid: 'prom-main', type: 'prometheus' },
          { uid: 'loki-main', type: 'loki' },
        ]) }] };
      }
      if (name === 'query_prometheus') return { content: [{ type: 'text', text: 'error_rate=0.34' }] };
      if (name === 'query_loki_logs') return { content: [{ type: 'text', text: 'render-worker: GPU allocation timeout' }] };
      throw new Error(`unexpected tool ${name}`);
    },
  };
  const gemini = {
    async generate(prompt) {
      assert.match(prompt, /error_rate=0\.34/);
      assert.match(prompt, /GPU allocation timeout/);
      return 'Root cause: GPU allocator saturation. Action: drain render-worker-7.';
    },
  };

  const result = await investigateStudioIncident({
    incidentId: 'INC-42',
    service: 'render-worker',
    grafana,
    gemini,
  });

  assert.deepEqual(calls.map(({ name }) => name), [
    'list_datasources',
    'query_prometheus',
    'query_loki_logs',
  ]);
  assert.equal(result.incidentId, 'INC-42');
  assert.match(result.receipt.digest, /^[a-f0-9]{64}$/);
  assert.match(result.decision, /GPU allocator saturation/);
});

test('investigation stops when Grafana has no Prometheus or Loki datasource', async () => {
  const grafana = {
    async callTool() {
      return { content: [{ type: 'text', text: '[]' }] };
    },
  };

  await assert.rejects(
    investigateStudioIncident({
      incidentId: 'INC-43',
      service: 'render-worker',
      grafana,
      gemini: { generate: async () => 'must not run' },
    }),
    /Prometheus and Loki datasources/,
  );
});
