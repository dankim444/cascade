/**
 * Set VITE_API_BASE_URL in frontend/.env.local to hit a remote backend, e.g.:
 *   VITE_API_BASE_URL=http://YOUR_EC2_PUBLIC_IP:8000
 * Optional: VITE_WS_BASE_URL=ws://YOUR_EC2_PUBLIC_IP:8000 (defaults from HTTP URL)
 */
const trimmed = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
  /\/$/,
  ''
);
export const API_BASE_URL = trimmed || 'http://localhost:8000';

const wsRaw = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.replace(
  /\/$/,
  ''
);
const wsOverride = wsRaw
  ? wsRaw.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:')
  : '';
export const WS_BASE_URL =
  wsOverride ||
  API_BASE_URL.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
