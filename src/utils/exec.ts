import { exec as nodeExec } from 'node:child_process';
import type { ChildProcess, ExecOptions } from 'node:child_process';
import api from '../api';

async function exec(
  command: string,
  option: ExecOptions = {},
  signal?: AbortSignal,
): Promise<{
  stdout: string;
  stderr: string;
}> {
  const config = api.getConfig();
  return new Promise((resolve, reject) => {
    try {
      const prc: ChildProcess = nodeExec(
        command,
        option,
        (error, stdout, stderr) => {
          stdout = Buffer.isBuffer(stdout) ? stdout.toString() : stdout;
          stderr = Buffer.isBuffer(stderr) ? stderr.toString() : stderr;
          if (error) {
            reject(error);
          } else {
            resolve({ stdout, stderr });
          }
        },
      );
      if (signal) {
        signal.addEventListener('abort', () => {
          prc.kill('SIGTERM');
          reject(new Error('[internal] exec aborted via signal'));
        });
      }
      if (config.debug) {
        prc.stdout && prc.stdout.pipe(process.stdout);
        prc.stderr && prc.stderr.pipe(process.stdout);
      }
    } catch (e) {
      reject(e);
    }
  });
}

export default exec;
