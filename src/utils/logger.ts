export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export const LOG_COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Colors
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
};

export function formatTimestamp(date = new Date()): string {
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

export class Logger {
  private currentLevel: LogLevel;

  constructor(defaultLevel: LogLevel = "info") {
    const envLevel = (process.env.LOG_LEVEL || defaultLevel).toLowerCase() as LogLevel;
    this.currentLevel = envLevel in LOG_LEVEL_PRIORITY ? envLevel : defaultLevel;
  }

  public setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  public getLevel(): LogLevel {
    return this.currentLevel;
  }

  public shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.currentLevel];
  }

  private formatMessage(levelTag: string, message: string): string {
    return `${levelTag} ${message}`;
  }

  public debug(message: any, ...optionalParams: any[]) {
    if (!this.shouldLog("debug")) return;
    const tag = `${LOG_COLORS.magenta}${LOG_COLORS.bold}[DEBUG]${LOG_COLORS.reset}`;
    console.debug(this.formatMessage(tag, message), ...optionalParams);
  }

  public info(message: any, ...optionalParams: any[]) {
    if (!this.shouldLog("info")) return;
    const tag = `${LOG_COLORS.cyan}${LOG_COLORS.bold}[INFO]${LOG_COLORS.reset} `;
    console.info(this.formatMessage(tag, message), ...optionalParams);
  }

  public warn(message: any, ...optionalParams: any[]) {
    if (!this.shouldLog("warn")) return;
    const tag = `${LOG_COLORS.yellow}${LOG_COLORS.bold}[WARN]${LOG_COLORS.reset} `;
    console.warn(this.formatMessage(tag, message), ...optionalParams);
  }

  public error(message: any, ...optionalParams: any[]) {
    if (!this.shouldLog("error")) return;
    const tag = `${LOG_COLORS.red}${LOG_COLORS.bold}[ERROR]${LOG_COLORS.reset}`;
    console.error(this.formatMessage(tag, message), ...optionalParams);
  }

  public http(message: any, ...optionalParams: any[]) {
    if (!this.shouldLog("info")) return;
    const tag = `${LOG_COLORS.green}${LOG_COLORS.bold}[HTTP]${LOG_COLORS.reset} `;
    console.log(this.formatMessage(tag, message), ...optionalParams);
  }
}

export const logger = new Logger();
