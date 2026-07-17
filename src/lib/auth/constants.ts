export const SESSION_COOKIE = "mcycle_session";
export const SESSION_MAX_AGE_DAYS = 30;
export const DEFAULT_RP_ID = process.env.WEBAUTHN_RP_ID ?? "localhost";
export const DEFAULT_RP_ORIGIN =
  process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";
