import { Handler } from "aws-lambda";
import { S3, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { Readable } from "stream";

const s3 = new S3();
const destinationBucket = process.env.DESTINATION_BUCKET;

if (!destinationBucket) {
  throw new Error("DESTINATION_BUCKET environment variable is not set");
}

export const handler: Handler = async (event, context) => {
  try {
    const sourceBucket = event.Records[0].s3.bucket.name;
    const imageKey = event.Records[0].s3.object.key;

    console.info(
      `Processing image from bucket: ${sourceBucket}, key: ${imageKey}`
    );

    // Get the image from the source S3 bucket
    const getObjectParams = { Bucket: sourceBucket, Key: imageKey };
    const imageObj = await s3.send(new GetObjectCommand(getObjectParams));

    if (!imageObj || !imageObj.Body) {
      throw new Error("Failed to retrieve image from S3");
    }

    // Process the image with sharp
    const imageStream = imageObj.Body as Readable;
    const metadata = await sharp().metadata();

    // Calculate new dimensions while maintaining aspect ratio
    const maxDimension = 4096;
    let width = metadata.width || 0;
    let height = metadata.height || 0;

    if (width > height) {
      if (width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    console.info(`Resizing image to ${width}x${height}`);

    // Create sharp pipeline
    const converter = sharp()
      .resize(width, height, { fit: "inside" })
      .webp({ quality: 80 }); // Add quality parameter for better compression

    // Pipe the image through sharp
    const resizedImage = imageStream.pipe(converter);

    // Save the resized image to the destination bucket
    console.info(
      `Saving resized image to bucket: ${destinationBucket}, key: ${imageKey}`
    );

    await s3.send(
      new PutObjectCommand({
        Bucket: destinationBucket,
        Key: imageKey,
        Body: resizedImage,
        ContentType: "image/webp",
      })
    );

    console.info(`Successfully processed image: ${imageKey}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Image processed successfully",
        originalKey: imageKey,
        newDimensions: { width, height },
      }),
    };
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
};
