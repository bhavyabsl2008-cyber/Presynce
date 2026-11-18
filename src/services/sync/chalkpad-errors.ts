/**
 * Classified Chalkpad failures. Only "auth" is reliable evidence that the
 * upstream session was rejected; every other kind is a retryable or
 * diagnosable problem that must NOT ask the user to log in again.
 */
export type ChalkpadErrorKind =
  | "auth" // upstream answered HTTP 401/403
  | "upstream" // upstream HTTP 5xx / other non-OK status or network failure
  | "malformed" // response body was not the JSON/HTML we expect
  | "empty" // JSON received but without attendance content
  | "parse"; // content received but no subjects could be parsed

export class ChalkpadError extends Error {
  readonly kind: ChalkpadErrorKind;
  readonly status?: number;

  constructor(kind: ChalkpadErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ChalkpadError";
    this.kind = kind;
    this.status = status;
  }
}

export interface SyncErrorResponse {
  status: number;
  body: { requiresReauth: true } | { error: string; code?: ChalkpadErrorKind };
}

/** Local session-token problems (cannot decrypt / past 24h TTL): genuine expiry. */
export const SESSION_REAUTH_RESPONSE: SyncErrorResponse = {
  status: 401,
  body: { requiresReauth: true },
};

/**
 * Maps an error thrown while syncing to an HTTP response.
 * Messages are fixed strings: no credentials, cookies, tokens or upstream
 * content are ever echoed.
 */
export function mapSyncError(error: unknown, isSessionBased: boolean): SyncErrorResponse {
  if (error instanceof ChalkpadError && isSessionBased) {
    switch (error.kind) {
      case "auth":
        return SESSION_REAUTH_RESPONSE;
      case "upstream":
        return {
          status: 502,
          body: { error: "Chalkpad is temporarily unavailable. Please try again shortly.", code: "upstream" },
        };
      case "empty":
        return {
          status: 502,
          body: { error: "Chalkpad returned no attendance data. Please try again shortly.", code: "empty" },
        };
      case "malformed":
        return {
          status: 502,
          body: { error: "Chalkpad returned an unreadable response. Please try again shortly.", code: "malformed" },
        };
      case "parse":
        return {
          status: 502,
          body: { error: "Could not read attendance data from Chalkpad. Your session is still saved.", code: "parse" },
        };
    }
  }

  if (error instanceof Error) {
    const m = error.message;
    if (
      m.includes("login failed") ||
      m.includes("login request failed") ||
      m.includes("credential check failed") ||
      m.includes("HTTP 401") ||
      m.includes("status: 401") ||
      m.includes("invalid JSON on login")
    ) {
      return { status: 500, body: { error: "Invalid credentials or Chalkpad login failed." } };
    }
    if (m.includes("OTP verification failed")) {
      return { status: 500, body: { error: "Invalid or expired OTP." } };
    }
    if (m.includes("no attendance content") || m.includes("parsed")) {
      return { status: 500, body: { error: "Could not parse attendance data from Chalkpad." } };
    }
    return { status: 500, body: { error: "An unexpected error occurred while communicating with Chalkpad." } };
  }
  return { status: 500, body: { error: "An unexpected error occurred." } };
}
