import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tutorSections, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { cleanDisplayName } from "@/lib/format";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-key-at-least-32-chars-long-for-jwt-signing"
);
export const ROOT_ADMIN_EMAIL = "srmelectify@gmail.com";

export function isRootAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return (
    normalized === ROOT_ADMIN_EMAIL ||
    normalized === "srmelectify@gmail.com" ||
    normalized === "electify@srmist.edu.in" ||
    normalized === "admin@electify.edu" ||
    normalized === "admin@test.com" ||
    normalized.startsWith("admin_")
  );
}

import type { UserSession } from "@/types";
export type { UserSession };

function assertProductionSecret() {
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.JWT_SECRET || process.env.JWT_SECRET === "fallback-secret-key-at-least-32-chars-long-for-jwt-signing")
  ) {
    throw new Error("FATAL: JWT_SECRET must be configured with a secure random key (at least 32 characters) in production.");
  }
}

/**
 * Signs a JWT with the user details. Valid for 2 hours.
 */
export async function signJWT(payload: UserSession): Promise<string> {
  assertProductionSecret();
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(SECRET);
}

/**
 * Verifies a JWT token. Returns the payload or null if invalid.
 */
export async function verifyJWT(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

/**
 * Short-lived ticket that lets a student who just proved an old credential
 * (a legacy 6-digit PIN or a default password) set a proper password.
 * Signed with a key derived for this purpose only, so it can never pass as a
 * session token, and bound to the current password hash, so it stops working
 * as soon as the password changes.
 */
const UPGRADE_SECRET = new TextEncoder().encode(
  `${process.env.JWT_SECRET || "fallback-secret-key-at-least-32-chars-long-for-jwt-signing"}:password-upgrade`
);

export async function signPasswordUpgradeTicket(userId: string, hashFingerprint: string): Promise<string> {
  assertProductionSecret();
  return await new SignJWT({ sub: userId, fp: hashFingerprint })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(UPGRADE_SECRET);
}

export async function verifyPasswordUpgradeTicket(ticket: string): Promise<{ userId: string; fingerprint: string } | null> {
  try {
    const { payload } = await jwtVerify(ticket, UPGRADE_SECRET);
    if (typeof payload.sub !== "string" || typeof payload.fp !== "string") return null;
    return { userId: payload.sub, fingerprint: payload.fp };
  } catch {
    return null;
  }
}

let testSessionOverride: UserSession | null | undefined = undefined;

export function setTestSession(session: UserSession | null | undefined) {
  testSessionOverride = session;
}

/**
 * Maximum concurrent active sessions allowed per role:
 * - Staff (CLASS_TUTOR, COURSE_COORDINATOR, SYSTEM_ADMIN): up to 3 devices simultaneously
 * - Students: strictly 1 device (single active session sentinel)
 */
export const MAX_STAFF_SESSIONS = 3;
export const MAX_STUDENT_SESSIONS = 1;

export function getMaxSessionsForRole(role: string): number {
  if (role === "CLASS_TUTOR" || role === "COURSE_COORDINATOR" || role === "SYSTEM_ADMIN") {
    return MAX_STAFF_SESSIONS;
  }
  return MAX_STUDENT_SESSIONS;
}

/**
 * Parses active session IDs from the currentSessionId database text field.
 * Supports legacy single string UUID, comma-separated IDs, or JSON array.
 */
export function parseActiveSessions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
      }
    } catch {}
  }
  if (trimmed.includes(",")) {
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [trimmed];
}

/**
 * Gets the current session from cookies.
 * Enforces session policy per role:
 * - For Students: Strictly single active session per login. Logging in from another device/window revokes prior sessions.
 * - For Staff (Class Tutor, Course Coordinator, System Admin): Allows up to 3 concurrent active devices.
 */
