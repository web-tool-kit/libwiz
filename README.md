# libwiz

`libwiz` is a powerful CLI tool designed to help you build JavaScript and TypeScript libraries, especially for React components. It supports output formats like ESM (ECMAScript Module) and CJS (CommonJS), while offering features like type generation, source maps, and more.

## Features

- 📦 **Multi-format Support**: Build libraries in ESM (modern JavaScript) or CJS (CommonJS) formats.
- 📜 **TypeScript Type Generation**: Automatically generate TypeScript definition files (`*.d.ts`).
- 🛠 **Customizable Build Directories**: Specify source and output directories as needed.
- 🔄 **Dev Mode**: Automatically rebuild when files change.
- 🗺 **Source Maps**: Generate source maps for easier debugging.
- 📝 **Verbose Logging**: Get detailed build logs for debugging.
- ⚙️ **Config File Support**: Customize the build with a configuration file (`libwiz.config.js`, `libwiz.config.json`, or `.libwizrc`).

## Installation

You can install `libwiz` globally using npm:

```bash
npm install -g libwiz
```

Or, add it as a dev dependency in your project:

```bash
npm install --save-dev libwiz
```

## Usage

### Commands

`libwiz` provides two primary commands: `build` and `dev`.

1. **build**: Build the library in the desired format.
2. **dev**: Run the build in watch mode for faster development.

### Command Syntax

```bash
libwiz <command> [options]
```

For example:

```bash
libwiz build --types
```

### Options

| Option          | Alias | Type    | Default  | Description                                      |
| --------------- | ----- | ------- | -------- | ------------------------------------------------ |
| `--target`      |       | string  |          | Target format for the build. Use `esm` or `cjs`. |
| `--src-dir`     |       | string  | `./src`  | The source directory for your library code.      |
| `--out-dir`     |       | string  | `./dist` | The output directory for the build files.        |
| `--types`       |       | boolean | `false`  | Generate type definition files (`*.d.ts`).       |
| `--source-maps` |       | boolean | `false`  | Generate source maps for the build.              |
| `--verbose`     | `-v`  | boolean | `false`  | Enable verbose logging.                          |
| `--help`        |       |         |          | Show help for all commands and options.          |
| `--version`     |       |         |          | Show the version of `libwiz`.                    |

### Config File Support

`libwiz` also supports configuration files to give you more control over your build process. You can create a config file named `libwiz.config.js`, `libwiz.config.json`, or `.libwizrc` in your project root. Here's an overview of the configuration options available:

#### Config Schema Overview

The following configuration options allow you to customize or override the default flow. By default, `libwiz` will use sensible values, but you can specify these options as needed to fine-tune the build process.

- **`debug`** (`boolean`): Enables debug mode, providing detailed logging for development.
- **`root`** (`string`): Specifies the root directory of the project.
- **`workspace`** (`string`): Defines a workspace directory within the project.
- **`srcPath`** (`string`): Path to the source files of the library.
- **`buildPath`** (`string`): Directory where build output files will be stored.
- **`tsConfig`** (`string`): Path to the TypeScript configuration file, such as `tsconfig.json`.
- **`extensions`** (`array of strings`): List of file extensions to process, e.g., `['.ts', '.tsx']`.
- **`ignore`** (`array of strings`): Patterns to ignore during processing, like test files or specific directories.
- **`lib`** (`object`): Library configuration settings for both ESM and CJS builds:
  - **`esm`** (`object`): Settings for ESM (EcmaScript Module) format output.
    - **`output`** (`object`): Configures ESM output settings.
      - **`comments`** (`boolean`): Includes comments in the output if `true`.
      - **`sourceMap`** (`boolean`): Generates source maps if `true`.
  - **`cjs`** (`object`): Settings for CJS (CommonJS) format output.
    - **`output`** (`object`): Configures CJS output settings.
      - **`comments`** (`boolean`): Includes comments in the output if `true`.
      - **`sourceMap`** (`boolean`): Generates source maps if `true`.
