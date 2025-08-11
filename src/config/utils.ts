import path from 'node:path';
import fse from 'fs-extra';
import pc from '@/utils/picocolors';
import type { Config } from '@/types';

export const PACKAGE_NAME = 'libwiz';

export function getTSConfigPath({
  root,
  workspace,
}: {
  root: NonNullable<Config['root']>;
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

export async function loadConfig(root: string): Promise<Config> {
  const configPath = getConfigPath(root);
  if (!configPath) return {};
  if (configPath.endsWith('.js')) {
    const configModule = await import(configPath);
    return (configModule?.default || configModule) as Config;
  }
  return JSON.parse(
    await fse.readFile(configPath, { encoding: 'utf8' }),
  ) as Config;
}

const boldYellow = (str: string) => pc.bold(pc.yellow(str));
export const expectedTypeError = function (
  value: unknown,
  type: string,
  got?: string,
) {
  return `expected type ${type} but got '${boldYellow(got || typeof value)}'`;
};

export function invalidTypeError(
  key: string,
  value: unknown,
  type: string | string[],
  got?: string,
) {
  const typ =
    typeof type === 'string'
      ? boldYellow(type)
      : type.map(t => boldYellow(t)).join(' or ');
  return `Invalid ${boldYellow(key)} passed, ${expectedTypeError(value, typ, got)}`;
}

export function invalidValueTypeError(
  key: string,
  value: unknown,
  type: string,
  got?: string,
) {
  return `Invalid ${boldYellow(key)} value found -> '${boldYellow(value as string)}', ${expectedTypeError(value, type, got)}`;
}

export async function getBrowserslistConfig(
  root: string,
): Promise<string | string[]> {
  if (await fse.pathExists(path.resolve(root, 'package.json'))) {
    const pkg = await fse.readJSON(path.resolve(root, 'package.json'));
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
