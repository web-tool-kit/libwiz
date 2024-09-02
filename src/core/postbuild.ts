#!/usr/bin/env node
import path from 'node:path';
import fse from 'fs-extra';
import glob from 'fast-glob';
import pc from 'picocolors';
import { getConfig } from '../config';

const { root } = getConfig();

const buildPath = path.join(root, './dist');
const srcPath = path.join(root, './src');

async function includeFileInBuild(file: string) {
  const sourcePath = path.resolve(root, file);
  if (fse.existsSync(sourcePath)) {
    const targetPath = path.resolve(buildPath, path.basename(file));
    await fse.copy(sourcePath, targetPath);
    console.log(`Copied ${sourcePath} to ${targetPath}`);
  }
}

/**
 * used to create tree-shakeable package.json in each module of project
 * @param {object} param0
 * @param {string} param0.from
 * @param {string} param0.to
 */
async function createModulePackages({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const packageData = JSON.parse(
    await fse.readFile(path.resolve(root, './package.json'), 'utf8'),
  );

  const directoryPackages = glob
    .sync('*/index.{js,ts,tsx}', { cwd: from })
    .map(path.dirname);

  await Promise.all(
    directoryPackages.map(async directoryPackage => {
      const packageJsonPath = path.join(to, directoryPackage, 'package.json');
      const topLevelPathImportsAreCommonJSModules = await fse.pathExists(
        path.resolve(path.dirname(packageJsonPath), '../esm'),
      );

      const packageJson: Record<string, any> = {
        version: packageData.version,
        sideEffects: false,
        module: topLevelPathImportsAreCommonJSModules
          ? path.posix.join('../esm', directoryPackage, 'index.js')
          : './index.js',
        main: topLevelPathImportsAreCommonJSModules
          ? './index.js'
          : path.posix.join('../cjs', directoryPackage, 'index.js'),
        types: './index.d.ts',
      };

      const [moduleEntryExists, mainEntryExists, typingsEntryExist] =
        await Promise.all([
          fse.pathExists(
            path.resolve(path.dirname(packageJsonPath), packageJson.module),
          ),
          fse.pathExists(
            path.resolve(path.dirname(packageJsonPath), packageJson.main),
          ),
          fse.pathExists(
            path.resolve(path.dirname(packageJsonPath), packageJson.types),
          ),
        ]);

      if (!moduleEntryExists) {
        delete packageJson.module;
      }
      if (!mainEntryExists) {
        delete packageJson.main;
      }
      if (!typingsEntryExist) {
        delete packageJson.types;
      }
      await fse.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2),
      );
      return packageJsonPath;
    }),
  );
}

/**
 * Function ensure build dir exist
 */
async function ensureBuildDirExists() {
  if (!fse.existsSync(buildPath)) {
    fse.mkdirSync(buildPath, { recursive: true });
  }
}

/**
 * Copy type definition if exist in module files
 * @param {object} param
 * @param {string} param.from
 * @param {string} param.to
 */
async function typescriptCopy({ from, to }: { from: string; to: string }) {
  if (!(await fse.pathExists(to))) {
    console.log(pc.yellow(`typescriptCopy: path ${to} does not exists`));
    return [];
  }
  const files = await glob('**/*.d.ts', { cwd: from });
  return Promise.all(
    files.map(file =>
      fse.copy(path.resolve(from, file), path.resolve(to, file)),
    ),
  );
}

/**
 * Copy required files of module in there folder
 * @param {object} param
 * @param {string} param.from
 * @param {string} param.to
 */
async function copyRequiredFiles({ from, to }: { from: string; to: string }) {
  if (!(await fse.pathExists(to))) {
    console.log(pc.yellow(`CopyRequired: path ${to} does not exists`));
    return [];
  }
  const hasCJS = await fse.pathExists(`${to}/cjs`);
  const hasESM = await fse.pathExists(`${to}/esm`);
  const files = await glob(`**/*.{png,jpg,jpeg,gif,svg,css,json}`, {
    cwd: from,
    dot: true,
  });
  const task: Promise<void>[] = [];
  files.forEach(file => {
    if (hasCJS) {
      task.push(
        fse.copy(path.resolve(from, file), path.resolve(`${to}/cjs`, file)),
      );
    }
    if (hasESM) {
      task.push(
        fse.copy(path.resolve(from, file), path.resolve(`${to}/esm`, file)),
      );
    }
    task.push(fse.copy(path.resolve(from, file), path.resolve(to, file)));
  });
  return Promise.all(task);
}

async function createPackageFile() {
  const {
    scripts,
    devDependencies,
    workspaces,
    publishConfig,
    ...restPackageData
  } = JSON.parse(
    await fse.readFile(path.resolve(root, './package.json'), 'utf8'),
  );

  const newPackageData = {
    ...restPackageData,
    private: false,
    main: fse.existsSync(path.resolve(buildPath, './cjs/index.js'))
      ? './cjs/index.js'
      : './index.js',
    module: fse.existsSync(path.resolve(buildPath, './esm/index.js'))
      ? './esm/index.js'
      : './index.js',
  };

  const [moduleEntryExists, mainEntryExists] = [
    fse.pathExistsSync(path.resolve(buildPath, newPackageData.module)),
    fse.pathExistsSync(path.resolve(buildPath, newPackageData.main)),
  ];

  if (!moduleEntryExists) {
    delete newPackageData.module;
  }
  if (!mainEntryExists) {
    delete newPackageData.main;
  }

  const hasDefinitionsFile = await fse.pathExists(
    path.resolve(buildPath, './index.d.ts'),
  );

  if (hasDefinitionsFile) {
    newPackageData.types = './index.d.ts';
  }
  await fse.writeFile(
    path.resolve(buildPath, './package.json'),
    JSON.stringify(newPackageData, null, 2),
    'utf8',
  );
}

async function postbuild() {
  try {
    ensureBuildDirExists();
    await typescriptCopy({ from: srcPath, to: buildPath });
    await copyRequiredFiles({ from: srcPath, to: buildPath });
    await createModulePackages({ from: srcPath, to: buildPath });
    await createPackageFile();
    await Promise.all(['./README.md'].map(file => includeFileInBuild(file)));
  } catch (err) {
    console.log(pc.red(err));
    process.exit(1);
  }
}

export default postbuild;
