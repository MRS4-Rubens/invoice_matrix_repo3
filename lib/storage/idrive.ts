import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.IDRIVE_E2_ENDPOINT;
const region = process.env.IDRIVE_E2_REGION;
const accessKeyId = process.env.IDRIVE_E2_ACCESS_KEY;
const secretAccessKey = process.env.IDRIVE_E2_SECRET_KEY;
const bucketName = process.env.IDRIVE_E2_BUCKET_NAME;

if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucketName) {
  throw new Error('Missing one or more required iDrive e2 environment variables: IDRIVE_E2_ENDPOINT, IDRIVE_E2_REGION, IDRIVE_E2_ACCESS_KEY, IDRIVE_E2_SECRET_KEY, IDRIVE_E2_BUCKET_NAME');
}

// S3 client configured with forcePathStyle: true, which is often required for S3-compatible providers like iDrive e2
const s3Client = new S3Client({
  endpoint: `https://${endpoint}`,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

/**
 * Uploads a file buffer to the configured iDrive e2 bucket.
 */
export async function uploadFileToStorage(key: string, body: Buffer, contentType: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

/**
 * Generates a signed URL for downloading an object, expiring in the specified seconds.
 */
export async function getSignedDownloadUrl(key: string, expirySeconds: number = 300): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: expirySeconds });
}

/**
 * Fetches an object from the configured iDrive e2 bucket and returns it as a Buffer.
 */
export async function getFileBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error('No body returned from S3 GetObjectCommand');
  }

  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}
