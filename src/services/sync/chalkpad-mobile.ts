import { ChalkpadBridgePayload } from "./types";
import crypto from "crypto";

const CHALKPAD_BASE_URL = "https://cuiet.codebrigade.in/mobilev2";
const LOGIN_URL = `${CHALKPAD_BASE_URL}/appLoginAuthV2`;
const MULTI_FACTOR_URL = `${CHALKPAD_BASE_URL}/multiFactorAuth`;
const VERIFY_OTP_URL = `${CHALKPAD_BASE_URL}/verifyOtp`;
const ATTENDANCE_URL = `${CHALKPAD_BASE_URL}/commonPage`;
const PAGE_ID = "28";

// The static DEVICE_ID is the captured mobile device UUID used throughout
// both the old fallback flow and the new OTP-authenticated flow.
const DEVICE_ID = "88437E4C-4E1D-4104-964A-7DE41B163E06";

// LEGACY: The static SECURITY_TOKEN is only used by the OLD fallback flow
// (login() + fetchAttendance()). The new OTP flow uses the per-user token
// returned by verifyOtp � never this constant.
const SECURITY_TOKEN = "be91f0f1aeba33d751fb901b8652bf98805cded69305fcb73a488c9a9d9c3ec857e4d0b323095b1a437f3c9df7f09a46be437636c583010463b40dd02926136126ff582c5a6a702310a62f9f0eba20dfc2df5cbce3cf9209b5c1dc6a4b990d9f518d4f6dfa630941a66ac4c2117308eb";
const USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

// -----------------------------------------------------------------------------
// NEW OTP FLOW � Types
// -----------------------------------------------------------------------------

/**
 * Intermediate state returned after a successful credential check when the
 * Chalkpad server requires OTP verification (status "4").
 * This is passed opaquely back to the API route; the client never sees it
 * directly � the route serialises it into a short-lived server-side token.
 */
export interface OtpPendingState {
  /** userId from appLoginAuthV2 response � passed to verifyOtp as authUserId */
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
   * Stored as a single Cookie header string: "ci_session=�; PHPSESSID=�"
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
  /** User-specific security token returned by verifyOtp � used as securityToken in commonPage */
  token: string;
  cookieHeader: string;
}

// -----------------------------------------------------------------------------
// LEGACY � Types (unchanged)
// -----------------------------------------------------------------------------

interface LoginData {
  userId: string;
  sessionId: string;
  roleId: string;
  name: string;
}

export class ChalkpadMobileService {
  /**
   * Main entry point to fetch and parse attendance.
   */
  static async fetchAttendance(username: string, password: string): Promise<{ payloads: ChalkpadBridgePayload[], dataAsOf: string }> {
    const { loginData, cookieHeader } = await this.login(username, password);
    const html = await this.getAttendanceHtml(loginData, cookieHeader);
    const result = this.parseAttendanceHtml(html);
    
    // Diagnostic fingerprinting
    const fingerprintString = result.payloads.map(p => 
      `${p.subjectName}|${p.subjectCode}|${p.delivered}|${p.attended}|${p.dl}`
    ).join("||");
    const fingerprint = crypto.createHash('sha256').update(fingerprintString).digest('hex').substring(0, 16);
    
    console.info(`[Chalkpad Diag] Final Attendance Fingerprint for userId ${loginData.userId}: ${fingerprint}`);
    
    return result;
  }

  // -----------------------------------------------------------------------------
  // NEW OTP FLOW � Public API
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
    for (const c of setCookieHeaders) {
      const primary = c.split(";")[0].trim();
      const eqIdx = primary.indexOf("=");
      if (eqIdx > 0) {
        const name = primary.slice(0, eqIdx).trim();
        const value = primary.slice(eqIdx + 1).trim();
        cookieJar.set(name, value);
      }
    }
    const cookieHeader = Array.from(cookieJar.entries())
      .map(([n, v]) => `${n}=${v}`)
      .join("; ");

    let loginJson: { status?: string; data?: Record<string, unknown>[] };
    try {
      loginJson = await loginRes.json();
    } catch {
      throw new Error("Chalkpad returned invalid JSON on login.");
    }

    // status "4" is the OTP-required signal from the Chalkpad mobile API.
    if (String(loginJson.status) !== "4") {
      throw new Error(
        `Chalkpad credential check failed (status: ${loginJson.status}). Check username and password.`
      );
    }

