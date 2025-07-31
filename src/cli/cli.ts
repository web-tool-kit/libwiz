import { getConfig } from '../config';
import log from '@/utils/log';
import prebuildRun from '@/core/prebuild';
import buildRun from '@/core/build';
import postBuild from '@/core/postbuild';
import type { CliProps, TaskTypes } from '@/types';
import { hasTypescript, notifyTypescriptNotInstalled } from '@/typescript';

async function generateTypes(onlyTypeCheck: boolean) {
  try {
    if (!hasTypescript()) {
      notifyTypescriptNotInstalled(log.error);
      process.exit(1);
    }
    const { default: typesRun } = require('@/core/types');
    await typesRun(onlyTypeCheck);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  return;
}

async function run(cliProps: CliProps, task: TaskTypes) {
  const config = getConfig();
  const { build, types, watch, check } = cliProps;

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
  // production/devlopment can be there
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
  if (types && !build && !watch) {
    await generateTypes(check);
  }

  const buildStartTime = Date.now();
  await prebuildRun();

  if (build) {
    await buildRun();
  }

  if (config.tsConfig && types && !watch) {
    await generateTypes(false);
  }

  await postBuild(buildStartTime);
}

export default run;
