'use client';

import { testServerAction } from './actions';

export default function DevSentryTestPage() {
  const triggerClientError = () => {
    throw new Error('This is a test Client-side error for Sentry verification');
  };

  const triggerServerError = async () => {
    await testServerAction();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sentry Verification Test</h1>
      <div className="space-x-4">
        <button
          onClick={triggerClientError}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Trigger Client Error
        </button>
        <button
          onClick={triggerServerError}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Trigger Server Action Error
        </button>
      </div>
    </div>
  );
}
