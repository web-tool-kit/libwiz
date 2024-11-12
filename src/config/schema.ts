import pc from 'picocolors';
import type { TransformOptions } from '@babel/core';
import { z } from 'zod';
import { log } from '../utils';
import type { TranspileOutput, TranspileOptions } from '../types';

export type Bundles = 'esm' | 'cjs';

const VALID_BUNDLE_ENUM = z.enum(['esm', 'cjs']).describe('Valid bundle types');

export interface ModuleConfig {
  output?: {
    comments?: boolean;
    sourceMap?: boolean;
  };
}

export const ModuleConfigSchema = z
  .object({
    output: z
      .object({
        comments: z
          .boolean()
          .optional()
          .describe('Include comments in the output'),
        sourceMap: z.boolean().optional().describe('Generate source maps'),
      })
      .optional()
      .describe('Output configuration'),
  })
  .strict()
  .optional()
  .describe('Module configuration');

export interface LibConfig {
  esm?: ModuleConfig;
  cjs?: ModuleConfig;
}

export const LibConfigSchema = z
  .object({
    esm: ModuleConfigSchema.describe('ESM module configuration'),
    cjs: ModuleConfigSchema.describe('CommonJS module configuration'),
  })
  .strict()
  .optional()
  .describe('Library configuration');

export interface LibwizReactConfig {
  pragma: string;
  pragmaFrag: string;
  throwIfNamespace?: boolean;
  useBuiltins?: boolean;
  runtime?: 'classic' | 'automatic';
  importSource?: string;
}

const LibwizReactConfigSchema = z
  .object({
    pragma: z.string().optional().describe('React pragma for JSX'),
    pragmaFrag: z.string().optional().describe('React pragma for fragment'),
    throwIfNamespace: z
      .boolean()
      .optional()
      .describe('Throw if namespace is used in JSX'),
    useBuiltins: z
      .boolean()
      .optional()
      .describe('Enable built-in runtime optimizations'),
    runtime: z
      .enum(['classic', 'automatic'])
      .optional()
      .describe('React runtime mode'),
    importSource: z.string().optional().describe('React import source'),
  })
  .optional()
  .describe('React config for transpile');

export type Config = Partial<{
  debug: boolean;
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
  customTranspiler: (
    code: string,
    option: TranspileOptions,
  ) => Promise<TranspileOutput | void>;
  compiler: Partial<{
    tool: 'babel';
    react: Partial<LibwizReactConfig>;
    presets: TransformOptions['presets'];
    plugins: TransformOptions['plugins'];
    browsers: string | string[];
  }>;
}>;

const PluginAndPresetSchema = z.union([
  z.string().describe('Plugin or preset name'),
  z
    .tuple([z.string(), z.record(z.any())])
    .describe('Plugin or preset with options'),
]);

const CompilerSchema = z
  .object({
    tool: z.enum(['babel']).optional().describe('Compiler tool'),
    react: LibwizReactConfigSchema.optional().describe(
      'React specific configuration',
    ),
    presets: z
      .array(PluginAndPresetSchema)
      .optional()
      .describe('Compiler presets'),
    plugins: z
      .array(PluginAndPresetSchema)
      .optional()
      .describe('Compiler plugins'),
    browsers: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('Target browsers for compilation'),
  })
  .strict();

const CustomTranspileOptionsSchema = z.object({
  env: VALID_BUNDLE_ENUM,
  sourceMaps: z.boolean(),
  comments: z.boolean(),
});

const CustomTranspileOutputSchema = z.object({
  code: z.string(),
  map: z.string().optional(),
});

export const ConfigSchema = z
  .object({
    debug: z.boolean().optional().describe('Enable debug mode'),
    root: z.string().optional().describe('Root directory'),
    workspace: z.string().optional().describe('Workspace directory'),
    srcPath: z.string().optional().describe('Source path'),
    buildPath: z.string().optional().describe('Build output path'),
    tsConfig: z
      .string()
      .optional()
      .describe('TypeScript configuration file path'),
    extensions: z
      .array(z.string())
      .optional()
      .describe('File extensions to process'),
    ignore: z.array(z.string()).optional().describe('Patterns to ignore'),
    lib: LibConfigSchema,
    target: z
      .union([VALID_BUNDLE_ENUM, z.array(VALID_BUNDLE_ENUM)])
      .optional()
      .describe('Build targets'),
    assets: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional()
      .describe('Assets to include'),
    customTranspiler: z
      .function()
      .args(z.string(), CustomTranspileOptionsSchema)
      .returns(z.promise(z.union([CustomTranspileOutputSchema, z.void()])))
      .optional()
      .describe('Custom transpile function'),
    compiler: CompilerSchema.optional().describe('Compiler configuration'),
  })
  .strict();

function formatZodErrors(errors: any[]) {
  const error = errors[0];
  const { path, message } = error;
  const pathString = `${pc.yellow(path.length ? path.join(' -> ') : 'root')}`;
  const stackTrace = new Error().stack;
  const filteredStackTrace = stackTrace
    .split('\n')
    .filter(line => line.includes('/'))
    .join('\n');
  return `Error in config ${pathString} : ${message} \n${filteredStackTrace}`;
}

export function validateConfigSchema(config: Config) {
  const configResult = ConfigSchema.safeParse(config);
  if (!configResult.success) {
    log.error(formatZodErrors(configResult.error.errors));
    process.exit(1);
  }
  return configResult.data as Config;
}
