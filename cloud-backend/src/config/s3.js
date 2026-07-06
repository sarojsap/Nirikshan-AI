import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.S3_BUCKET || 'nirikshan-incidents';

let s3 = null;

function getS3() {
  if (s3) return s3;
  if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
    return null;
  }
  s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
  });
  return s3;
}

export async function generateUploadUrl(key, contentType, expiresIn = 3600) {
  const client = getS3();
  if (!client) throw new Error('S3 not configured');

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function generateDownloadUrl(key, expiresIn = 3600) {
  const client = getS3();
  if (!client) return null;

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export { BUCKET };
