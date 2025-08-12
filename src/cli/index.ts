#!/usr/bin/env node
import '@/typescript';
import pc from '@/utils/picocolors';
import { initCli } from '@/utils/common';
import { initConfig } from '@/config';
import { parseArgs } from './parser';

// suppress browserslist warning
process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1';

function printPackageIntro(version: string) {
  console.log(
    pc.bold(`${pc.bold(pc.cyan('   Libwiz'))} ${pc.green(`v${version}`)}\n`),
  );
}

(async function start() {
  const { cliOptions, task, version } = parseArgs();
  printPackageIntro(version);

  const shouldClearScreen = process.env.LIBWIZ_ENABLE_PROGRESS === 'true';
  initCli(Boolean(shouldClearScreen || task === 'dev'));

  await initConfig(cliOptions);
  const { default: cli } = require('./cli');
  cli(cliOptions, task);
})();
