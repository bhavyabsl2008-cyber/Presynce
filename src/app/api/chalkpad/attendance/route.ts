import { NextRequest, NextResponse } from "next/server";

const CHALKPAD_BASE_URL = "https://cuiet.codebrigade.in/mobilev2";
const LOGIN_URL = `${CHALKPAD_BASE_URL}/appLoginAuthV2`;
const COMMON_PAGE_URL = `${CHALKPAD_BASE_URL}/commonPage`;

const ATTENDANCE_PAGE_ID = "28";
const DEVICE_ID = "88437E4C-4E1D-4104-964A-7DE41B163E06";
const SECURITY_TOKEN =
  "be91f0f1aeba33d751fb901b8652bf98805cded69305fcb73a488c9a9d9c3ec857e4d0b323095b1a437f3c9df7f09a46be437636c583010463b40dd02926136126ff582c5a6a702310a62f9f0eba20dfc2df5cbce3cf9209b5c1dc6a4b990d9f518d4f6dfa630941a66ac4c2117308eb";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginUser = {
  userId: string;
  sessionId: string;
  roleId: string;
  name?: string;
};

type ChalkpadSubject = {
  subjectName: string;
  subjectCode: string;
  delivered: number;
  attended: number;
  dl: number;
  percentage: number;
  dataAsOf: string;
  source: "Chalkpad";
};

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getField(text: string, label: string): string {
  const escaped = label.replace(/[.*+-^${}()|[\]\\]/g, "\\$&");

  const match = text.match(
    new RegExp(
      `${escaped}\\s*:\\s*(.*?)(?=\\s+[A-Za-z][A-Za-z ]{0,30}\\s*:|$)`,
      "i"
    )
  );

  return match?.[1]?.trim()?? "";
}

function getNumber(value: string): number {
  const match = value.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function getPercentage(value: string): number {
  const match = value.match(/\d+(?:\.\d+)-/);
  return match ? Number.parseFloat(match[0]) : 0;
}

function parseAttendance(html: string): ChalkpadSubject[] {
  const parts = html.split(
    /<div\s+class\s*=\s*['"]tt-box-new['"][^>]*>/i
  );

  const today = new Date().toISOString().slice(0, 10);

  const subjects: ChalkpadSubject[] = [];

  for (const part of parts.slice(1)) {
    const heading = part.match(
      /<div\s+class\s*=\s*['"]tt-period-number['"][^>]*>[\s\S]*-<span>([\s\S]*-)<\/span>\s*<span>([\s\S]*-)<\/span>/i
    );

    if (!heading) continue;

    const subjectName = stripHtml(heading[1]);
    const subjectCode = stripHtml(heading[2]);

    if (!subjectName) continue;

    const text = stripHtml(part);

    const delivered = getNumber(getField(text, "Delivered"));
    const attended = getNumber(getField(text, "Attended"));

    const dlMatch = text.match(/DL\s*:\s*(\d+)/i);
    const dl = dlMatch ? Number.parseInt(dlMatch[1], 10) : 0;

    const percentage = getPercentage(
      getField(text, "Total Percentage")
    );

    subjects.push({
      subjectName,
      subjectCode,
      delivered,
      attended,
      dl,
      percentage,
      dataAsOf: today,
      source: "Chalkpad",
    });
  }

  return subjects;
}

function getSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const raw = response.headers.get("set-cookie");

  return raw ? [raw] : [];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!username || !password) {
      return NextResponse.json(
        {
          error: "Chalkpad username and password are required.",
        },
        { status: 400 }
      );
    }

    const loginBody = new URLSearchParams({
      deviceIdUUID: DEVICE_ID,
      txtUsername: username,
      txtPassword: password,
    });

    const loginResponse = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type":
          "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: "null",
        "User-Agent": USER_AGENT,
      },
      body: loginBody.toString(),
      cache: "no-store",
    });

    const loginText = await loginResponse.text();

    if (!loginResponse.ok) {
      return NextResponse.json(
        {
          error: "Chalkpad login request failed.",
        },
        { status: 502 }
      );
    }

    let loginJson: {
      status?: string | number;
      data?: LoginUser[];
    };

    try {
      loginJson = JSON.parse(loginText);
    } catch {
      return NextResponse.json(
        {
          error: "Chalkpad returned an invalid login response.",
        },
        { status: 502 }
      );
    }

    if (String(loginJson.status) !== "4") {
      return NextResponse.json(
        {
          error: "Chalkpad login failed. Check your username and password.",
        },
        { status: 401 }
      );
    }

    const user = loginJson.data?.[0];

    if (
      !user ||
      !user.userId ||
      !user.sessionId ||
      !user.roleId
    ) {
      return NextResponse.json(
        {
          error:
            "Chalkpad login succeeded but returned incomplete user data.",
        },
        { status: 502 }
      );
    }

    const cookies = getSetCookies(loginResponse);

    const cookieHeader = cookies
      .map((cookie) => cookie.split(";")[0])
      .filter(Boolean)
      .join("; ");

    const attendanceBody = new URLSearchParams({
      commonObj: "",
      commonPageId: ATTENDANCE_PAGE_ID,
      device: "",
      userId: String(user.userId),
      sessionId: String(user.sessionId),
      roleId: String(user.roleId),
      securityToken: SECURITY_TOKEN,
      deviceIdUUID: DEVICE_ID,
    });

    const attendanceResponse = await fetch(COMMON_PAGE_URL, {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type":
          "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: "null",
        "User-Agent": USER_AGENT,
        ...(cookieHeader
          ? { Cookie: cookieHeader }
          : {}),
      },
      body: attendanceBody.toString(),
      cache: "no-store",
    });

    const attendanceText = await attendanceResponse.text();

    if (!attendanceResponse.ok) {
      return NextResponse.json(
        {
          error: "Chalkpad attendance request failed.",
        },
        { status: 502 }
      );
    }

    let attendanceJson: {
      content?: string;
      title?: string;
    };

    try {
      attendanceJson = JSON.parse(attendanceText);
    } catch {
      return NextResponse.json(
        {
          error: "Chalkpad returned invalid attendance data.",
        },
        { status: 502 }
      );
    }

    if (!attendanceJson.content) {
      return NextResponse.json(
        {
          error:
            "Chalkpad returned no attendance content.",
        },
        { status: 502 }
      );
    }

    const subjects = parseAttendance(
      attendanceJson.content
    );

    if (subjects.length === 0) {
      return NextResponse.json(
        {
          error:
            "Attendance data was received but no subjects could be parsed.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      studentName: user.name?? null,
      subjects,
    });
  } catch (error) {
    console.error(
      "[Presynce Chalkpad API] Unexpected error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to fetch attendance from Chalkpad.",
      },
      { status: 500 }
    );
  }
}