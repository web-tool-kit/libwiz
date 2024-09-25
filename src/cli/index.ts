#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { initCli } from '../utils';
import { initConfig } from '../config';
import type { CliProps } from '../types';

function getPackageVersion() {
  try {
    const packageJsonPath = join(__dirname, './package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (e) {}
}

const version = getPackageVersion();

const argv = yargs(hideBin(process.argv))
  .help()
  .strict()

  // target will be used if you want to generate build for
  // specific case like commonjs (cjs) or modernjs (esm)
  .option('target', { type: 'string' })

  // output dir, default it will be dist it could be
  // build or something else based on need
  .option('out-dir', { default: './dist', type: 'string' })

  // this flag will required if we need to generate type
  // definition files *.d.ts
  .option('types', {
    default: false,
    describe: 'To generate types definitions',
    type: 'boolean',
  })

  .option('prebuild', {
    default: false,
    describe: 'To run prebuild steps',
    type: 'boolean',
  })

  .option('watch', {
    alias: 'w',
    type: 'boolean',
    default: false,
    description: 'Flag to run in watch mode',
  })

  .option('source-maps', {
    default: false,
    alias: 'sourceMaps',
    describe: 'To create source map of library',
    type: 'boolean',
  })

  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    default: false,
    description: 'Run with verbose logging',
  })
  .help()
  .strict()
  .version(version)
  .demandCommand(
    1,
    1,
    'Please specify the command: `build` or `dev` (eg: libwiz build)',
  )
  .parse();

const task = argv['_'][0];

if (task === 'build') {
  argv['build'] = true;
} else if (task === 'dev') {
  argv['watch'] = true;
} else {
  console.error(
    'Please specify the correct command: `build` or `dev` (eg: libwiz build)',
  );
  process.exit(1);
}

const cliProps = argv as unknown as CliProps;

initCli();
initConfig({
  debug: cliProps.verbose,
  lib: {
    esm: {
      output: {
        comments: false,
        sourceMap: Boolean(cliProps.sourceMaps),
      },
    },
    cjs: {
      output: {
        comments: false,
        sourceMap: Boolean(cliProps.sourceMaps),
      },
    },
  },
});

(function start() {
  const { default: cli } = require('./cli');
  cli(cliProps);
})();
