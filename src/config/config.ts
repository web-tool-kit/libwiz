import path from 'node:path';
import fse from 'fs-extra';
import { isPlainObject, isBoolean, log, mergeDeep } from '@/utils';
import {
  getTSConfigPath,
  loadConfig,
  invalidTypeError,
  invalidValueTypeError,
  getBrowserslistConfig,
} from './utils';
import type { Config, CliOptions, NotPartial, NormalizedConfig } from '@/types';
import { validateConfigSchema } from './schema';
import store from './store';

/**
 * Get the initial config from the cli props
 */
function getInitialConfig(cliOptions?: CliOptions): NormalizedConfig {
  const initialConfig: NormalizedConfig = {
    srcPath: './src',
    output: {
      dir: './dist',
      target: ['esm', 'cjs'],
      comments: false,
      sourceMap: false,
    },
    lib: {
      esm: {
        output: {
          path: './',
        },
      },
      cjs: {
        output: {
          path: './cjs',
        },
      },
    },
    ignore: [
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.d.ts',
    ],
  };

  if (cliOptions) {
    if (cliOptions.srcDir) {
      initialConfig.srcPath = cliOptions.srcDir;
    }

    if (cliOptions.outDir) {
      initialConfig.output.dir = cliOptions.outDir;
    }

    if (cliOptions.target) {
      initialConfig.output.target = cliOptions.target;
    }

    if (cliOptions.sourceMaps) {
      const sourceMaps = Boolean(cliOptions.sourceMaps);
      initialConfig.output.sourceMap = sourceMaps;
      if (initialConfig.lib?.esm?.output) {
        initialConfig.lib.esm.output.sourceMap = sourceMaps;
      }
      if (initialConfig.lib?.cjs?.output) {
        initialConfig.lib.cjs.output.sourceMap = sourceMaps;
      }
    }
  }

  return initialConfig;
}

function normalizeConfig(config: Config): NormalizedConfig {
  if (typeof config.output === 'string') {
    config.output = { dir: config.output };
  }
  return config as NormalizedConfig;
}

function normalizeLibConfig(config: NormalizedConfig) {
  const outputSourceMap = Boolean(config.output.sourceMap);
  const outputComments = Boolean(config.output.comments);
  if (isPlainObject(config.lib)) {
    if (isPlainObject(config.lib?.esm) && config.lib?.esm?.output) {
      if (!isBoolean(config.lib.esm.output.sourceMap)) {
        config.lib.esm.output.sourceMap = outputSourceMap;
      }
      if (!isBoolean(config.lib.esm.output.comments)) {
        config.lib.esm.output.comments = outputComments;
      }
    }

    if (isPlainObject(config.lib?.cjs) && config.lib?.cjs?.output) {
      if (!isBoolean(config.lib.cjs.output.sourceMap)) {
        config.lib.cjs.output.sourceMap = outputSourceMap;
      }
      if (!isBoolean(config.lib.cjs.output.comments)) {
        config.lib.cjs.output.comments = outputComments;
      }
    }
  }
}

export async function initConfig(
  cliOptions?: CliOptions,
): Promise<NormalizedConfig> {
  // if config is already initialized, return it
  if (store.hasConfig()) {
    return store.config() as NormalizedConfig;
  }

  const initialConfig = getInitialConfig(cliOptions);
  validateConfigSchema(initialConfig);

  const root = process.cwd();

  const config = {
    ...initialConfig,
    customTranspiler: null,
    compiler: {
      plugins: [],
      presets: [],
      browsers: await getBrowserslistConfig(root),
    },
  } as NormalizedConfig;

  // merge initialConfig with config
  if (initialConfig) {
    normalizeConfig(initialConfig);
    mergeDeep(config, initialConfig);
  }

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
      normalizeConfig(rootConfig);
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

    // handle extensions
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

    if (typeof config.output === 'object' && config.output.target) {
      const target = config.output.target;
      if (typeof target !== 'string') {
        if (!Array.isArray(target)) {
          invalidTypeError('output.target', target, ['Array', 'String']);
        }

        for (let i = 0; i < target.length; i++) {
          if (typeof target[i] !== 'string') {
            invalidValueTypeError('output.target', target[i], 'string');
          }
        }
      }
    }
  } catch (err) {
    log.error(err instanceof Error ? err.message : String(err));
    console.error(err);
    process.exit(1);
  }

  config.root = root;

  if (config.srcPath) {
    config.srcPath = path.resolve(root, config.srcPath);
  } else {
    config.srcPath = path.resolve(root, './src');
  }

  if (config.output.dir) {
    config.output.dir = path.resolve(root, config.output.dir);
  } else {
    config.output.dir = path.resolve(root, './dist');
  }

  // resolve output paths w.r.t output path with defaults
  if (config.lib?.esm?.output?.path) {
    config.lib.esm.output.path = path.resolve(
      config.output.dir,
      config.lib.esm.output.path,
    );
  }
  if (config.lib?.cjs?.output?.path) {
    config.lib.cjs.output.path = path.resolve(
      config.output.dir,
      config.lib.cjs.output.path,
    );
  }

  normalizeLibConfig(config);

  store.setConfig(config);
  return config as NormalizedConfig;
}

export const getConfig = () => {
  return store.config() as NotPartial<NormalizedConfig>;
};

export default getConfig;
