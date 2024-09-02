import pc from 'picocolors';

export interface LoggerType {
  info: (info: string) => void;
  error: (error: string) => void;
  warn: (warn: string) => void;
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

function Logger(this: LoggerType) {
  this.info = msg => {
    console.log(formattedMsg('INFO', msg));
  };

  this.error = msg => {
    console.log(formattedMsg('ERROR', msg));
  };

  this.warn = msg => {
    console.log(formattedMsg('WARN', msg));
  };
}

const log: LoggerType = new Logger();

export default log;
