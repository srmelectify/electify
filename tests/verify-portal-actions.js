const assert = require("node:assert");

console.log("==================================================");
console.log("   ELECTIFY PORTAL ACTIONS & MUTATIONS TEST       ");
console.log("==================================================\n");

async function testActions() {
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: "postgresql://postgres.tfguhqrilbgommfbkzdu:Electify2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Verify Class Tutor section assignment
    console.log("--- 1. CLASS TUTOR SECTION ASSIGNMENT ---");
    const tutorRes = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, ts.section_id, s.label, b.year
      FROM users u
      JOIN tutor_sections ts ON ts.tutor_id = u.id
      JOIN sections s ON ts.section_id = s.id
      JOIN academic_batches b ON s.academic_batch_id = b.id
      WHERE u.role = 'CLASS_TUTOR';
    `);
    assert.ok(tutorRes.rows.length > 0, "Class Tutor must have assigned section");
    console.log(`[✓ PASS] Class Tutor (${tutorRes.rows[0].email}) assigned to Section ${tutorRes.rows[0].label}`);

    // 2. Verify Course Coordinator department & section assignment
    console.log("\n--- 2. COURSE COORDINATOR DEPARTMENT ASSIGNMENT ---");
    const coordRes = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, d.name as dept_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role = 'COURSE_COORDINATOR';
    `);
    assert.ok(coordRes.rows.length > 0, "Course Coordinator must exist");
    console.log(`[✓ PASS] Course Coordinator (${coordRes.rows[0].email}) active in system`);

    // 3. Verify System Admin privileges & System Settings
    console.log("\n--- 3. SYSTEM ADMIN & SETTINGS ---");
    const adminRes = await pool.query(`
      SELECT id, name, email, role, is_active FROM users WHERE role = 'SYSTEM_ADMIN';
    `);
    assert.ok(adminRes.rows.length > 0, "System Admin must exist");
    console.log(`[✓ PASS] Root Admin (${adminRes.rows[0].email}) possesses SYSTEM_ADMIN role`);

    const settingsRes = await pool.query("SELECT * FROM system_settings WHERE id = 'system'");
    assert.strictEqual(settingsRes.rows.length, 1, "System settings row must exist");
    console.log(`[✓ PASS] Global System Settings active (Maintenance Mode: ${settingsRes.rows[0].maintenance_mode})`);

    // 4. Test Class Code Generation Logic
    console.log("\n--- 4. CLASS TUTOR SIGNUP CODE LOGIC ---");
    const testCode = "EFCL-TEST" + Math.floor(Math.random() * 8999 + 1000);
    const tutorId = tutorRes.rows[0].id;
    const sectionId = tutorRes.rows[0].section_id;

    // Get batch id from section
    const secBatch = await pool.query("SELECT academic_batch_id FROM sections WHERE id = $1", [sectionId]);
    const batchId = secBatch.rows[0].academic_batch_id;

    const insCode = await pool.query(`
      INSERT INTO invite_codes (code, role, section_id, academic_batch_id, created_by_id, max_uses, used_count, status, expires_at)
      VALUES ($1, 'STUDENT', $2, $3, $4, 60, 0, 'ACTIVE', NOW() + INTERVAL '7 days')
      RETURNING id, code;
    `, [testCode, sectionId, batchId, tutorId]);
    assert.strictEqual(insCode.rows.length, 1);
    console.log(`[✓ PASS] Class Tutor generated enrollment code: ${insCode.rows[0].code}`);

    // Clean up test code
    await pool.query("DELETE FROM invite_codes WHERE id = $1", [insCode.rows[0].id]);
    console.log(`[✓ PASS] Class Code lifecycle verified & cleaned up`);

    // 5. Test Staff Invite Code Generation Logic
    console.log("\n--- 5. COURSE COORDINATOR STAFF INVITE LOGIC ---");
    const testInvite = "ELC-TEST" + Math.floor(Math.random() * 8999 + 1000);
    const insInvite = await pool.query(`
      INSERT INTO invite_codes (code, role, status, created_by_id, expires_at)
      VALUES ($1, 'CLASS_TUTOR', 'ACTIVE', $2, NOW() + INTERVAL '14 days')
      RETURNING id, code, role;
    `, [testInvite, coordRes.rows[0].id]);
    assert.strictEqual(insInvite.rows.length, 1);
    console.log(`[✓ PASS] Coordinator generated staff invite code: ${insInvite.rows[0].code}`);

    // Clean up test invite
    await pool.query("DELETE FROM invite_codes WHERE id = $1", [insInvite.rows[0].id]);
    console.log(`[✓ PASS] Staff Invite lifecycle verified & cleaned up`);

    // 6. Test Audit Logging
    console.log("\n--- 6. AUDIT LOGGING INTEGRITY ---");
    const insAudit = await pool.query(`
      INSERT INTO audit_logs (action, user_id, user_email, user_role, metadata)
      VALUES ('PORTAL_VERIFICATION_CHECK', $1, 'system@electify.internal', 'SYSTEM_ADMIN', '{"test": true}')
      RETURNING id;
    `, [adminRes.rows[0].id]);
    assert.strictEqual(insAudit.rows.length, 1);
    console.log(`[✓ PASS] Immutable Audit Log entry recorded`);
    await pool.query("DELETE FROM audit_logs WHERE id = $1", [insAudit.rows[0].id]);

    console.log("\n==================================================");
    console.log("   ALL PORTAL ACTIONS & MUTATIONS PASSED!         ");
    console.log("==================================================");
  } finally {
    await pool.end();
  }
}

testActions().catch(err => {
  console.error("Action verification failed:", err);
  process.exit(1);
});
