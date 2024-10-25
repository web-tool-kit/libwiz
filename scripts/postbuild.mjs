#!/usr/bin/env node
import url from 'node:url';
import path from 'node:path';
import fse from 'fs-extra';
import generateSchema from './generate-schema.mjs';

async function postbuild() {
  const currentDirectory = url.fileURLToPath(new URL('.', import.meta.url));
  const sourcePath = path.resolve(currentDirectory, '../');
  const distPath = path.resolve(sourcePath, 'dist');

  const packageJson = fse.readJsonSync(
    path.resolve(sourcePath, 'package.json'),
  );

  delete packageJson['lint-staged'];
  delete packageJson['private'];

  const { scripts, devDependencies, ...restPackageData } = packageJson;

  restPackageData.name = 'libwiz';
  restPackageData.main = './index.js';
  restPackageData.types = './index.d.js';
  Object.keys(restPackageData.bin).forEach(key => {
    restPackageData.bin[key] = restPackageData.bin[key].replace(
      /\.\/dist\//,
      './',
    );
  });

  await fse.writeFile(
    path.resolve(distPath, 'package.json'),
    JSON.stringify(restPackageData, null, 2),
    'utf8',
  );

  const readmeFile = path.resolve(sourcePath, 'README.md');
  if (fse.existsSync(readmeFile)) {
    fse.copyFileSync(readmeFile, path.resolve(distPath, 'README.md'));
  }

  await generateSchema(distPath);
}

postbuild();
