import { z } from 'zod';
import { log } from '@/utils';
import pc from '@/utils/picocolors';
import type { Config } from '@/types';

const VALID_BUNDLE_ENUM = z.enum(['esm', 'cjs']).describe('Valid bundle types');

export const ModuleConfigSchema = z
  .object({
    output: z
      .object({
        comments: z
          .boolean()
          .optional()
          .describe('Include comments in the output'),
        sourceMap: z.boolean().optional().describe('Generate source maps'),
        path: z
          .string()
          .optional()
          .describe('Custom output directory path for this module format'),
      })
      .strict()
      .optional()
      .describe('Output configuration'),
  })
  .strict()
  .optional()
  .describe('Module configuration');

export const LibConfigSchema = z
  .object({
    esm: ModuleConfigSchema.optional().describe('ESM module configuration'),
    cjs: ModuleConfigSchema.optional().describe(
      'CommonJS module configuration',
    ),
  })
  .strict()
  .optional()
  .describe('Library configuration');

const PluginAndPresetSchema = z.union([
  z.string().describe('Plugin or preset name'),
  z
    .tuple([z.string(), z.record(z.any())])
    .describe('Plugin or preset with options'),
]);

const CompilerConfigSchema = z
  .object({
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
    overrides: z
      .array(z.any())
      .optional()
      .describe('Babel overrides configuration'),
  })
  .strict();

const CompilerContextSchema = z.object({
  target: VALID_BUNDLE_ENUM,
  isESM: z.boolean(),
  isCJS: z.boolean(),
});

const CompilerSchema = z.union([
  CompilerConfigSchema.describe('Compiler configuration object'),
  z
    .function()
    .args(CompilerContextSchema)
    .returns(CompilerConfigSchema)
    .describe('Compiler configuration function'),
]);

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
    root: z.string().optional().describe('Root directory'),
    workspace: z.string().optional().describe('Workspace directory'),
    srcPath: z.string().optional().describe('Source path'),
    output: z
      .union([
        z.string().describe('Output directory path'),
        z
          .object({
            dir: z
              .string()
              .optional()
              .describe('Output directory path (defaults to "dist")'),
            target: z
              .union([VALID_BUNDLE_ENUM, z.array(VALID_BUNDLE_ENUM)])
              .optional()
              .describe('Build targets'),
            comments: z
              .boolean()
              .optional()
              .describe('Include comments in output'),
            sourceMap: z.boolean().optional().describe('Generate source maps'),
          })
          .describe('Output configuration object'),
      ])
      .optional()
      .describe('Output configuration'),
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

function printError(errMsg: string, stackTrace: string) {
  const msg = errMsg.trim();
  return `${msg}\n${pc.gray(
    stackTrace
      ?.split('\n')
      .filter(line => line.includes('/'))
      .join('\n'),
  )}`;
}

function configValidationErrors(errors: any[]) {
  const stackTrace = new Error().stack;
  const { code, path, keys, expected, received, message } = errors[0] || {};

  const fullPath = Array.isArray(path) ? path : [path];

  if (code === 'unrecognized_keys') {
    fullPath.push(keys[0]);
  }

  const pathString = `${pc.bold(pc.yellow(fullPath.join(' → ')))}`;

  if (code === 'invalid_type') {
    const msg = `Invalid configuration at ${pathString}, expected to be a ${expected} but received ${received}`;
    return printError(msg, stackTrace);
  }

  if (code === 'unrecognized_keys') {
    const msg = `Unrecognized key ${pathString}`;
    return printError(msg, stackTrace);
  }

  const msg = `${pathString} ${message}`;
  return printError(msg, stackTrace);
}

export function validateConfigSchema(config: Config) {
  const configResult = ConfigSchema.safeParse(config);
  if (!configResult.success) {
    log.error(configValidationErrors(configResult.error.issues));
    process.exit(1);
  }
  return configResult.data as Config;
}
