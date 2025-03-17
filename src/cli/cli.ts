import api from '../api';
import prebuildRun from '../core/prebuild';
import buildRun from '../core/build';
import typesRun from '../core/types';
import postBuild from '../core/postbuild';
import type { CliProps } from '../types';

async function run(argv: CliProps) {
  const config = api.getConfig();
  const { build, types, watch } = argv;

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
    const { default: watchRun } = require('../core/watch');
    watchRun();
    return;
  }

  await prebuildRun();

  if (build) {
    await buildRun();
  }

  if (config.tsConfig && types && !watch) {
    try {
      await typesRun();
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  }

  await postBuild();
}

export default run;