- **`target`** (`string` or `array`): Specifies build targets, such as `"esm"`, `"cjs"`, or an array with both.
- **`customTranspiler`** (`function`): A custom function to handle transpilation if specific control is required.
- **`compiler`** (`object`, optional): Compiler configuration settings (defaults will be used if not provided).
  - **`tool`** (`string`): Compiler tool; currently supports only `babel`.
  - **`react`** (`object`): React-specific configuration options.
    - **`pragma`** (`string`): Specifies the React pragma for JSX transformation.
    - **`pragmaFrag`** (`string`): Specifies the React pragma for fragments.
    - **`throwIfNamespace`** (`boolean`): Throws an error if a namespace is used in JSX if `true`.
    - **`useBuiltins`** (`boolean`): Enables runtime optimizations if `true`.
    - **`runtime`** (`string`): Sets React runtime mode; can be `"classic"` or `"automatic"`.
    - **`importSource`** (`string`): Specifies the source library for JSX imports, useful for custom JSX setups.
  - **`presets`** (`array`): Array of compiler presets; can be either `string` or `[string, object]` for custom options.
  - **`plugins`** (`array`): Array of compiler plugins; can be either `string` or `[string, object]` for custom options.
  - **`browsers`** (`string` or `array`): Target browsers for code compilation. **Recommended:** Use a `.browserslistrc` file to manage browser targets instead for better control and reusability across tools.
- **`assets`** (`string`, `array`, or `null`): Specifies additional assets to include in the build, like `['**/*.css']`. Set to `null` to exclude assets.

### Example Configuration

Here is an example of a configuration file (`libwiz.config.js`):

```js
// libwiz.config.js
module.exports = {
  debug: true,
  root: './',
  workspace: '../../',
  srcPath: './src',
  buildPath: './dist',
  tsConfig: './tsconfig.json',
  extensions: ['.ts', '.tsx'],
  ignore: ['**/__tests__/**'],
  lib: {
    esm: {
      output: {
        comments: true,
        sourceMap: true,
      },
    },
    cjs: {
      output: {
        comments: true,
        sourceMap: true,
      },
    },
  },
  target: ['esm', 'cjs'],
  compiler: {
    tool: 'babel',
    react: {
      runtime: 'automatic',
    },
    presets: [
      // ...any presets if exist
    ],
    plugins: [
      '@babel/plugin-proposal-object-rest-spread',
      '@babel/plugin-proposal-class-properties',
    ],
    browsers: 'last 2 versions',
  },
  assets: '**/*.css',
};
```

Example `libwiz.config.json`

```json
{
  "$schema": "./node_module/schemas/libwiz-schema.json",
  "debug": true,
  "root": "./",
  "srcPath": "./src",
  "buildPath": "./dist"
}
```

### Examples

#### Building for ESM format

```bash
libwiz build --target esm
```

#### Building for CommonJS format

```bash
libwiz build --target cjs
```

#### Generating build with TypeScript definition files

To create types libwiz need `tsconfig.json` or `tsconfig.build.json`

```bash
libwiz build --types
```

#### Running in watch mode

```bash
libwiz dev
```

### Default Babel Plugins and Presets

`libwiz` comes with a set of default Babel plugins and presets to simplify your build configuration. If your project doesn't specify these plugins or presets in its configuration, `libwiz` will automatically use the following versions:

| Plugin/Preset                       | Default Version |
| ----------------------------------- | --------------- |
| `@babel/preset-env`                 | ^7.26.0         |
| `@babel/preset-react`               | ^7.25.9         |
| `@babel/plugin-transform-react-jsx` | ^7.25.9         |
| `@babel/preset-typescript`          | ^7.26.0         |

However, if your project already includes any of these plugins or presets in `node_modules`, `libwiz` will use your project's versions instead. This allows for seamless integration and compatibility with your existing setup.

### Using `customTranspiler` for Custom Transpilation

If you need full control over the transpilation process, `libwiz` offers a `customTranspiler` option. By using this, you can define a function to handle the transpilation according to your specific requirements. Here's how it works:

- **Function Definition**: `customTranspiler` expects a function that takes in `code` and `options`.
- **Code Parameter**: The `code` parameter is a `string` containing the source code that you want to transpile.
- **Options Parameter**: The `options` parameter provides useful information for transpilation and includes the following fields:
  - **`env`**: Specifies the build environment, such as `esm` or `cjs` (from the `Bundles` type).
  - **`sourceMaps`**: A `boolean` that indicates if source maps should be generated.
  - **`comments`**: A `boolean` that indicates if comments should be included in the output.

After processing, the `customTranspiler` function should return an object containing:

- **`code`**: The transpiled code as a `string`.
- **`map`** (optional): The source map as a `string`, if source maps were generated.

If `customTranspiler` returns nothing, or if it returns invalid data, `libwiz` will fall back to its default compilation process.

#### Example Usage

Here’s an example of how you might set up `customTranspiler` in your `libwiz.config.js`:

```js
module.exports = {
  // other configurations...
  customTranspiler: async (code, options) => {
    const transpiledCode = await myCustomCompile(code, options); // your custom transpile logic
    const sourceMap = generateSourceMap(transpiledCode); // optional

    return {
      code: transpiledCode,
      map: sourceMap, // return map only if generated
    };
  },
};
```
