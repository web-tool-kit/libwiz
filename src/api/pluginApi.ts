import clone from 'clone-deep';
import api from './api';
import { doOrDie } from '../utils';
import type {
  PluginApi as PluginApiInterface,
  Config,
  InternalConfig,
  Compiler,
} from '../types';

class PluginApi implements PluginApiInterface {
  get isDev() {
    return api.config.mode === 'development';
  }

  get isProd() {
    return api.config.mode === 'production';
  }

  get config(): Config {
    const config = clone(api.config) as InternalConfig;
    delete config.__compiler;
    return config;
  }

  useCompiler(compiler: Compiler) {
    if (typeof compiler === 'function') {
      api.setConfig({ __compiler: compiler });
    }
  }

  updateConfig(newConfig: Config) {
    // no allow to add libwiz plugins from another plugin
    delete newConfig.plugins;
    api.setConfig(newConfig);
  }
}

export const registerPlugin = () => {
  const pluginApi = new PluginApi();
  const plugins = api.config.plugins;
  if (!plugins) return;

  const libwizPlugins = plugins.filter(plugin => {
    return (
      typeof plugin === 'object' &&
      Boolean(plugin.name?.startsWith('LIBWIZ_PLUGIN'))
    );
  });

  libwizPlugins.forEach(plugin => {
    doOrDie(() => {
      plugin.setup(pluginApi);
    });
  });
};

export default PluginApi;
