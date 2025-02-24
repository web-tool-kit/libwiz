import type { Bundles } from '../config';
import type { Config } from '../config';

export type { Bundles, ModuleConfig, LibConfig } from '../config';
export type { Config };
export interface CliProps {
  build: boolean;
  types: boolean;
  watch: boolean;
  sourceMaps: boolean;
  srcDir: string;
  outDir: string;
  bundle: string;
  verbose: boolean;
  target: Bundles;
}

export interface TranspileOptions {
  bundle: Bundles;
  sourceMaps: boolean;
  comments: boolean;
}

export interface TranspileOutput {
  code: string;
  map?: string;
}

export interface InternalConfig extends Config {}

export interface PluginApi {
  isDev: boolean;
  isProd: boolean;
  getConfig: () => Config;
  modifyConfig: (newConfig: Config) => Config;
}

export type LibwizPluginBase = {
  name?: string;
  setup: (api: PluginApi) => void | Promise<void>;
};

export type LibwizPlugin = LibwizPluginBase;
