import {
  validateEnvironmentVariables,
  validateS3Event,
  validateImageKey,
  ValidationError,
} from "../src/validation";

describe("Validation", () => {
  describe("validateEnvironmentVariables", () => {
    beforeEach(() => {
      delete process.env.DESTINATION_BUCKET;
    });

    afterEach(() => {
      process.env.DESTINATION_BUCKET = "test-bucket";
    });

    it("should throw error when DESTINATION_BUCKET is not set", () => {
      expect(() => validateEnvironmentVariables()).toThrow(ValidationError);
      expect(() => validateEnvironmentVariables()).toThrow(
        "DESTINATION_BUCKET environment variable is not set"
      );
    });

    it("should not throw error when DESTINATION_BUCKET is set", () => {
      process.env.DESTINATION_BUCKET = "test-bucket";
      expect(() => validateEnvironmentVariables()).not.toThrow();
    });
  });

  describe("validateS3Event", () => {
    it("should validate correct S3 event", () => {
      const event = {
        Records: [
          {
            s3: {
              bucket: { name: "test-bucket" },
              object: { key: "photos/test.jpg" },
            },
          },
        ],
      };

      const result = validateS3Event(event);
      expect(result).toEqual(event);
    });

    it("should throw error for invalid event structure", () => {
      expect(() => validateS3Event({})).toThrow(ValidationError);
      expect(() => validateS3Event({ Records: [] })).toThrow(ValidationError);
      expect(() => validateS3Event({ Records: [{}] })).toThrow(ValidationError);
    });
  });

  describe("validateImageKey", () => {
    it("should validate correct image keys", () => {
      const validKeys = [
        "photos/test.jpg",
        "photos/image.png",
        "photos/photo.webp",
        "photos/picture.jpeg",
      ];

      validKeys.forEach(key => {
        expect(() => validateImageKey(key)).not.toThrow();
      });
    });

    it("should throw error for invalid image keys", () => {
      const invalidKeys = [
        "",
        "test.jpg",
        "images/test.jpg",
        "photos/test.txt",
        "photos/test",
      ];

      invalidKeys.forEach(key => {
        expect(() => validateImageKey(key)).toThrow(ValidationError);
      });
    });
  });
});
