import crypto from "crypto";
import { ChalkpadBridgePayload } from "./types";

// ============================================================================
// CHALKPAD MOBILE API SERVICE
// ============================================================================

const CHALKPAD_BASE_URL = "https://cu.chalkpad.in/mobileApi";
const LOGIN_URL = `${CHALKPAD_BASE_URL}/appLoginAuthV2`;
const VERIFY_OTP_URL = `${CHALKPAD_BASE_URL}/verifyOtp`;
const ATTENDANCE_URL = `${CHALKPAD_BASE_URL}/commonPage`;
const MULTI_FACTOR_AUTH_URL = `${CHALKPAD_BASE_URL}/multiFactorAuth`;

// 564 corresponds to the "Attendance" page in Chalkpad's mobile app layout
const PAGE_ID = "564";

// Both the legitimate and legacy flow require a device ID.
const DEVICE_ID = "88437E4C-4E1D-4104-964A-7DE41B163E06";

const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

/**
 * Transient state generated when the server responds with status "4" (OTP required).
 * This is passed opaquely back to the API route; the client never sees it
 * directly  the route serialises it into a short-lived server-side token.
 */
export interface OtpPendingState {
  /** userId from appLoginAuthV2 response  passed to verifyOtp as authUserId */
  userId: string;
  /** sessionId from appLoginAuthV2 response (academic semester integer as string) */
  sessionId: string;
  /** roleId from appLoginAuthV2 response */
  roleId: string;
  /** Human-readable name (for diagnostics only) */
  name: string;
  /**
   * Cookies from the login response, forwarded on every subsequent request
   * in the same sequence (multiFactorAuth, verifyOtp, commonPage).
   * Stored as a single Cookie header string: "ci_session=; PHPSESSID="
   */
  cookieHeader: string;
}

/**
 * Fully authenticated session state produced after OTP verification.
 * Contains everything needed to call commonPage.
 */
export interface AuthenticatedSession {
  userId: string;
  sessionId: string;
  roleId: string;
  /** User-specific security token returned by verifyOtp  used as securityToken in commonPage */
  token: string;
  cookieHeader: string;
}

export class ChalkpadMobileService {
  
  // -----------------------------------------------------------------------------
  // LEGITIMATE OTP FLOW
  // -----------------------------------------------------------------------------

