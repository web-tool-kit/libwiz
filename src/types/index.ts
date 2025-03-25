import type { Config as SwcConfig } from '@swc/types';

export interface CliProps {
  build: boolean;
  types: boolean;
  watch: boolean;
  sourceMaps: boolean | 'inline';
  srcDir: string;
  outDir: string;
  bundle: string;
  verbose: boolean;
  target: Bundles;
}

export type Bundles = 'esm' | 'cjs';

export interface CompileOptions {
  bundle: Bundles;
  sourceMaps: boolean | 'inline';
  comments: boolean;
}

export interface CompileOutput {
  code: string;
  map?: string;
}

export type Compiler = (
  sourceFile: string,
  options: CompileOptions,
) => Promise<CompileOutput>;

export interface PluginApi {
  isDev: boolean;
  isProd: boolean;
  config: Config;
  updateConfig: (newConfig: Config) => void;
  useCompiler: (compiler: Compiler) => void;
}

export type LibwizPlugin = {
  name?: string;
  setup: (api: PluginApi) => void | Promise<void>;
};

export interface ModuleConfig {
  output?: {
    comments?: boolean;
    sourceMap?: boolean | 'inline';
  };
}

export interface LibConfig {
  esm?: ModuleConfig;
  cjs?: ModuleConfig;
}

export type CustomTranspiler = (
  code: string,
  option: CompileOptions,
) => Promise<CompileOutput | void>;

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
  __compiler?: Compiler;
}
