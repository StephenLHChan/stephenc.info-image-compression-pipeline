import { S3, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { logger } from "./logger";
import { ErrorHandler, RetryableError, ErrorType } from "./errorHandler";

export class S3Service {
  private s3: S3;
  private destinationBucket: string;

  constructor() {
    this.s3 = new S3();
    this.destinationBucket = process.env.DESTINATION_BUCKET!;
  }

  async downloadImage(sourceBucket: string, key: string): Promise<Readable> {
    return ErrorHandler.withRetry(
      async () => {
        logger.info(
          `Downloading image from bucket: ${sourceBucket}, key: ${key}`
        );

        const command = new GetObjectCommand({
          Bucket: sourceBucket,
          Key: key,
        });

        const response = await this.s3.send(command);

        if (!response.Body) {
          throw new RetryableError(
            "No image data received from S3",
            true,
            ErrorType.S3_ERROR
          );
        }

        logger.info("Image downloaded successfully");
        return response.Body as Readable;
      },
      `Download image from ${sourceBucket}/${key}`,
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      }
    );
  }

  async uploadCompressedImage(
    key: string,
    imageBuffer: Buffer
  ): Promise<string> {
    return ErrorHandler.withRetry(
      async () => {
        logger.info(
          `Uploading compressed image to bucket: ${this.destinationBucket}, key: ${key}`
        );

        const command = new PutObjectCommand({
          Bucket: this.destinationBucket,
          Key: key,
          Body: imageBuffer,
          ContentType: "image/jpeg",
          CacheControl: "max-age=31536000", // 1 year cache
          Metadata: {
            "processed-by": "image-compression-lambda",
            "processed-at": new Date().toISOString(),
          },
        });

        await this.s3.send(command);

        const publicUrl = `https://${this.destinationBucket}.s3.amazonaws.com/${key}`;
        logger.info("Compressed image uploaded successfully", {
          url: publicUrl,
        });

        return publicUrl;
      },
      `Upload compressed image to ${this.destinationBucket}/${key}`,
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      }
    );
  }

  async checkImageExists(bucket: string, key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
}
