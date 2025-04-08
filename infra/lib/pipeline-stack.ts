import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as path from "path";

export class StephencInfoImageCompressionPipelineStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceBucket = new s3.Bucket(this, "SourceBucket", {
      bucketName: "stephenc.info-source-bucket",
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(1),
          noncurrentVersionExpiration: cdk.Duration.days(1),
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const destinationBucket = new s3.Bucket(this, "DestinationBucket", {
      bucketName: "stephenc.info-destination-bucket",
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      versioned: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(7),
          noncurrentVersionExpiration: cdk.Duration.days(7),
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const compressImageLambda = new lambda.Function(
      this,
      "CompressImageLambda",
      {
        functionName: "stephenc-info-compress-image-lambda",
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        timeout: cdk.Duration.seconds(60),
        memorySize: 1024,
        retryAttempts: 2,
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../services/lambdas/dist")
        ),
        environment: {
          DESTINATION_BUCKET: destinationBucket.bucketName,
          NODE_OPTIONS: "--max-old-space-size=512",
        },
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    );

    sourceBucket.grantRead(compressImageLambda);
    destinationBucket.grantWrite(compressImageLambda);

    sourceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(compressImageLambda),
      {
        prefix: "images/",
      }
    );

    new cdk.CfnOutput(this, "SourceBucketName", {
      value: sourceBucket.bucketName,
      description: "Name of the source bucket",
    });

    new cdk.CfnOutput(this, "DestinationBucketName", {
      value: destinationBucket.bucketName,
      description: "Name of the destination bucket",
    });
  }
}
