import clone from 'clone-deep';
import { mergeDeep } from '../utils';
import type { Config } from '../types';
import { initConfig } from '../config';

function initCli() {
  if (!process.stdout.isTTY) return;
  process.stdout.write('\u001B[?25l');

  function restoreCursor() {
    process.stdout.write('\u001B[?25h');
    process.exit(0);
  }

  ['SIGINT', 'SIGTERM', 'exit'].map(event => {
    process.on(event, restoreCursor);
  });
}

class CreateApi {
  private static instance: CreateApi;
  private config: Config;

  private constructor() {
    this.config = {};
  }

  static getInstance(): CreateApi {
    if (!CreateApi.instance) {
      CreateApi.instance = new CreateApi();
    }
    return CreateApi.instance;
  }

  init(config: Config) {
    initCli();
    initConfig(config);
  }

  hasConfig() {
    return Boolean(Object.keys(this.config).length);
  }

  setConfig(newConfig: Config): Config {
    this.config = mergeDeep(this.config, newConfig);
    return this.config;
  }

  getConfig(): Config {
    return clone(this.config);
  }
}

export default CreateApi.getInstance();
