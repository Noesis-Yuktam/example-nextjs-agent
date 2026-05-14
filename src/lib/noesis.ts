import { NoesisClient } from '@noesis-yuktam/sdk';

let client: NoesisClient | null = null;

export function getNoesisClient(): NoesisClient | null {
  if (client) return client;

  const baseUrl = process.env.NOESIS_BASE_URL;
  const apiKey = process.env.NOESIS_API_KEY;

  if (!baseUrl || !apiKey) {
    console.warn('Noesis SDK not configured: NOESIS_BASE_URL or NOESIS_API_KEY missing');
    return null;
  }

  client = new NoesisClient({
    baseUrl,
    apiKey,
    timeout: 30_000,
    retryCount: 3,
    retryDelay: 1_000,
  });

  return client;
}
