import path from 'node:path';
import fse from 'fs-extra';
import { getConfig } from '@/config';
import * as babel from './babel';
import { isProgressDisabled } from '@/utils';
import type { ModuleConfig, Bundles, TranspileOutput, Config } from '@/types';

export type ProgressCallback = ({
  completed,
  target,
}: {
  completed: number;
  target: Bundles;
}) => void;

type TranspileFileOptions = {
  target: Bundles;
  srcPath: string;
  outDir: string;
  moduleConfig: ModuleConfig;
  sourceFileRelPath: string;
  customTranspiler?: Config['customTranspiler'];
};

async function transpileFile(options: TranspileFileOptions) {
  const {
    sourceFileRelPath,
    target,
    moduleConfig,
    customTranspiler,
    srcPath,
    outDir,
  } = options;

  // files relative paths
  const outputFileRelPath = sourceFileRelPath.replace(/\.tsx?/, '.js');

  // files absolute paths
  const sourceFileAbsPath = path.resolve(srcPath, sourceFileRelPath);
  const outputFileAbsPath = path.resolve(outDir, outputFileRelPath);

  if (!(await fse.pathExists(sourceFileAbsPath))) {
    // in case source file not exists, remove the output file (that need to sync in case of watch mode)
    const outputFile = path.resolve(outDir, sourceFileRelPath);
    await fse.remove(outputFile);
    return;
  }

  const transpileOptions = {
    env: target,
    sourceMaps: Boolean(moduleConfig?.output?.sourceMap),
    comments: Boolean(moduleConfig?.output?.comments),
  };

  let output: TranspileOutput;

  if (typeof customTranspiler === 'function') {
    const code = await fse.readFile(sourceFileAbsPath, 'utf8');
    const tmp = await customTranspiler(code, transpileOptions);
    if (tmp && tmp.code) {
      output = { code: tmp.code, map: tmp.map };
    }
  }

  if (!output) {
    output = await babel.transformFileAsync(
      sourceFileAbsPath,
      transpileOptions,
    );
  }

  const writeOps: Promise<void>[] = [];
  if (output.map) {
    // use relative path for source map URL
    output.code += `\n//# sourceMappingURL=${path.basename(outputFileAbsPath)}.map`;
    writeOps.push(fse.outputFile(`${outputFileAbsPath}.map`, output.map));
  }

  writeOps.push(fse.outputFile(outputFileAbsPath, output.code));
  await Promise.all(writeOps);
}

export const transformFilesAsync = async (
  target: Bundles,
  sourceFiles: string[],
  progress: ProgressCallback,
) => {
  const { lib, srcPath, output, customTranspiler } = getConfig();
  const noprogress = isProgressDisabled();

  function callbackProgress(completed: number) {
    if (noprogress) return;
    return progress({ completed, target });
  }

  let moduleConfig: ModuleConfig;
  if (target === 'cjs') {
    moduleConfig = lib.cjs as ModuleConfig;
  } else if (target === 'esm') {
    moduleConfig = lib.esm as ModuleConfig;
  }

  const outPath = moduleConfig?.output?.path;

  const outDir = path.resolve(
    output.dir,
    // It will support top level path
    // `import Component from 'library/Component'`
    outPath,
  );

  // set initial progress 0
  callbackProgress(0);

  try {
    const baseTranspileFileOptions: Omit<
      TranspileFileOptions,
      'sourceFileRelPath'
    > = {
      target,
      srcPath,
      outDir,
      moduleConfig,
      customTranspiler,
    };

    // dynamic batch size
    const BATCH_SIZE = noprogress ? sourceFiles.length : 5;

    let completed = 0;

    // batched parallel processing for better performance
    for (let i = 0; i < sourceFiles.length; i += BATCH_SIZE) {
      const batch = sourceFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async sourceFileRelPath => {
          const transpileFileOptions: TranspileFileOptions = {
            ...baseTranspileFileOptions,
            sourceFileRelPath,
          };
          await transpileFile(transpileFileOptions);
        }),
      );
      completed += batch.length;
      callbackProgress(completed);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default transformFilesAsync;
