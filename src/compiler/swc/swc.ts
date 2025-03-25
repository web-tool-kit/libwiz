import useSwcConfig from './useSwcConfig';
import { magicImport } from '../../utils';
import api from '../../api';
import type { CompileOutput, Compiler } from '../../types';

export const compiler: Compiler = async (sourceFile, options) => {
  const { root, workspace } = api.config;

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

  const output: CompileOutput = { code: transformedCode.code };
  if (transformedCode.map) {
    output.map = JSON.stringify(transformedCode.map);
  }
  return output;
};

export default compiler;
