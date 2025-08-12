import { globSync } from 'fast-glob';
import { getConfig } from '@/config';

export function getAllSourceFiles() {
  const { extensions, ignore, srcPath } = getConfig();
  // create proper glob pattern based on number of extensions
  let globPattern: string;
  if (extensions.length === 1) {
    // for single extension, use simple pattern
    globPattern = `**/*${extensions[0]}`;
  } else {
    // for multiple extensions, use brace expansion
    globPattern = `**/*{${extensions.join(',')}}`;
  }

  try {
    const hasDts = ignore.includes('**/*.d.ts');
    return globSync(globPattern, {
      cwd: srcPath,
      // ignore d.ts as its not needed to be transpiled
      ignore: [...ignore, !hasDts && '**/*.d.ts'].filter(Boolean) as string[],
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}
