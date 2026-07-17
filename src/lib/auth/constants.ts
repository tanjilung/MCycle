export const SESSION_COOKIE = "mcycle_session";
export const SESSION_MAX_AGE_DAYS = 30;

const fallbackOrigin = "http://localhost:3000";
export const DEFAULT_RP_ORIGIN = process.env.WEBAUTHN_ORIGIN ?? fallbackOrigin;

function rpIdFromOrigin(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return "localhost";
  }
}

export const DEFAULT_RP_ID =
  process.env.WEBAUTHN_RP_ID ?? rpIdFromOrigin(DEFAULT_RP_ORIGIN);
