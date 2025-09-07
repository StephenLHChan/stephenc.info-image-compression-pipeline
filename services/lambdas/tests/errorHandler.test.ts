import { ErrorHandler, RetryableError, ErrorType } from "../src/errorHandler";

describe("ErrorHandler", () => {
  describe("classifyError", () => {
    it("should classify validation errors", () => {
      const error = new Error("Invalid input validation failed");
      expect(ErrorHandler.classifyError(error)).toBe(
        ErrorType.VALIDATION_ERROR
      );
    });

    it("should classify S3 errors", () => {
      const error = new Error("S3 bucket access denied");
      expect(ErrorHandler.classifyError(error)).toBe(ErrorType.S3_ERROR);
    });

    it("should classify image processing errors", () => {
      const error = new Error("Sharp image format not supported");
      expect(ErrorHandler.classifyError(error)).toBe(
        ErrorType.IMAGE_PROCESSING_ERROR
      );
    });

    it("should classify network errors", () => {
      const error = new Error("Network timeout connection failed");
      expect(ErrorHandler.classifyError(error)).toBe(ErrorType.NETWORK_ERROR);
    });

    it("should classify unknown errors", () => {
      const error = new Error("Some random error");
      expect(ErrorHandler.classifyError(error)).toBe(ErrorType.UNKNOWN_ERROR);
    });
  });

  describe("isRetryableError", () => {
    it("should not retry validation errors", () => {
      const error = new Error("Invalid input validation failed");
      expect(ErrorHandler.isRetryableError(error)).toBe(false);
    });

    it("should retry S3 errors", () => {
      const error = new Error("S3 bucket access denied");
      expect(ErrorHandler.isRetryableError(error)).toBe(true);
    });

    it("should not retry image processing errors", () => {
      const error = new Error("Sharp image format not supported");
      expect(ErrorHandler.isRetryableError(error)).toBe(false);
    });

    it("should retry network errors", () => {
      const error = new Error("Network timeout connection failed");
      expect(ErrorHandler.isRetryableError(error)).toBe(true);
    });

    it("should retry unknown errors", () => {
      const error = new Error("Some random error");
      expect(ErrorHandler.isRetryableError(error)).toBe(true);
    });
  });

  describe("withRetry", () => {
    it("should succeed on first attempt", async () => {
      const operation = jest.fn().mockResolvedValue("success");

      const result = await ErrorHandler.withRetry(operation, "test operation");

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and eventually succeed", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockRejectedValueOnce(new Error("Another failure"))
        .mockResolvedValue("success");

      const result = await ErrorHandler.withRetry(operation, "test operation", {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries", async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(new Error("Persistent failure"));

      await expect(
        ErrorHandler.withRetry(operation, "test operation", {
          maxRetries: 2,
          baseDelayMs: 10,
          maxDelayMs: 100,
          backoffMultiplier: 2,
        })
      ).rejects.toThrow("Persistent failure");

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should not retry non-retryable errors", async () => {
      const operation = jest
        .fn()
        .mockRejectedValue(
          new RetryableError(
            "Non-retryable error",
            false,
            ErrorType.VALIDATION_ERROR
          )
        );

      await expect(
        ErrorHandler.withRetry(operation, "test operation")
      ).rejects.toThrow("Non-retryable error");

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});
