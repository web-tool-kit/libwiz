#!/usr/bin/env node
import '@/typescript';
import { initCli } from '@/utils/common';
import { initConfig } from '@/config';
import { parseArgs } from './parser';

// suppress browserslist warning
process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1';

(async function start() {
  const { cliOptions, task } = parseArgs();
  const shouldClearScreen = process.env.LIBWIZ_ENABLE_PROGRESS === 'true';
  initCli(Boolean(shouldClearScreen || task === 'dev'));

  await initConfig(cliOptions);
  const { default: cli } = require('./cli');
  cli(cliOptions, task);
})();
