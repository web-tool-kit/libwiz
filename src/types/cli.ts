import type { Bundles } from './config';

export type CliTaskTypes = 'build' | 'dev' | 'types';

export interface CliOptions {
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
