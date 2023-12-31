import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

export class AwsGithubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const provider = new iam.CfnOIDCProvider(this, "GitHubOIDC", {
      url: "https://token.actions.githubusercontent.com",
      clientIdList: ["sts.amazonaws.com"],
      thumbprintList: ["ffffffffffffffffffffffffffffffffffffffff"],
      // Note that the thumbprint has been set to all F's because the thumbprint is not used when authenticating token.actions.githubusercontent.com.
      // Instead, IAM uses its library of trusted CAs to authenticate. However, this value is still required by the API.
    });

    const principal = new iam.WebIdentityPrincipal(provider.attrArn, {
      StringLike: {
        // Only allow specified subjects to assume this role
        ["token.actions.githubusercontent.com:sub"]:
          "repo:WarFox/deepumohan.com:*",
      },
      StringEquals: {
        ["token.actions.githubusercontent.com:aud"]: "sts.amazonaws.com",
      },
    });

    const ghActionsRole = new iam.Role(this, "GHActionsRole", {
      roleName: "GitHubActionsRole",
      description: "Role used by github actions",
      assumedBy: principal,
    });

    const StagingBucket = s3.Bucket.fromBucketArn(
      this,
      "StagingBucket",
      "arn:aws:s3:::staging.deepumohan.com"
    );

    const ProductionBucket = s3.Bucket.fromBucketArn(
      this,
      "ProductionBucket",
      "arn:aws:s3:::deepumohan.com"
    );

    StagingBucket.grantWrite(ghActionsRole);
    ProductionBucket.grantWrite(ghActionsRole);
  }
}
