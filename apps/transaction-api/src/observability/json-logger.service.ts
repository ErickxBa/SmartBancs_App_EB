import { LoggerService } from '@nestjs/common';

export class JsonLoggerService implements LoggerService {
  log(message: any, context?: string) {
    console.log(this.format('info', message, context));
  }

  error(message: any, trace?: string, context?: string) {
    console.error(this.format('error', message, context, trace));
  }

  warn(message: any, context?: string) {
    console.warn(this.format('warn', message, context));
  }

  debug(message: any, context?: string) {
    console.debug(this.format('debug', message, context));
  }

  verbose(message: any, context?: string) {
    console.log(this.format('verbose', message, context));
  }

  private format(level: string, message: any, context?: string, trace?: string) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      trace,
    });
  }
}
