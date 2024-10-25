# libwiz

`libwiz` is a powerful CLI tool designed to help you build JavaScript and TypeScript libraries, especially for React components. It supports output formats like ESM (ECMAScript Module) and CJS (CommonJS), while offering features like type generation, source maps, and more.

## Features

- 📦 **Multi-format Support**: Build libraries in ESM (modern JavaScript) or CJS (CommonJS) formats.
- 📜 **TypeScript Type Generation**: Automatically generate TypeScript definition files (`*.d.ts`).
- 🛠 **Customizable Build Directories**: Specify source and output directories as needed.
- 🔄 **Dev Mode**: Automatically rebuild when files change.
- 🗺 **Source Maps**: Generate source maps for easier debugging.
- 📝 **Verbose Logging**: Get detailed build logs for debugging.
- 🚀 **Prebuild Hooks**: Run prebuild steps to prepare your library for building.
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
libwiz build --prebuild --types
```

### Options

| Option          | Alias | Type    | Default  | Description                                      |
| --------------- | ----- | ------- | -------- | ------------------------------------------------ |
| `--target`      |       | string  |          | Target format for the build. Use `esm` or `cjs`. |
| `--src-dir`     |       | string  | `./src`  | The source directory for your library code.      |
| `--out-dir`     |       | string  | `./dist` | The output directory for the build files.        |
| `--types`       |       | boolean | `false`  | Generate type definition files (`*.d.ts`).       |
| `--prebuild`    |       | boolean | `false`  | Run prebuild steps before building.              |
| `--source-maps` |       | boolean | `false`  | Generate source maps for the build.              |
| `--verbose`     | `-v`  | boolean | `false`  | Enable verbose logging.                          |
| `--help`        |       |         |          | Show help for all commands and options.          |
| `--version`     |       |         |          | Show the version of `libwiz`.                    |

### Config File Support

`libwiz` also supports configuration files to give you more control over your build process. You can create a config file named `libwiz.config.js`, `libwiz.config.json`, or `.libwizrc` in your project root. Here's an overview of the configuration options available:

#### Config Schema Overview

- **`debug`**: Enable debug mode (`boolean`).
- **`root`**: Root directory (`string`).
- **`workspace`**: Workspace directory (`string`).
- **`srcPath`**: Source path (`string`).
- **`buildPath`**: Build output path (`string`).
- **`tsConfig`**: TypeScript configuration file path (`string`).
- **`extensions`**: File extensions to process (`array of strings`).
- **`ignore`**: Patterns to ignore (`array of strings`).
- **`lib`**: Library configuration for ESM and CJS:
  - **`esm`**: ESM module configuration.
    - **`output`**: ESM output configuration.
      - **`comments`**: Include comments in the output (`boolean`).
      - **`sourceMap`**: Generate source maps (`boolean`).
  - **`cjs`**: CJS module configuration.
    - **`output`**: CJS output configuration.
      - **`comments`**: Include comments in the output (`boolean`).
      - **`sourceMap`**: Generate source maps (`boolean`).
- **`target`**: Build targets, can be `"modern"`, `"common"`, or an array of these.
- **`babel`**: Babel configuration:
  - **`runtime`**: Use Babel runtime (`boolean`).
  - **`react`**: React configuration.
    - **`runtime`**: Specify React runtime (`"classic"` or `"automatic"`).
  - **`presets`**: Array of Babel presets.
    - **String value**: Preset name (`string`).
    - **Tuple value**: Preset name with options (`[string, object]`).
  - **`plugins`**: Array of Babel plugins.
    - **String value**: Plugin name (`string`).
    - **Tuple value**: Plugin name with options (`[string, object]`).
  - **`browsers`**: Target browsers (`string` or `array of strings`).
  - **`overrides`**: Array of Babel overrides.
    - **`exclude`**: Regular expression to exclude files (`RegExp`).
    - **`plugins`**: Array of Babel plugins (`array of strings`).
- **`assets`**: Assets to include in the build (`string`, `array of strings`, or `null`).

### Example Configuration

Here is an example of a configuration file (`libwiz.config.js`):

```javascript
// libwiz.config.js
module.exports = {
  debug: true,
  root: "./",
  workspace: "./workspace",
  srcPath: "./src",
  buildPath: "./dist",
  tsConfig: "./tsconfig.json",
  extensions: [".ts", ".tsx"],
  ignore: ["**/__tests__/**"],
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
  target: ["modern", "common"],
  babel: {
    runtime: true,
    react: {
      runtime: "automatic",
    },
    presets: [
      // any custom preset
    ],
    plugins: [
      // any custom babel plugins
      "@babel/plugin-proposal-object-rest-spread",
      "@babel/plugin-proposal-class-properties",
    ],
    browsers: "last 2 versions",
    overrides: [
      {
        exclude: /node_modules/,
        plugins: ["@babel/plugin-syntax-dynamic-import"],
      },
    ],
  },
  assets: "**/*.css",
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
libwiz build --target modern
```

#### Building for CommonJS format

```bash
libwiz build --target common
```

#### Generating build with TypeScript definition files

To create types libwiz need `tsconfig.json` or `tsconfig.build.json`

```bash
libwiz build --prebuild --types
```

#### Running in watch mode

```bash
libwiz dev
```

### Default Babel Plugins and Presets

`libwiz` comes with a set of default Babel plugins and presets to simplify your build configuration. If your project doesn't specify these plugins or presets in its configuration, `libwiz` will automatically use the following versions:

| Plugin/Preset                       | Default Version |
| ----------------------------------- | --------------- |
| `@babel/plugin-transform-react-jsx` | ^7.25.2         |
| `@babel/plugin-transform-runtime`   | ^7.25.4         |
| `@babel/preset-env`                 | ^7.25.4         |
| `@babel/preset-react`               | ^7.24.7         |
| `@babel/preset-typescript`          | ^7.24.7         |

However, if your project already includes any of these plugins or presets in `node_modules`, `libwiz` will use your project's versions instead. This allows for seamless integration and compatibility with your existing setup.

#### Specifying Runtime Helper Version with `plugin-transform-runtime`

While using `@babel/plugin-transform-runtime`, you can optionally specify the version of runtime helpers that Babel should align with. This is useful in scenarios where you want to ensure that the code generated by Babel is fully compatible with the version of `@babel/runtime` installed in your project.

```js
{
  // other config
  babel: {
    // other config
    plugins: [
      [
        "@babel/plugin-transform-runtime",
        {
          version: "^7.12.0", // custom version
        },
      ],
      // custom plugins
    ],
  },
}
```
