import type { Options as SwcOptions } from '@swc/types';
import { getConfig } from '../../config';
import type { TranspileOptions } from '../../types';

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
  const { tools } = getConfig();
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

  if (options.bundle === 'esm') {
    swcConfig.module.type = 'es6';
  }

  return swcConfig;
};

export default useSwcConfig;
