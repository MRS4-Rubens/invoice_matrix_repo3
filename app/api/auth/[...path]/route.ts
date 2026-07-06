import { auth } from '@/lib/auth/server';

// This single catch-all route handles all Neon Auth API calls (sign-in, sign-up, session refresh, etc.) — do not add other logic here.
export const { GET, POST } = auth.handler();
