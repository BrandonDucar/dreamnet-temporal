// @@@SNIPSTART money-transfer-project-template-ts-worker
import { NativeConnection, Worker } from '@temporalio/worker';
import { writeFileSync, rmSync } from 'node:fs';
import * as activities from './activities';
import { taskQueueName } from './shared';
import { loadDreamNetTemporalConfig } from './temporal-config';

async function run() {
  const { connectionOptions, namespace } = loadDreamNetTemporalConfig();
  const connection = await NativeConnection.connect(connectionOptions);

  const worker = await Worker.create({
    connection,
    workflowsPath: require.resolve('./workflows'),
    activities,
    namespace,
    taskQueue: taskQueueName,
  });

  const healthFile =
    process.env.TEMPORAL_HEALTH_FILE || '/tmp/dreamnet-temporal-ready';
  writeFileSync(healthFile, new Date().toISOString(), { mode: 0o600 });

  try {
    await worker.run();
  } finally {
    rmSync(healthFile, { force: true });
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
// @@@SNIPEND
