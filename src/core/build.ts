import glob from 'fast-glob';
import * as babel from '../transpiler/babel';
import createProgressLoader from '../utils/loader';
import { trackProgress } from '../utils';
import { getConfig } from '../config';
import type { BuildProps, Bundles } from '../types';

function getAllSourceFiles() {
  const { extensions, ignore, srcPath } = getConfig();
  try {
    return glob.globSync(`**/*{${extensions.join(',')}}`, {
      cwd: srcPath,
      ignore,
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function build(argv: BuildProps) {
  const config = getConfig();
  const { target = config.target } = argv;

  const sourceFiles = getAllSourceFiles();
  const loader = createProgressLoader(sourceFiles.length);
  loader.updateProgressText('Building library...');

  async function runBuildProcess(props: BuildProps) {
    const transpiles = await babel.transpileAsync(props, sourceFiles);
    if (!transpiles.length) return;
    await trackProgress(transpiles, ({ completed }) => {
      loader.track(completed);
    });
  }

  try {
    if (target) {
      if (!Array.isArray(target)) {
        await runBuildProcess({ ...argv, target: target as Bundles });
      } else {
        await Promise.all(
          [...target].map(trgt => {
            return runBuildProcess({ ...argv, target: trgt });
          }),
        );
      }
    } else {
      await Promise.all(
        (['modern', 'common'] as Bundles[]).map(target => {
          return runBuildProcess({ ...argv, target });
        }),
      );
    }
  } catch (err) {
    loader.stop();
    console.error(err);
    throw err;
  }
  loader.stop();
}

export default build;
