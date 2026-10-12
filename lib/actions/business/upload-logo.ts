'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { businesses } from '@/lib/db/schema';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/storage/idrive';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { canUploadBusinessLogo } from '@/lib/subscriptions/entitlements';

const uploadLogoSchema = z.object({
  base64Data: z.string().min(1, 'Image data is required'),
  mimeType: z.string().refine(
    (type) => ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(type.toLowerCase()),
    { message: 'Only PNG, JPEG, and WebP images are supported.' }
  ),
  fileName: z.string().optional(),
});

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const uploadBusinessLogo = createAuthenticatedAction(
  uploadLogoSchema,
  async (input, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError('No business linked to your account. Please complete business setup first.', {
        code: 'NO_BUSINESS',
      });
    }

    // 1. Check existing business and entitlement
    const existing = await db
      .select({
        logo_storage_key: businesses.logo_storage_key,
        subscription_plan: businesses.subscription_plan,
        subscription_status: businesses.subscription_status,
        trial_ends_at: businesses.trial_ends_at,
        subscription_ends_at: businesses.subscription_ends_at,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (existing.length === 0) {
      throw new ActionError('Business profile not found.', { code: 'NOT_FOUND' });
    }

    const logoCheck = canUploadBusinessLogo(existing[0]);
    if (!logoCheck.allowed) {
      throw new ActionError(logoCheck.reason || 'Custom logo branding is an Essentials Pro feature.', {
        code: logoCheck.code || 'LOGO_UPLOAD_LOCKED',
      });
    }

    // Clean base64 header if present
    const base64Clean = input.base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new ActionError('Image size exceeds the 5MB limit. Please compress or choose a smaller image.', {
        code: 'FILE_TOO_LARGE',
      });
    }

    // Delete previous logo from iDrive E2 if present
    if (existing[0]?.logo_storage_key) {
      try {
        await deleteFileFromStorage(existing[0].logo_storage_key);
      } catch (delError) {
        console.warn('Failed to delete previous logo from storage:', delError);
      }
    }

    // 2. Determine file extension
    let extension = '.png';
    const lowerMime = input.mimeType.toLowerCase();
    if (lowerMime.includes('jpeg') || lowerMime.includes('jpg')) {
      extension = '.jpg';
    } else if (lowerMime.includes('webp')) {
      extension = '.webp';
    }

    const storageKey = `logos/${businessId}/logo-${Date.now()}${extension}`;

    // 3. Upload to iDrive E2
    try {
      await uploadFileToStorage(storageKey, buffer, input.mimeType);
    } catch (uploadError) {
      console.error('Failed to upload logo to iDrive E2:', uploadError);
      throw new ActionError('Failed to upload image to cloud storage. Please check your storage configuration.', {
        code: 'STORAGE_UPLOAD_FAILED',
      });
    }

    // 4. Update database
    try {
      await db
        .update(businesses)
        .set({
          logo_storage_key: storageKey,
          updated_at: new Date(),
        })
        .where(eq(businesses.id, businessId));
    } catch (dbError) {
      console.error('Failed to update business logo in DB:', dbError);
      throw new ActionError('Failed to update business profile record.', {
        code: 'DB_UPDATE_FAILED',
      });
    }

    revalidatePath('/settings');
    revalidatePath('/invoices');
    revalidatePath('/dashboard');

    return {
      storageKey,
      logoUrl: `/api/business/${businessId}/logo?t=${Date.now()}`,
    };
  },
  'upload-business-logo'
);
