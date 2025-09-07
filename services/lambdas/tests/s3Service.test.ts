import { S3Service } from "../src/s3Service";
import { S3, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3");
const mockS3 = S3 as jest.MockedClass<typeof S3>;

describe("S3Service", () => {
  let s3Service: S3Service;
  let mockS3Instance: jest.Mocked<S3>;

  beforeEach(() => {
    process.env.DESTINATION_BUCKET = "test-destination-bucket";

    mockS3Instance = {
      send: jest.fn(),
    } as any;

    mockS3.mockImplementation(() => mockS3Instance);

    s3Service = new S3Service();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.DESTINATION_BUCKET;
  });

  describe("downloadImage", () => {
    it("should download image successfully", async () => {
      const mockResponse = {
        Body: {
          pipe: jest.fn(),
        },
      };

      mockS3Instance.send.mockResolvedValue(mockResponse);

      const result = await s3Service.downloadImage(
        "test-bucket",
        "photos/test.jpg"
      );

      expect(mockS3Instance.send).toHaveBeenCalledWith(
        expect.any(GetObjectCommand)
      );
      expect(result).toBe(mockResponse.Body);
    });

    it("should throw error when no body received", async () => {
      mockS3Instance.send.mockResolvedValue({});

      await expect(
        s3Service.downloadImage("test-bucket", "photos/test.jpg")
      ).rejects.toThrow("No image data received from S3");
    });

    it("should retry on S3 errors", async () => {
      const mockResponse = {
        Body: {
          pipe: jest.fn(),
        },
      };

      mockS3Instance.send
        .mockRejectedValueOnce(new Error("S3 temporary error"))
        .mockRejectedValueOnce(new Error("S3 temporary error"))
        .mockResolvedValue(mockResponse);

      const result = await s3Service.downloadImage(
        "test-bucket",
        "photos/test.jpg"
      );

      expect(mockS3Instance.send).toHaveBeenCalledTimes(3);
      expect(result).toBe(mockResponse.Body);
    });
  });

  describe("uploadCompressedImage", () => {
    it("should upload image successfully", async () => {
      const testBuffer = Buffer.from("test-image-data");
      const expectedUrl =
        "https://test-destination-bucket.s3.amazonaws.com/photos/test.jpg";

      mockS3Instance.send.mockResolvedValue({});

      const result = await s3Service.uploadCompressedImage(
        "photos/test.jpg",
        testBuffer
      );

      expect(mockS3Instance.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: "test-destination-bucket",
            Key: "photos/test.jpg",
            Body: testBuffer,
            ContentType: "image/jpeg",
            ACL: "public-read",
            CacheControl: "max-age=31536000",
          }),
        })
      );
      expect(result).toBe(expectedUrl);
    });

    it("should retry on upload errors", async () => {
      const testBuffer = Buffer.from("test-image-data");

      mockS3Instance.send
        .mockRejectedValueOnce(new Error("S3 upload error"))
        .mockRejectedValueOnce(new Error("S3 upload error"))
        .mockResolvedValue({});

      const result = await s3Service.uploadCompressedImage(
        "photos/test.jpg",
        testBuffer
      );

      expect(mockS3Instance.send).toHaveBeenCalledTimes(3);
      expect(result).toBe(
        "https://test-destination-bucket.s3.amazonaws.com/photos/test.jpg"
      );
    });
  });

  describe("checkImageExists", () => {
    it("should return true when image exists", async () => {
      mockS3Instance.send.mockResolvedValue({});

      const result = await s3Service.checkImageExists(
        "test-bucket",
        "photos/test.jpg"
      );

      expect(result).toBe(true);
      expect(mockS3Instance.send).toHaveBeenCalledWith(
        expect.any(GetObjectCommand)
      );
    });

    it("should return false when image does not exist", async () => {
      mockS3Instance.send.mockRejectedValue(new Error("NoSuchKey"));

      const result = await s3Service.checkImageExists(
        "test-bucket",
        "photos/test.jpg"
      );

      expect(result).toBe(false);
    });
  });
});
