# DreamNet Temporal Durability Lab

> **Agentic Cinema submission:** [DreamNet Studio Guardian](agentic-cinema/README.md) uses Gemini and live Grafana MCP calls to investigate media-production incidents and emit digest-bound receipts.

A public reference harness for the durable workflow patterns DreamNet uses to coordinate long-running agent work.

This repository currently contains a small TypeScript money-transfer workflow adapted from Temporal's starter material. Its purpose is narrow: make retries, compensation, worker separation, and deterministic workflow execution easy to inspect before those patterns are applied to DreamNet assignments, receipts, quorum gates, and Nexus operations.

> Status: reference harness, not the production DreamNet control plane.

## Why Temporal is in DreamNet

DreamNet uses Temporal for work that must survive process restarts, network interruptions, and worker replacement:

- durable assignment execution
- bounded retries and explicit non-retryable failures
- human approval waits
- compensation after partial failure
- receipt and Proof Drop handoffs
- scheduled DreamLoops
- Nexus operations across local, cloud, and edge workers

Temporal owns durable execution history. DreamNet remains responsible for identity, policy, evidence, approvals, and receipts.

## What This Example Demonstrates

The sample workflow performs three activities:

1. withdraw
2. deposit
3. refund when deposit fails

That small flow demonstrates the same primitives required by a governed agent workflow: retry policy, fault isolation, compensation, and replay-safe orchestration.

## Quick Start

Requirements:

- Node.js 18 or later
- a local Temporal development server

```bash
npm install
npm run build
npm test
npm run worker
```

In another terminal:

```bash
npm run client
```

## Production Direction

The production integration is being developed around:

```text
intake
  -> signed assignment
  -> policy and budget gate
  -> Temporal workflow
  -> worker activity
  -> independent verification
  -> receipt / Proof Drop
  -> human or policy approval
  -> publication
```

Public milestones for this repository:

- replace tutorial-only banking adapters with a generic assignment contract
- add deterministic receipt emission
- add approval and timeout examples
- add failure/replay fixtures
- add a signed Nexus operation example
- publish an architecture diagram and deployment guide

## Related Projects

- [DreamNet](https://github.com/BrandonDucar/DreamNet)
- [DreamLoops](https://github.com/BrandonDucar/Dreamloops)
- [Spore SDK](https://github.com/BrandonDucar/dreamnet-spore-sdk)
- [Warper Keeper](https://warper-keeper.dreamnet.ink)

## License and Upstream Credit

The current sample began from Temporal's TypeScript getting-started example. Temporal documentation and SDK licensing remain the authoritative upstream references.
