import path from 'node:path';
import fse from 'fs-extra';
import * as babel from './babel';
import { getConfig } from '../config';
import type { ModuleConfig, Bundles, TranspileOutput } from '../types';

export type ProgressCallback = ({
  completed,
  target,
}: {
  completed: number;
  target: Bundles;
}) => void;

export const transformFilesAsync = async (
  target: Bundles,
  sourceFiles: string[],
  progress: ProgressCallback,
) => {
  const { lib, srcPath, buildPath, customTranspiler } = getConfig();

  function callbackProgress(completed: number) {
    return progress({ completed, target });
  }

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

  // set initial progress 0
  callbackProgress(0);

  for (let i = 0; i < sourceFiles.length; i++) {
    try {
      // files relative paths
      const sourceFileRelPath = sourceFiles[i];
      const outputFileRelPath = sourceFiles[i].replace(/\.tsx?/, '.js');

      // files absolute paths
      const sourceFileAbsPath = path.resolve(srcPath, sourceFileRelPath);
      const outputFileAbsPath = path.resolve(outDir, outputFileRelPath);

      if (!fse.existsSync(sourceFileAbsPath)) {
        fse.removeSync(path.resolve(outDir, sourceFiles[i]));
        callbackProgress(i + 1);
        continue;
      }

      const options = {
        env: target,
        sourceMaps: Boolean(moduleConfig?.output?.sourceMap),
        comments: Boolean(moduleConfig?.output?.comments),
      };

      let output: TranspileOutput;
      if (typeof customTranspiler === 'function') {
        const code = fse.readFileSync(sourceFileAbsPath, 'utf8');
        const tmp = await customTranspiler(code, options);
        if (tmp && tmp.code) {
          output = { code: tmp.code, map: tmp.map };
        }
      }

      if (!output) {
        output = await babel.transformFileAsync(sourceFileAbsPath, options);
      }

      if (output.map) {
        output.code += `\n//# sourceMappingURL=${outputFileAbsPath}.map`;
        fse.outputFileSync(`${outputFileAbsPath}.map`, output.map);
      }
      fse.outputFileSync(outputFileAbsPath, output.code);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
    callbackProgress(i + 1);
  }

  return opsAsync;
};

export default transformFilesAsync;
