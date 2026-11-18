import { describe, it, expect, vi, afterEach } from "vitest";
import { ChalkpadMobileService, AuthenticatedSession } from "./chalkpad-mobile";
import { ChalkpadError, mapSyncError } from "./chalkpad-errors";

const session: AuthenticatedSession = {
  userId: "u1",
  sessionId: "s1",
  roleId: "r1",
  token: "SECRET_TOKEN",
  cookieHeader: "ci_session=SECRET_COOKIE",
};

function stubFetch(res: { status?: number; json?: unknown; badJson?: boolean }) {
  const status = res.status ?? 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (res.badJson) throw new SyntaxError("Unexpected token <");
        return res.json;
      },
    }))
  );
}

async function sync() {
  try {
    await ChalkpadMobileService.fetchAttendanceAuthenticated(session);
    return null;
  } catch (e) {
    return e;
  }
}

afterEach(() => vi.unstubAllGlobals());

describe("session sync failure classification", () => {
  it("HTTP 401 / 403 from Chalkpad => genuine auth rejection => requiresReauth", async () => {
    for (const status of [401, 403]) {
      stubFetch({ status });
      const err = await sync();
      expect(err).toBeInstanceOf(ChalkpadError);
      expect((err as ChalkpadError).kind).toBe("auth");
      expect(mapSyncError(err, true)).toEqual({ status: 401, body: { requiresReauth: true } });
    }
  });

  it("HTTP 5xx => retryable upstream error, NOT reauth", async () => {
    for (const status of [500, 502, 503]) {
      stubFetch({ status });
      const err = await sync();
      expect((err as ChalkpadError).kind).toBe("upstream");
      const mapped = mapSyncError(err, true);
      expect(mapped.status).toBe(502);
      expect(mapped.body).not.toHaveProperty("requiresReauth");
      expect(mapped.body).toHaveProperty("code", "upstream");
    }
  });

  it("empty response (no content) => 'empty', NOT reauth", async () => {
    stubFetch({ json: { status: "1" } });
    const err = await sync();
    expect((err as ChalkpadError).kind).toBe("empty");
    const mapped = mapSyncError(err, true);
    expect(mapped.status).toBe(502);
    expect(mapped.body).not.toHaveProperty("requiresReauth");
  });

  it("non-JSON response => 'malformed', NOT reauth", async () => {
    stubFetch({ badJson: true });
    const err = await sync();
    expect((err as ChalkpadError).kind).toBe("malformed");
    expect(mapSyncError(err, true).body).not.toHaveProperty("requiresReauth");
  });

  it("HTML without subject boxes => 'parse', NOT reauth", async () => {
    stubFetch({ json: { content: "<html><body>Please login</body></html>" } });
    const err = await sync();
    expect((err as ChalkpadError).kind).toBe("parse");
    const mapped = mapSyncError(err, true);
    expect(mapped.status).toBe(502);
    expect(mapped.body).not.toHaveProperty("requiresReauth");
  });

  it("subject boxes present but unparseable => 'parse', NOT reauth", async () => {
    stubFetch({ json: { content: "<div class='tt-box-new'>nothing useful</div>" } });
    const err = await sync();
    expect((err as ChalkpadError).kind).toBe("parse");
  });

  it("well-formed attendance HTML succeeds", async () => {
    const html =
      "<div class='tt-box-new'><div class='tt-period-number'><span>Java</span> <span>CS101</span></div>" +
      "Delivered : 8 Attended : 2 Total Percentage : 25</div>";
    stubFetch({ json: { content: html } });
    const result = await ChalkpadMobileService.fetchAttendanceAuthenticated(session);
    expect(result.payloads).toHaveLength(1);
    expect(result.payloads[0]).toMatchObject({ subjectName: "Java", delivered: 8, attended: 2 });
  });

  it("unknown/network errors in a session sync are not reauth", () => {
    const mapped = mapSyncError(new TypeError("fetch failed"), true);
    expect(mapped.status).toBe(500);
    expect(mapped.body).not.toHaveProperty("requiresReauth");
  });

  it("error responses never leak secrets", async () => {
    stubFetch({ status: 503 });
    const err = await sync();
    const text = JSON.stringify(mapSyncError(err, true)) + (err as Error).message;
    expect(text).not.toContain("SECRET_TOKEN");
    expect(text).not.toContain("SECRET_COOKIE");
  });

  it("non-session (login/OTP) error messages are unchanged", () => {
    expect(mapSyncError(new Error("OTP verification failed (status: 0)."), false).body).toEqual({
      error: "Invalid or expired OTP.",
    });
    expect(mapSyncError(new Error("Chalkpad credential check failed (status: 0)."), false).body).toEqual({
      error: "Invalid credentials or Chalkpad login failed.",
    });
  });
});
