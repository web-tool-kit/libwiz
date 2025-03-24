import path from 'node:path';
import fse from 'fs-extra';
import clone from 'clone-deep';
import api from '../api';
import { log, mergeDeep, isPlainObject, doOrDie } from '../utils';
import {
  getTSConfigPath,
  getRootConfig,
  setupAndRegisterBuildApi,
} from './utils';
import { validateConfigSchema } from './schema';
import type { Config, InternalConfig } from '../types';

const defaultConfig: InternalConfig = {
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

export function initConfig(localConfig?: Config): InternalConfig {
  const root = path.resolve(localConfig.root || process.cwd());

  if (localConfig) {
    validateConfigSchema(localConfig);
  }

  const config = clone(defaultConfig);
  config.verbose = Boolean(process.env.LIBWIZ_VERBOSE);

  // merge localConfig with config
  mergeDeep(config, localConfig);

  doOrDie(() => {
    if (!fse.pathExistsSync(root)) {
      log.error('provided root path does not exist');
      process.exit(1);
    }

    // get root config and if exist then merge with config
    const rootConfig = getRootConfig(root);
    if (rootConfig) {
      validateConfigSchema(rootConfig);
      mergeDeep(config, rootConfig);
    }

    // Handle workspace path
    if (config.workspace) {
      config.workspace = path.resolve(root, config.workspace);
      if (!fse.pathExistsSync(config.workspace)) {
        log.error('provided workspace path does not exist');
        process.exit(1);
      }
    } else {
      config.workspace = root;
    }

    // Handle tsconfig path
    if (config.tsConfig) {
      config.tsConfig = path.resolve(root, config.tsConfig);
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
      if (config.extensions.length === 0) {
        log.error(
          "extensions can't be empty Array either remove of pass with value",
        );
        process.exit(1);
      }
    } else if (config.tsConfig) {
      config.extensions = ['.ts', '.tsx'];
    } else {
      config.extensions = ['.js', '.jsx'];
    }

    // Handle ignore
    if (!config.ignore) {
      config.ignore = [
        '**/*.test.js',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.d.ts',
      ];
    }
  });

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

  api.setConfig(updatedConfig);
  return updatedConfig as Config;
}
