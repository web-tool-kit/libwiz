import path from 'node:path';
import glob from 'fast-glob';
import fse from 'fs-extra';
import useBabelConfig, { type UseBabelConfigProps } from './useBabelConfig';
import { getConfig, type ModuleConfig } from '../config';
import type { Bundles } from '../config';
import { magicImport } from '../utils';

const babel = magicImport<typeof import('@babel/core')>('@babel/core');

export interface BuildProps {
  outDir: string;
  target: Bundles;
}

const { validBundles, extensions, root, ignore, lib } = getConfig();
const srcDir = path.resolve(root, './src');

export async function transpileAsync(
  props: BuildProps,
  sourceFiles: string[],
  signal?: AbortSignal,
) {
  const { target, outDir: _outDir } = props;
  if (!target || validBundles.indexOf(target) === -1) {
    throw new TypeError('Unrecognized bundle Config');
  }

  const topLevelNonIndexFiles = glob
    .sync(`*{${extensions.join(',')}}`, { cwd: srcDir, ignore })
    .filter(file => {
      return path.basename(file, path.extname(file)) !== 'index';
    });
  const hasTopLevelImports = topLevelNonIndexFiles.length === 0;

  let moduleConfig: ModuleConfig = null;
  let outPath = './';

  if (target === 'common') {
    moduleConfig = lib?.cjs;
    if (moduleConfig?.output?.path) {
      outPath = path.resolve(root, lib?.cjs?.output?.path);
    } else if (hasTopLevelImports) {
      outPath = './cjs';
    }
  } else if (target === 'modern') {
    moduleConfig = lib?.esm;
    if (moduleConfig?.output?.path) {
      outPath = path.resolve(root, lib?.esm?.output?.path);
    } else if (!hasTopLevelImports) {
      outPath = './esm';
    }
  }

  const outDir = path.resolve(
    _outDir,
    // It will support top level path
    // `import Component from 'library/Component'`
    // like:
    // {
    //   common: hasTopLevelImports ? './cjs' : './',
    //   modern: hasTopLevelImports ? './' : './esm',
    // }[bundle],
    outPath,
  );

  if (signal) {
    signal.addEventListener('abort', () => {
      new Error(
        '[internal] new process initialized, previous process aborted via signal',
      );
    });
  }

  const opsAsync = [];

  for (let i = 0; i < sourceFiles.length; i++) {
    // [Restart](phase 1) break loop if signal aborted
    if (signal && signal.aborted) {
      break;
    }

    const sourceFilePath = path.resolve(srcDir, sourceFiles[i]);

    if (!fse.existsSync(sourceFilePath)) {
      fse.removeSync(path.resolve(outDir, sourceFiles[i]));
      continue;
    }

    opsAsync.push(
      new Promise<void>(async res => {
        const transformedCode = await babel.transformFileAsync(sourceFilePath, {
          sourceMaps: Boolean(moduleConfig?.output?.sourceMap),
          comments: Boolean(moduleConfig?.output?.comments),
          ...useBabelConfig({
            env: target,
          } as UseBabelConfigProps),
        });

        // [Restart](phase 2) avoid save if signal aborted
        if (signal && signal.aborted) res();

        fse.outputFileSync(
          path.resolve(outDir, sourceFiles[i].replace(/\.tsx?/, '.js')),
          transformedCode.code || '',
        );
        res();
      }),
    );
  }

  // [Restart](phase 3) return as no need to wait for all promises
  if (signal && signal.aborted) {
    return;
  }

  await Promise.all(opsAsync);
}
