import fse from 'fs-extra';
import glob from 'fast-glob';
import { getTypescript } from '@/typescript';

export const getFormatHost = () => {
  const ts = getTypescript();
  return {
    getCanonicalFileName: (path: string) => path,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
  };
};

// prettier-ignore
const NON_ALLOWED_IMPORT_EXTENSIONS_FOR_DTS = [
  // images
  'css', 'svg', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'ico', 'bmp', 'tiff',
  // fonts
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  // media
  'mp4', 'mp3', 'wav', 'avi', 'mov', 'webm',
  // other files
  'pdf', 'zip', 'rar', 'tar', 'gz',
  'json', 'txt', 'md', 'yaml', 'yml', 'xml', 'csv'
];

function removeUnWantedImports(code: string) {
  const extensionPattern = NON_ALLOWED_IMPORT_EXTENSIONS_FOR_DTS.join('|');
  const importRegex = new RegExp(
    `import\\s+['"].+\\.(${extensionPattern})['"];?`,
    'gi',
  );
  return code.replace(importRegex, '').replace(/\n{2,}/g, '\n');
}

// remove imports for common asset files from .d.ts files
export async function postProcessDTS(distPath: string) {
  const declarationFiles = glob.sync('**/*.d.ts', {
    cwd: distPath,
    absolute: true,
  });

  await Promise.all(
    declarationFiles.map(async file => {
      const code = await fse.readFile(file, { encoding: 'utf8' });
      await fse.writeFile(file, removeUnWantedImports(code));
    }),
  );
}
