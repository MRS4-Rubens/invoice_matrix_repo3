import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@/lib/db/client';
import { invoices, invoiceLineItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const invoiceId = '28f2c722-500d-4c73-9f20-ce18119b011b';
  const s3Key = 'invoices/2270ff50-930b-4230-800b-24db3d9091a4/2026-27/28f2c722-500d-4c73-9f20-ce18119b011b.pdf';

  try {
    // 1. Delete from iDrive e2
    const endpoint = process.env.IDRIVE_E2_ENDPOINT;
    const region = process.env.IDRIVE_E2_REGION;
    const accessKeyId = process.env.IDRIVE_E2_ACCESS_KEY;
    const secretAccessKey = process.env.IDRIVE_E2_SECRET_KEY;
    const bucketName = process.env.IDRIVE_E2_BUCKET_NAME;

    if (endpoint && region && accessKeyId && secretAccessKey && bucketName) {
      const s3Client = new S3Client({
        endpoint: `https://${endpoint}`,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });
      await s3Client.send(command);
      console.log(`Deleted PDF from iDrive e2: ${s3Key}`);
    } else {
      console.log('Skipping S3 deletion due to missing env vars.');
    }

    // 2. Delete invoice line items
    const deletedLineItems = await db.delete(invoiceLineItems)
      .where(eq(invoiceLineItems.invoice_id, invoiceId))
      .returning();
    console.log(`Deleted ${deletedLineItems.length} line items.`);

    // 3. Delete invoice row
    const deletedInvoices = await db.delete(invoices)
      .where(eq(invoices.id, invoiceId))
      .returning();
    console.log(`Deleted ${deletedInvoices.length} invoices.`);

    console.log('Cleanup complete.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    process.exit(0);
  }
}

main();
