import type { Config as SwcConfig } from '@swc/types';

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

export type Bundles = 'esm' | 'cjs';

export interface TranspileOptions {
  bundle: Bundles;
  sourceMaps: boolean;
  comments: boolean;
}

export interface TranspileOutput {
  code: string;
  map?: string;
}

export interface PluginApi {
  isDev: boolean;
  isProd: boolean;
  getConfig: () => Config;
  modifyConfig: (newConfig: Config) => Config;
}

export type LibwizPlugin = {
  name?: string;
  setup: (api: PluginApi) => void | Promise<void>;
};

export interface ModuleConfig {
  output?: {
    comments?: boolean;
    sourceMap?: boolean;
  };
}

export interface LibConfig {
  esm?: ModuleConfig;
  cjs?: ModuleConfig;
}

export type CustomTranspiler = (
  code: string,
  option: TranspileOptions,
) => Promise<TranspileOutput | void>;

export type Config = Partial<{
  verbose: boolean;
  mode: 'development' | 'production';
  root: string;
  srcPath: string;
  buildPath: string;
  workspace: string;
  tsConfig: string;
  extensions: string[];
  ignore: string[];
  lib: LibConfig;
  target: Bundles | Bundles[];
  assets: string | string[] | null;
  customTranspiler: CustomTranspiler;
  plugins: LibwizPlugin[];
  tools: Partial<{
    swc: SwcConfig;
  }>;
}>;

export interface InternalConfig extends Config {
  // this will use to set internal transpile
  __transpiler?: (
    code: string,
    option: TranspileOptions,
  ) => Promise<TranspileOutput | void>;
}
