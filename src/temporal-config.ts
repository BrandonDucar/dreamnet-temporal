import { readFileSync } from 'node:fs';
import { loadClientConnectConfig } from '@temporalio/envconfig';

function definedEnvironment(
  source: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );
}

export function loadDreamNetTemporalConfig(source: NodeJS.ProcessEnv = process.env) {
  const environment = definedEnvironment(source);
  const apiKeyFile = environment.TEMPORAL_API_KEY_FILE?.trim();

  if (apiKeyFile) {
    const apiKey = readFileSync(apiKeyFile, 'utf8').trim();
    if (!apiKey) {
      throw new Error(`Temporal API key file is empty: ${apiKeyFile}`);
    }
    environment.TEMPORAL_API_KEY = apiKey;
  }

  const envOnly = Boolean(
    environment.TEMPORAL_ADDRESS &&
      environment.TEMPORAL_NAMESPACE &&
      environment.TEMPORAL_API_KEY
  );

  return loadClientConnectConfig({
    profile: envOnly
      ? undefined
      : environment.TEMPORAL_PROFILE || 'cloud-setup',
    disableFile: envOnly,
    overrideEnvVars: environment,
  });
}
