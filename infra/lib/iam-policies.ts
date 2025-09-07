import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

export class IAMPolicies {
  static createLambdaExecutionRole(
    scope: any,
    id: string,
    sourceBucket: s3.Bucket,
    destinationBucket: s3.Bucket
  ): iam.Role {
    const role = new iam.Role(scope, id, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    // Grant read access to source bucket
    sourceBucket.grantRead(role);

    // Grant write access to destination bucket
    destinationBucket.grantWrite(role);

    // Add CloudWatch Logs permissions
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    return role;
  }

  static createHomepageUserPolicy(
    scope: any,
    id: string,
    destinationBucket: s3.Bucket
  ): iam.Policy {
    return new iam.Policy(scope, id, {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "s3:GetObject",
            "s3:GetObjectMetadata",
            "s3:GetObjectVersion",
          ],
          resources: [`${destinationBucket.bucketArn}/*`],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "s3:ListBucket",
            "s3:ListBucketMultipartUploads",
            "s3:ListMultipartUploadParts",
          ],
          resources: [destinationBucket.bucketArn],
          conditions: {
            StringLike: {
              "s3:prefix": ["photos/*"],
            },
          },
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:ListBucket"],
          resources: [destinationBucket.bucketArn],
          conditions: {
            StringEquals: {
              "s3:prefix": ["photos/"],
            },
          },
        }),
      ],
    });
  }

  static createS3BucketPolicy(
    scope: any,
    id: string,
    bucket: s3.Bucket,
    allowedOrigins: string[] = ["*"]
  ): iam.Policy {
    return new iam.Policy(scope, id, {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.AnyPrincipal()],
          actions: ["s3:GetObject"],
          resources: [`${bucket.bucketArn}/*`],
          conditions: {
            StringEquals: {
              "s3:ExistingObjectTag/public": "true",
            },
          },
        }),
      ],
    });
  }
}
