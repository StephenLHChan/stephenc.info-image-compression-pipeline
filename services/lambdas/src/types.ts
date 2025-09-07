export interface S3EventRecord {
  s3: {
    bucket: {
      name: string;
    };
    object: {
      key: string;
    };
  };
}

export interface LambdaEvent {
  Records: S3EventRecord[];
}

export interface LambdaResponse {
  statusCode: number;
  body: {
    message: string;
    originalKey: string;
    newDimensions: {
      width: number;
      height: number;
    };
    destinationUrl: string;
  };
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  quality: number;
}

export interface ProcessingResult {
  success: boolean;
  originalKey: string;
  newDimensions: {
    width: number;
    height: number;
  };
  processedBuffer?: Buffer;
  destinationUrl?: string;
  error?: string;
}
