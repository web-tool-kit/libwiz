import { hasTypescript, notifyTypescriptNotInstalled } from '@/typescript';
import { getConfig } from '@/config';
import log from '@/utils/log';
import prebuildRun from '@/core/prebuild';
import buildRun from '@/core/build';
import postBuild from '@/core/postbuild';
import { createTimer } from '@/utils';
import type { CliProps, CliTaskTypes } from '@/types';

async function generateTypes(onlyTypeCheck: boolean, showTiming = true) {
  try {
    if (!hasTypescript()) {
      notifyTypescriptNotInstalled(log.error);
      process.exit(1);
    }
    const { default: typesRun } = require('@/core/types');
    await typesRun(onlyTypeCheck, showTiming);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  return;
}

async function run(cliProps: CliProps, task: CliTaskTypes) {
  const config = getConfig();
  const { types, watch, check } = cliProps;

  // validate --check flag usage
  if (cliProps.check) {
    if (task !== 'types') {
      log.error(
        '--check flag is only valid with the "types" command (libwiz types --check)',
      );
      process.exit(1);
    }
    if (!config.tsConfig) {
      log.error(
        'No tsconfig found. Type checking requires a TypeScript configuration file.',
      );
      process.exit(1);
    }
  }

  // setup env before build start
  // production/development can be there
  {
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = watch ? 'development' : 'production';
    }

    if (!process.env.BABEL_ENV) {
      process.env.BABEL_ENV = watch ? 'development' : 'production';
    }
  }

  if (watch) {
    const { default: watchRun } = require('@/core/watch');
    watchRun(cliProps);
    return;
  }

  // Handle types-only command
  if (task === 'types') {
    await generateTypes(check, true);
    process.exit(0);
  }

  await prebuildRun();

  const buildTimer = createTimer();
  if (task === 'build') {
    await buildRun();
  }

  if (config.tsConfig && types && task === 'build') {
    await generateTypes(false, false);
  }

  await postBuild(buildTimer);
}

export default run;
