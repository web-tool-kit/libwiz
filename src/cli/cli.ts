import { getConfig } from '../config';
import watchRun from '../core/watch';
import prebuildRun from '../core/prebuild';
import buildRun from '../core/build';
import typesRun from '../core/types';
import postbuild from '../core/postbuild';
import type { BuildProps } from '../core/build';

export interface CliProps extends BuildProps {
  build: boolean;
  types: boolean;
  watch: boolean;
  prebuild: boolean;
  sourceMaps: boolean;
  outDir: string;
  bundle: string;
  verbose: boolean;
}

const config = getConfig();

async function run(argv: CliProps) {
  const { build, types, watch, prebuild, outDir } = argv;

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

  const buildProps = {
    target: argv.target,
    bundle: argv.bundle,
    outDir: argv.outDir,
    sourceMaps: argv.sourceMaps,
  };

  if (watch) {
    console.clear();
    watchRun({ ...buildProps });
    return;
  }

  if (prebuild) {
    await prebuildRun({ outDir });
  }

  if (build) {
    console.clear();
    await buildRun(buildProps);
  }

  if (config.tsConfig && types && !watch) {
    try {
      await typesRun();
    } catch (err) {
      throw new Error(`Failed TS build: \n${err}`);
    }
  }

  postbuild();
}

export default run;
