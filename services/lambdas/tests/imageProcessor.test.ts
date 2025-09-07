import { ImageProcessor } from "../src/imageProcessor";
import { Readable } from "stream";

// Mock sharp
jest.mock("sharp", () => {
  const mockSharp = jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 8000,
      height: 6000,
      format: "jpeg",
      size: 1024000,
    }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    pipe: jest.fn().mockReturnValue({
      toBuffer: jest
        .fn()
        .mockResolvedValue(Buffer.from("mock-compressed-image-data")),
    }),
  }));
  return mockSharp;
});

describe("ImageProcessor", () => {
  let imageProcessor: ImageProcessor;
  let mockImageStream: Readable;

  beforeEach(() => {
    imageProcessor = new ImageProcessor();
    mockImageStream = new Readable({
      read() {
        this.push("mock-image-data");
        this.push(null);
      },
    });
  });

  describe("calculateDimensions", () => {
    it("should not resize images smaller than max dimension", () => {
      const processor = new ImageProcessor();
      const result = processor["calculateDimensions"](2000, 1500);
      expect(result).toEqual({ width: 2000, height: 1500 });
    });

    it("should resize landscape images correctly", () => {
      const processor = new ImageProcessor();
      const result = processor["calculateDimensions"](8000, 4000);
      expect(result).toEqual({ width: 4096, height: 2048 });
    });

    it("should resize portrait images correctly", () => {
      const processor = new ImageProcessor();
      const result = processor["calculateDimensions"](3000, 6000);
      expect(result).toEqual({ width: 2048, height: 4096 });
    });

    it("should handle square images correctly", () => {
      const processor = new ImageProcessor();
      const result = processor["calculateDimensions"](6000, 6000);
      expect(result).toEqual({ width: 4096, height: 4096 });
    });
  });

  describe("processImage", () => {
    beforeEach(() => {
      process.env.DESTINATION_BUCKET = "test-destination-bucket";
    });

    afterEach(() => {
      delete process.env.DESTINATION_BUCKET;
    });

    it("should process image successfully", async () => {
      const result = await imageProcessor.processImage(
        mockImageStream,
        "photos/test.jpg"
      );

      expect(result.success).toBe(true);
      expect(result.originalKey).toBe("photos/test.jpg");
      expect(result.newDimensions).toEqual({ width: 4096, height: 3072 });
      expect(result.destinationUrl).toBe(
        "https://test-destination-bucket.s3.amazonaws.com/photos/test.jpg"
      );
    });

    it("should handle processing errors", async () => {
      const errorStream = new Readable({
        read() {
          throw new Error("Stream error");
        },
      });

      const result = await imageProcessor.processImage(
        errorStream,
        "photos/test.jpg"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
