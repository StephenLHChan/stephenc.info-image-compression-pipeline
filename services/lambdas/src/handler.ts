import { Handler } from "aws-lambda";
import { LambdaEvent, LambdaResponse, ProcessingResult } from "./types";
import {
  validateEnvironmentVariables,
  validateS3Event,
  validateImageKey,
  ValidationError,
} from "./validation";
import { logger } from "./logger";
import { S3Service } from "./s3Service";
import { ImageProcessor } from "./imageProcessor";

export const handler: Handler = async (event, context) => {
  const startTime = Date.now();

  try {
    logger.info("Lambda function started", {
      requestId: context.awsRequestId,
      remainingTime: context.getRemainingTimeInMillis(),
    });

    // Validate environment
    validateEnvironmentVariables();

    // Validate and parse event
    const s3Event = validateS3Event(event);
    const record = s3Event.Records[0];
    const sourceBucket = record.s3.bucket.name;
    const imageKey = record.s3.object.key;

    logger.info("Processing S3 event", { sourceBucket, imageKey });

    // Validate image key
    validateImageKey(imageKey);

    // Initialize services
    const s3Service = new S3Service();
    const imageProcessor = new ImageProcessor();

    // Download image from source bucket
    logger.info("Downloading image from S3");
    const imageStream = await s3Service.downloadImage(sourceBucket, imageKey);
    logger.info("Image downloaded successfully");

    // Process the image
    logger.info("Starting image processing");
    const result = await imageProcessor.processImage(imageStream, imageKey);
    logger.info("Image processing completed", { success: result.success });

    if (!result.success) {
      throw new Error(result.error || "Image processing failed");
    }

    // Upload compressed image to destination bucket
    if (!result.processedBuffer) {
      throw new Error("No processed image buffer available for upload");
    }

    logger.info("Uploading compressed image to S3");
    const destinationUrl = await s3Service.uploadCompressedImage(
      imageKey,
      result.processedBuffer
    );
    logger.info("Image uploaded successfully", { destinationUrl });

    const processingTime = Date.now() - startTime;
    logger.info("Image processing completed successfully", {
      originalKey: imageKey,
      newDimensions: result.newDimensions,
      destinationUrl,
      processingTimeMs: processingTime,
    });

    const response: LambdaResponse = {
      statusCode: 200,
      body: {
        message: "Image processed successfully",
        originalKey: imageKey,
        newDimensions: result.newDimensions,
        destinationUrl,
      },
    };

    return response;
  } catch (error) {
    const processingTime = Date.now() - startTime;

    if (error instanceof ValidationError) {
      logger.error("Validation error occurred", error);
      return {
        statusCode: 400,
        body: {
          message: "Validation error",
          error: error.message,
          requestId: context.awsRequestId,
        },
      };
    }

    logger.error("Unexpected error occurred", error);
    return {
      statusCode: 500,
      body: {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
        requestId: context.awsRequestId,
        processingTimeMs: processingTime,
      },
    };
  }
};
