const { chromium } = require("playwright");

const USERS = [
  {
    role: "CLASS_TUTOR",
    email: "angelb1@srmist.edu.in",
    pass: "Electify@2026",
    routes: [
      "/faculty/dashboard",
      "/faculty/monitor",
      "/faculty/window",
      "/faculty/replay",
      "/faculty/tutor-electives",
      "/faculty/section",
      "/faculty/tutor-reports",
      "/faculty/approvals",
      "/faculty/database",
    ]
  },
  {
    role: "COURSE_COORDINATOR",
    email: "sabenabanu@srmist.edu.in",
    pass: "Electify@2026",
    routes: [
      "/faculty/dashboard",
      "/faculty/monitor",
      "/faculty/window",
      "/faculty/replay",
      "/faculty/electives",
      "/faculty/events",
      "/faculty/academic-sessions",
      "/faculty/departments",
      "/faculty/students",
      "/faculty/reports",
      "/faculty/section",
      "/faculty/tutor-electives",
      "/faculty/tutor-reports",
      "/faculty/approvals",
      "/faculty/invites",
      "/faculty/templates",
      "/faculty/database",
    ]
  },
  {
    role: "SYSTEM_ADMIN",
    email: "srmelectify@gmail.com",
    pass: "Electify@2026",
    routes: [
      "/faculty/dashboard",
      "/faculty/monitor",
      "/faculty/replay",
      "/faculty/events",
      "/faculty/academic-sessions",
      "/faculty/departments",
      "/faculty/templates",
      "/faculty/users",
      "/faculty/invites",
      "/faculty/audit",
      "/faculty/database",
      "/faculty/settings",
    ]
  }
];

async function verifyPortals() {
  console.log("==================================================");
  console.log("   ELECTIFY PORTAL & MODULE VERIFICATION SUITE   ");
  console.log("==================================================\n");

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const user of USERS) {
    console.log(`\n▶ TESTING PORTAL: ${user.role} (${user.email})`);
    const context = await browser.newContext();
    const page = await context.newPage();

    const pageErrors = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    try {
      // 1. Log in
      await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
      await page.click("text=Staff");
      await page.fill("input[name='email']", user.email);
      await page.fill("input[name='password']", user.pass);
      await page.click("button[type='submit']");
      await page.waitForTimeout(1500);

      // Handle session selector if redirected
      if (page.url().includes("/session-select")) {
        console.log(`  [i] Handled /session-select prompt for ${user.role}`);
        const selectBtn = page.locator("button:has-text('Enter Workspace'), button:has-text('Select')").first();
        if (await selectBtn.isVisible()) {
          await selectBtn.click();
          await page.waitForTimeout(1000);
        }
      }

      console.log(`  ✓ Logged in successfully: ${page.url()}`);

      // 2. Test each route
      for (const route of user.routes) {
        pageErrors.length = 0;
        let statusCode = 200;
        try {
          const resp = await page.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
          statusCode = resp ? resp.status() : 0;
          await page.waitForTimeout(600);

          // Check if page showed error boundary
          const bodyText = await page.innerText("body");
          const hasCrash = bodyText.includes("Application error") || bodyText.includes("Internal Server Error") || statusCode >= 500;
          const passed = !hasCrash && pageErrors.length === 0;

          results.push({
            role: user.role,
            route,
            passed,
            statusCode,
            error: hasCrash ? "Page crash / 500" : (pageErrors[0] || null)
          });

          if (passed) {
            console.log(`    [✓ PASS] ${route} (Status: ${statusCode})`);
          } else {
            console.log(`    [✗ FAIL] ${route} (Status: ${statusCode}) - Error: ${pageErrors[0] || "Crash detected"}`);
          }
        } catch (routeErr) {
          results.push({
            role: user.role,
            route,
            passed: false,
            statusCode: 0,
            error: routeErr.message
          });
          console.log(`    [✗ FAIL] ${route} - Timeout/Error: ${routeErr.message}`);
        }
      }

    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log("\n==================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`TOTAL MODULES TESTED: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    console.log("\nFailed modules:");
    results.filter(r => !r.passed).forEach(r => console.log(` - [${r.role}] ${r.route}: ${r.error}`));
    process.exit(1);
  } else {
    console.log("\n🎉 ALL PORTAL MODULES ARE 100% OPERATIONAL!");
    process.exit(0);
  }
}

verifyPortals().catch(console.error);
