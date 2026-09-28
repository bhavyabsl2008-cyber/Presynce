import { NextRequest, NextResponse } from "next/server";
import { ChalkpadMobileService, OtpPendingState } from "@/services/sync/chalkpad-mobile";
import crypto from "crypto";

// Use a stable key for encrypting the pending state to keep it opaque to the client.
// We default to a fallback secret so it works out-of-the-box without ENV changes.
const ENCRYPTION_KEY = crypto.scryptSync(process.env.NEXTAUTH_SECRET || "chalkpad_default_secret_39233", "salt", 32);

function encryptState(state: OtpPendingState): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(JSON.stringify(state), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decryptState(token: string): OtpPendingState {
  const [ivHex, authTagHex, encrypted] = token.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, otp, pendingToken, useLegacyFlow } = body;

    // ── OTP STAGE 2: Verify OTP and fetch attendance ─────────────────────────
    if (otp && pendingToken) {
      if (typeof otp !== "string" || otp.trim() === "") {
        return NextResponse.json({ error: "OTP is required" }, { status: 400 });
      }
      
      const pendingState = decryptState(pendingToken);
      const session = await ChalkpadMobileService.verifyOtp(pendingState, otp.trim());
      const result = await ChalkpadMobileService.fetchAttendanceAuthenticated(session);
      
      return NextResponse.json(result);
    }

    // ── LEGACY FLOW FALLBACK ──────────────────────────────────────────────────
    if (useLegacyFlow) {
      if (!username || typeof username !== "string" || username.trim() === "") {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
      }
      if (!password || typeof password !== "string" || password.trim() === "") {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }

      const result = await ChalkpadMobileService.fetchAttendance(username.trim(), password);
      return NextResponse.json(result);
    }

    // ── OTP STAGE 1: Initiate Login ───────────────────────────────────────────
    if (username && password) {
      if (typeof username !== "string" || username.trim() === "") {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
      }
      if (typeof password !== "string" || password.trim() === "") {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }

      const pendingState = await ChalkpadMobileService.initiateLogin(username.trim(), password);
      const token = encryptState(pendingState);
      
      return NextResponse.json({
        requiresOtp: true,
        pendingToken: token,
        name: pendingState.name
      });
    }

    return NextResponse.json({ error: "Invalid request payload. Expected username/password or otp/pendingToken." }, { status: 400 });

  } catch (error: unknown) {
    console.error("[Chalkpad Sync API] Error:", error);
    
    // Provide generic safe error messages without exposing credentials or internal tokens
    let safeMessage = "An error occurred during Chalkpad sync.";
    if (error instanceof Error) {
      if (error.message.includes("login failed") || error.message.includes("status: 401")) {
        safeMessage = "Invalid credentials or Chalkpad login failed.";
      } else if (error.message.includes("OTP verification failed")) {
        safeMessage = "Invalid or expired OTP.";
      } else if (error.message.includes("no attendance content") || error.message.includes("parsed")) {
        safeMessage = "Could not parse attendance data from Chalkpad.";
      } else {
        safeMessage = "An unexpected error occurred while communicating with Chalkpad.";
      }
    }

    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
