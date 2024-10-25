import type { Bundles } from '../config';

export type { Bundles, ModuleConfig, LibConfig, Config } from '../config';

export interface CliProps {
  build: boolean;
  types: boolean;
  watch: boolean;
  prebuild: boolean;
  sourceMaps: boolean;
  srcDir: string;
  outDir: string;
  bundle: string;
  verbose: boolean;
  target: Bundles;
}
