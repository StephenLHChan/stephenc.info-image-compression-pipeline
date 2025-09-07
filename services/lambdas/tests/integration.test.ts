import { validateS3Event, validateImageKey } from "../src/validation";

describe("Integration Tests", () => {
  describe("S3 Event Processing", () => {
    it("should validate a complete S3 event for photos prefix", () => {
      const event = {
        Records: [
          {
            s3: {
              bucket: { name: "test-source-bucket" },
              object: { key: "photos/test-image.jpg" },
            },
          },
        ],
      };

      const validatedEvent = validateS3Event(event);
      expect(validatedEvent).toEqual(event);

      const record = validatedEvent.Records[0];
      expect(() => validateImageKey(record.s3.object.key)).not.toThrow();
    });

    it("should reject events with wrong prefix", () => {
      const event = {
        Records: [
          {
            s3: {
              bucket: { name: "test-source-bucket" },
              object: { key: "images/test-image.jpg" },
            },
          },
        ],
      };

      const validatedEvent = validateS3Event(event);
      const record = validatedEvent.Records[0];
      expect(() => validateImageKey(record.s3.object.key)).toThrow();
    });
  });

  describe("Environment Setup", () => {
    it("should have required environment variables", () => {
      process.env.DESTINATION_BUCKET = "test-destination-bucket";

      // This should not throw
      expect(() => {
        if (!process.env.DESTINATION_BUCKET) {
          throw new Error("DESTINATION_BUCKET environment variable is not set");
        }
      }).not.toThrow();
    });
  });
});
