import path from 'node:path';
import fse from 'fs-extra';
import useBabelConfig from './useBabelConfig';
import { getConfig } from '../config';
import { magicImport } from '../utils';
import type { ModuleConfig, Bundles } from '../types';

const babel = magicImport<typeof import('@babel/core')>('@babel/core');

export interface BuildProps {
  outDir: string;
  target: Bundles;
}

export async function transpileAsync(props: BuildProps, sourceFiles: string[]) {
  const { lib, srcPath, buildPath } = getConfig();
  const { target } = props;

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

    opsAsync.push(
      new Promise<void>(async (resolve, reject) => {
        try {
          const babelConfig = useBabelConfig({ env: target });
          const transformedCode = await babel.transformFileAsync(
            sourceFileAbsPath,
            {
              sourceMaps: Boolean(moduleConfig?.output?.sourceMap),
              comments: Boolean(moduleConfig?.output?.comments),
              ...babelConfig,
              configFile: false,
            },
          );

          if (transformedCode.map) {
            transformedCode.code += `\n//# sourceMappingURL=${outputFileRelPath}.map`;
          }

          fse.outputFileSync(outputFileAbsPath, transformedCode.code || '');

          if (transformedCode.map) {
            fse.outputFileSync(
              `${outputFileAbsPath}.map`,
              JSON.stringify(transformedCode.map),
            );
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      }),
    );
  }

  return opsAsync;
}
