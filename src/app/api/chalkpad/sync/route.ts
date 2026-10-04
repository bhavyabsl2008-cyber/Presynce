import { NextRequest, NextResponse } from "next/server";
import { ChalkpadMobileService, OtpPendingState, AuthenticatedSession } from "@/services/sync/chalkpad-mobile";
import crypto from "crypto";



function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("NEXTAUTH_SECRET is required");
  }
  return crypto.scryptSync(secret || "dev_only_secret", "salt", 32);
}
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SessionTokenPayload {
  session: AuthenticatedSession;
  expiresAt: number;
}

function encryptState<T>(state: T): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  let encrypted = cipher.update(JSON.stringify(state), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decryptState<T>(token: string): T {
  const [ivHex, authTagHex, encrypted] = token.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
    return NextResponse.json(
      { error: "NEXTAUTH_SECRET is required" },
      { status: 500 }
    );
  }
  let isSessionBased = false;

  try {
    const body = await req.json();
    const { username, password, otp, pendingToken, sessionToken } = body;

    // --- C. Session-based sync ---
    if (sessionToken) {
      isSessionBased = true;
      if (typeof sessionToken !== "string" || sessionToken.trim() === "") {
        return NextResponse.json({ error: "Session token is required" }, { status: 400 });
      }
      
      let payload: SessionTokenPayload;
      try {
        payload = decryptState<SessionTokenPayload>(sessionToken);
      } catch (err) {
        return NextResponse.json({ requiresReauth: true }, { status: 401 });
      }

      if (Date.now() > payload.expiresAt) {
        return NextResponse.json({ requiresReauth: true }, { status: 401 });
      }
      
      const result = await ChalkpadMobileService.fetchAttendanceAuthenticated(payload.session);
      return NextResponse.json(result);
    }

    // --- B. OTP verification ---
    if (otp && pendingToken) {
      if (typeof otp !== "string" || otp.trim() === "") {
        return NextResponse.json({ error: "OTP is required" }, { status: 400 });
      }
      
      const pendingState = decryptState<OtpPendingState>(pendingToken);
      const session = await ChalkpadMobileService.verifyOtp(pendingState, otp.trim());
      const result = await ChalkpadMobileService.fetchAttendanceAuthenticated(session);
      
      const newSessionToken = encryptState<SessionTokenPayload>({
        session,
        expiresAt: Date.now() + SESSION_TTL_MS
      });
      
      return NextResponse.json({
        ...result,
        sessionToken: newSessionToken
      });
    }

    // --- A. Initial authentication ---
    if (username && password) {
      if (typeof username !== "string" || username.trim() === "") {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
      }
      if (typeof password !== "string" || password.trim() === "") {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }

      const pendingState = await ChalkpadMobileService.initiateLogin(username.trim(), password);
      const token = encryptState<OtpPendingState>(pendingState);
      
      return NextResponse.json({
        requiresOtp: true,
        pendingToken: token,
      });
    }

    return NextResponse.json({ error: "Invalid request payload. Expected sessionToken, username/password, or otp/pendingToken." }, { status: 400 });

  } catch (error: unknown) {
    if (error instanceof Error) {
      // If we used a session token and the Chalkpad upstream fetch failed with auth errors (401/403/parse redirect),
      // we tell the client the session is dead.
      if (isSessionBased && (error.message.includes("login failed") || error.message.includes("HTTP 401") || error.message.includes("HTTP 403") || error.message.includes("status: 401") || error.message.includes("status: 403"))) {
        return NextResponse.json({ requiresReauth: true }, { status: 401 });
      }

      let safeMessage = "An error occurred during Chalkpad sync.";
      if (error.message.includes("login failed") || error.message.includes("login request failed") || error.message.includes("credential check failed") || error.message.includes("HTTP 401") || error.message.includes("status: 401") || error.message.includes("invalid JSON on login")) {
        safeMessage = "Invalid credentials or Chalkpad login failed.";
      } else if (error.message.includes("OTP verification failed")) {
        safeMessage = "Invalid or expired OTP.";
      } else if (error.message.includes("no attendance content") || error.message.includes("parsed")) {
        if (isSessionBased) {
          // If a session-based sync gets a weird parse error (usually due to a redirect back to login HTML), treat as expired
          return NextResponse.json({ requiresReauth: true }, { status: 401 });
        }
        safeMessage = "Could not parse attendance data from Chalkpad.";
      } else {
        safeMessage = "An unexpected error occurred while communicating with Chalkpad.";
      }
      return NextResponse.json({ error: safeMessage }, { status: 500 });
    }

    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
