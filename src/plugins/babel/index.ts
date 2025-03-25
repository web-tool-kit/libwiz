import type { BabelConfig } from './types';
import type {
  LibwizPlugin,
  PluginApi,
  Compiler,
  CompileOutput,
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
    const { root, workspace } = api.config;
    const babel = ensureDependency<typeof import('@babel/core')>(
      '@babel/core',
      { root, workspace },
    );

    const transform: Compiler = async (sourceFile, options) => {
      const babelConfig = useBabelConfig({ root, workspace }, this.babelConfig);
      // ignore browserlist warning
      process.env.BROWSERSLIST_IGNORE_OLD_DATA = 'true';

      const transformedCode = await babel.transformFileAsync(sourceFile, {
        ...babelConfig,
        envName: options.bundle,
        sourceMaps: options.sourceMaps,
        comments: options.comments,
        configFile: false,
        browserslistConfigFile: false,
      });

      const output: CompileOutput = {
        code: (transformedCode?.code as string) || '',
      };

      if (transformedCode?.map) {
        output.map = JSON.stringify(transformedCode.map);
      }
      return output;
    };

    api.useCompiler(transform);
  }
}

module.exports = PluginBabel;
export default PluginBabel;
