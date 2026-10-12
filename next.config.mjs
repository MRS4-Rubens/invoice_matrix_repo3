import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost', 'localhost:3000', '127.0.0.1:3000'],
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
}

export default withSentryConfig(nextConfig, {
  org: "bill-matrix",
  project: "bill-matrix",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
