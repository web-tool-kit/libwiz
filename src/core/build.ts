import path from 'node:path';
import glob from 'fast-glob';
import * as babel from '../transpiler/babel';
import createProgressLoader from '../utils/loader';
import { trackProgress } from '../utils';
import { getConfig } from '../config';
import type { BuildProps, Bundles } from '../types';

function getAllSourceFiles() {
  const { root, extensions, ignore } = getConfig();
  const srcDir = path.resolve(root, './src');
  try {
    return glob.globSync(`**/*{${extensions.join(',')}}`, {
      cwd: srcDir,
      ignore,
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function build(argv: BuildProps, signal?: AbortSignal) {
  const { target } = argv;

  const sourceFiles = getAllSourceFiles();
  const loader = createProgressLoader(sourceFiles.length);
  loader.updateProgressText('Building library...');

  async function runBuildProcess(props: BuildProps) {
    const transpiles = await babel.transpileAsync(props, sourceFiles, signal);
    if (!transpiles.length) return;
    await trackProgress(transpiles, ({ completed }) => {
      if (signal && signal.aborted) return;
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
    throw err;
  }
  loader.stop();
}

export default build;
