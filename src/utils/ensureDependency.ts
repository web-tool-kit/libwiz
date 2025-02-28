import { magicImportClient } from './common';
import type { Config } from '../types';

/**
 * Custom Error for Missing Dependencies
 */
export class MissingDependencyError extends Error {
  constructor(pkg: string) {
    super(
      `❌ Missing Dependency: ${pkg}\n` +
        `This library requires ${pkg}, but it was not found.\n\n` +
        `📌 Install it using:\n   ${getInstallCommand(pkg)}\n\n` +
        `💡 If you're using a monorepo, ensure it is installed in the correct workspace.\n`,
    );
    this.name = 'MissingDependencyError';
  }
}

/**
 * Determines the correct installation command based on the package manager.
 */
function getInstallCommand(pkg: string): string {
  const packageManager = detectPackageManager();
  const command = {
    npm: `npm install -D ${pkg}`,
    yarn: `yarn add -D ${pkg}`,
    pnpm: `pnpm add -D ${pkg}`,
  };
  return command[packageManager] || command.npm;
}

/**
 * Detects the user's package manager.
 */
function detectPackageManager(): 'npm' | 'yarn' | 'pnpm' {
  if (process.env.npm_execpath?.includes('yarn')) return 'yarn';
  if (process.env.npm_execpath?.includes('pnpm')) return 'pnpm';
  return 'npm'; // Default to npm
}

function ensureDependency<T = any>(
  pkg: string,
  options: Pick<Config, 'root' | 'workspace'> = {},
): T {
  const module = magicImportClient(pkg, options);
  if (module) return module;
  throw new MissingDependencyError(pkg);
}

export default ensureDependency;
