import path from 'node:path';
import fse from 'fs-extra';
import * as babel from './babel';
import { getConfig } from '../config';
import type { ModuleConfig, Bundles, TranspileOutput } from '../types';

export const transformFilesAsync = async (
  target: Bundles,
  sourceFiles: string[],
) => {
  const { lib, srcPath, buildPath } = getConfig();

  let moduleConfig: ModuleConfig = null;
  let outPath = './';

  if (target === 'common') {
    moduleConfig = lib.cjs;
    outPath = './cjs';
  } else if (target === 'modern') {
    moduleConfig = lib.esm;
  }

  const outDir = path.resolve(
    buildPath,
    // It will support top level path
    // `import Component from 'library/Component'`
    outPath,
  );

  const opsAsync: Promise<unknown>[] = [];

  for (let i = 0; i < sourceFiles.length; i++) {
    // files relative paths
    const sourceFileRelPath = sourceFiles[i];
    const outputFileRelPath = sourceFiles[i].replace(/\.tsx?/, '.js');

    // files absolute paths
    const sourceFileAbsPath = path.resolve(srcPath, sourceFileRelPath);
    const outputFileAbsPath = path.resolve(outDir, outputFileRelPath);

    if (!fse.existsSync(sourceFileAbsPath)) {
      fse.removeSync(path.resolve(outDir, sourceFiles[i]));
      continue;
    }

    const options = {
      env: target,
      sourceMaps: Boolean(moduleConfig?.output?.sourceMap),
      comments: Boolean(moduleConfig?.output?.comments),
    };

    opsAsync.push(
      new Promise<void>(async (resolve, reject) => {
        try {
          const output = babel.transformFile(sourceFileAbsPath, options);

          if (output.map) {
            output.code += `\n//# sourceMappingURL=${outputFileRelPath}.map`;
          }

          fse.outputFileSync(outputFileAbsPath, output.code || '');

          if (output.map) {
            fse.outputFileSync(`${outputFileAbsPath}.map`, output.map);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      }),
    );
  }

  return opsAsync;
};

export default transformFilesAsync;
