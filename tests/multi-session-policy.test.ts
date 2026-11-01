import assert from "node:assert";
import { parseActiveSessions, getMaxSessionsForRole, MAX_STAFF_SESSIONS, MAX_STUDENT_SESSIONS } from "@/lib/auth";

console.log("==================================================");
console.log("   ELECTIFY MULTI-SESSION POLICY VERIFICATION     ");
console.log("==================================================");

// 1. Role Limits Test
console.log("\n--- 1. ROLE SESSION CAPACITIES ---");
assert.strictEqual(MAX_STAFF_SESSIONS, 3, "Staff max sessions must be 3");
assert.strictEqual(MAX_STUDENT_SESSIONS, 1, "Student max sessions must be 1");
assert.strictEqual(getMaxSessionsForRole("CLASS_TUTOR"), 3, "CLASS_TUTOR must have max 3 sessions");
assert.strictEqual(getMaxSessionsForRole("COURSE_COORDINATOR"), 3, "COURSE_COORDINATOR must have max 3 sessions");
assert.strictEqual(getMaxSessionsForRole("SYSTEM_ADMIN"), 3, "SYSTEM_ADMIN must have max 3 sessions");
assert.strictEqual(getMaxSessionsForRole("STUDENT"), 1, "STUDENT must be strictly 1 session");
console.log("[✓ PASS] Role session limits verified: Staff = 3, Student = 1");

// Helper simulating session transition
function simulateLogin(existingCurrentSessionId: string | null, newSessionId: string, role: string): string {
  const max = getMaxSessionsForRole(role);
  if (max > 1) {
    const active = parseActiveSessions(existingCurrentSessionId);
    active.push(newSessionId);
    const trimmed = active.slice(-max);
    return JSON.stringify(trimmed);
  } else {
    return newSessionId;
  }
}

function simulateLogout(existingCurrentSessionId: string | null, sessionToLogout: string, role: string): string | null {
  if (role === "STUDENT") {
    return null;
  }
  const active = parseActiveSessions(existingCurrentSessionId);
  const remaining = active.filter((id) => id !== sessionToLogout);
  return remaining.length > 0 ? (remaining.length === 1 ? remaining[0] : JSON.stringify(remaining)) : null;
}

function isSessionValid(currentSessionId: string | null, sessionId: string, role: string): boolean {
  const active = parseActiveSessions(currentSessionId);
  if (role === "STUDENT") {
    return active.length > 0 && active[active.length - 1] === sessionId;
  }
  return active.includes(sessionId);
}

// 2. Class Tutor Multi-Session Test (Up to 3 devices)
console.log("\n--- 2. CLASS TUTOR MULTI-DEVICE LIFECYCLE ---");
let tutorDbSession: string | null = null;
const tDev1 = "tutor-laptop-001";
const tDev2 = "tutor-mobile-002";
const tDev3 = "tutor-ipad-003";
const tDev4 = "tutor-desktop-004";

// Device 1 logs in
tutorDbSession = simulateLogin(tutorDbSession, tDev1, "CLASS_TUTOR");
assert.strictEqual(isSessionValid(tutorDbSession, tDev1, "CLASS_TUTOR"), true, "Device 1 must be active");
console.log("[✓ PASS] Device 1 logged in -> active");

// Device 2 logs in
tutorDbSession = simulateLogin(tutorDbSession, tDev2, "CLASS_TUTOR");
assert.strictEqual(isSessionValid(tutorDbSession, tDev1, "CLASS_TUTOR"), true, "Device 1 must still be active");
assert.strictEqual(isSessionValid(tutorDbSession, tDev2, "CLASS_TUTOR"), true, "Device 2 must be active");
console.log("[✓ PASS] Device 2 logged in -> BOTH Device 1 and 2 active simultaneously");

// Device 3 logs in
tutorDbSession = simulateLogin(tutorDbSession, tDev3, "CLASS_TUTOR");
assert.strictEqual(isSessionValid(tutorDbSession, tDev1, "CLASS_TUTOR"), true, "Device 1 must still be active");
assert.strictEqual(isSessionValid(tutorDbSession, tDev2, "CLASS_TUTOR"), true, "Device 2 must still be active");
assert.strictEqual(isSessionValid(tutorDbSession, tDev3, "CLASS_TUTOR"), true, "Device 3 must be active");
console.log("[✓ PASS] Device 3 logged in -> ALL 3 Devices (1, 2, 3) active simultaneously");

