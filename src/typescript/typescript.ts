export type TS = typeof import('typescript');

let tsModule: TS | null = null;

export function initTypescript() {
  if (tsModule) return tsModule;
  try {
    tsModule = require('typescript');
  } catch {}
  return tsModule;
}

export function notifyTypescriptNotInstalled(
  log: (msg: string) => void = console.error,
) {
  log(
    'Missing dependency: TypeScript\n\n' +
      'Install TypeScript to run type generation:\n\n' +
      '  npm install --save-dev typescript\n' +
      '  yarn add --dev typescript\n' +
      '  pnpm add -D typescript',
  );
}

export function hasTypescript() {
  if (tsModule) return true;
  try {
    initTypescript();
    return tsModule !== null;
  } catch {
    return false;
  }
}

export function getTypescript() {
  hasTypescript();
  return tsModule;
}

export default getTypescript;
