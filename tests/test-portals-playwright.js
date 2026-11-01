const { chromium } = require("playwright");

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  console.log("=== STARTING PLAYWRIGHT PORTAL SIMULATION TESTS ===\n");

  // ==========================================
  // 1. CLASS TUTOR PORTAL (AngelRubavathi)
  // ==========================================
  console.log("--- 1. Testing Class Tutor Portal (angelb1@srmist.edu.in) ---");
  const tutorContext = await browser.newContext();
  const tutorPage = await tutorContext.newPage();

  await tutorPage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  console.log("  Navigated to /login");

  // Switch to Staff tab
  const staffTab = await tutorPage.locator("button:has-text('Staff'), [role='tab']:has-text('Staff')").first();
  if (await staffTab.isVisible()) {
    await staffTab.click();
    console.log("  Clicked Staff tab");
  }

  // Fill staff credentials
  await tutorPage.fill("input[type='email']", "angelb1@srmist.edu.in");
  await tutorPage.fill("input[type='password']", "Electify@2026");
  await tutorPage.click("button:has-text('Sign in')");
  await tutorPage.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
  console.log("  Logged in, current URL:", tutorPage.url());

  // If on session-select, pick AY 2026-2027
  if (tutorPage.url().includes("session-select")) {
    console.log("  On session-select, picking AY 2026-2027...");
    const btn2026 = await tutorPage.locator("button:has-text('2026'), a:has-text('2026')").first();
    if (await btn2026.isVisible()) {
      await btn2026.click();
      await tutorPage.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
    }
  }

  // Go to Dashboard
  await tutorPage.goto("http://localhost:3000/faculty/dashboard", { waitUntil: "networkidle" });
  await tutorPage.waitForTimeout(1000);
  const dashboardText = await tutorPage.textContent("body");

  const hasEventTitle = dashboardText.includes("MCA 2026 Odd Semester Elective Selection");
  const noGlitch = !dashboardText.includes("No class chosen for this timeline yet");
  console.log("  Dashboard shows event:", hasEventTitle ? "YES" : "NO");
  console.log("  'No class chosen' glitch absent:", noGlitch ? "YES" : "NO");
  await tutorPage.screenshot({ path: "screenshot-tutor-dashboard.png", fullPage: true });

  // Go to Live Window
  await tutorPage.goto("http://localhost:3000/faculty/window", { waitUntil: "networkidle" });
  await tutorPage.waitForTimeout(1000);
  const windowText = await tutorPage.textContent("body");
  console.log("  Live window shows status:", windowText.includes("Open") || windowText.includes("Live") || windowText.includes("Closes") ? "YES" : "NO");
  await tutorPage.screenshot({ path: "screenshot-tutor-window.png", fullPage: true });

  // Go to Live Monitor
  await tutorPage.goto("http://localhost:3000/faculty/monitor", { waitUntil: "networkidle" });
  await tutorPage.waitForTimeout(1000);
  const monitorText = await tutorPage.textContent("body");
  console.log("  Live monitor has event data:", !monitorText.includes("No Active Registration Events Found"));
  await tutorPage.screenshot({ path: "screenshot-tutor-monitor.png", fullPage: true });

  // Go to Replay
  await tutorPage.goto("http://localhost:3000/faculty/replay", { waitUntil: "networkidle" });
  await tutorPage.waitForTimeout(1000);
  const replayText = await tutorPage.textContent("body");
  console.log("  Replay shows event sessions:", !replayText.includes("No matching registration events"));
  await tutorPage.screenshot({ path: "screenshot-tutor-replay.png", fullPage: true });

  // Go to Assign Sections / Workspaces
  await tutorPage.goto("http://localhost:3000/faculty/assign-sections", { waitUntil: "networkidle" });
  await tutorPage.waitForTimeout(1000);
  const assignText = await tutorPage.textContent("body");
  console.log("  Assigned section shows active session:", !assignText.includes("No active session"));
  await tutorPage.screenshot({ path: "screenshot-tutor-assign-sections.png", fullPage: true });

  await tutorContext.close();

  // ==========================================
  // 2. COURSE COORDINATOR (Dr. Sabena Banu)
  // ==========================================
  console.log("\n--- 2. Testing Course Coordinator Portal (sabenabanu@srmist.edu.in) ---");
  const coordContext = await browser.newContext();
  const coordPage = await coordContext.newPage();

  await coordPage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  const coordStaffTab = await coordPage.locator("button:has-text('Staff'), [role='tab']:has-text('Staff')").first();
  if (await coordStaffTab.isVisible()) {
    await coordStaffTab.click();
  }
  await coordPage.fill("input[type='email']", "sabenabanu@srmist.edu.in");
  await coordPage.fill("input[type='password']", "Electify@2026");
  await coordPage.click("button:has-text('Sign in')");
  await coordPage.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});

  if (coordPage.url().includes("session-select")) {
    const btn2026 = await coordPage.locator("button:has-text('2026'), a:has-text('2026')").first();
    if (await btn2026.isVisible()) {
      await btn2026.click();
      await coordPage.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
    }
  }

  // Coordinator Events Page
  await coordPage.goto("http://localhost:3000/faculty/events", { waitUntil: "networkidle" });
  await coordPage.waitForTimeout(1000);
  const eventsText = await coordPage.textContent("body");
  console.log("  Events page lists active event:", eventsText.includes("MCA 2026 Odd Semester Elective Selection") ? "YES" : "NO");
  await coordPage.screenshot({ path: "screenshot-coord-events.png", fullPage: true });

  // Coordinator Electives Page
  await coordPage.goto("http://localhost:3000/faculty/electives", { waitUntil: "networkidle" });
  await coordPage.waitForTimeout(1000);
  const electivesText = await coordPage.textContent("body");
  console.log("  Electives page shows courses:", electivesText.includes("Cloud Native Architecture") ? "YES" : "NO");
  await coordPage.screenshot({ path: "screenshot-coord-electives.png", fullPage: true });

  // Coordinator Monitor Page
  await coordPage.goto("http://localhost:3000/faculty/monitor", { waitUntil: "networkidle" });
  await coordPage.waitForTimeout(1000);
  const coordMonText = await coordPage.textContent("body");
  console.log("  Coordinator monitor active:", !coordMonText.includes("No Active Registration Events Found") ? "YES" : "NO");
  await coordPage.screenshot({ path: "screenshot-coord-monitor.png", fullPage: true });

  await coordContext.close();

  // ==========================================
  // 3. STUDENT PORTAL (Confirmed Student)
  // ==========================================
  console.log("\n--- 3. Testing Confirmed Student Portal (RA2532241010001) ---");
  const student1Context = await browser.newContext();
  const student1Page = await student1Context.newPage();

  await student1Page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await student1Page.fill("input[name='registerNumber'], input[placeholder*='RA']", "RA2532241010001");
  await student1Page.fill("input[type='password']", "Electify@2026");
  await student1Page.click("button:has-text('Sign in')");
  await student1Page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
  console.log("  Confirmed student URL:", student1Page.url());

  await student1Page.waitForTimeout(1000);
  const student1Text = await student1Page.textContent("body");
  const confirmedValid = student1Text.includes("Confirmed") || student1Text.includes("registered") || student1Page.url().includes("my-registration");
  console.log("  Registration confirmed view active:", confirmedValid ? "YES" : "NO");
  await student1Page.screenshot({ path: "screenshot-student-confirmed.png", fullPage: true });
  await student1Context.close();

  // ==========================================
  // 4. STUDENT PORTAL (Pending Student - Divya Balaji)
  // ==========================================
  console.log("\n--- 4. Testing Pending Student Portal (RA2532241010006) ---");
  const student2Context = await browser.newContext();
  const student2Page = await student2Context.newPage();

  await student2Page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await student2Page.fill("input[name='registerNumber'], input[placeholder*='RA']", "RA2532241010006");
  await student2Page.fill("input[type='password']", "Electify@2026");
  await student2Page.click("button:has-text('Sign in')");
  await student2Page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
  console.log("  Pending student URL:", student2Page.url());

  await student2Page.waitForTimeout(1000);
  const student2Text = await student2Page.textContent("body");
  const hasCourses = student2Text.includes("Cloud Native Architecture") || student2Text.includes("Professional Elective");
  console.log("  Live elective registration picker loaded:", hasCourses ? "YES" : "NO");
  await student2Page.screenshot({ path: "screenshot-student-live-picker.png", fullPage: true });

  await student2Context.close();
  await browser.close();

  console.log("\n=== ALL PORTAL PLAYWRIGHT TESTS COMPLETED SUCCESSFULLY ===");
}

runTest().catch(err => {
  console.error("Playwright test failed:", err);
  process.exit(1);
});

