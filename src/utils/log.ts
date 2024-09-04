import pc from 'picocolors';

const isTTY = process.stdin.isTTY;

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
    isTTY && process.stdout.write(formattedMsg('INFO', msg));
  },
  error: (msg: string) => {
    isTTY && process.stdout.write(formattedMsg('ERROR', msg));
  },
  warn: (msg: string) => {
    isTTY && process.stdout.write(formattedMsg('WARN', msg));
  },
  success: (msg: string) => {
    isTTY && process.stdout.write(`${pc.green('\u2713')} ${msg}`);
  },
  fail: (msg: string) => {
    isTTY && process.stdout.write(`${pc.red('\u2717')} ${msg}`);
  },
  progress: (msg: string) => {
    isTTY && process.stdout.write(`${pc.green('○')} ${msg}`);
  },
};

export default log;
