#!/usr/bin/env node
import '@/typescript';
import { initCli } from '../utils/common';
import { initConfig } from '../config';
import { parseArgs } from './parser';

(async function start() {
  const { cliProps, task } = parseArgs();
  const shouldClearScreen = process.env.LIBWIZ_ENABLE_PROGRESS === 'true';
  initCli(Boolean(shouldClearScreen || cliProps.watch));

  await initConfig(cliProps);
  const { default: cli } = require('./cli');
  cli(cliProps, task);
})();
