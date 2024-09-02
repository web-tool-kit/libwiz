#!/usr/bin/env node
import url from 'node:url';
import path from 'node:path';
import fse from 'fs-extra';

async function postbuild() {
  const currentDirectory = url.fileURLToPath(new URL('.', import.meta.url));
  const sourcePath = path.resolve(currentDirectory, '../');
  const packageJson = fse.readJsonSync(
    path.resolve(sourcePath, 'package.json'),
  );
  const { scripts, devDependencies, ...restPackageData } = packageJson;

  restPackageData.main = './index.js';
  restPackageData.types = './index.d.js';
  Object.keys(restPackageData.bin).forEach(key => {
    restPackageData.bin[key] = restPackageData.bin[key].replace(
      /\.\/dist\//,
      './',
    );
  });

  await fse.writeFile(
    path.resolve(sourcePath, 'dist/package.json'),
    JSON.stringify(restPackageData, null, 2),
    'utf8',
  );

  const readmeFile = path.resolve(sourcePath, 'README.md');
  if (fse.existsSync(readmeFile)) {
    fse.copyFileSync(readmeFile, path.resolve(sourcePath, 'dist/README.md'));
  }
}

postbuild();
