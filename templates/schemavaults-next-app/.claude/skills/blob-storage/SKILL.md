---
name: blob-storage
description: Use when storing, reading, listing or deleting files or blobs — uploads, images, documents, exports, attachments, anything that belongs in object storage rather than Postgres. The app has an S3 client pre-configured in src/lib/s3.ts (@aws-sdk/client-s3), backed by a local S3-compatible service (RustFS) from docker-compose.yml in development and by AWS S3 or any S3-compatible provider in production.
---

# Blob storage (S3)

`src/lib/s3.ts` is the only place the S3 client is configured:

| Export | What it is |
| --- | --- |
| `getS3Client()` | The shared `S3Client` (one connection pool for the whole server) |
| `getS3Bucket()` | The bucket to use (`S3_BUCKET`) |

Use them with the command classes from `@aws-sdk/client-s3`. Never construct
another `S3Client` or read the `S3_*` variables elsewhere. The module imports
`server-only`: call it from route handlers / API operations, server components
and server actions — never from client components.

## Configuration

Read from the environment on first use (so `next build` needs none of it):

| Variable | Meaning |
| --- | --- |
| `S3_ENDPOINT` | Empty for AWS S3; the provider's URL otherwise (`http://localhost:9000` locally) |
| `S3_REGION` | Required (`us-east-1` locally; `auto` for Cloudflare R2) |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Both or neither; neither = the AWS SDK's default credential chain (IAM role, ...) |
| `S3_BUCKET` | Required |
| `S3_FORCE_PATH_STYLE` | `"true"` for path-style URLs (required locally) |

`.env.local` already points at the local service; `.env.example` lists the
variables to set in production.

## Local development

```bash
docker compose up -d --wait s3   # S3 API on :9000; creates the dev-bucket bucket
bun run dev
```

Browse objects at http://localhost:9001/rustfs/console/ (access key
`s3-dev-access-key`, secret key `s3-dev-secret-key`). Objects persist in the
`s3-data` volume; `docker compose down -v` wipes them.

## Recipes

```ts
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client } from "@/lib/s3";

const s3 = getS3Client();
const Bucket = getS3Bucket();

// Write (Body: string | Uint8Array | Blob | ReadableStream)
await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: bytes, ContentType: "image/png" }));

// Read — stream large objects instead of buffering them
try {
  const object = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  const text = await object.Body!.transformToString();       // small objects
  // const stream = object.Body!.transformToWebStream();     // large objects
} catch (error) {
  if (!(error instanceof NoSuchKey)) throw error;
  // missing object: answer 404
}

// List (paginate with ContinuationToken while IsTruncated) and delete
const page = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: `users/${uid}/` }));
await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
```

`HeadObjectCommand` on a missing key throws `NotFound` (not `NoSuchKey`).

## Browser uploads and downloads: presigned URLs

Don't proxy file bytes through API operations. Return a short-lived presigned
URL as JSON (`ctx.json(200, { url })`, see the `api-routes` skill) and let the
browser `PUT` to / `GET` from storage directly. This needs one more package,
pinned to the same version as `@aws-sdk/client-s3` in `package.json`:

```bash
bun add @aws-sdk/s3-request-presigner@<the @aws-sdk/client-s3 version>
```

```ts
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const uploadUrl = await getSignedUrl(
  getS3Client(),
  new PutObjectCommand({ Bucket: getS3Bucket(), Key: key, ContentType: contentType }),
  { expiresIn: 300 }, // seconds
);
// browser: fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": contentType } })

const downloadUrl = await getSignedUrl(
  getS3Client(),
  new GetObjectCommand({ Bucket: getS3Bucket(), Key: key }),
  { expiresIn: 300 },
);
```

The URL's host is `S3_ENDPOINT`, so it must be reachable from the browser
(`http://localhost:9000` is when running `bun run dev`; the `http://s3:9000`
the docker-compose `app` container uses is not). Uploading with `fetch` from
another origin also requires a CORS rule on the bucket.

## Rules

- Protect object access with the same auth as the data it belongs to: put
  presigned-URL operations behind `authenticatedAccess()` and check that the
  caller owns the key before signing.
- Generate keys server-side (e.g. `` `users/${uid}/${crypto.randomUUID()}` ``);
  never use a client-supplied filename or path as the key. Keep the original
  filename in metadata or the database.
- Store the key and its metadata (owner, content type, size) in Postgres; S3
  only holds the bytes.
- Keep the bucket private; expose objects through presigned URLs, not public
  ACLs.
