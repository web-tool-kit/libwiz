import pc from 'picocolors';
import { isMainThread, parentPort } from 'node:worker_threads';

const isTTY = process.stdin.isTTY;

export function print(msg: string) {
  if (isMainThread) {
    if (isTTY) {
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

function spacedStr(str: string) {
  return ` ${str} `;
}

function formattedMsg(status: 'INFO' | 'ERROR' | 'WARN', msg: string) {
  let statusMsg = pc.bgBlue(spacedStr(status));

  switch (status) {
    case 'INFO':
      statusMsg = pc.bgBlue(spacedStr(status));
      break;
    case 'ERROR':
      statusMsg = pc.bgRed(spacedStr(status));
      break;
    case 'WARN':
      statusMsg = pc.bgYellow(spacedStr(status));
      break;
    default:
      break;
  }
  return `${statusMsg} ${msg}`.trim();
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
};

export function clearLine() {
  if (isMainThread) {
    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
  } else if (parentPort) {
    parentPort.postMessage({ type: 'clearLine' });
  }
}

export default log;
