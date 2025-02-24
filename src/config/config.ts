import path from 'node:path';
import fse from 'fs-extra';
import { log, mergeDeep, isPlainObject } from '../utils';
import {
  getTSConfigPath,
  getConfigPath,
  invalidTypeError,
  invalidValueTypeError,
  getBrowserslistConfig,
  setupAndRegisterBuildApi,
} from './utils';
import { validateConfigSchema } from './schema';
import store from './store';
import type { Config, InternalConfig } from '../types';

export function initConfig(localConfig?: Config): InternalConfig {
  const root = process.cwd();

  if (localConfig) {
    validateConfigSchema(localConfig);
  }

  const config: InternalConfig = {
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
          comments: true,
          sourceMap: false,
        },
      },
      cjs: {
        output: {
          comments: true,
          sourceMap: false,
        },
      },
    },
    customTranspiler: null,
    plugins: [],
    tools: {},
  };

  // merge localConfig with config
  mergeDeep(config, localConfig);

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
      mergeDeep(config, rootConfig);
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

  if (config.srcPath) {
    config.srcPath = path.resolve(root, config.srcPath);
  } else {
    config.srcPath = path.resolve(root, './src');
  }

  if (config.buildPath) {
    config.buildPath = path.resolve(root, config.buildPath);
  } else {
    config.buildPath = path.resolve(root, './dist');
  }

  if (!config.mode) {
    if (process.env.NODE_ENV === 'development') {
      config.mode = 'development';
    } else if (process.env.NODE_ENV === 'production') {
      config.mode = 'production';
    }
  }

  // delete SWC env if empty and no target
  if (
    !config?.tools?.swc?.jsc?.target &&
    isPlainObject(config.tools?.swc?.env) &&
    Object.keys(config.tools.swc.env).length === 0
  ) {
    delete config.tools.swc.env;
  }

  if (config.tools?.swc?.env && config?.tools?.swc?.jsc?.target) {
    log.error('`env` and `jsc.target` cannot be used together');
    process.exit(1);
  }

  // this method used to register all api with plugins and
  // initialize all actions
  const setup = setupAndRegisterBuildApi(config);
  const updatedConfig = setup();

  store.setConfig(updatedConfig);
  return updatedConfig as Config;
}

export const getConfig = (localConfig?: Config) => {
  if (!store.hasConfig()) {
    initConfig(localConfig);
  }
  return store.config();
};

export default getConfig;
