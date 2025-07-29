import { isMainThread, parentPort } from 'node:worker_threads';
import pc from './picocolors';
import { isTTY, isProgressDisabled } from './common';

export function print(msg: string) {
  if (isMainThread) {
    if (isTTY) {
      if (isProgressDisabled()) msg += '\n';
      process.stdout.write(msg);
      return;
    }
  } else {
    if (parentPort) {
      parentPort.postMessage({ type: 'log', message: msg });
      return;
    }
  }
  console.log(msg);
}

function formattedMsg(status: 'INFO' | 'ERROR' | 'WARN', msg: string) {
  let statusMsg = pc.bgBlue(status);

  switch (status) {
    case 'INFO':
      statusMsg = pc.cyan(status);
      break;
    case 'ERROR':
      statusMsg = pc.red(status);
      break;
    case 'WARN':
      statusMsg = pc.yellow(status);
      break;
    default:
      break;
  }
  return `${pc.bold(statusMsg.toLocaleLowerCase())} ${msg}`.trim();
}

export const log = {
  info: (msg: string) => {
    print(formattedMsg('INFO', msg));
  },
  error: (msg: string) => {
    print(formattedMsg('ERROR', msg));
  },
  warn: (msg: string) => {
    print(formattedMsg('WARN', msg));
  },
  success: (msg: string) => {
    print(`${pc.green('\u2713')} ${msg}`);
  },
  fail: (msg: string) => {
    print(`${pc.red('\u2717')} ${msg}`);
  },
  progress: (msg: string) => {
    print(`${pc.green('○')} ${msg}`);
  },
  raw: (msg: string) => {
    print(msg);
  },
  newline: () => {
    print('\n');
  },
};

export function clearLine() {
  if (isProgressDisabled()) return;
  if (isMainThread) {
    if (isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    } else {
      console.log('\r');
    }
  } else if (parentPort) {
    parentPort.postMessage({ type: 'clearLine' });
  }
}

export default log;
