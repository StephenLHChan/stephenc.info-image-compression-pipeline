export class Logger {
  private context: string;

  constructor(context: string = "ImageCompression") {
    this.context = context;
  }

  info(message: string, data?: any): void {
    console.info(
      `[${this.context}] ${message}`,
      data ? JSON.stringify(data) : ""
    );
  }

  error(message: string, error?: Error | any): void {
    console.error(
      `[${this.context}] ${message}`,
      error
        ? JSON.stringify({
            message: error.message,
            stack: error.stack,
            ...error,
          })
        : ""
    );
  }

  warn(message: string, data?: any): void {
    console.warn(
      `[${this.context}] ${message}`,
      data ? JSON.stringify(data) : ""
    );
  }

  debug(message: string, data?: any): void {
    console.debug(
      `[${this.context}] ${message}`,
      data ? JSON.stringify(data) : ""
    );
  }
}

export const logger = new Logger();
