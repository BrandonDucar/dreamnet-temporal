// @@@SNIPSTART money-transfer-project-template-ts-start-workflow
import { Connection, Client } from '@temporalio/client';
import { moneyTransfer } from './workflows';
import type { PaymentDetails } from './shared';

import { taskQueueName } from './shared';
import { loadDreamNetTemporalConfig } from './temporal-config';

async function run() {
  const { connectionOptions, namespace } = loadDreamNetTemporalConfig();
  const connection = await Connection.connect(connectionOptions);
  const client = new Client({ connection, namespace });

  const details: PaymentDetails = {
    amount: 400,
    sourceAccount: '85-150',
    targetAccount: '43-812',
    referenceId: '12345',
  };

  console.log(
    `Starting transfer from account ${details.sourceAccount} to account ${details.targetAccount} for $${details.amount}`
  );

  const handle = await client.workflow.start(moneyTransfer, {
    args: [details],
    taskQueue: taskQueueName,
    workflowId: process.env.WORKFLOW_ID || 'money-transfer-demo',
  });

  console.log(
    `Started Workflow ${handle.workflowId} with RunID ${handle.firstExecutionRunId}`
  );
  console.log(await handle.result());

  await connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
// @@@SNIPEND
