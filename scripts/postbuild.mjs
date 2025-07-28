#!/usr/bin/env node
import url from 'node:url';
import path from 'node:path';
import fse from 'fs-extra';
import generateSchema from './generate-schema.mjs';

async function postBuild() {
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

  restPackageData.publishConfig = {
    access: 'public',
    provenance: true,
    registry: 'https://registry.npmjs.org/',
  };

  await fse.writeFile(
    path.resolve(distPath, 'package.json'),
    JSON.stringify(restPackageData, null, 2),
    'utf8',
  );

  ['README.md', 'LICENSE'].forEach(file => {
    const filePath = path.resolve(sourcePath, file);
    if (fse.existsSync(filePath)) {
      fse.copyFileSync(filePath, path.resolve(distPath, file));
    }
  });

  await generateSchema(distPath);
}

postBuild();
