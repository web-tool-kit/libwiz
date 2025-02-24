import type { Config as SwcConfig, ReactConfig } from '@swc/types';
import type { LibwizPlugin, PluginApi } from '../../types';
import { mergeDeep } from '../../utils';

class PluginReact implements LibwizPlugin {
  name: string;
  private reactConfig: ReactConfig;

  constructor(reactConfig: ReactConfig) {
    this.name = 'LIBWIZ_PLUGIN_REACT';
    this.reactConfig = reactConfig;
  }

  setup(api: PluginApi): void {
    const { isDev, isProd, modifyConfig, getConfig } = api;
    const config = getConfig();

    const __config: SwcConfig = {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        transform: {
          react: {
            development: isDev,
            runtime: 'automatic',
            ...this.reactConfig,
          },
        },
      },
    };

    if (isProd) {
      __config.jsc.minify = {
        keep_classnames: true,
        keep_fnames: true,
      };
    }

    modifyConfig({
      tools: {
        swc: mergeDeep<SwcConfig>(config.tools?.swc, __config),
      },
    });
  }
}

module.exports = PluginReact;
export default PluginReact;
