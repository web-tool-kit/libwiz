import type { Bundles } from '../config';

export type { Bundles, ModuleConfig, LibConfig, Config } from '../config';

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
  env: Bundles;
  sourceMaps: boolean;
  comments: boolean;
}

export interface TranspileOutput {
  code: string;
  map?: string;
}
