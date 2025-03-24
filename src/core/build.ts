import glob from 'fast-glob';
import transformFilesAsync from '../transpiler';
import createProgressLoader from '../utils/loader';
import type { Bundles } from '../types';
import api from '../api';

function getAllSourceFiles() {
  const { extensions, ignore, srcPath } = api.config;
  try {
    const pattern =
      extensions.length > 1
        ? `{${extensions.join(',')}}`
        : extensions.join(',');
    return glob.globSync(`**/*${pattern}`, {
      cwd: srcPath,
      ignore,
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function build() {
  const { target, extensions } = api.config;

  const sourceFiles = getAllSourceFiles();
  if (sourceFiles.length === 0) {
    console.error(
      'No source files found which match extension ' + extensions.join(','),
    );
    process.exit(1);
  }

  const loader = createProgressLoader(sourceFiles.length);
  loader.updateProgressText('Building library...');

  let i = 0;
  async function runBuildProcess(target: Bundles) {
    await transformFilesAsync(target, sourceFiles, ({ completed }) => {
      // Edge case: When esm and cjs builds run concurrently,
      // one build may complete steps ahead of the other. This check
      // prevents reducing the progress bar if a later callback reports
      // less progress than a previous one.
      if (i > completed) return;
      i = completed;
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
        (['esm', 'cjs'] as Bundles[]).map(target => {
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
