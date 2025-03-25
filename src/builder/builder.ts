import path from 'node:path';
import fse from 'fs-extra';
import api from '../api';
import type { ModuleConfig, Bundles, CompileOutput } from '../types';

export type ProgressCallback = ({
  completed,
  target,
}: {
  completed: number;
  target: Bundles;
}) => void;

const builder = async (
  target: Bundles,
  sourceFiles: string[],
  progress: ProgressCallback,
) => {
  const { lib, srcPath, buildPath, customTranspiler } = api.config;

  function callbackProgress(completed: number) {
    return progress({ completed, target });
  }

  let moduleConfig: ModuleConfig = null;
  let outPath = './';

  if (target === 'cjs') {
    moduleConfig = lib.cjs;
    outPath = './cjs';
  } else if (target === 'esm') {
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
    const sourceFileRelPath = sourceFiles[i];
    const outputFileRelPath = sourceFiles[i].replace(/\.(ts|js)x?/, '.js');

    // files absolute paths
    const sourceFileAbsPath = path.resolve(srcPath, sourceFileRelPath);
    const outputFileAbsPath = path.resolve(outDir, outputFileRelPath);

    if (!fse.existsSync(sourceFileAbsPath)) {
      fse.removeSync(path.resolve(outDir, sourceFiles[i]));
      callbackProgress(i + 1);
      continue;
    }

    const options = {
      bundle: target,
      sourceMaps: moduleConfig?.output?.sourceMap,
      comments: moduleConfig?.output?.comments,
    };

    let output: CompileOutput;
    if (typeof customTranspiler === 'function') {
      const code = fse.readFileSync(sourceFileAbsPath, 'utf8');
      const tmp = await customTranspiler(code, options);
      if (tmp && tmp.code) {
        output = { code: tmp.code, map: tmp.map };
      }
    }
    if (!output) {
      output = await api.compiler(sourceFileAbsPath, options);
    }

    if (output.map) {
      output.code += `\n//# sourceMappingURL=${outputFileAbsPath}.map`;
      fse.outputFileSync(`${outputFileAbsPath}.map`, output.map);
    }
    fse.outputFileSync(outputFileAbsPath, output.code);
    callbackProgress(i + 1);
  }

  return opsAsync;
};

export default builder;
