#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { StephencInfoImageCompressionPipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App();
new StephencInfoImageCompressionPipelineStack(
  app,
  "StephencDevImageCompressionPipelineStack",
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  }
);