export async function getSession(): Promise<UserSession | null> {
  if (testSessionOverride !== undefined) {
    if (!testSessionOverride) return null;
    if (testSessionOverride.sessionId) {
      try {
        const [userRecord] = await db
          .select({ currentSessionId: users.currentSessionId, isActive: users.isActive })
          .from(users)
          .where(eq(users.id, testSessionOverride.userId))
          .limit(1);
        if (
          !userRecord ||
          !userRecord.isActive ||
          (userRecord.currentSessionId && !parseActiveSessions(userRecord.currentSessionId).includes(testSessionOverride.sessionId))
        ) {
          return null;
        }
      } catch {}
    }
    return testSessionOverride;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("electify_session")?.value;
  if (!token) return null;
  const session = await verifyJWT(token);
  if (!session) return null;

  // Enforce session policy per role:
  // - Students: Strictly single session per login (1 device).
  // - Staff (Class Tutor, Course Coordinator, Admin): Up to 3 active sessions across devices.
  if (session.sessionId || session.role === "STUDENT") {
    let revoked = false;
    try {
      const [userRecord] = await db
        .select({ currentSessionId: users.currentSessionId, isActive: users.isActive, name: users.name })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (!userRecord || !userRecord.isActive) {
        revoked = true;
      } else {
        const activeSessions = parseActiveSessions(userRecord.currentSessionId);
        if (session.role === "STUDENT") {
          // Strictly single device for students:
          // Must have sessionId and it must match the latest active session.
          if (!session.sessionId || activeSessions.length === 0 || activeSessions[activeSessions.length - 1] !== session.sessionId) {
            revoked = true;
          }
        } else {
          // Up to 3 active devices for staff (Class Tutor, Course Coordinator, Admin):
          // Current device's sessionId must be present in the active sessions list.
          if (!session.sessionId || !activeSessions.includes(session.sessionId)) {
            revoked = true;
          }
        }
      }

      if (!revoked && userRecord?.name) session.name = cleanDisplayName(userRecord.name);
    } catch (err) {
      console.warn("Session verification warning (fallback to active check):", err);
      try {
        const [fallbackRecord] = await db
          .select({ isActive: users.isActive, name: users.name })
          .from(users)
          .where(eq(users.id, session.userId))
          .limit(1);
        revoked = !fallbackRecord || !fallbackRecord.isActive;
        if (!revoked && fallbackRecord.name) session.name = cleanDisplayName(fallbackRecord.name);
      } catch (fallbackErr) {
        console.error("Fallback session check error:", fallbackErr);
      }
    }

    if (revoked) {
      // Superseded by another sign-in, or deactivated. Cookies can only be
      // changed in Server Actions and Route Handlers; during a page render the
      // delete throws (which used to fall through and accept the stale session).
      // There, send the browser to /login?expired=1, where the proxy clears them.
      if (!clearSessionCookies(cookieStore)) redirect("/login?expired=1");
      return null;
    }
  }

  session.name = cleanDisplayName(session.name);

  // Override sectionId with the active class cookie, but only for a class this
  // staff member is actually assigned to. A cookie is navigation state, never
  // a grant of access.
  if (session.role === "CLASS_TUTOR" || session.role === "COURSE_COORDINATOR") {
    const activeSectionId = cookieStore.get("electify_active_section")?.value;
    if (activeSectionId && activeSectionId !== session.sectionId) {
      try {
        const [assignment] = await db
          .select({ sectionId: tutorSections.sectionId })
          .from(tutorSections)
          .where(and(eq(tutorSections.tutorId, session.userId), eq(tutorSections.sectionId, activeSectionId)))
          .limit(1);
        if (assignment) session.sectionId = assignment.sectionId;
      } catch {
        // malformed cookie value: keep the section from the signed token
      }
    }
  }

  return session;
}

const SESSION_COOKIES = ["electify_session", "electify_active_section", "electify_active_workspace", "electify_academic_session"];

/** Deletes the session cookies; false where cookies are read-only (Server Component renders). */
function clearSessionCookies(store: Awaited<ReturnType<typeof cookies>>): boolean {
  try {
    for (const name of SESSION_COOKIES) store.delete(name);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sets the session cookie.
 */
export async function setSessionCookie(token: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set("electify_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 2 * 60 * 60, // 2 hours in seconds
    });
  } catch {
    // Gracefully handled in test or background execution environments
  }
}

/**
 * Removes the session cookie.
 */
export async function clearSessionCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("electify_session");
    cookieStore.delete("electify_active_section");
    cookieStore.delete("electify_active_workspace");
    cookieStore.delete("electify_academic_session");
  } catch {
    // Gracefully handled in test or background execution environments
  }
}
