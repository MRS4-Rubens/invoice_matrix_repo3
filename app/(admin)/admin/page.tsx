import type { Metadata } from 'next';

import { AdminConsole } from './admin-console';
import { getAdminDashboardStats } from '@/lib/actions/subscriptions/get-admin-dashboard-stats';
import { getPendingRequests } from '@/lib/actions/subscriptions/get-pending-requests';
import { getAllBusinesses } from '@/lib/actions/subscriptions/get-all-businesses';
import { getAllUsers } from '@/lib/actions/subscriptions/get-all-users';
import { getSignedDownloadUrl } from '@/lib/storage/idrive';

export const metadata: Metadata = {
  title: 'Platform Admin Console',
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // 1. Trigger Server Actions in parallel
  const [statsRes, pendingRes, businessesRes, usersRes] = await Promise.all([
    getAdminDashboardStats({}),
    getPendingRequests({}),
    getAllBusinesses({}),
    getAllUsers({}),
  ]);

  // 2. Error handling if any action fails
  if (!statsRes.success || !pendingRes.success || !businessesRes.success || !usersRes.success) {
    return (
      <div className="w-full">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-rose-700 dark:text-rose-400">
          <h2 className="text-lg font-bold">Failed to load administrative console</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Please make sure you have appropriate admin privileges configured in process.env.PLATFORM_ADMIN_EMAILS.
          </p>
        </div>
      </div>
    );
  }

  const stats = statsRes.data;
  const pendingRaw = pendingRes.data;
  const businessesRaw = businessesRes.data;
  const usersRaw = usersRes.data;

  // 3. Resolve S3 signed URLs for payment screenshot images server-side (7 days validity)
  const pendingRequests = await Promise.all(
    pendingRaw.map(async (req) => {
      let screenshotUrl = null;
      if (req.screenshotStorageKey) {
        try {
          screenshotUrl = await getSignedDownloadUrl(req.screenshotStorageKey, 604800);
        } catch (e) {
          console.error('[AdminPage] Failed to generate signed URL:', e);
        }
      }
      return {
        ...req,
        screenshotUrl,
        createdAt: req.createdAt.toISOString(),
      };
    })
  );

  // 4. Serialize date columns to ISO strings
  const businessesProp = businessesRaw.map((b) => ({
    ...b,
    subscriptionEndsAt: b.subscriptionEndsAt ? b.subscriptionEndsAt.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
  }));

  const usersProp = usersRaw.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  // 5. Pass down payee UPI and bank details from environment variables
  const upiConfig = {
    upiId: process.env.ADMIN_UPI_ID || 'admin@okaxis',
    upiName: process.env.ADMIN_UPI_NAME || 'Bill Matrix Billing',
    bankName: process.env.ADMIN_BANK_NAME || 'State Bank of India',
    accName: process.env.ADMIN_BANK_ACC_NAME || 'Bill Matrix Admin',
    accNo: process.env.ADMIN_BANK_ACC_NO || '12345678901',
    ifsc: process.env.ADMIN_BANK_IFSC || 'SBIN0001234',
  };

  const adminEmailsEnv = process.env.PLATFORM_ADMIN_EMAILS || '';

  return (
    <div className="w-full pb-12">
      <AdminConsole
        stats={stats}
        pendingRequests={pendingRequests}
        businesses={businessesProp}
        users={usersProp}
        upiConfig={upiConfig}
        adminEmailAllowlist={adminEmailsEnv}
      />
    </div>
  );
}
