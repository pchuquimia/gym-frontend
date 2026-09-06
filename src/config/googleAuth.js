export const googleClientId = String(
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
).trim();

export const isGoogleSignInConfigured = Boolean(googleClientId);
