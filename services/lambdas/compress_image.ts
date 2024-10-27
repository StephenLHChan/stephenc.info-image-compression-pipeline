import { Handler } from "aws-lambda";

import { S3, GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { Readable } from "stream";

const s3 = new S3();
const destinationBucket = process.env.DESTINATION_BUCKET;

export const handler: Handler = async (event, context) => {
  const sourceBucket = event.Records[0].s3.bucket.name;
  const imageKey = event.Records[0].s3.object.key;

  try {
    // Get the image from the source S3 bucket
    console.info(
      `Fetching image from bucket: ${sourceBucket}, key: ${imageKey}`
    );

    const params = { Bucket: sourceBucket, Key: imageKey };
    const imageObj = await s3.send(new GetObjectCommand(params));
    // const imageObj = await s3.getObject({
    //   Bucket: sourceBucket,
    //   Key: imageKey,
    // });

    if (!imageObj || !imageObj.Body) {
      throw new Error("Failed to retrieve image from S3");
    }

    console.info("Image successfully fetched, processing with sharp");
    const imageBuffer = imageObj.Body;

    // Resize the image using sharp
    const converter = await sharp()
      .resize({ width: 1024, height: 1024, fit: "inside" })
      .webp();

    const resizedImage = (imageObj.Body as Readable).pipe(converter);

    // const resizedImage = await sharp(imageBuffer)
    //   .resize({ width: 1024, height: 1024, fit: "inside" })
    //   .toBuffer();

    // Save the resized image to the destination bucket
    const compressedKey = `resized-${imageKey}`;
    console.info(
      `Saving resized image to bucket: ${destinationBucket}, key: ${compressedKey}`
    );

    await s3.putObject({
      Bucket: destinationBucket,
      Key: compressedKey,
      Body: resizedImage,
      ContentType: "image/jpeg", // Adjust based on your image format
    });

    console.log(`Resized image saved as ${compressedKey}`);
    return {
      statusCode: 200,
      body: `Resized image saved as ${compressedKey}`,
    };
  } catch (error) {
    console.error(
      `Error processing image ${imageKey} from bucket ${sourceBucket}:`,
      error
    );
    throw error;
  }
};
