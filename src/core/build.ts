import glob from 'fast-glob';
import transformFilesAsync from '../transpiler';
import createProgressLoader from '../utils/loader';
import { trackProgress } from '../utils';
import { getConfig } from '../config';
import type { Bundles } from '../types';

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

async function build() {
  const { target, extensions } = getConfig();

  const sourceFiles = getAllSourceFiles();
  if (sourceFiles.length === 0) {
    console.error(
      'No source files found which match extension ' + extensions.join(','),
    );
    process.exit(1);
  }

  const loader = createProgressLoader(sourceFiles.length);
  loader.updateProgressText('Building library...');

  async function runBuildProcess(target: Bundles) {
    const transpiles = await transformFilesAsync(target, sourceFiles);
    if (!transpiles.length) return;
    await trackProgress(transpiles, ({ completed }) => {
      loader.track(completed);
    });
  }

  try {
    if (target) {
      if (!Array.isArray(target)) {
        await runBuildProcess(target as Bundles);
      } else {
        await Promise.all(
          [...target].map(trgt => {
            return runBuildProcess(trgt as Bundles);
          }),
        );
      }
    } else {
      await Promise.all(
        (['modern', 'common'] as Bundles[]).map(target => {
          return runBuildProcess(target);
        }),
      );
    }
  } catch (err) {
    loader.stop();
    console.error(err);
    process.exit(1);
  }
  loader.stop();
}

export default build;
