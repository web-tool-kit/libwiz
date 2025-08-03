import resolveFrom from 'resolve-from';
import type { Config } from '@/types';

export function magicImport<T = any>(
  moduleId: string,
  options: Pick<Config, 'root' | 'workspace'> = {},
): T {
  const { root = process.cwd(), workspace } = options;
  const fromProject = resolveFrom.silent(root, moduleId);
  if (fromProject) {
    return require(fromProject) as T;
  } else if (workspace) {
    const fromWorkspace = resolveFrom.silent(root, moduleId);
    if (fromWorkspace) {
      return require(fromWorkspace) as T;
    }
  }
  return require(moduleId) as T;
}

export default magicImport;
