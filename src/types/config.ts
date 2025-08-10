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
    comments?: boolean;
    sourceMap?: boolean;
    path?: string;
  };
}

export interface LibConfig {
  esm?: ModuleConfig;
  cjs?: ModuleConfig;
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

export type Config = Partial<{
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
  compiler: CompilerOptions;
  customTranspiler: CustomTranspiler | null;
}>;
