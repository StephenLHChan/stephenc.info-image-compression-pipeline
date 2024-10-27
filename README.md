# Image Compression Pipeline with AWS Lambda

This repository contains a serverless image compression pipeline using AWS services. When an image is uploaded to an S3 bucket, a Lambda function is triggered to compress the image (resize to a maximum height and width) and store it in another S3 bucket. The image compression uses the sharp library, which is included as a Lambda layer.

## Architecture

    1.	S3 (Source Bucket): Stores the original images.
    2.	S3 (Destination Bucket): Stores the compressed images.
    3.	Lambda Function: Handles image compression using the sharp library.

## How the Lambda Function Works

The Lambda function is triggered whenever an image is uploaded to the source S3 bucket. It performs the following steps:

    1.	Retrieves the uploaded image from the source bucket.
    2.	Compresses the image using sharp by resizing it to a maximum width and height of 1024 pixels (or any dimensions you specify).
    3.	Uploads the compressed image to the destination bucket.

### Environment Variables

Ensure that the destination bucket name is passed to the Lambda function via environment variables in the CDK stack:

```typescript
environment: {
  DESTINATION_BUCKET: destinationBucket.bucketName,
},
```
