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
import type { Config } from './schema';

class ConfigCacheManager {
  private cacheConfig: Config = {};

  public config = () => structuredClone(this.cacheConfig);

  public hasConfig = () => {
    return Boolean(Object.keys(this.config).length);
  };

  public setConfig(config: Config): void {
    this.cacheConfig = config;
  }
}

const ccm = new ConfigCacheManager();

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
      let conf = {};
      if (configPath.endsWith('.js')) {
        conf = require(configPath) || {};
      } else {
        conf = JSON.parse(fse.readFileSync(configPath, { encoding: 'utf8' }));
      }
      let validConfig = validateConfigSchema(conf as Config);
      validConfig = { ...validConfig, ...config };

      if (validConfig.lib) {
        if (!config.lib) {
          config.lib = {};
        }
        if (validConfig.lib.esm) {
          if (config.lib.esm) {
            config.lib.esm = {
              ...config.lib.esm,
              output: {
                ...config.lib.esm.output,
                ...validConfig.lib.esm.output,
              },
            };
          } else {
            config.lib.esm = validConfig.lib.esm;
          }

          if (config.lib.cjs) {
            config.lib.cjs = {
              ...config.lib.cjs,
              output: {
                ...config.lib.cjs.output,
                ...validConfig.lib.cjs.output,
              },
            };
          } else {
            config.lib.cjs = validConfig.lib.cjs;
          }
        }
      }

      for (let key in validConfig) {
        config[key] = validConfig[key];
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

    // Handle ignore
    if (config.validBundles) {
      if (!Array.isArray(config.validBundles)) {
        invalidTypeError('validBundles', config.validBundles, 'Array');
      }

      if (config.validBundles.length === 0) {
        log.error(
          "validBundles can't be empty Array either remove of pass with value",
        );
        process.exit(1);
      }

      for (let i = 0; i < config.validBundles.length; i++) {
        if (typeof config.validBundles[i] !== 'string') {
          invalidValueTypeError(
            'validBundles',
            config.validBundles[i],
            'string',
          );
        }
      }
    } else {
      config.validBundles = ['modern', 'common'];
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

  ccm.setConfig(config);
  return config as Config;
}

export const getConfig = (localConfig?: Config) => {
  if (!ccm.hasConfig()) {
    initConfig(localConfig);
  }
  return ccm.config();
};

export default initConfig;
