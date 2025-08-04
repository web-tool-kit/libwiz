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

  // in case source file not exists, remove the output file (that need to sync in case of watch mode)
  if (!fse.existsSync(sourceFileAbsPath)) {
    fse.removeSync(path.resolve(outDir, sourceFileRelPath));
    return;
  }

  const transpileOptions = {
    env: target,
    sourceMaps: Boolean(moduleConfig?.output?.sourceMap),
    comments: Boolean(moduleConfig?.output?.comments),
  };

  let output: TranspileOutput;

  if (typeof customTranspiler === 'function') {
    const code = fse.readFileSync(sourceFileAbsPath, 'utf8');
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

  if (output.map) {
    // use relative path for source map URL
    output.code += `\n//# sourceMappingURL=${path.basename(outputFileAbsPath)}.map`;
    await fse.outputFile(`${outputFileAbsPath}.map`, output.map);
  }

  await fse.outputFile(outputFileAbsPath, output.code);
}

export const transformFilesAsync = async (
  target: Bundles,
  sourceFiles: string[],
  progress: ProgressCallback,
) => {
  const { lib, srcPath, buildPath, customTranspiler } = getConfig();

  function callbackProgress(completed: number) {
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
    buildPath,
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

    // if progress is disabled, we can use Promise.all to process all files at once
    if (isProgressDisabled()) {
      await Promise.all(
        sourceFiles.map(async sourceFileRelPath => {
          const transpileFileOptions: TranspileFileOptions = {
            ...baseTranspileFileOptions,
            sourceFileRelPath,
          };
          await transpileFile(transpileFileOptions);
        }),
      );
    } else {
      // if progress is enabled, we need to process one by one
      for (let i = 0; i < sourceFiles.length; i++) {
        const transpileFileOptions: TranspileFileOptions = {
          ...baseTranspileFileOptions,
          sourceFileRelPath: sourceFiles[i],
        };
        await transpileFile(transpileFileOptions);

        // update progress after file is transpiled
        callbackProgress(i + 1);
      }
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default transformFilesAsync;
