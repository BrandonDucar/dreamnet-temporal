import { readFileSync } from 'node:fs';
import {
  Connection,
  Client,
  WorkflowExecutionAlreadyStartedError,
} from '@temporalio/client';
import {
  WorkflowIdConflictPolicy,
  WorkflowIdReusePolicy,
} from '@temporalio/common';
import { loadDreamNetTemporalConfig } from './temporal-config';
import {
  receiptRouteWorkflowId,
  routeSecurityReceipt,
  type SecurityReceiptInput,
} from './receipt-router';
import { taskQueueName } from './shared';

async function run() {
  const receiptFile = process.env.RECEIPT_FILE;
  if (!receiptFile) {
    throw new Error('RECEIPT_FILE is required');
  }

  const receipt = JSON.parse(
    readFileSync(receiptFile, 'utf8')
  ) as SecurityReceiptInput;
  const workflowId = receiptRouteWorkflowId(receipt);
  const { connectionOptions, namespace } = loadDreamNetTemporalConfig();
  const connection = await Connection.connect(connectionOptions);
  const client = new Client({ connection, namespace });

  try {
    let handle;
    try {
      handle = await client.workflow.start(routeSecurityReceipt, {
        args: [receipt],
        taskQueue: taskQueueName,
        workflowId,
        workflowIdConflictPolicy: WorkflowIdConflictPolicy.USE_EXISTING,
        workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
      });
    } catch (error) {
      if (!(error instanceof WorkflowExecutionAlreadyStartedError)) {
        throw error;
      }
      handle = client.workflow.getHandle(workflowId);
    }

    console.log(JSON.stringify(await handle.result(), null, 2));
  } finally {
    await connection.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
