import path from 'node:path';
import fse from 'fs-extra';
import { isPlainObject, isBoolean, log, mergeDeep } from '@/utils';
import { getTSConfigPath, loadConfig, getBrowserslistConfig } from './utils';
import type { Config, CliOptions, NotPartial, NormalizedConfig } from '@/types';
import { validateConfigSchema, validateOutputTarget } from './schema';
import store from './store';

/**
 * Get the initial config from the cli props
 */
function getInitialConfig(cliOptions?: CliOptions) {
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
        output: {},
      },
      cjs: {
        output: {},
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

export async function initConfig(cliOptions?: CliOptions) {
  // if config is already initialized, return it
  if (store.hasConfig()) {
    return store.config() as NormalizedConfig;
  }

  const initialConfig = getInitialConfig(cliOptions);
  validateConfigSchema(initialConfig);

  const root = process.cwd();

  const config = {
    ...initialConfig,
    root: root,
    workspace: root,
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
    // handle libwiz config and merge that into main config
    const rootConfig = (await loadConfig(root)) || {};
    if (rootConfig) {
      validateOutputTarget(rootConfig as NormalizedConfig);
      validateConfigSchema(rootConfig);
      normalizeConfig(rootConfig);
      mergeDeep(config, rootConfig);
    }

    // handle root path
    if (config.root) {
      const rootPath = path.resolve(config.root);
      if (!fse.pathExistsSync(config.root)) {
        log.error('provided root path does not exist');
        process.exit(1);
      }
      config.root = rootPath;
    }

    // Handle workspace path
    if (config.workspace) {
      const workspacePath = path.resolve(root, config.workspace);
      config.workspace = workspacePath;

      if (!fse.pathExistsSync(workspacePath)) {
        log.error('provided workspace path does not exist');
        process.exit(1);
      }
    }

    // Handle tsconfig path
    if (config.tsConfig) {
      const tsConfigPath = path.resolve(config.root as string, config.tsConfig);
      config.tsConfig = tsConfigPath;

      if (!fse.pathExistsSync(config.tsConfig)) {
        log.error('provided tsConfig path does not exist');
        process.exit(1);
      }
    } else {
      config.tsConfig = getTSConfigPath({
        root: config.root as string,
        workspace: config.workspace,
      });
    }

    // handle extensions
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
  } catch (err) {
    log.error(err instanceof Error ? err.message : String(err));
    console.error(err);
    process.exit(1);
  }

  if (config.srcPath) {
    config.srcPath = path.isAbsolute(config.srcPath)
      ? config.srcPath
      : path.resolve(root, config.srcPath);
  } else {
    config.srcPath = path.resolve(root, './src');
  }

  if (config.output.dir) {
    config.output.dir = path.isAbsolute(config.output.dir)
      ? config.output.dir
      : path.resolve(root, config.output.dir);
  } else {
    config.output.dir = path.resolve(root, './dist');
  }

  if (!config.lib?.esm?.output) {
    config.lib.esm.output = {};
  }

  if (!config.lib?.cjs?.output) {
    config.lib.cjs.output = {};
  }

  if (config.lib.esm.output?.path) {
    if (path.isAbsolute(config.lib.esm.output.path)) {
      config.lib.esm.output.path = path.resolve(config.lib.esm.output.path);
    } else {
      config.lib.esm.output.path = path.resolve(
        config.output.dir,
        config.lib.esm.output.path,
      );
    }
  } else {
    // default esm output path dist/
    config.lib.esm.output.path = config.output.dir;
  }

  if (config.lib.cjs.output?.path) {
    if (path.isAbsolute(config.lib.cjs.output.path)) {
      config.lib.cjs.output.path = path.resolve(config.lib.cjs.output.path);
    } else {
      config.lib.cjs.output.path = path.resolve(
        config.output.dir,
        config.lib.cjs.output.path,
      );
    }
  } else {
    // default cjs output path dist/cjs
    config.lib.cjs.output.path = path.join(config.output.dir, 'cjs');
  }

  normalizeLibConfig(config);

  store.setConfig(config);
  return config as NormalizedConfig;
}

export const getConfig = () => {
  return store.config() as NotPartial<NormalizedConfig>;
};

export default getConfig;
