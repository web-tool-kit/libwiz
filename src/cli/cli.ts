import { getConfig } from '../config';
import watchRun from '../core/watch';
import prebuildRun from '../core/prebuild';
import buildRun, { type BuildProps } from '../core/build';
import typesRun from '../core/types';
import postbuild from '../core/postbuild';

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
    watchRun({ ...buildProps });
    return;
  }

  if (prebuild) {
    await prebuildRun({ outDir });
  }

  if (build) {
    await buildRun(buildProps);
  }

  if (config.tsConfig && types && !watch) {
    try {
      await typesRun();
    } catch (err) {
      throw new Error(`Failed TS build: \n${err}`);
    }
  }

  await postbuild();
  // loader.stop();
}

export default run;
