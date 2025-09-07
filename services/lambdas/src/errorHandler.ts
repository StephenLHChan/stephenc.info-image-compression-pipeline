import { logger } from "./logger";

export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  S3_ERROR = "S3_ERROR",
  IMAGE_PROCESSING_ERROR = "IMAGE_PROCESSING_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export class RetryableError extends Error {
  public readonly retryable: boolean;
  public readonly errorType: ErrorType;

  constructor(
    message: string,
    retryable: boolean = true,
    errorType: ErrorType = ErrorType.UNKNOWN_ERROR
  ) {
    super(message);
    this.name = "RetryableError";
    this.retryable = retryable;
    this.errorType = errorType;
  }
}

export class ErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig: RetryConfig = ErrorHandler.DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error;
    let delay = retryConfig.baseDelayMs;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        logger.info(`Attempting ${operationName} (attempt ${attempt + 1})`);
        const result = await operation();

        if (attempt > 0) {
          logger.info(`${operationName} succeeded on attempt ${attempt + 1}`);
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt === retryConfig.maxRetries) {
          logger.error(
            `${operationName} failed after ${
              retryConfig.maxRetries + 1
            } attempts`,
            lastError
          );
          break;
        }

        if (error instanceof RetryableError && !error.retryable) {
          logger.error(
            `${operationName} failed with non-retryable error`,
            error
          );
          break;
        }

        logger.warn(
          `${operationName} failed on attempt ${
            attempt + 1
          }, retrying in ${delay}ms`,
          { error: lastError.message }
        );

        await ErrorHandler.delay(delay);
        delay = Math.min(
          delay * retryConfig.backoffMultiplier,
          retryConfig.maxDelayMs
        );
      }
    }

    throw lastError!;
  }

  static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes("validation") || message.includes("invalid")) {
      return ErrorType.VALIDATION_ERROR;
    }

    if (
      message.includes("s3") ||
      message.includes("bucket") ||
      message.includes("aws")
    ) {
      return ErrorType.S3_ERROR;
    }

    if (
      message.includes("sharp") ||
      message.includes("image") ||
      message.includes("format")
    ) {
      return ErrorType.IMAGE_PROCESSING_ERROR;
    }

    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection")
    ) {
      return ErrorType.NETWORK_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  static isRetryableError(error: Error): boolean {
    const errorType = ErrorHandler.classifyError(error);

    switch (errorType) {
      case ErrorType.VALIDATION_ERROR:
        return false; // Don't retry validation errors
      case ErrorType.S3_ERROR:
        return true; // Retry S3 errors (network issues, temporary failures)
      case ErrorType.IMAGE_PROCESSING_ERROR:
        return false; // Don't retry image processing errors (format issues, etc.)
      case ErrorType.NETWORK_ERROR:
        return true; // Retry network errors
      case ErrorType.UNKNOWN_ERROR:
        return true; // Retry unknown errors by default
      default:
        return false;
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
