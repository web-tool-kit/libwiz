#!/usr/bin/env node
import url from 'node:url';
import path from 'node:path';
import fse from 'fs-extra';
import glob from 'fast-glob';

const currentDirectory = url.fileURLToPath(new URL('.', import.meta.url));
function resolve(...paths) {
  return path.resolve(currentDirectory, '../', ...paths);
}
const distPath = resolve('dist');

// omit keys from object
function omit(obj, keys) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key)),
  );
}

async function postBuild() {
  // remove tsbuildinfo files from project
  const tsbuildinfoFiles = await glob('**/*.tsbuildinfo');
  tsbuildinfoFiles.forEach(file => fse.unlinkSync(path.resolve(file)));

  const packageJson = fse.readJsonSync(resolve('package.json'));

  const restPackageData = omit(packageJson, [
    'private',
    'scripts',
    'lint-staged',
    'devDependencies',
  ]);

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
    registry: 'https://registry.npmjs.org/',
  };

  await fse.writeFile(
    path.resolve(distPath, 'package.json'),
    JSON.stringify(restPackageData, null, 2),
    'utf8',
  );

  ['README.md', 'LICENSE'].forEach(file => {
    const filePath = resolve(file);
    if (fse.existsSync(filePath)) {
      fse.copyFileSync(filePath, path.resolve(distPath, file));
    }
  });
}

postBuild();
