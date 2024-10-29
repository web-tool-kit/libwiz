import useBabelConfig from './useBabelConfig';
import { magicImport } from '../../utils';
import type { TranspileOptions, TranspileOutput } from '../../types';

const babel = magicImport<typeof import('@babel/core')>('@babel/core');

export async function transformFileAsync(
  sourceFile: string,
  options: TranspileOptions,
): Promise<TranspileOutput> {
  const babelConfig = useBabelConfig({ env: options.env });
  const transformedCode = await babel.transformFileAsync(sourceFile, {
    ...babelConfig,
    sourceMaps: Boolean(options.sourceMaps),
    comments: Boolean(options.comments),
    configFile: false,
  });
  const output: TranspileOutput = { code: transformedCode.code };
  if (transformedCode.map) {
    output.map = JSON.stringify(transformedCode.map);
  }
  return output;
}

export default transformFileAsync;
