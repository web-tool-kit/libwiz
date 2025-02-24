import useSwcConfig from './useSwcConfig';
import getConfig from '../../config';
import { magicImport } from '../../utils';

import type { TranspileOptions, TranspileOutput } from '../../types';

export async function transformFileAsync(
  sourceFile: string,
  options: TranspileOptions,
): Promise<TranspileOutput> {
  const { root, workspace } = getConfig();

  const swc = magicImport<typeof import('@swc/core')>('@swc/core', {
    root,
    workspace,
  });
  const swcConfig = useSwcConfig(options);

  const transformedCode = await swc.transformFile(sourceFile, {
    ...swcConfig,
    configFile: false,
    swcrc: false,
    sourceMaps: options.sourceMaps,
  });

  const output: TranspileOutput = { code: transformedCode.code };
  if (transformedCode.map) {
    output.map = JSON.stringify(transformedCode.map);
  }
  return output;
}

export default transformFileAsync;
