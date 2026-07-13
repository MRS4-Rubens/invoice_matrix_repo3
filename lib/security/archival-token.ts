import crypto from 'crypto';

const SECRET = process.env.ARCHIVAL_SIGNING_SECRET;

if (!SECRET) {
  throw new Error('Missing ARCHIVAL_SIGNING_SECRET environment variable');
}

/**
 * Generates a signed token to authorize access to the archival render route.
 */
export function createArchivalToken(invoiceId: string, expiresInSeconds = 600): string {
  const expiryTimestamp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${invoiceId}.${expiryTimestamp}`;
  
  const signature = crypto
    .createHmac('sha256', SECRET!)
    .update(payload)
    .digest('base64url');
    
  return `${payload}.${signature}`;
}

/**
 * Verifies the archival token and ensures it hasn't expired.
 */
export function verifyArchivalToken(token: string): { valid: boolean; invoiceId?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };
    
    const [invoiceId, expiryStr, signature] = parts;
    const expiryTimestamp = parseInt(expiryStr, 10);
    
    if (isNaN(expiryTimestamp) || Math.floor(Date.now() / 1000) > expiryTimestamp) {
      return { valid: false };
    }
    
    const payload = `${invoiceId}.${expiryTimestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', SECRET!)
      .update(payload)
      .digest('base64url');
      
    if (signature !== expectedSignature) {
      return { valid: false };
    }
    
    return { valid: true, invoiceId };
  } catch (error) {
    return { valid: false };
  }
}
