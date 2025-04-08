# AWS Image Compression Pipeline

An automated image compression pipeline built with AWS CDK that processes images uploaded to an S3 bucket, compresses them to a maximum dimension of 4096px, and stores them in a destination bucket.

## Architecture

The pipeline consists of the following components:

- **Source S3 Bucket**: Where original images are uploaded
- **Destination S3 Bucket**: Where compressed images are stored
- **Lambda Function**: Processes images using Sharp library
- **S3 Event Notifications**: Triggers Lambda on new image uploads

### Flow

1. User uploads an image to the source bucket
2. S3 event notification triggers the Lambda function
3. Lambda processes the image:
   - Resizes to max 4096px on the longer side
   - Converts to WebP format
   - Maintains aspect ratio
4. Compressed image is saved to the destination bucket

## Prerequisites

- Node.js 20.x or later
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally
- TypeScript 5.x or later

## Setup

1. Install dependencies:

   ```bash
   # Install Lambda dependencies
   cd services/lambdas
   npm install

   # Install CDK dependencies
   cd ../../infra
   npm install
   ```

2. Build the Lambda function:

   ```bash
   cd services/lambdas
   npm run build
   ```

3. Deploy the stack:
   ```bash
   cd infra
   cdk bootstrap  # First time only
   cdk deploy
   ```

## Usage

1. Upload images to the source bucket:

   - Bucket name: `stephenc.info-source-bucket`
   - Place images in the `images/` prefix
   - Supported formats: JPEG, PNG, WebP, etc.

2. The pipeline will automatically:
   - Process the image
   - Save the compressed version to the destination bucket
   - Use the same key as the original image

## Configuration

### Lambda Function

- Runtime: Node.js 20.x
- Memory: 1024MB
- Timeout: 60 seconds
- Retry attempts: 2

### S3 Buckets

- Versioning: Enabled
- Lifecycle rules: Clean up versions after 1 day
- Encryption: S3 managed encryption
- Public access: Blocked

## Development

### Local Testing

To test the Lambda function locally:

1. Create a test event in `services/lambdas/test/`:

   ```json
   {
     "Records": [
       {
         "s3": {
           "bucket": {
             "name": "your-source-bucket"
           },
           "object": {
             "key": "images/test.jpg"
           }
         }
       }
     ]
   }
   ```

2. Run the test:
   ```bash
   cd services/lambdas
   npm run test
   ```

### Modifying the Pipeline

1. Update Lambda code in `services/lambdas/index.ts`
2. Update infrastructure in `infra/lib/pipeline-stack.ts`
3. Rebuild and deploy:
   ```bash
   cd services/lambdas
   npm run build
   cd ../../infra
   cdk deploy
   ```

## Monitoring

- CloudWatch Logs: Lambda function logs
- X-Ray: Request tracing
- S3 metrics: Bucket operations

## Security

- All S3 buckets are private
- Lambda has minimal IAM permissions
- Data is encrypted at rest
- Versioning enabled for data protection

## Cleanup

To remove all resources:

```bash
cd infra
cdk destroy
```

## License

MIT
