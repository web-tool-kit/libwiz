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

type MessageStatus = 'info' | 'error' | 'warn' | 'done' | 'progress';

function formattedMsg(status: MessageStatus, msg: string) {
  const paddedStatus = status.padEnd(8);
  let statusMsg = pc.blue(paddedStatus);
  switch (status) {
    case 'info':
      statusMsg = pc.cyan(paddedStatus);
      break;
    case 'error':
      statusMsg = pc.red(paddedStatus);
      break;
    case 'warn':
      statusMsg = pc.yellow(paddedStatus);
      break;
    case 'done':
      statusMsg = pc.green(paddedStatus);
      break;
    default:
      break;
  }
  return `${pc.bold(statusMsg)} ${msg}`.trim();
}

export const log = {
  info: (msg: string) => {
    print(formattedMsg('info', msg));
  },
  error: (msg: string) => {
    print(formattedMsg('error', msg));
  },
  warn: (msg: string) => {
    print(formattedMsg('warn', msg));
  },
  done: (msg: string) => {
    print(formattedMsg('done', msg));
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
