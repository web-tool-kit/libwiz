import type { TransformOptions } from '@babel/core';

export type Bundles = 'esm' | 'cjs';

export interface TranspileOptions {
  env: Bundles;
  sourceMaps: boolean;
  comments: boolean;
}

export interface TranspileOutput {
  code: string;
  map?: string;
}

export interface ModuleConfig {
  output?: {
    path: string;
    comments?: boolean;
    sourceMap?: boolean;
  };
}

export interface LibConfig {
  esm: ModuleConfig;
  cjs: ModuleConfig;
}

export interface CompilerConfig {
  presets?: TransformOptions['presets'];
  plugins?: TransformOptions['plugins'];
  browsers?: string | string[];
  overrides?: TransformOptions['overrides'];
}

export interface CompilerContext {
  target: Bundles;
  isESM: boolean;
  isCJS: boolean;
}

type CustomTranspiler = (
  code: string,
  option: TranspileOptions,
) => Promise<TranspileOutput | void>;

type CompilerOptions =
  | CompilerConfig
  | ((context: CompilerContext) => CompilerConfig);

type OutputConfig = {
  dir: string;
  target?: Bundles | Bundles[];
  comments?: boolean;
  sourceMap?: boolean;
};

export type Config = Partial<{
  root: string;
  srcPath: string;
  output: string | OutputConfig;
  workspace: string;
  tsConfig: string;
  extensions: string[];
  ignore: string[];
  lib: LibConfig;
  assets: string | string[] | null;
  compiler: CompilerOptions;
  customTranspiler?: CustomTranspiler | null;
}>;

// normalized config type where output is always an object
export interface NormalizedConfig extends Config {
  lib: NonNullable<Config['lib']>;
  output: OutputConfig;
}
