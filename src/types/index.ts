export type {
  ModuleConfig,
  LibConfig,
  Config,
  CompilerConfig,
  CompilerContext,
} from '@/config';

export type Bundles = 'esm' | 'cjs';
export type TaskTypes = 'build' | 'dev' | 'types';

/**
 * Utility type that makes all properties of T required instead of partial
 * This is the opposite of Partial<T>
 */
export type NotPartial<T> = {
  [P in keyof T]-?: T[P];
};

export interface CliProps {
  build: boolean;
  types: boolean;
  watch: boolean;
  sourceMaps: boolean;
  srcDir: string;
  outDir: string;
  bundle: string;
  progress: boolean;
  target: Bundles;
  check: boolean;
}

export interface TranspileOptions {
  env: Bundles;
  sourceMaps: boolean;
  comments: boolean;
}

export interface TranspileOutput {
  code: string;
  map?: string;
}
