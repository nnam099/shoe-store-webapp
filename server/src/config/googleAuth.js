import 'dotenv/config';

export function getGoogleAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    const error = new Error('GOOGLE_CLIENT_ID is not configured.');
    error.code = 'GOOGLE_AUTH_CONFIGURATION_ERROR';
    throw error;
  }
  return { clientId };
}
