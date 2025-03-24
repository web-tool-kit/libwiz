import type { BabelConfig } from './types';
import type {
  LibwizPlugin,
  PluginApi,
  TranspileOptions,
  TranspileOutput,
} from '../../types';
import useBabelConfig from './useBabelConfig';
import { ensureDependency } from '../../utils';

class PluginBabel implements LibwizPlugin {
  name: string;
  private babelConfig: BabelConfig;

  constructor(babelConfig: BabelConfig) {
    this.name = 'LIBWIZ_PLUGIN_BABEL';
    this.babelConfig = babelConfig;
  }

  setup(api: PluginApi): void {
    const { root, workspace } = api.getConfig();
    const babel = ensureDependency<typeof import('@babel/core')>(
      '@babel/core',
      { root, workspace },
    );

    const transform = async (sourceFile: string, options: TranspileOptions) => {
      const babelConfig = useBabelConfig(this.babelConfig, { root, workspace });
      const transformedCode = await babel.transformFileAsync(sourceFile, {
        ...babelConfig,
        ...options,
        browserslistConfigFile: false,
      });
      const output: TranspileOutput = {
        code: (transformedCode?.code as string) || '',
      };
      if (transformedCode?.map) {
        output.map = JSON.stringify(transformedCode.map);
      }
      return output;
    };

    console.log(transform);
  }
}

module.exports = PluginBabel;
export default PluginBabel;
