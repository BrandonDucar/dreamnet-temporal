# DreamNet Temporal Durability Lab

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

This repository is adapted from Temporal's
[TypeScript money-transfer template](https://github.com/temporalio/money-transfer-project-template-ts).
Its upstream source attribution is preserved in NOTICE.md and Git history.

Licensing is explicitly scoped:

- The new original licensing documentation listed in LICENSE_SCOPE.md is
  Apache-2.0; the full terms are in LICENSE.
- The inherited template source and adaptations have no located license grant
  in the inspected upstream snapshot. They are not relicensed Apache-2.0 here.
- Temporal SDK and other dependencies retain their own licenses; those licenses
  do not automatically grant rights to the starter template.

See [LICENSE_SCOPE.md](LICENSE_SCOPE.md) and [NOTICE.md](NOTICE.md) for exact
commit provenance, covered documentation and the remaining upstream rights gap.
No current runtime or production licensing clearance is claimed.
