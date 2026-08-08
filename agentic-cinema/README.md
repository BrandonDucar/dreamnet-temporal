# DreamNet Studio Guardian

DreamNet Studio Guardian is a deterministic incident director for media-production pipelines. It uses Gemini for evidence-bound diagnosis and actively calls Grafana MCP at runtime to inspect live Prometheus metrics and Loki logs.

## Qualification path

Every investigation performs these runtime MCP calls:

1. `list_datasources`
2. `query_prometheus`
3. `query_loki_logs`

The workflow stops if Grafana does not expose both Prometheus and Loki. Gemini receives the returned evidence, produces one bounded recovery recommendation, and DreamNet emits a SHA-256 receipt covering the incident, evidence, and decision.

## Run

Requirements: Node.js 20+, Gemini API access, and a Grafana MCP connection.

```bash
cd agentic-cinema
npm install
cp .env.example .env
# export the values from .env in your shell
npm test
npm start -- INC-DEMO-001 render-worker
```

The hosted Grafana Cloud endpoint uses Streamable HTTP and interactive OAuth. Complete authorization for `https://mcp.grafana.com/mcp` in an MCP-compatible development environment before recording the demo. Set `GRAFANA_URL` to the participating stack. For unattended deployment, point `GRAFANA_MCP_ENDPOINT` at the official open-source `grafana/mcp-grafana` server configured with a Grafana service-account token.

Do not commit tokens, OAuth state, `.env`, or production telemetry.

## Three-minute demo

- Trigger a controlled failure in the demo `render-worker` pipeline.
- Show the firing alert and live Grafana dashboard.
- Run Studio Guardian and show the three MCP tool calls.
- Show Gemini correlating the error-rate metric with the GPU-allocation log.
- Display the bounded recovery action and DreamNet receipt digest.
- Show recovery in Grafana and close with the architecture and impact.

## Reused DreamNet infrastructure

This submission adapts proven DreamNet patterns: Gemini/Vertex inference, Prometheus cost telemetry, durable orchestration, Grafana monitoring, Nerve Bus event flow, and digest-bound receipts. The private control plane is not required to run this public judging harness.

## Safety

The submitted workflow is read-only against Grafana. It recommends a bounded recovery action but does not mutate production infrastructure. A production deployment should route execution through DreamNet approval and ReceiptGuard gates.
