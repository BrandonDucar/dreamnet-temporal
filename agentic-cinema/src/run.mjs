#!/usr/bin/env node
import { investigateStudioIncident } from './studio-guardian.mjs';
import { GeminiClient, GrafanaMcpClient } from './runtime-clients.mjs';

const incidentId = process.argv[2] || `demo-${Date.now()}`;
const service = process.argv[3] || 'render-worker';
const grafana = new GrafanaMcpClient();

try {
  const result = await investigateStudioIncident({
    incidentId,
    service,
    grafana,
    gemini: new GeminiClient(),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await grafana.close();
}
