import path from 'node:path';
import glob from 'fast-glob';
import pc from 'picocolors';
import * as babel from '../transpiler/babel';
import { getConfig } from '../config';
import type { Bundles } from '../config';

export interface BuildProps {
  sourceMaps: boolean;
  outDir: string;
  target: Bundles;
}

const config = getConfig();
const { extensions, root, ignore } = config;
const srcDir = path.resolve(root, './src');

function getAllSourceFiles() {
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
  function runBuildProcess(props: BuildProps) {
    return babel.transpileAsync(props, sourceFiles, signal);
  }

  if (target) {
    console.log(pc.green(`Build: ${target} mode`));
    await runBuildProcess({ ...argv, target });
  } else if (config.target) {
    if (!Array.isArray(config.target)) {
      console.log(pc.green(`Build: ${config.target} mode`));
      await runBuildProcess({ ...argv, target });
    } else {
      console.log(pc.green(`Build: ${config.target.join(',')} mode`));
      await Promise.all(
        [...config.target].map(trgt => {
          return runBuildProcess({ ...argv, target: trgt });
        }),
      );
    }
  } else {
    console.log(pc.green('Build: common and modern mode'));
    await Promise.all(
      (['common', 'modern'] as Bundles[]).map(trgt => {
        return runBuildProcess({ ...argv, target: trgt });
      }),
    );
  }
}

export default build;
