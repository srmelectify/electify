const { Client } = require("pg");

const connectionString = "postgresql://postgres.tfguhqrilbgommfbkzdu:Electify2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";

async function testSimulatedEvent() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log("=== VERIFYING SIMULATED EVENT ACROSS ALL 3 PORTALS ===\n");

  let passes = 0;
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passes++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failures++;
    }
  }

  // 1. Verify Academic Sessions & Cohort Terms
  console.log("1. Checking Academic Hierarchy & Year Servers:");
  const termsRes = await client.query(`
    SELECT count(*) as total_terms FROM cohort_session_terms;
  `);
  assert(parseInt(termsRes.rows[0].total_terms, 10) >= 453, `Cohort session terms populated (${termsRes.rows[0].total_terms} rows)`);

  const mcaTerms = await client.query(`
    SELECT cst.*, sess.start_year, sess.end_year 
    FROM cohort_session_terms cst
    JOIN academic_batches b ON cst.academic_batch_id = b.id
    JOIN programmes p ON b.programme_id = p.id
    JOIN academic_sessions sess ON cst.academic_session_id = sess.id
    WHERE p.name = 'MCA. Computer Applications' AND sess.start_year = 2026;
  `);
  assert(mcaTerms.rows.length > 0, "MCA 2026 batch linked to AY 2026-2027 in cohort_session_terms");

  // 2. Verify Course Coordinator Setup
  console.log("\n2. Checking Course Coordinator (sabenabanu@srmist.edu.in):");
  const coordRes = await client.query(`
    SELECT u.id, u.email, u.role, p.name as prog_name, d.name as dept_name
    FROM users u
    JOIN programmes p ON u.programme_id = p.id
    JOIN departments d ON u.department_id = d.id
    WHERE u.email = 'sabenabanu@srmist.edu.in';
  `);
  assert(coordRes.rows.length === 1, "Course coordinator account exists");
  assert(coordRes.rows[0].role === "COURSE_COORDINATOR", "Role is COURSE_COORDINATOR");
  assert(coordRes.rows[0].prog_name === "MCA. Computer Applications", "Programme is MCA. Computer Applications");

  // 3. Verify Class Tutor Setup
  console.log("\n3. Checking Class Tutor (angelb1@srmist.edu.in):");
  const tutorRes = await client.query(`
    SELECT u.id, u.email, u.role, ts.section_id, s.label, b.year, p.name as prog_name
    FROM users u
    JOIN tutor_sections ts ON ts.tutor_id = u.id
    JOIN sections s ON ts.section_id = s.id
    JOIN academic_batches b ON s.academic_batch_id = b.id
    JOIN programmes p ON b.programme_id = p.id
    WHERE u.email = 'angelb1@srmist.edu.in';
  `);
  assert(tutorRes.rows.length >= 1, "Class tutor assigned in tutor_sections");
  assert(tutorRes.rows[0].label === "A", "Assigned section is Section A");
  assert(tutorRes.rows[0].prog_name === "MCA. Computer Applications", "Assigned programme is MCA. Computer Applications");

  // 4. Verify Registration Event
  console.log("\n4. Checking Registration Event:");
  const eventRes = await client.query(`
    SELECT e.*, sess.start_year, sess.end_year, count(es.id) as section_targets
    FROM registration_events e
    JOIN academic_sessions sess ON e.academic_session_id = sess.id
    LEFT JOIN event_sections es ON es.event_id = e.id
    WHERE e.name = 'MCA 2026 Odd Semester Elective Selection'
    GROUP BY e.id, sess.start_year, sess.end_year;
  `);
  assert(eventRes.rows.length === 1, "Event 'MCA 2026 Odd Semester Elective Selection' exists");
  const ev = eventRes.rows[0];
  assert(ev.status === "OPEN", "Event status is OPEN");
  assert(parseInt(ev.section_targets, 10) >= 1, `Event targets ${ev.section_targets} sections including Section A`);
  assert(new Date(ev.open_date) < new Date(), "Event open_date is in the past (portal is currently active)");
  assert(new Date(ev.close_date) > new Date(), "Event close_date is in the future");

  // 5. Verify Elective Groups & Courses
  console.log("\n5. Checking Elective Baskets & Courses:");
  const groupsRes = await client.query(`
    SELECT g.id, g.name, count(el.id) as course_count
    FROM elective_groups g
    LEFT JOIN electives el ON el.group_id = g.id
    WHERE g.event_id = $1
    GROUP BY g.id, g.name
    ORDER BY g.sort_order;
  `, [ev.id]);
  assert(groupsRes.rows.length === 2, "2 Elective Baskets configured");
  for (const g of groupsRes.rows) {
    assert(parseInt(g.course_count, 10) >= 2, `Basket '${g.name}' has ${g.course_count} courses`);
  }

  // 6. Verify Students in Section A
  console.log("\n6. Checking Section A Student Roster:");
  const studentsRes = await client.query(`
    SELECT u.id, u.register_number, u.name, u.email,
           count(sr.id) as reg_count
    FROM users u
    LEFT JOIN student_registrations sr ON sr.student_id = u.id AND sr.event_id = $1 AND sr.status = 'CONFIRMED'
    WHERE u.section_id = $2 AND u.role = 'STUDENT'
    GROUP BY u.id, u.register_number, u.name, u.email
    ORDER BY u.register_number;
  `, [ev.id, tutorRes.rows[0].section_id]);
  assert(studentsRes.rows.length === 10, `10 students enrolled in Section A (found ${studentsRes.rows.length})`);
  
  const confirmed = studentsRes.rows.filter(s => parseInt(s.reg_count, 10) > 0);
  const pending = studentsRes.rows.filter(s => parseInt(s.reg_count, 10) === 0);
  assert(confirmed.length === 5, `5 students confirmed registrations (found ${confirmed.length})`);
  assert(pending.length === 5, `5 students pending registration (found ${pending.length})`);

  // 7. Verify Registration Replay Stream
  console.log("\n7. Checking Registration Replay Audit Stream:");
  const replayRes = await client.query(`
    SELECT count(*) as replay_count FROM replay_events WHERE registration_event_id = $1;
  `, [ev.id]);
  assert(parseInt(replayRes.rows[0].replay_count, 10) >= 5, `Replay events recorded (${replayRes.rows[0].replay_count} audit logs)`);

  await client.end();

  console.log(`\n========================================================`);
  console.log(`RESULTS: ${passes} PASSED, ${failures} FAILED`);
  console.log(`========================================================\n`);

  if (failures > 0) process.exit(1);
}

testSimulatedEvent().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
