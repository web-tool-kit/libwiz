import path from 'node:path';
import fse from 'fs-extra';
import { log } from '../utils';
import {
  getTSConfigPath,
  getConfigPath,
  invalidTypeError,
  invalidValueTypeError,
} from './utils';
import { validateConfigSchema } from './schema';
import store from './store';
import type { Config } from '../types';

export function initConfig(localConfig?: Config): Config {
  const root = process.cwd();

  if (localConfig) {
    validateConfigSchema(localConfig);
  }

  const config: Config = {
    debug: Boolean(process.env.DEBUG_MODE),
    ignore: [
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.d.ts',
    ],
    lib: {
      esm: {
        output: {
          comments: false,
          sourceMap: false,
        },
      },
      cjs: {
        output: {
          comments: false,
          sourceMap: false,
        },
      },
    },
    ...localConfig,
    babel: {
      runtime: true,
      react: {
        runtime: 'automatic',
        ...localConfig?.babel?.react,
      },
      ...localConfig?.babel,
    },
  };

  try {
    // handle root path
    if (config.root) {
      if (typeof config.root !== 'string') {
        invalidTypeError('root', config.root, 'string');
      }
      const rootPath = path.resolve(config.root);
      if (!fse.pathExistsSync(config.root)) {
        log.error('provided root path does not exist');
        process.exit(1);
      }
      config.root = rootPath;
    } else {
      config.root = root;
    }

    const configPath = getConfigPath(root);

    // handle libwiz config and merge that into main config
    if (configPath) {
      let rootConfig: Config = {};
      if (configPath.endsWith('.js')) {
        rootConfig = (require(configPath) || {}) as Config;
      } else {
        rootConfig = JSON.parse(
          fse.readFileSync(configPath, { encoding: 'utf8' }),
        ) as Config;
      }
      rootConfig = validateConfigSchema(rootConfig);

      if (rootConfig.lib) {
        if (!config.lib) {
          config.lib = {};
        }
        if (rootConfig.lib.esm) {
          if (config.lib.esm) {
            config.lib.esm = {
              ...config.lib.esm,
              output: {
                ...config.lib.esm.output,
                ...rootConfig.lib.esm.output,
              },
            };
          } else {
            config.lib.esm = rootConfig.lib.esm;
          }
        }

        if (rootConfig.lib.cjs) {
          if (config.lib.cjs) {
            config.lib.cjs = {
              ...config.lib.cjs,
              output: {
                ...config.lib.cjs.output,
                ...rootConfig.lib.cjs.output,
              },
            };
          } else {
            config.lib.cjs = rootConfig.lib.cjs;
          }
        }
        // delete lib from root config as its already added in config
        // above keeping this can overwrite above resolved config
        delete rootConfig.lib;
      }

      rootConfig = { ...rootConfig, ...config };
      for (let key in rootConfig) {
        config[key] = rootConfig[key];
      }
    }

    // Handle workspace path
    if (config.workspace) {
      if (typeof config.workspace !== 'string') {
        invalidTypeError('workspace', config.workspace, 'string');
      }

      const workspacePath = path.resolve(root, config.workspace);
      config.workspace = workspacePath;

      if (!fse.pathExistsSync(workspacePath)) {
        log.error('provided workspace path does not exist');
        process.exit(1);
      }
    } else {
      config.workspace = root;
    }

    // Handle tsconfig path
    if (config.tsConfig) {
      if (typeof config.tsConfig !== 'string') {
        invalidTypeError('tsConfig', config.tsConfig, 'string');
      }

      const tsConfigPath = path.resolve(process.cwd(), config.tsConfig);
      config.tsConfig = tsConfigPath;

      if (!fse.pathExistsSync(config.tsConfig)) {
        log.error('provided tsConfig path does not exist');
        process.exit(1);
      }
    } else {
      config.tsConfig = getTSConfigPath({
        workspace: config.workspace,
        root,
      });
    }

    // Handle extensions
    if (config.extensions) {
      if (!Array.isArray(config.extensions)) {
        invalidTypeError('extensions', config.extensions, 'string');
      }

      if (config.extensions.length === 0) {
        log.error(
          "extensions can't be empty Array either remove of pass with value",
        );
        process.exit(1);
      }

      for (let i = 0; i < config.extensions.length; i++) {
        if (typeof config.extensions[i] !== 'string') {
          invalidValueTypeError('extensions', config.extensions[i], 'string');
        }
      }
    } else if (config.tsConfig) {
      config.extensions = ['.ts', '.tsx'];
    } else {
      config.extensions = ['.js', '.jsx'];
    }

    // Handle ignore
    if (config.ignore) {
      if (!Array.isArray(config.ignore)) {
        invalidTypeError('ignore', config.ignore, 'Array');
      }

      for (let i = 0; i < config.ignore.length; i++) {
        if (typeof config.ignore[i] !== 'string') {
          invalidValueTypeError('ignore', config.ignore[i], 'string');
        }
      }
    } else {
      config.ignore = [
        '**/*.test.js',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.d.ts',
      ];
    }

    if (config.target) {
      if (typeof config.target !== 'string') {
        if (!Array.isArray(config.target)) {
          invalidTypeError('target', config.target, ['Array', 'String']);
        }

        for (let i = 0; i < config.target.length; i++) {
          if (typeof config.target[i] !== 'string') {
            invalidValueTypeError('target', config.target[i], 'string');
          }
        }
      }
    }
  } catch (err) {
    log.error(err.toString());
    console.error(err);
    process.exit(1);
  }

  config.root = root;
  store.setConfig(config);
  return config as Config;
}

export const getConfig = (localConfig?: Config) => {
  if (!store.hasConfig()) {
    initConfig(localConfig);
  }
  return store.config();
};

export default getConfig;
