import path from 'node:path';
import fse from 'fs-extra';
import glob from 'fast-glob';
import { getConfig } from '@/config';
import { log } from '@/utils';
import type { NormalizedConfig, Bundles } from '@/types';

export function isTarget(
  target: NormalizedConfig['output']['target'],
  value: Bundles,
) {
  if (!target) return false;
  return target === value || (Array.isArray(target) && target.includes(value));
}

/**
 * Copy required files of module in there folder
 */
export async function copyRequiredFiles() {
  const { assets, srcPath, output, lib } = getConfig();

  if (!assets || (Array.isArray(assets) && assets.length === 0)) {
    return;
  }

  if (!(await fse.pathExists(output.dir))) {
    log.warn(`build path ${output.dir} does not exists to copy assets`);
    return [];
  }

  // get custom paths from config or use defaults
  const cjsPath = lib?.cjs?.output?.path as string;
  const esmPath = lib?.esm?.output?.path as string;

  const [hasCJS, hasESM] = await Promise.all([
    fse.pathExists(cjsPath),
    fse.pathExists(esmPath),
  ]);

  const files = await glob(assets, {
    cwd: srcPath,
    dot: true,
  });

  const task: Promise<void>[] = [];

  files.forEach(file => {
    if (hasCJS) {
      task.push(
        fse.copy(path.resolve(srcPath, file), path.resolve(cjsPath, file)),
      );
    }
    if (hasESM) {
      task.push(
        fse.copy(path.resolve(srcPath, file), path.resolve(esmPath, file)),
      );
    }
  });
  await Promise.all(task);
}

// function to unlink files from build path, this expect files paths exist in src
// this used when watch mode is enabled and we need to unlink files from build path
// when file is deleted in src path
export async function unlinkFilesFromBuild(
  files: string | string[],
  isDir: boolean = false,
) {
  const { srcPath, lib, output } = getConfig();
  const cjsPath = lib?.cjs?.output?.path as string;
  const esmPath = lib?.esm?.output?.path as string;

  const [hasCJS, hasESM] = await Promise.all([
    isTarget(output.target, 'cjs') && fse.pathExists(cjsPath),
    isTarget(output.target, 'esm') && fse.pathExists(esmPath),
  ]);

  const tasks: Promise<void>[] = [];
  const isTS = (ext: string) => ['.ts', '.tsx', '.mts'].includes(ext);

  async function removeFile(file: string) {
    const relativePath = path.relative(srcPath, file);

    // helper function to remove from both CJS and ESM paths
    const removeFromBuildPaths = async (targetPath: string) => {
      if (hasCJS) {
        const cjsTarget = path.resolve(cjsPath, targetPath);
        if (await fse.pathExists(cjsTarget)) {
          tasks.push(fse.remove(cjsTarget));
        }
      }

      if (hasESM) {
        const esmTarget = path.resolve(esmPath, targetPath);
        if (await fse.pathExists(esmTarget)) {
          tasks.push(fse.remove(esmTarget));
        }
      }
    };

    if (isDir) {
      // for directories, remove directly from both CJS and ESM paths
      await removeFromBuildPaths(relativePath);
    } else {
      // for files, handle extension conversion
      const dirName = path.dirname(relativePath);
      const fileName = path.basename(relativePath);
      const ext = path.extname(fileName);

      const buildFileName =
        // in case file is ts group then we need to unlink the js file
        // but for dts files we do not convert to js
        isTS(ext) && !fileName.endsWith('.d.ts')
          ? fileName.replace(ext, '.js')
          : fileName;

      await removeFromBuildPaths(path.join(dirName, buildFileName));
    }
  }

  if (Array.isArray(files)) {
    await Promise.all(files.map(removeFile));
  } else {
    await removeFile(files);
  }

  await Promise.all(tasks);
}
