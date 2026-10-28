export function buildPasswordResetUrl(appBaseUrl, rawToken) {
  return `${appBaseUrl.replace(/\/$/, '')}/reset-password#token=${encodeURIComponent(rawToken)}`;
}