  /**
   * Step 1 of the OTP flow.
   *
   * Posts credentials to appLoginAuthV2. When the server responds with
   * status "4" (OTP required), captures the user fields and session cookies,
   * then fires the stateless multiFactorAuth probe (which causes the server
   * to dispatch the OTP SMS/email to the user). Returns an OtpPendingState
   * that the caller must keep server-side until the OTP arrives.
   *
   * Throws on network errors or credential rejection.
   */
  static async initiateLogin(username: string, password: string): Promise<OtpPendingState> {
    // -- 1a. Credential check --------------------------------------------------
    const loginBody = new URLSearchParams({
      deviceIdUUID: DEVICE_ID,
      device: "iOS",
      txtUsername: username,
      txtPassword: password,
    });

    const loginRes = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": "null",
        "User-Agent": USER_AGENT,
        "Connection": "close",
      },
      body: loginBody.toString(),
      cache: "no-store",
    });

    if (!loginRes.ok) {
      throw new Error(`Chalkpad login request failed with HTTP ${loginRes.status}.`);
    }

    // -- Capture login cookies (ci_session, PHPSESSID) -------------------------
    const setCookieHeaders = loginRes.headers.getSetCookie
      ? loginRes.headers.getSetCookie()
      : [loginRes.headers.get("set-cookie")?? ""].filter(Boolean);
    
    const cookieJar = new Map<string, string>();
    setCookieHeaders.forEach((c) => {
      const primaryPair = c.split(";")[0].trim();
      const eqIdx = primaryPair.indexOf("=");
      if (eqIdx > 0) {
        cookieJar.set(primaryPair.slice(0, eqIdx).trim(), primaryPair.slice(eqIdx + 1).trim());
      }
    });
    
    const cookieHeader = Array.from(cookieJar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");

    // -- Validate login response -----------------------------------------------
    let loginJson: { status?: string; data?: Record<string, unknown>[] };
    try {
      loginJson = await loginRes.json();
    } catch {
      throw new Error("Chalkpad returned invalid JSON on login.");
    }

    if (String(loginJson.status) !== "4") {
      throw new Error(
        `Chalkpad credential check failed (status: ${loginJson.status}). Check username and password.`
      );
    }

    const userData = loginJson.data?.[0];
    if (!userData || !userData.userId) {
      throw new Error("Chalkpad login returned status 4 but no user data.");
    }

    const pendingState: OtpPendingState = {
      userId: String(userData.userId),
      sessionId: String(userData.sessionId),
      roleId: String(userData.roleId),
      name: String(userData.name),
      cookieHeader,
    };

    // -- 1b. Trigger the OTP dispatch ------------------------------------------
    // This endpoint must be hit with the user's ID for Chalkpad to actually
    // send the SMS/email. It returns HTML, which we ignore.
    const triggerBody = new URLSearchParams({
      authUserId: pendingState.userId,
    });

    const triggerRes = await fetch(MULTI_FACTOR_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "*/*",
        "User-Agent": USER_AGENT,
        "Connection": "close",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: triggerBody.toString(),
      cache: "no-store",
    });

    if (!triggerRes.ok) {
      throw new Error(`Failed to trigger Chalkpad OTP dispatch (HTTP ${triggerRes.status}).`);
    }

    // Success: The user should now be receiving an OTP.
    return pendingState;
  }

  /**
   * Step 2 of the OTP flow.
   *
   * Posts the user-entered OTP to verifyOtp. On success the server returns
   * a per-user `token` that is used as `securityToken` in the commonPage
   * request. Returns an AuthenticatedSession ready for fetchAttendanceAuthenticated.
   *
   * Throws on network errors, invalid OTP, or missing token in the response.
   */
  static async verifyOtp(
    pending: OtpPendingState,
    otp: string
  ): Promise<AuthenticatedSession> {
    const body = new URLSearchParams({
      deviceIdUUID: DEVICE_ID,
      OTPText: otp.trim(),
      authUserId: pending.userId,
    });

    const res = await fetch(VERIFY_OTP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": "null",
        "User-Agent": USER_AGENT,
        "Connection": "close",
        ...(pending.cookieHeader ? { Cookie: pending.cookieHeader } : {}),
      },
      body: body.toString(),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`OTP verification request failed with HTTP ${res.status}.`);
    }

    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error("Chalkpad returned invalid JSON on OTP verify.");
    }

    if (json.status !== "1" && json.status !== 1) {
      throw new Error(`OTP verification failed (status: ${json.status}).`);
    }

    const userData = json.data?.[0];
    if (!userData || !userData.token) {
      throw new Error("OTP verified successfully but Chalkpad returned no security token.");
    }

    return {
      userId: pending.userId,
      sessionId: pending.sessionId,
      roleId: pending.roleId,
      token: String(userData.token),
      cookieHeader: pending.cookieHeader,
    };
  }

  /**
   * Step 3 of the OTP flow.
   *
   * Fetches attendance using the authenticated session produced by verifyOtp.
   * Uses the per-user token.
   * Returns the same ChalkpadBridgePayload[] + dataAsOf shape.
   */
  static async fetchAttendanceAuthenticated(
    session: AuthenticatedSession
  ): Promise<{ payloads: ChalkpadBridgePayload[]; dataAsOf: string }> {
    const html = await this.getAttendanceHtmlAuthenticated(session);
    const result = this.parseAttendanceHtml(html);

    // Diagnostic fingerprinting (no sensitive values)
    const fingerprintString = result.payloads
      .map((p) => `${p.subjectName}|${p.subjectCode}|${p.delivered}|${p.attended}|${p.dl}`)
      .join("||");
    const fingerprint = crypto
      .createHash("sha256")
      .update(fingerprintString)
      .digest("hex")
      .substring(0, 16);

    console.info(
      `[Chalkpad OTP] Attendance fingerprint for userId ${session.userId}: ${fingerprint}`
    );

    return result;
  }

  /**
   * Internal helper for the legitimate OTP flow.
   * Uses session.token (from verifyOtp) as the securityToken.
   */
  private static async getAttendanceHtmlAuthenticated(
    session: AuthenticatedSession
  ): Promise<string> {
    const body = new URLSearchParams({
      commonObj: "",
      commonPageId: PAGE_ID,
      device: "",
      userId: session.userId,
      sessionId: session.sessionId,
      roleId: session.roleId,
      securityToken: session.token, // per-user token, NOT the legacy static constant
      deviceIdUUID: DEVICE_ID,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin": "null",
      "User-Agent": USER_AGENT,
      "Connection": "close",
    };
    
    if (session.cookieHeader) {
      headers["Cookie"] = session.cookieHeader;
    }

    const res = await fetch(ATTENDANCE_URL, {
      method: "POST",
      headers,
      body: body.toString(),
      cache: "no-store", // Explicitly bypass Next.js fetch cache
    });

    if (!res.ok) {
      throw new Error(`Attendance request failed with HTTP ${res.status}.`);
    }

    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error("Chalkpad commonPage returned invalid JSON.");
    }

    if (!json.content) {
      throw new Error("Chalkpad commonPage returned no attendance content.");
    }

    return String(json.content);
  }

  // -----------------------------------------------------------------------------
  // INTERNAL PARSERS
  // -----------------------------------------------------------------------------

  private static normalizeWhitespace(text: string): string {
    if (!text) return "";
    let s = text;
    s = s.replace(/<br\s*\/?>/gi, " ");
    s = s.replace(/<[^>]+>/gi, " ");
    // Decode &amp; FIRST so &amp;nbsp; resolves to &nbsp; then to space
    s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    s = s.replace(/&nbsp;?/gi, " ");
    s = s.replace(/\s+/g, " ");
    return s.trim();
  }

  private static getNumber(text: string | undefined): number {
    if (!text) return 0;
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  private static getPercentage(text: string | undefined): number {
    if (!text) return 0;
    const match = text.match(/\d+(?:\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  }

  private static getFieldValue(text: string, label: string): string {
    if (!text) return "";
    const escapedLabel = label.replace(/[.*+\-^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedLabel}\\s*:\\s*(.*?)(?=\\s+[A-Za-z][A-Za-z ]{0,30}\\s*:|$)`, "i");
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    return "";
  }

  private static parseAttendanceHtml(html: string): { payloads: ChalkpadBridgePayload[], dataAsOf: string } {
    const boxParts = html.split(/<div\s+class\s*=\s*['"]tt-box-new['"][^>]*>/i);
    if (boxParts.length < 2) {
      throw new Error("Attendance HTML was received but no subject boxes were found.");
    }

    const payloads: ChalkpadBridgePayload[] = [];
    const dataAsOf = new Date().toISOString().split("T")[0];

    for (let i = 1; i < boxParts.length; i++) {
      const boxHtml = boxParts[i];

      const headingPattern = /<div\s+class\s*=\s*['"]tt-period-number['"][^>]*>[\s\S]*?<span>(.*?)<\/span>\s*<span>(.*?)<\/span>/i;
      const headingMatch = boxHtml.match(headingPattern);

      if (!headingMatch) continue;

      const subjectName = this.normalizeWhitespace(headingMatch[1]);
      const subjectCode = this.normalizeWhitespace(headingMatch[2]);

      if (!subjectName) continue;

      let s = boxHtml;
      s = s.replace(/<br\s*\/?>/gi, " ");
      s = s.replace(/<[^>]+>/gi, " ");
      s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      s = s.replace(/&nbsp;?/gi, " ");
      s = s.replace(/\s+/g, " ");
      const boxText = s.trim();

      const deliveredText = this.getFieldValue(boxText, "Delivered");
      const attendedText = this.getFieldValue(boxText, "Attended");
      const dlText = this.getFieldValue(boxText, "DL") || this.getFieldValue(boxText, "Duty Leave") || "0";
      const mlText = this.getFieldValue(boxText, "ML") || this.getFieldValue(boxText, "Medical Leave") || "0";
      const percentageText = this.getFieldValue(boxText, "Total Percentage") || this.getFieldValue(boxText, "Percentage");

      const delivered = this.getNumber(deliveredText);
      const attended = this.getNumber(attendedText);
      const dl = this.getNumber(dlText);
      const ml = this.getNumber(mlText);
      const percentage = this.getPercentage(percentageText);

      payloads.push({
        subjectName,
        subjectCode: subjectCode || undefined,
        delivered,
        attended,
        dl,
        ml,
        percentage,
        dataAsOf,
        source: "Chalkpad",
      });
    }

    if (payloads.length === 0) {
      throw new Error("Attendance HTML was returned but no subjects could be parsed.");
    }

    return { payloads, dataAsOf };
  }
}

