import { boldYellow } from '@/utils/picocolors';
import { hasTypescript, notifyTypescriptNotInstalled } from '@/typescript';
import { getConfig } from '@/config';
import log from '@/utils/log';
import prebuildRun from '@/core/prebuild';
import buildRun from '@/core/build';
import postBuild from '@/core/postbuild';
import { createTimer } from '@/utils';
import type { CliOptions, CliTaskTypes } from '@/types';

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

async function run(cliOptions: CliOptions, task: CliTaskTypes) {
  const config = getConfig();
  const { types, check } = cliOptions;
  const watch = task === 'dev';

  // validate --check flag usage
  if (cliOptions.check) {
    // with types there is no sense to use --check flag
    if (cliOptions.types) {
      log.error(
        `${boldYellow('--types')} and ${boldYellow('--check')} cannot be used together`,
      );
      process.exit(1);
    }
    if (task !== 'types') {
      log.error(
        `${boldYellow('--check')} flag is not valid with ${boldYellow(task)} command`,
      );
      process.exit(1);
    }
  }

  // just warn the user that --types flag is not needed with types command
  if (task === 'types') {
    if (cliOptions.types) {
      log.warn(
        `no need to use ${boldYellow('--types')} flag with ${boldYellow('types')} command`,
      );
    }
  }

  // if type actions will gonna be performed then we need to check if
  // tsconfig is present
  if (task === 'types' || cliOptions.types) {
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

  if (task === 'dev') {
    const { default: watchRun } = require('@/core/watch');
    watchRun(cliOptions);
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
