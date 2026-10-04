/**
 * Blob storage: one shared S3 client and the bucket this app stores objects
 * in. Configured entirely from the S3_* environment variables (see
 * `.env.example`), so the same code talks to the local `s3` service from
 * docker-compose.yml in development and to AWS S3 or any S3-compatible
 * provider (Cloudflare R2, Backblaze B2, ...) in production:
 *
 * ```ts
 * import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
 * import { getS3Bucket, getS3Client } from "@/lib/s3";
 *
 * const s3 = getS3Client();
 * await s3.send(new PutObjectCommand({ Bucket: getS3Bucket(), Key: "notes/hello.txt", Body: "Hello!" }));
 * const object = await s3.send(new GetObjectCommand({ Bucket: getS3Bucket(), Key: "notes/hello.txt" }));
 * const text = await object.Body?.transformToString();
 * ```
 *
 * The environment is read on first use rather than at import time, so
 * `next build` does not need S3 credentials.
 */
import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

/** An environment variable, with an empty value treated as unset. */
function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function requireEnv(name: string): string {
  const value = readEnv(name);
  if (value === undefined) {
    throw new Error(`${name} is not set (see .env.example)`);
  }
  return value;
}

function createS3Client(): S3Client {
  const accessKeyId = readEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("S3_SECRET_ACCESS_KEY");
  if ((accessKeyId === undefined) !== (secretAccessKey === undefined)) {
    throw new Error("Set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or neither");
  }

  return new S3Client({
    region: requireEnv("S3_REGION"),
    // Unset for AWS S3; the provider's URL for S3-compatible storage.
    endpoint: readEnv("S3_ENDPOINT"),
    // `http://host/bucket/key` instead of `http://bucket.host/key`. The local
    // service needs it: `localhost` has no per-bucket subdomains.
    forcePathStyle: readEnv("S3_FORCE_PATH_STYLE") === "true",
    // Without static keys the AWS SDK's default credential chain applies
    // (IAM roles, AWS_* variables, ~/.aws), e.g. when running on AWS.
    credentials:
      accessKeyId !== undefined && secretAccessKey !== undefined
        ? { accessKeyId, secretAccessKey }
        : undefined,
  });
}

let client: S3Client | undefined;

/** The shared S3 client; reuses one connection pool across requests. */
export function getS3Client(): S3Client {
  client ??= createS3Client();
  return client;
}

/** The bucket this app stores its objects in (`S3_BUCKET`). */
export function getS3Bucket(): string {
  return requireEnv("S3_BUCKET");
}
