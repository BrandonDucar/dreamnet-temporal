# DreamNet Temporal Worker

This repository is DreamNet's small, independently deployable Temporal worker
reference. It proves that a worker on the NUC can execute durable workflows
against Temporal Cloud without running a Temporal server on the NUC.

The included money-transfer workflow is an official Temporal learning sample.
It is a connectivity and recovery test, not financial software.

## Architecture

```text
DreamNet app or agent
        |
        | starts a workflow
        v
Temporal Cloud namespace
        |
        | durable task queue
        v
NUC Docker worker
        |
        +-- activities
        +-- retries
        +-- receipts and application events
```

Temporal owns workflow history, timers, retries, and task delivery. GitHub owns
source and deployable definitions. GitGrid owns durable evidence artifacts.
Databases and search engines may project those artifacts but are not canonical.

## Local Verification

Run Cerberus before dependency installation:

```bash
git clone https://github.com/BrandonDucar/dreamnet-cerberus.git
node dreamnet-cerberus/scripts/cerberus.mjs gate .
npm ci
npm test
npm run build
```

## NUC Deployment

Store the Temporal service-account key outside the repository with mode `600`.
Then create a local `.env` from `example.env` and run:

```bash
docker compose --env-file .env -f compose.nuc.yml up -d --build
docker compose --env-file .env -f compose.nuc.yml ps
```

The worker accepts either a standard Temporal client profile or environment-only
configuration. `TEMPORAL_API_KEY_FILE` is preferred because the credential stays
out of the image, repository, Compose file, and Docker environment inspection.

The current NUC installs Node through NVM. Non-interactive SSH and service
automation must use the pinned runtime path explicitly:

```bash
export PATH=/home/nuc/.nvm/versions/node/v22.22.2/bin:$PATH
```

## Operating Rules

- Use a dedicated service account with the smallest namespace permission.
- Rotate worker API keys and overlap old/new keys during deployment.
- Give each workload family its own task queue.
- Keep workflow inputs small; store large artifacts in GitGrid or object storage.
- Make every activity idempotent because retries are expected behavior.
- Do not put secrets, personal data, or large binary artifacts in workflow input.
- Pin deploy images by digest after the first production build.
- Run Cerberus again whenever the source commit or dependency lock changes.

## Current Proof

The NUC validation path completed twelve tests and one Temporal Cloud workflow
using a Cerberus-approved checkout. Production workers should replace this sample
workflow with bounded DreamNet workflows such as scraping campaigns, Proof Drop
assembly, claim verification, Memory Grid projection, and scheduled agent work.

## Security Receipt Router

The worker also exports a deterministic Receipt Router:

```text
green  -> admit
yellow -> quarantine and remediate
orange -> human-led high-risk escalation
red    -> incident containment
unknown or malformed -> fail closed as an incident
```

Use the security receipt digest plus policy version as the stable workflow
identity. `receipt-client` uses Temporal's conflict and reuse policies to return
the existing decision instead of starting duplicate routing work.

`fixtures/orange-security-receipt.json` is a non-secret conformance input. A
successful route denies execution, requires human approval, selects escalation,
and requests at least 15 specialist seats. Replaying the fixture under the same
policy returns the existing workflow result.

## Upstream

This repository began as Temporal's TypeScript money-transfer tutorial:
`temporalio/money-transfer-project-template-ts`.
