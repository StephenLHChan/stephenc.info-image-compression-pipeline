import sharp from "sharp";
import { Readable } from "stream";
import { logger } from "./logger";
import { ProcessingResult, ImageMetadata } from "./types";

export class ImageProcessor {
  private readonly maxDimension: number;
  private readonly quality: number;

  constructor() {
    this.maxDimension = 4096;
    this.quality = 80;
  }

  async processImage(
    imageStream: Readable,
    originalKey: string
  ): Promise<ProcessingResult> {
    try {
      logger.info("Starting image processing", { originalKey });

      // Convert stream to buffer first
      const imageBuffer = await this.streamToBuffer(imageStream);
      logger.info("Image stream converted to buffer", {
        bufferSize: imageBuffer.length,
      });

      // Get image metadata
      const metadata = await this.getImageMetadata(imageBuffer);
      logger.info("Image metadata retrieved", { metadata });

      // Calculate new dimensions
      const newDimensions = this.calculateDimensions(
        metadata.width,
        metadata.height
      );
      logger.info("Calculated new dimensions", {
        original: { width: metadata.width, height: metadata.height },
        new: newDimensions,
      });

      // Process the image
      const processedBuffer = await this.resizeAndConvert(
        imageBuffer,
        newDimensions
      );
      logger.info("Image processing completed", {
        originalSize: metadata.size,
        newSize: processedBuffer.length,
        compressionRatio:
          (
            ((metadata.size - processedBuffer.length) / metadata.size) *
            100
          ).toFixed(2) + "%",
      });

      return {
        success: true,
        originalKey,
        newDimensions,
        processedBuffer,
        destinationUrl: `https://${process.env.DESTINATION_BUCKET}.s3.amazonaws.com/${originalKey}`,
      };
    } catch (error) {
      logger.error(`Image processing failed for key: ${originalKey}`, error);
      return {
        success: false,
        originalKey,
        newDimensions: { width: 0, height: 0 },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      stream.on("error", (error: Error) => {
        reject(error);
      });
    });
  }

  private async getImageMetadata(imageBuffer: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || "unknown",
      size: imageBuffer.length,
      quality: this.quality,
    };
  }

  private calculateDimensions(
    width: number,
    height: number
  ): { width: number; height: number } {
    if (width <= this.maxDimension && height <= this.maxDimension) {
      return { width, height };
    }

    const aspectRatio = width / height;
    if (width > height) {
      return {
        width: this.maxDimension,
        height: Math.round(this.maxDimension / aspectRatio),
      };
    } else {
      return {
        width: Math.round(this.maxDimension * aspectRatio),
        height: this.maxDimension,
      };
    }
  }

  private async resizeAndConvert(
    imageBuffer: Buffer,
    dimensions: { width: number; height: number }
  ): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(dimensions.width, dimensions.height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: this.quality,
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer();
  }
}
