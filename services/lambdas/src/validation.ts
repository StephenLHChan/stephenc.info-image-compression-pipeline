import { LambdaEvent, S3EventRecord } from "./types";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateEnvironmentVariables(): void {
  const destinationBucket = process.env.DESTINATION_BUCKET;

  if (!destinationBucket) {
    throw new ValidationError(
      "DESTINATION_BUCKET environment variable is not set"
    );
  }
}

export function validateS3Event(event: any): LambdaEvent {
  if (!event || !Array.isArray(event.Records)) {
    throw new ValidationError(
      "Invalid event structure: Records array is missing"
    );
  }

  if (event.Records.length === 0) {
    throw new ValidationError("No records found in event");
  }

  const record = event.Records[0] as S3EventRecord;

  if (!record.s3) {
    throw new ValidationError("Invalid S3 event record: s3 object is missing");
  }

  if (!record.s3.bucket || !record.s3.bucket.name) {
    throw new ValidationError(
      "Invalid S3 event record: bucket name is missing"
    );
  }

  if (!record.s3.object || !record.s3.object.key) {
    throw new ValidationError("Invalid S3 event record: object key is missing");
  }

  return event as LambdaEvent;
}

export function validateImageKey(key: string): void {
  if (!key) {
    throw new ValidationError("Image key is empty");
  }

  // Check if the key is in the photos/ prefix
  if (!key.startsWith("photos/")) {
    throw new ValidationError(
      `Image key '${key}' is not in the photos/ prefix`
    );
  }

  // Check for valid image extensions
  const validExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".tiff",
  ];
  const hasValidExtension = validExtensions.some(ext =>
    key.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    throw new ValidationError(
      `Image key '${key}' does not have a valid image extension`
    );
  }
}