    const userData = loginJson.data?.[0];
    if (!userData?.userId) {
      throw new Error("Chalkpad login returned status 4 but no user data.");
    }

    console.info(
      `[Chalkpad OTP] Credential check OK | userId:${userData.userId} | OTP required`
    );

    // -- 1b. Trigger multiFactorAuth (stateless � no body needed) -------------
    // This causes the server to send the OTP to the user's registered contact.
    const mfaRes = await fetch(MULTI_FACTOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": "null",
        "User-Agent": USER_AGENT,
        "Connection": "close",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: "",
      cache: "no-store",
    });

    // We log the MFA probe status but do not fail on it � the OTP dispatch
    // may succeed even if the probe returns a non-2xx code in some configurations.
    console.info(
      `[Chalkpad OTP] multiFactorAuth probe status: ${mfaRes.status}`
    );

    // Merge any new cookies the MFA probe sets into the jar
    const mfaCookies = mfaRes.headers.getSetCookie
      ? mfaRes.headers.getSetCookie()
      : [mfaRes.headers.get("set-cookie")?? ""].filter(Boolean);
    for (const c of mfaCookies) {
      const primary = c.split(";")[0].trim();
      const eqIdx = primary.indexOf("=");
      if (eqIdx > 0) {
        cookieJar.set(primary.slice(0, eqIdx).trim(), primary.slice(eqIdx + 1).trim());
      }
    }
    const finalCookieHeader = Array.from(cookieJar.entries())
      .map(([n, v]) => `${n}=${v}`)
      .join("; ");

    return {
      userId: String(userData.userId),
      sessionId: String(userData.sessionId?? ""),
      roleId: String(userData.roleId?? ""),
      name: String(userData.name?? ""),
      cookieHeader: finalCookieHeader,
    };
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
      throw new Error(`Chalkpad verifyOtp request failed with HTTP ${res.status}.`);
    }

    let json: { status?: string | number; data?: Record<string, unknown> };
    try {
      json = await res.json();
    } catch {
      throw new Error("Chalkpad verifyOtp returned invalid JSON.");
    }

    // status "1" means OTP accepted
    if (String(json.status) !== "1") {
      throw new Error(
        `Chalkpad OTP verification failed (status: ${json.status}). The OTP may be incorrect or expired.`
      );
    }

    const data = json.data;
    if (!data?.token) {
      throw new Error("Chalkpad verifyOtp succeeded but returned no token.");
    }

    // Merge any new cookies from the OTP verification response
    const cookieJar = new Map<string, string>();
    for (const part of (pending.cookieHeader || "").split(";")) {
      const trimmed = part.trim();
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        cookieJar.set(trimmed.slice(0, eqIdx).trim(), trimmed.slice(eqIdx + 1).trim());
      }
    }
    const otpCookies = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")?? ""].filter(Boolean);
    for (const c of otpCookies) {
      const primary = c.split(";")[0].trim();
      const eqIdx = primary.indexOf("=");
      if (eqIdx > 0) {
        cookieJar.set(primary.slice(0, eqIdx).trim(), primary.slice(eqIdx + 1).trim());
      }
    }
    const finalCookieHeader = Array.from(cookieJar.entries())
      .map(([n, v]) => `${n}=${v}`)
      .join("; ");

    console.info(
      `[Chalkpad OTP] OTP verified | userId:${data.userId?? pending.userId}`
    );

    return {
      userId: String(data.userId?? pending.userId),
      sessionId: String(data.sessionId?? pending.sessionId),
      roleId: String(data.roleId?? pending.roleId),
      token: String(data.token),
      cookieHeader: finalCookieHeader,
    };
  }

  /**
   * Step 3 of the OTP flow.
   *
   * Fetches attendance using the authenticated session produced by verifyOtp.
   * Uses the per-user token (not the legacy static SECURITY_TOKEN).
   * Returns the same ChalkpadBridgePayload[] + dataAsOf shape as the old flow.
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
   * Internal helper: fires the authenticated commonPage request.
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
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Chalkpad commonPage failed with HTTP ${res.status}.`);
    }

    let json: { content?: string };
    try {
      json = await res.json();
    } catch {
      throw new Error("Chalkpad commonPage returned invalid JSON.");
    }

    if (!json.content) {
      throw new Error("Chalkpad commonPage returned no attendance content.");
    }

    const html = String(json.content);
    console.info(
      `[Chalkpad OTP] Attendance HTML received | userId:${session.userId} | length:${html.length}`
    );
    return html;
  }

  // -----------------------------------------------------------------------------
  // LEGACY FLOW � Unchanged (kept as fallback)
  // -----------------------------------------------------------------------------

  private static async login(username: string, password: string): Promise<{ loginData: LoginData; cookieHeader: string }> {

    const body = new URLSearchParams({
      deviceIdUUID: DEVICE_ID,
      txtUsername: username,
      txtPassword: password,
    });

    const res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": "null",
        "User-Agent": USER_AGENT,
        "Connection": "close", // Prevent connection pooling/reuse issues
      },
      body: body.toString(),
      cache: "no-store", // Explicitly bypass Next.js fetch cache
    });

    if (!res.ok) {
      throw new Error(`Login request failed with status: ${res.status}`);
    }

    // -- Cookie jar ---------------------------------------------------------
    const setCookieHeaders = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")?? ""].filter(Boolean);

    console.info(`[Chalkpad Diag] Login Set-Cookie count: ${setCookieHeaders.length}`);
    
    const cookieJar = new Map<string, string>();
    
    setCookieHeaders.forEach((c) => {
      const primaryPair = c.split(";")[0].trim();
      const eqIdx = primaryPair.indexOf("=");
      
      if (eqIdx > 0) {
        const name = primaryPair.slice(0, eqIdx).trim();
        const value = primaryPair.slice(eqIdx + 1).trim();
        
        if (cookieJar.has(name)) {
          console.info(`[Chalkpad Diag] Overwriting duplicate cookie: ${name}`);
        } else {
          console.info(`[Chalkpad Diag] Storing cookie: ${name}`);
        }
        
        cookieJar.set(name, value);
      }
    });

    const cookieHeader = Array.from(cookieJar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");

    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error("Chalkpad returned invalid login JSON.");
    }

    if (json.status !== "4") {
      throw new Error(`Chalkpad login failed. Returned status: ${json.status}`);
    }

    if (!json.data || json.data.length < 1 || !json.data[0].userId) {
      throw new Error("Chalkpad login succeeded but returned no user data.");
    }

    const userData = json.data[0];
    
    // Diagnostic logging for non-secret response fields
    console.info(`[Chalkpad Diag] Login Response Keys: ${Object.keys(userData).join(", ")}`);
    console.info(`[Chalkpad Diag] apiKey present: ${"apiKey" in userData}`);

    const loginData: LoginData = {
      userId: String(userData.userId),
      sessionId: String(userData.sessionId),
      roleId: String(userData.roleId),
      name: String(userData.name),
    };

    console.info(`[Chalkpad Diag] Login OK | userId:${loginData.userId} | roleId:${loginData.roleId}`);

    return { loginData, cookieHeader };
  }

  private static async getAttendanceHtml(user: LoginData, cookieHeader: string): Promise<string> {
    const body = new URLSearchParams({
      commonObj: "",
      commonPageId: PAGE_ID,
      device: "",
      userId: user.userId,
      sessionId: user.sessionId,
      roleId: user.roleId,
      securityToken: SECURITY_TOKEN,
      deviceIdUUID: DEVICE_ID,
    });

    // Forward session cookies from the login response, replicating
    // the PowerShell -WebSession cookie jar behavior.
    const attendanceHeaders: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin": "null",
      "User-Agent": USER_AGENT,
      "Connection": "close", // Prevent connection pooling/reuse issues
    };
    if (cookieHeader) {
      attendanceHeaders["Cookie"] = cookieHeader;
    }

    const res = await fetch(ATTENDANCE_URL, {
      method: "POST",
      headers: attendanceHeaders,
      body: body.toString(),
      cache: "no-store", // Explicitly bypass Next.js fetch cache
    });

    if (!res.ok) {
      throw new Error(`Attendance request failed with status: ${res.status}`);
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

    const html = String(json.content);

    // Minimal safe server log � logs only userId and subject count after parse,
    // never any HTML content, attendance values, or session data.
    console.info(`[Chalkpad] Attendance HTML received | userId:${user.userId} | length:${html.length}`);

    return html;
  }

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

      // ENTITY DECODE: &amp; FIRST so &amp;nbsp; &rarr; &nbsp; &rarr; space
      // Old code decoded &nbsp; before &amp;, so &amp;nbsp; survived as literal &nbsp;
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






