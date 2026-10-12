import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { businesses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getFileBuffer } from '@/lib/storage/idrive';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse('Business ID required', { status: 400 });
    }

    const businessRows = await db
      .select({ logo_storage_key: businesses.logo_storage_key })
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1);

    if (businessRows.length === 0 || !businessRows[0].logo_storage_key) {
      return new NextResponse('Logo not found', { status: 404 });
    }

    const storageKey = businessRows[0].logo_storage_key;
    const buffer = await getFileBuffer(storageKey);

    let contentType = 'image/png';
    const lowerKey = storageKey.toLowerCase();
    if (lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (lowerKey.endsWith('.webp')) {
      contentType = 'image/webp';
    } else if (lowerKey.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching logo:', error);
    return new NextResponse('Failed to load logo', { status: 500 });
  }
}
