import type { Options as SwcOptions } from '@swc/types';
import type { TranspileOptions } from '../../types';
import { getConfig, getBrowserslistConfig } from '../../config';

const getDefaultSwcConfig = () => {
  const { mode } = getConfig();

  const swcConfig: SwcOptions = {
    jsc: {
      target: 'es2020',
      parser: {
        syntax: 'typescript',
        tsx: false,
      },
      minify: {
        format: {},
      },
    },
    configFile: false,
    swcrc: false,
    module: {
      type: 'commonjs',
    },
  };

  if (mode === 'production') {
    swcConfig.jsc.minify = {
      keep_classnames: true,
      keep_fnames: true,
    };
  }

  return swcConfig;
};

const useSwcConfig = (options: TranspileOptions) => {
  const { root, tools } = getConfig();
  const defaultConfig = getDefaultSwcConfig();
  const toolConfig = tools.swc || {};

  const swcConfig: SwcOptions = {
    ...defaultConfig,
    ...toolConfig,
    jsc: {
      ...defaultConfig.jsc,
      ...toolConfig.jsc,
      parser: {
        ...defaultConfig.jsc.parser,
        ...toolConfig.jsc?.parser,
      },
      minify: {
        ...defaultConfig.jsc.minify,
        ...toolConfig.jsc?.minify,
        format: {
          ...defaultConfig.jsc.minify.format,
          ...toolConfig.jsc?.minify?.format,
          comments: options.comments === false ? false : 'all',
        },
      },
    },
    sourceMaps: options.sourceMaps,
  };

  let hasBrowserList = false;
  if (!toolConfig.env && !toolConfig.jsc.target) {
    swcConfig.env ||= {};
    // handle browserlist config in case jsc target not handle by library
    const browsersListConfig = getBrowserslistConfig(root);
    console.log(browsersListConfig, 'browsersListConfig');

    if (browsersListConfig.env) {
      swcConfig.env.targets = browsersListConfig.env;
      hasBrowserList = true;
    } else if (browsersListConfig.path) {
      swcConfig.env.path = browsersListConfig.path;
      hasBrowserList = true;
    } else if (browsersListConfig.packageJSON) {
      swcConfig.env.targets = browsersListConfig.packageJSON;
      hasBrowserList = true;
    }
  }

  // in case env exist or browsersListConfig exist by library then target can't be used
  // as target and env both can not be used together in SWC
  if (toolConfig.env || hasBrowserList) {
    delete swcConfig.jsc.target;
  }

  if (options.bundle === 'esm') {
    swcConfig.module.type = 'es6';
  }

  return swcConfig;
};

export default useSwcConfig;