// Device 4 logs in -> Exceeds 3 devices! Oldest (Device 1) should be evicted
tutorDbSession = simulateLogin(tutorDbSession, tDev4, "CLASS_TUTOR");
assert.strictEqual(isSessionValid(tutorDbSession, tDev1, "CLASS_TUTOR"), false, "Device 1 (oldest) must be evicted");
assert.strictEqual(isSessionValid(tutorDbSession, tDev2, "CLASS_TUTOR"), true, "Device 2 must remain active");
assert.strictEqual(isSessionValid(tutorDbSession, tDev3, "CLASS_TUTOR"), true, "Device 3 must remain active");
assert.strictEqual(isSessionValid(tutorDbSession, tDev4, "CLASS_TUTOR"), true, "Device 4 must be active");
console.log("[✓ PASS] Device 4 logged in -> Oldest (Device 1) evicted, 3 devices (2, 3, 4) active");

// Device 3 logs out -> Devices 2 and 4 remain active
tutorDbSession = simulateLogout(tutorDbSession, tDev3, "CLASS_TUTOR");
assert.strictEqual(isSessionValid(tutorDbSession, tDev3, "CLASS_TUTOR"), false, "Device 3 must be logged out");
assert.strictEqual(isSessionValid(tutorDbSession, tDev2, "CLASS_TUTOR"), true, "Device 2 must remain active after Device 3 logout");
assert.strictEqual(isSessionValid(tutorDbSession, tDev4, "CLASS_TUTOR"), true, "Device 4 must remain active after Device 3 logout");
console.log("[✓ PASS] Device 3 logged out -> Devices 2 and 4 remain active without interruption");

// 3. Course Coordinator & Admin Multi-Session Test
console.log("\n--- 3. COURSE COORDINATOR & SYSTEM ADMIN MULTI-DEVICE ---");
for (const role of ["COURSE_COORDINATOR", "SYSTEM_ADMIN"]) {
  let dbSession: string | null = null;
  dbSession = simulateLogin(dbSession, "d1", role);
  dbSession = simulateLogin(dbSession, "d2", role);
  dbSession = simulateLogin(dbSession, "d3", role);
  assert.strictEqual(isSessionValid(dbSession, "d1", role), true);
  assert.strictEqual(isSessionValid(dbSession, "d2", role), true);
  assert.strictEqual(isSessionValid(dbSession, "d3", role), true);
  console.log(`[✓ PASS] ${role}: 3 concurrent devices active`);
}

// 4. Student Single-Session Sentinel Test
console.log("\n--- 4. STUDENT STRICT SINGLE-SESSION SENTINEL ---");
let studentDbSession: string | null = null;
const sDev1 = "student-laptop-001";
const sDev2 = "student-phone-002";

// Student logs in on Laptop
studentDbSession = simulateLogin(studentDbSession, sDev1, "STUDENT");
assert.strictEqual(isSessionValid(studentDbSession, sDev1, "STUDENT"), true, "Student Laptop must be active");
console.log("[✓ PASS] Student Laptop logged in -> active");

// Student logs in on Phone -> Laptop is IMMEDIATELY REVOKED
studentDbSession = simulateLogin(studentDbSession, sDev2, "STUDENT");
assert.strictEqual(isSessionValid(studentDbSession, sDev1, "STUDENT"), false, "Student Laptop MUST be revoked immediately upon Phone login");
assert.strictEqual(isSessionValid(studentDbSession, sDev2, "STUDENT"), true, "Student Phone is active");
console.log("[✓ PASS] Student Phone logged in -> Laptop revoked immediately (Strictly single-session enforced)");

// Student logs out
studentDbSession = simulateLogout(studentDbSession, sDev2, "STUDENT");
assert.strictEqual(studentDbSession, null, "Student currentSessionId must be null upon logout");
assert.strictEqual(isSessionValid(studentDbSession, sDev2, "STUDENT"), false, "Student session revoked after logout");
console.log("[✓ PASS] Student logout -> Session completely cleared");

console.log("\n==================================================");
console.log("   ALL MULTI-SESSION POLICY TESTS PASSED! (100%)  ");
console.log("==================================================");
