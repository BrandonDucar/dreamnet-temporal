import assert from 'node:assert';
import { after, before, describe, it } from 'mocha';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import {
  routeSecurityReceipt,
  type SecurityReceiptInput,
} from '../receipt-router';

const digest = (character: string) => `sha256:${character.repeat(64)}`;

function receipt(
  overrides: Partial<SecurityReceiptInput> = {}
): SecurityReceiptInput {
  return {
    receiptId: 'cerberus-example',
    receiptDigest: digest('a'),
    artifactDigest: digest('b'),
    sourceCommit: 'c'.repeat(40),
    policyVersion: 'cerberus-policy@1',
    verdict: 'green',
    riskScore: 0,
    findings: [],
    ...overrides,
  };
}

describe('Security Receipt Router workflow', function () {
  this.timeout(15_000);

  let testEnv: TestWorkflowEnvironment;

  before(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  after(async () => {
    await testEnv?.teardown();
  });

  async function execute(input: SecurityReceiptInput, suffix: string) {
    const { client, nativeConnection } = testEnv;
    const taskQueue = `receipt-router-${suffix}`;
    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue,
      workflowsPath: require.resolve('../receipt-router'),
    });

    return worker.runUntil(() =>
      client.workflow.execute(routeSecurityReceipt, {
        args: [input],
        workflowId: `receipt-router-${suffix}`,
        taskQueue,
      })
    );
  }

  it('admits only a green receipt', async () => {
    const decision = await execute(receipt(), 'green');
    assert.equal(decision.route, 'admit');
    assert.equal(decision.executionAllowed, true);
    assert.equal(decision.humanApprovalRequired, false);
  });

  it('routes yellow to adaptive remediation', async () => {
    const decision = await execute(
      receipt({
        verdict: 'yellow',
        riskScore: 17,
        findings: [
          {
            severity: 'high',
            rule: 'dependency.lifecycle-script',
          },
        ],
      }),
      'yellow'
    );

    assert.equal(decision.route, 'remediate');
    assert.equal(decision.executionAllowed, false);
    assert.equal(decision.minimumQuorumSeats, 11);
    assert.ok(decision.specialistSeats.includes('supply-chain'));
  });

  it('routes orange to human-led escalation', async () => {
    const decision = await execute(
      receipt({
        verdict: 'orange',
        riskScore: 42,
        findings: [
          {
            severity: 'high',
            rule: 'ci.action-unpinned',
          },
        ],
      }),
      'orange'
    );

    assert.equal(decision.route, 'escalate');
    assert.equal(decision.humanApprovalRequired, true);
    assert.equal(decision.minimumQuorumSeats, 15);
  });

  it('routes red to incident containment', async () => {
    const decision = await execute(
      receipt({
        verdict: 'red',
        riskScore: 95,
        findings: [
          {
            severity: 'critical',
            rule: 'credential.private-key',
          },
        ],
      }),
      'red'
    );

    assert.equal(decision.route, 'incident');
    assert.equal(decision.minimumQuorumSeats, 21);
    assert.ok(decision.actions.includes('revoke_temporary_access'));
  });

  it('fails closed for malformed or unknown receipts', async () => {
    const decision = await execute(
      receipt({
        receiptDigest: 'not-a-digest',
        verdict: 'purple',
      }),
      'unknown'
    );

    assert.equal(decision.normalizedVerdict, 'unknown');
    assert.equal(decision.route, 'incident');
    assert.equal(decision.executionAllowed, false);
    assert.equal(decision.reason, 'receipt_digest_invalid');
  });
});
