/**
 * Custom error classes for the build system
 */

export class BuildError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'BuildError';
  }
}

export class BuildCancelledError extends BuildError {
  constructor(message = 'Build was cancelled') {
    super(message);
    this.name = 'BuildCancelledError';
  }
}

export const isBuildCancelledError = (
  err: unknown,
): err is BuildCancelledError => {
  return err instanceof BuildCancelledError;
};
