const { Pool } = require("pg");
const dotenv = require("dotenv");
dotenv.config({ path: [".env.local", ".env"] });

async function runSQA() {
  console.log("=================================================");
  console.log("   ELECTIFY SQA COMPREHENSIVE VERIFICATION SUITE ");
  console.log("=================================================\n");

  const results = [];
  function record(suite, testName, passed, details = "") {
    results.push({ suite, testName, passed, details });
    const mark = passed ? "✓ PASS" : "✗ FAIL";
    console.log(`[${mark}] ${suite} -> ${testName} ${details ? "(" + details + ")" : ""}`);
  }

  // ── 1. Database SQA ───────────────────────────────────────────
  console.log("\n--- 1. DATABASE & POSTGRESQL CONNECTIVITY ---");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const pingRes = await pool.query("SELECT 1 AS alive");
    record("Database", "Supabase PostgreSQL Ping", pingRes.rows[0]?.alive === 1);

    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 
      ORDER BY table_name;
    `, ["public"]);
    const tableNames = tablesRes.rows.map(r => r.table_name);
    record("Database", "Public Tables Exists (20+)", tableNames.length >= 20, `${tableNames.length} tables found`);

    const userCountRes = await pool.query("SELECT COUNT(*) AS count FROM users;");
    record("Database", "Users Table Populated", parseInt(userCountRes.rows[0].count) >= 3, `${userCountRes.rows[0].count} users`);

    const settingsRes = await pool.query("SELECT * FROM system_settings WHERE id = $1;", ["system"]);
    record("Database", "System Settings Table Initialized", settingsRes.rows.length === 1);
  } catch (err) {
    record("Database", "Supabase Direct Query", false, err.message);
  } finally {
    await pool.end();
  }

  // ── 2. NestJS Backend API SQA ─────────────────────────────────
  console.log("\n--- 2. NESTJS BACKEND API ENDPOINTS ---");
  const apiBase = "http://localhost:4000/api";

  async function checkEndpoint(name, path, method = "GET", body = null, headers = {}) {
    try {
      const res = await fetch(`${apiBase}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : null
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data, ok: res.ok };
    } catch (e) {
      return { status: 0, data: null, ok: false, error: e.message };
    }
  }

  const rootCheck = await checkEndpoint("Root Index", "");
  record("Backend API", "GET /api (API Manifest)", rootCheck.ok && rootCheck.data?.name?.includes("Electify"));

  const healthCheck = await checkEndpoint("Health", "/health");
  record("Backend API", "GET /api/health (Service Health)", healthCheck.ok && healthCheck.data?.status === "ok");

  const healthDbCheck = await checkEndpoint("Health DB", "/health/db");
  record("Backend API", "GET /api/health/db (Supabase Connected)", healthDbCheck.ok && healthDbCheck.data?.database === "connected");

  // Auth tests
  let adminToken = "";
  let tutorToken = "";
  let coordinatorToken = "";

  const adminLogin = await checkEndpoint("Admin Login", "/auth/login", "POST", {
    identifier: "srmelectify@gmail.com",
    password: "Electify@2026"
  });
  record("Backend API", "POST /api/auth/login (Root Admin)", adminLogin.ok && adminLogin.data?.user?.role === "SYSTEM_ADMIN");
  adminToken = adminLogin.data?.access_token || "";

  const tutorLogin = await checkEndpoint("Tutor Login", "/auth/login", "POST", {
    identifier: "angelb1@srmist.edu.in",
    password: "Electify@2026"
  });
  record("Backend API", "POST /api/auth/login (Class Tutor)", tutorLogin.ok && tutorLogin.data?.user?.role === "CLASS_TUTOR");
  tutorToken = tutorLogin.data?.access_token || "";

  const coordLogin = await checkEndpoint("Coordinator Login", "/auth/login", "POST", {
    identifier: "sabenabanu@srmist.edu.in",
    password: "Electify@2026"
  });
  record("Backend API", "POST /api/auth/login (Course Coordinator)", coordLogin.ok && coordLogin.data?.user?.role === "COURSE_COORDINATOR");
  coordinatorToken = coordLogin.data?.access_token || "";

  // Guard tests
  const adminMe = await checkEndpoint("Admin /auth/me", "/auth/me", "GET", null, { Authorization: `Bearer ${adminToken}` });
  record("Backend Auth Guard", "GET /api/auth/me (Admin Bearer Token)", adminMe.ok && adminMe.data?.email === "srmelectify@gmail.com");

  const adminSettingsAuth = await checkEndpoint("Admin Settings", "/admin/settings", "GET", null, { Authorization: `Bearer ${adminToken}` });
  record("Backend Auth Guard", "GET /api/admin/settings (Allowed for SYSTEM_ADMIN)", adminSettingsAuth.ok);

  const tutorSettingsForbidden = await checkEndpoint("Tutor Admin Settings", "/admin/settings", "GET", null, { Authorization: `Bearer ${tutorToken}` });
  record("Backend RBAC Guard", "GET /api/admin/settings (Forbidden for CLASS_TUTOR)", tutorSettingsForbidden.status === 403);

  const tutorSections = await checkEndpoint("Tutor Sections", "/faculty/my-sections", "GET", null, { Authorization: `Bearer ${tutorToken}` });
  record("Backend API", "GET /api/faculty/my-sections (Class Tutor Scope)", tutorSections.ok);

  const electivesList = await checkEndpoint("Electives List", "/electives", "GET", null, { Authorization: `Bearer ${adminToken}` });
  record("Backend API", "GET /api/electives", electivesList.ok);

  const seatMetrics = await checkEndpoint("Seat Metrics", "/electives/metrics/seats", "GET", null, { Authorization: `Bearer ${adminToken}` });
  record("Backend API", "GET /api/electives/metrics/seats", seatMetrics.ok);

  // ── 3. Next.js Frontend SQA ───────────────────────────────────
  console.log("\n--- 3. NEXT.JS FRONTEND & RUNTIME PROXY ---");
  const webBase = "http://localhost:3000";

  const loginPageRes = await fetch(`${webBase}/login`);
  const loginHtml = await loginPageRes.text();
  record("Frontend", "GET /login (Sign-in Page Rendered)", loginPageRes.status === 200 && loginHtml.includes("Sign in"));

  const rootRedirectRes = await fetch(`${webBase}/`, { redirect: "manual" });
  record("Frontend", "GET / (Auto-redirect to /login)", rootRedirectRes.status === 307 && rootRedirectRes.headers.get("location") === "/login");

  const proxyHealthRes = await fetch(`${webBase}/api/nest/health`);
  const proxyHealthData = await proxyHealthRes.json().catch(() => null);
  record("Frontend Proxy", "GET /api/nest/health (Runtime Proxy to NestJS)", proxyHealthRes.ok && proxyHealthData?.status === "ok");

  const unauthSwitchSec = await fetch(`${webBase}/api/switch-section`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  record("Frontend Guard", "POST /api/switch-section (Guarded 401 when Unauthenticated)", unauthSwitchSec.status === 401);

  // ── Summary ──────────────────────────────────────────────────
  console.log("\n=================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL SQA TESTS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=================================================");
  process.exit(failed > 0 ? 1 : 0);
}

runSQA();

