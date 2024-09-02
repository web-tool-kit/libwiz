import resolveFrom from 'resolve-from';

export function magicImport<T = any>(moduleId: string): T {
  const fromProject = resolveFrom.silent(process.cwd(), moduleId);
  if (fromProject) {
    return require(fromProject) as T;
  }
  return require(moduleId) as T;
}
