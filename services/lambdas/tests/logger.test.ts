import { Logger } from "../src/logger";

describe("Logger", () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger("TestLogger");
    consoleSpy = jest.spyOn(console, "info").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log info messages", () => {
    logger.info("Test message");
    expect(consoleSpy).toHaveBeenCalledWith("[TestLogger] Test message", "");
  });

  it("should log info messages with data", () => {
    const data = { test: "data" };
    logger.info("Test message", data);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[TestLogger] Test message",
      JSON.stringify(data)
    );
  });

  it("should log error messages", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const error = new Error("Test error");

    logger.error("Test error message", error);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[TestLogger] Test error message",
      JSON.stringify({
        message: "Test error",
        stack: error.stack,
        ...error,
      })
    );

    consoleErrorSpy.mockRestore();
  });
});
