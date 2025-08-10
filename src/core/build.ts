import { globSync } from 'fast-glob';
import transformFilesAsync from '@/transpiler';
import createProgressLoader from '@/utils/loader';
import { getConfig } from '@/config';
import { checkBuildAbortSignal, isBuildCancelledError } from '@/utils';
import type { Bundles } from '@/types';

function getAllSourceFiles() {
  const { extensions, ignore, srcPath } = getConfig();
  // create proper glob pattern based on number of extensions
  let globPattern: string;
  if (extensions.length === 1) {
    // for single extension, use simple pattern
    globPattern = `**/*${extensions[0]}`;
  } else {
    // for multiple extensions, use brace expansion
    globPattern = `**/*{${extensions.join(',')}}`;
  }

  try {
    const hasDts = ignore.includes('**/*.d.ts');
    return globSync(globPattern, {
      cwd: srcPath,
      // ignore d.ts as its not needed to be transpiled
      ignore: [...ignore, !hasDts && '**/*.d.ts'].filter(Boolean) as string[],
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function build(abortSignal?: AbortSignal) {
  const { extensions, output } = getConfig();
  const target = output.target;

  const sourceFiles = getAllSourceFiles();
  if (sourceFiles.length === 0) {
    console.error(
      'No source files found which match extension ' + extensions.join(','),
    );
    process.exit(1);
  }

  const loader = createProgressLoader(sourceFiles.length);
  loader.updateProgressText('Building... ');

  let i = 0;
  async function runBuildProcess(target: Bundles) {
    // Check abort signal before starting
    checkBuildAbortSignal(abortSignal);

    await transformFilesAsync(target, sourceFiles, ({ completed }) => {
      // Check abort signal during progress updates
      checkBuildAbortSignal(abortSignal);

      // Edge case: When esm and cjs builds run concurrently,
      // one build may complete steps ahead of the other. This check
      // prevents reducing the progress bar if a later callback reports
      // less progress than a previous one.
      if (i > completed) return;
      i = completed;
      loader.track(completed);
    });
    abortSignal;
  }

  try {
    if (target) {
      if (!Array.isArray(target)) {
        await runBuildProcess(target as Bundles);
      } else {
        await Promise.all(
          [...target].map(trgt => {
            // Check abort signal before each target
            checkBuildAbortSignal(abortSignal);
            return runBuildProcess(trgt as Bundles);
          }),
        );
      }
    } else {
      await Promise.all(
        (['esm', 'cjs'] as Bundles[]).map(target => {
          // Check abort signal before each target
          checkBuildAbortSignal(abortSignal);
          return runBuildProcess(target);
        }),
      );
    }
  } catch (err) {
    loader.stop();
    // handle abort errors gracefully
    if (isBuildCancelledError(err)) {
      return;
    }
    console.error(err);
    process.exit(1);
  }
  loader.stop();
}

export default build;
