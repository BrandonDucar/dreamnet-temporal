import { createHash } from 'node:crypto';

function textFromToolResult(result) {
  return (result?.content ?? [])
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n');
}

function parseDatasources(result) {
  const text = textFromToolResult(result);
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.datasources ?? [];
  } catch {
    return [];
  }
}

function makeReceipt(payload) {
  const canonical = JSON.stringify(payload);
  return {
    schema: 'dreamnet.studio-guardian-receipt.v1',
    createdAt: new Date().toISOString(),
    digest: createHash('sha256').update(canonical).digest('hex'),
  };
}

export async function investigateStudioIncident({ incidentId, service, grafana, gemini }) {
  if (!incidentId || !service) throw new Error('incidentId and service are required');

  const datasourceResult = await grafana.callTool('list_datasources', {});
  const datasources = parseDatasources(datasourceResult);
  const prometheus = datasources.find((source) => source.type === 'prometheus');
  const loki = datasources.find((source) => source.type === 'loki');
  if (!prometheus || !loki) {
    throw new Error('Grafana must expose Prometheus and Loki datasources');
  }

  const now = new Date();
  const start = new Date(now.getTime() - 15 * 60 * 1000);
  const metrics = await grafana.callTool('query_prometheus', {
    datasourceUid: prometheus.uid,
    expr: `sum(rate(http_requests_total{service="${service}",status=~"5.."}[5m])) / sum(rate(http_requests_total{service="${service}"}[5m]))`,
    startTime: start.toISOString(),
    endTime: now.toISOString(),
  });
  const logs = await grafana.callTool('query_loki_logs', {
    datasourceUid: loki.uid,
    logql: `{service="${service}"} |= "error"`,
    startRfc3339: start.toISOString(),
    endRfc3339: now.toISOString(),
    limit: 100,
    direction: 'backward',
  });

  const evidence = {
    metrics: textFromToolResult(metrics),
    logs: textFromToolResult(logs),
  };
  const decision = await gemini.generate([
    'You are DreamNet Studio Guardian, the technical director for a media production pipeline.',
    'Diagnose this incident only from the live Grafana MCP evidence below.',
    'Return a concise root cause, confidence, and one bounded recovery action. Never invent missing evidence.',
    `Incident: ${incidentId}`,
    `Service: ${service}`,
    `Prometheus evidence:\n${evidence.metrics}`,
    `Loki evidence:\n${evidence.logs}`,
  ].join('\n\n'));

  const receiptPayload = { incidentId, service, evidence, decision };
  return { ...receiptPayload, receipt: makeReceipt(receiptPayload) };
}

export const _internal = { textFromToolResult, parseDatasources, makeReceipt };
