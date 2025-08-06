import path from 'node:path';
import fse from 'fs-extra';
import { log, mergeDeep } from '@/utils';
import {
  getTSConfigPath,
  loadConfig,
  invalidTypeError,
  invalidValueTypeError,
  getBrowserslistConfig,
} from './utils';
import { validateConfigSchema } from './schema';
import store from './store';
import type { Config, CliProps, NotPartial } from '../types';

/**
 * Get the initial config from the cli props
 */
function getInitialConfig(cliProps?: CliProps) {
  if (!cliProps) return;
  return {
    srcPath: cliProps.srcDir,
    buildPath: cliProps.outDir,
    target: cliProps.target,
    lib: {
      esm: {
        output: {
          path: './',
          comments: true,
          sourceMap: Boolean(cliProps.sourceMaps),
        },
      },
      cjs: {
        output: {
          path: './cjs',
          comments: true,
          sourceMap: Boolean(cliProps.sourceMaps),
        },
      },
    },
  };
}

export async function initConfig(cliProps?: CliProps): Promise<Config> {
  // if config is already initialized, return it
  if (store.hasConfig()) {
    return store.config() as Config;
  }

  const initialConfig = getInitialConfig(cliProps);
  const root = process.cwd();

  if (initialConfig) {
    validateConfigSchema(initialConfig);
  }

  const config: Config = {
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
    compiler: {
      plugins: [],
      presets: [],
      browsers: await getBrowserslistConfig(root),
    },
  };

  // merge initialConfig with config
  mergeDeep(config, initialConfig as Config);

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

    // handle libwiz config and merge that into main config
    const rootConfig = (await loadConfig(root)) || {};
    if (rootConfig) {
      validateConfigSchema(rootConfig);
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

  // resolve output paths w.r.t buildPath with defaults
  config.lib.esm.output.path = path.resolve(
    config.buildPath,
    config.lib.esm.output.path,
  );
  config.lib.cjs.output.path = path.resolve(
    config.buildPath,
    config.lib.cjs.output.path,
  );

  store.setConfig(config);
  return config as Config;
}

export const getConfig = () => {
  return store.config() as NotPartial<Config>;
};

export default getConfig;
