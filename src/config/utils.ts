import path from 'node:path';
import fse from 'fs-extra';
import { log } from '../utils';
import type { Config } from '../types';

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

export function getBrowserslistConfig(root: string): string | string[] {
  if (fse.existsSync(path.resolve(root, 'package.json'))) {
    const pkg = fse.readJSONSync(path.resolve(root, 'package.json'));
    if (pkg.browserslist) {
      return pkg.browserslist;
    }
  }
  return [
    'last 2 Chrome versions',
    'last 2 Firefox versions',
    'last 2 Safari versions',
    'last 2 iOS versions',
    'last 1 Android version',
    'last 1 ChromeAndroid version',
    'ie 11',
  ];
}
