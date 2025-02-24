import path from 'node:path';
import fse from 'fs-extra';
import type { EnvConfig } from '@swc/types';
import { log, mergeDeep } from '../utils';
import type { Config, PluginApi, InternalConfig } from '../types';

export const PACKAGE_NAME = 'libwiz';

export function getTSConfigPath({
  root,
  workspace,
}: {
  root: Config['root'];
  workspace?: Config['workspace'];
}): string | undefined {
  const TsConfigFiles = ['tsconfig.build.json', 'tsconfig.json'];

  let TsConfigPath: string | undefined;
  for (let i = 0; i < TsConfigFiles.length; i++) {
    const file = path.resolve(root, TsConfigFiles[i]);
    if (fse.existsSync(file)) {
      TsConfigPath = file;
      break;
    }
  }

  if (!TsConfigPath && workspace && workspace !== root) {
    for (let i = 0; i < TsConfigFiles.length; i++) {
      const file = path.resolve(workspace, TsConfigFiles[i]);
      if (fse.existsSync(file)) {
        TsConfigPath = file;
        break;
      }
    }
  }

  return TsConfigPath;
}

export function getConfigPath(root: string): string | undefined {
  const configPaths = [
    path.resolve(root, `./${PACKAGE_NAME}.config.js`),
    path.resolve(root, `./${PACKAGE_NAME}.config.json`),
    path.resolve(root, `./.${PACKAGE_NAME}rc`),
  ];
  let configPath: string | undefined;
  for (let i = 0; i < configPaths.length; i++) {
    if (fse.existsSync(configPaths[i])) {
      configPath = configPaths[i];
      break;
    }
  }
  return configPath;
}

export const expectedTypeError = function (value: unknown, type: string) {
  return `expected type '${type}' but got '${typeof value}'`;
};

export function invalidTypeError(
  key: string,
  value: unknown,
  type: string | string[],
) {
  let typ = typeof type === 'string' ? type : type.join(' or ');
  log.error(`Invalid ${key} passed, ${expectedTypeError(value, typ)}`);
  process.exit(1);
}

export function invalidValueTypeError(
  key: string,
  value: unknown,
  type: string,
) {
  log.error(
    `Invalid ${key} value found -> '${value}', ${expectedTypeError(value, type)}`,
  );
  process.exit(1);
}

export function getBrowserslistConfig(root: string) {
  const browsersList = {} as Partial<
    Record<'env' | 'packageJSON' | 'path', EnvConfig['targets']>
  >;
  if (fse.existsSync(path.resolve(root, 'package.json'))) {
    const pkg = fse.readJSONSync(path.resolve(root, 'package.json'));
    if (pkg.browserslist) {
      browsersList.packageJSON = pkg.browserslist;
    }
  }
  const configPath = path.resolve(root, `./.browserslistrc`);
  if (fse.existsSync(configPath)) {
    browsersList.path = configPath;
  }
  browsersList.env = process.env.BROWSERSLIST;
  return browsersList;
}

export function setupAndRegisterBuildApi(config: InternalConfig) {
  const api: PluginApi = {
    getConfig: () => config,
    modifyConfig: (newConfig: Config) => mergeDeep(config, newConfig),
    isDev: config.mode === 'development',
    isProd: config.mode === 'production',
  };

  return () => {
    config.plugins?.filter(Boolean).forEach(plugin => {
      plugin.setup(api);
    });
    return config;
  };
}
