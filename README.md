# AWS Image Compression Pipeline

An automated image compression pipeline built with AWS CDK that processes images uploaded to an S3 bucket, compresses them to a maximum dimension of 4096px, and stores them in a destination bucket for web delivery.

## Architecture

The pipeline consists of the following components:

- **Source S3 Bucket**: Where original images are uploaded (with `photos/` prefix)
- **Destination S3 Bucket**: Where compressed images are stored for web delivery
- **Lambda Function**: Processes images using Sharp library with comprehensive error handling
- **S3 Event Notifications**: Triggers Lambda on new image uploads
- **CloudWatch Monitoring**: Alarms, metrics, and dashboards for observability
- **SNS Notifications**: Error alerts and monitoring notifications

### Flow

1. User uploads an image to the source bucket with `photos/` prefix
2. S3 event notification triggers the Lambda function
3. Lambda processes the image:
   - Resizes to max 4096px on the longer side
   - Converts to JPEG format with 80% quality
   - Maintains aspect ratio
   - Implements retry logic for transient failures
4. Compressed image is saved to the destination bucket with public read access
5. CloudWatch metrics are recorded for monitoring

## Features

- **Automatic Image Processing**: Resizes and compresses images on upload
- **Format Conversion**: Converts all images to JPEG format for consistency
- **Retry Logic**: Handles transient failures with exponential backoff
- **Comprehensive Monitoring**: CloudWatch alarms, metrics, and dashboards
- **Error Handling**: Detailed error classification and logging
- **Security**: Least-privilege IAM roles and policies
- **Testing**: Comprehensive unit and integration tests

## Prerequisites

- Node.js 20.x or later
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed globally
- TypeScript 5.x or later

## Quick Start

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Deploy the entire pipeline**:

   ```bash
   npm run deploy
   ```

3. **Upload images**:
   - Upload images to the source bucket with `photos/` prefix
   - Compressed images will automatically appear in the destination bucket

## Available Scripts

- `npm run deploy` - Full deployment (build Lambda + deploy infrastructure)
- `npm run cleanup` - Remove all deployed resources
- `npm run build-lambda` - Build Lambda function only
- `npm run deploy-infra` - Deploy infrastructure only
- `npm test` - Run all tests
- `npm run build` - Build TypeScript code

## Project Structure

```
├── services/lambdas/          # Lambda function code
│   ├── src/                   # Source code
│   │   ├── handler.ts         # Main Lambda handler
│   │   ├── imageProcessor.ts  # Image processing logic
│   │   ├── s3Service.ts       # S3 operations
│   │   ├── errorHandler.ts    # Error handling and retry logic
│   │   ├── metrics.ts         # CloudWatch metrics
│   │   ├── validation.ts      # Input validation
│   │   └── logger.ts          # Logging utilities
│   ├── tests/                 # Test files
│   └── package.json           # Lambda dependencies
├── infra/                     # CDK infrastructure
│   ├── lib/
│   │   ├── pipeline-stack.ts  # Main CDK stack
│   │   └── iam-policies.ts    # IAM policies
│   └── package.json           # CDK dependencies
├── scripts/
│   └── deploy.sh              # Deployment script
└── docs/specs/                # Documentation
    └── photo-compression-pipeline/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

## Configuration

### Lambda Function

- Runtime: Node.js 20.x
- Memory: 1024MB
- Timeout: 60 seconds
- Retry attempts: 2 (with exponential backoff)
- Environment variables: `DESTINATION_BUCKET`

### S3 Buckets

- **Source Bucket**: `stephenc-dev-photos-raw`

  - Versioning: Enabled
  - Lifecycle: Clean up versions after 1 day
  - Encryption: S3 managed encryption
  - Public access: Blocked
  - Event notifications: Triggers Lambda on `photos/` prefix

- **Destination Bucket**: `stephenc-dev-photos`
  - Versioning: Enabled
  - Lifecycle: Clean up versions after 7 days
  - Encryption: S3 managed encryption
  - CORS: Enabled for web access
  - Public access: Blocked (except for Lambda and homepage user)

### Monitoring

- **CloudWatch Alarms**:

  - Lambda errors (threshold: 1 error in 5 minutes)
  - Lambda duration (threshold: 45 seconds average)
  - SNS notifications for alarm triggers

- **Custom Metrics**:

  - Image processing time
  - Compression ratio
  - Size reduction
  - Error rates by type

- **Dashboard**: `ImageCompressionPipeline` in CloudWatch

## Security

- **IAM Roles**: Least-privilege access for Lambda and homepage user
- **Data Protection**: All data encrypted at rest with S3 managed encryption
- **Access Control**: Homepage user has read-only access to destination bucket
- **Network Security**: All S3 buckets are private with controlled access

## Error Handling

The system implements comprehensive error handling:

- **Error Classification**: Validation, S3, Image Processing, Network, Unknown
- **Retry Logic**: Automatic retry for transient errors with exponential backoff
- **Error Metrics**: CloudWatch metrics for error tracking
- **Logging**: Structured logging with context and error details

## Testing

Run the test suite:

```bash
npm test
```

Test coverage includes:

- Unit tests for all modules
- Integration tests for S3 operations
- Error handling and retry logic tests
- Validation tests for input processing

## Development

### Local Testing

1. **Test Lambda function**:

   ```bash
   cd services/lambdas
   npm test
   ```

2. **Build and deploy**:
   ```bash
   npm run build-lambda
   npm run deploy-infra
   ```

### Modifying the Pipeline

1. Update Lambda code in `services/lambdas/src/`
2. Update infrastructure in `infra/lib/`
3. Run tests: `npm test`
4. Deploy: `npm run deploy`

## Monitoring and Troubleshooting

### CloudWatch Dashboard

Access the dashboard at: `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=ImageCompressionPipeline`

### Key Metrics to Monitor

- **Lambda Invocations**: Number of image processing requests
- **Lambda Errors**: Processing failures
- **Lambda Duration**: Processing time per image
- **Memory Utilization**: Lambda memory usage
- **Custom Metrics**: Compression ratios and processing statistics

### Common Issues

1. **Images not processing**: Check S3 event notifications and Lambda logs
2. **High error rates**: Review error logs and retry patterns
3. **Slow processing**: Monitor memory utilization and duration metrics
4. **Permission errors**: Verify IAM roles and bucket policies

## Cleanup

To remove all resources:

```bash
npm run cleanup
```

This will destroy the entire CDK stack and all associated resources.

## License

MIT
