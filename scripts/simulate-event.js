const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString = "postgresql://postgres.tfguhqrilbgommfbkzdu:Electify2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";

async function simulate() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected to Supabase PostgreSQL database...");

  const passwordHash = await bcrypt.hash("Electify@2026", 12);

  // 1. Get Faculty, Department, Programme, Batch, and Sections for MCA
  const progRes = await client.query(`
    SELECT p.id as prog_id, p.name as prog_name, d.id as dept_id, d.name as dept_name, f.id as faculty_id, f.name as faculty_name, b.id as batch_id, b.year
    FROM programmes p
    JOIN departments d ON p.department_id = d.id
    JOIN faculties f ON d.faculty_id = f.id
    JOIN academic_batches b ON b.programme_id = p.id
    WHERE p.name = 'MCA. Computer Applications' AND b.year = '2026'
    LIMIT 1;
  `);

  if (progRes.rows.length === 0) {
    throw new Error("MCA programme/batch not found!");
  }
  const mca = progRes.rows[0];
  console.log("Found MCA:", mca);

  // Get Section A for MCA
  const secARes = await client.query(`
    SELECT id, label FROM sections 
    WHERE academic_batch_id = $1 AND label = 'A'
    LIMIT 1;
  `, [mca.batch_id]);
  const sectionA = secARes.rows[0];
  console.log("Section A:", sectionA);

  // Get other sections for MCA
  const allSecRes = await client.query(`
    SELECT id, label FROM sections 
    WHERE academic_batch_id = $1 
    ORDER BY label;
  `, [mca.batch_id]);
  const allSections = allSecRes.rows;

  // 2. Get AY 2026-2027 Academic Session
  const sessRes = await client.query(`
    SELECT id, start_year, end_year FROM academic_sessions 
    WHERE start_year = 2026 LIMIT 1;
  `);
  const session2026 = sessRes.rows[0];
  console.log("Academic Session 2026:", session2026);

  // 3. Ensure Course Coordinator Sabena Banu
  const coordEmail = "sabenabanu@srmist.edu.in";
  let coordId;
  const existingCoord = await client.query(`SELECT id FROM users WHERE email = $1;`, [coordEmail]);
  if (existingCoord.rows.length > 0) {
    coordId = existingCoord.rows[0].id;
    await client.query(`
      UPDATE users 
      SET password_hash = $1, role = 'COURSE_COORDINATOR', faculty_id = $2, department_id = $3, programme_id = $4, is_active = true, updated_at = NOW()
      WHERE id = $5;
    `, [passwordHash, mca.faculty_id, mca.dept_id, mca.prog_id, coordId]);
    console.log("Updated Course Coordinator:", coordEmail, coordId);
  } else {
    const newCoord = await client.query(`
      INSERT INTO users (name, email, role, password_hash, faculty_id, department_id, programme_id, is_active, created_at, updated_at)
      VALUES ('Dr. Sabena Banu', $1, 'COURSE_COORDINATOR', $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id;
    `, [coordEmail, passwordHash, mca.faculty_id, mca.dept_id, mca.prog_id]);
    coordId = newCoord.rows[0].id;
    console.log("Created Course Coordinator:", coordEmail, coordId);
  }

  // 4. Ensure Class Tutor Angel Rubavathi
  const tutorEmail = "angelb1@srmist.edu.in";
  let tutorId;
  const existingTutor = await client.query(`SELECT id FROM users WHERE email = $1;`, [tutorEmail]);
  if (existingTutor.rows.length > 0) {
    tutorId = existingTutor.rows[0].id;
    await client.query(`
      UPDATE users 
      SET password_hash = $1, role = 'CLASS_TUTOR', faculty_id = $2, department_id = $3, programme_id = $4, is_active = true, updated_at = NOW()
      WHERE id = $5;
    `, [passwordHash, mca.faculty_id, mca.dept_id, mca.prog_id, tutorId]);
    console.log("Updated Class Tutor:", tutorEmail, tutorId);
  } else {
    const newTutor = await client.query(`
      INSERT INTO users (name, email, role, password_hash, faculty_id, department_id, programme_id, is_active, created_at, updated_at)
      VALUES ('AngelRubavathi', $1, 'CLASS_TUTOR', $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id;
    `, [tutorEmail, passwordHash, mca.faculty_id, mca.dept_id, mca.prog_id]);
    tutorId = newTutor.rows[0].id;
    console.log("Created Class Tutor:", tutorEmail, tutorId);
  }

  // Ensure Tutor is assigned to Section A
  await client.query(`
    INSERT INTO tutor_sections (tutor_id, section_id)
    VALUES ($1, $2)
    ON CONFLICT (tutor_id, section_id) DO NOTHING;
  `, [tutorId, sectionA.id]);
  console.log("Assigned AngelRubavathi to Section A");

  // 5. Ensure Registration Event
  const eventName = "MCA 2026 Odd Semester Elective Selection";
  let eventId;
  const existingEvent = await client.query(`
    SELECT id FROM registration_events WHERE name = $1 AND academic_batch_id = $2;
  `, [eventName, mca.batch_id]);

  const openDate = new Date(Date.now() - 4 * 3600 * 1000); // 4 hours ago
  const closeDate = new Date(Date.now() + 48 * 3600 * 1000); // in 48 hours

  if (existingEvent.rows.length > 0) {
    eventId = existingEvent.rows[0].id;
    await client.query(`
      UPDATE registration_events 
      SET status = 'OPEN', open_date = $1, close_date = $2, allow_editing = true, auto_close = true, academic_session_id = $3, updated_at = NOW()
      WHERE id = $4;
    `, [openDate, closeDate, session2026.id, eventId]);
    console.log("Updated existing Registration Event:", eventId);
  } else {
    const newEvent = await client.query(`
      INSERT INTO registration_events (
        name, description, academic_year, academic_session_id, semester, 
        academic_batch_id, created_by_id, open_date, close_date, status, 
        allow_editing, auto_close, created_at, updated_at
      ) VALUES (
        $1, 'SRMIST Kattankulathur - Department of Computer Applications official elective registration window for 2026 intake.',
        '2026-2027', $2, 1, $3, $4, $5, $6, 'OPEN', true, true, NOW(), NOW()
      ) RETURNING id;
    `, [eventName, session2026.id, mca.batch_id, coordId, openDate, closeDate]);
    eventId = newEvent.rows[0].id;
    console.log("Created Registration Event:", eventId);
  }

  // 6. Link Event to Sections (Sections A, B, C, D)
  for (const sec of allSections.slice(0, 4)) {
    const existingLink = await client.query(`
      SELECT id FROM event_sections WHERE event_id = $1 AND section_id = $2;
    `, [eventId, sec.id]);
    if (existingLink.rows.length === 0) {
      await client.query(`
        INSERT INTO event_sections (event_id, section_id, academic_batch_id)
        VALUES ($1, $2, $3);
      `, [eventId, sec.id, mca.batch_id]);
    }
  }
  console.log("Linked event to sections A, B, C, D");

  // 7. Create Elective Groups
  // Basket 1: Professional Elective - I
  let group1Id;
  const g1Res = await client.query(`SELECT id FROM elective_groups WHERE event_id = $1 AND name ILIKE '%Professional Elective%';`, [eventId]);
  if (g1Res.rows.length > 0) {
    group1Id = g1Res.rows[0].id;
  } else {
    const newG1 = await client.query(`
      INSERT INTO elective_groups (event_id, name, min_choices, max_choices, sort_order, created_at)
      VALUES ($1, 'Professional Elective - I (Cloud & AI Architecture)', 1, 1, 1, NOW())
      RETURNING id;
    `, [eventId]);
    group1Id = newG1.rows[0].id;
  }

  // Basket 2: Open Elective - I
  let group2Id;
  const g2Res = await client.query(`SELECT id FROM elective_groups WHERE event_id = $1 AND name ILIKE '%Open Elective%';`, [eventId]);
  if (g2Res.rows.length > 0) {
    group2Id = g2Res.rows[0].id;
  } else {
    const newG2 = await client.query(`
      INSERT INTO elective_groups (event_id, name, min_choices, max_choices, sort_order, created_at)
      VALUES ($1, 'Open Elective - I (Emerging Technologies & Management)', 1, 1, 2, NOW())
      RETURNING id;
    `, [eventId]);
    group2Id = newG2.rows[0].id;
  }
  console.log("Elective Groups:", { group1Id, group2Id });

  // 8. Create Electives
  const electivesDef = [
    // Group 1
    { groupId: group1Id, code: "21CAC101T", name: "Cloud Native Architecture & Kubernetes", credits: 3, max: 30, desc: "Container orchestration, microservices, and multi-cloud resilience on AWS & GCP." },
    { groupId: group1Id, code: "21CAC102T", name: "Deep Learning & Generative AI Systems", credits: 3, max: 30, desc: "Neural networks, transformer architectures, LLM fine-tuning, and diffusion models." },
    { groupId: group1Id, code: "21CAC103T", name: "Modern Full-Stack Distributed Systems", credits: 3, max: 30, desc: "High-throughput asynchronous workflows, event-driven backends, and Next.js." },
    // Group 2
    { groupId: group2Id, code: "21CAE201T", name: "Technology Entrepreneurship & Product Management", credits: 3, max: 30, desc: "Agile product lifecycle, lean market validation, and venture scalability." },
    { groupId: group2Id, code: "21CAE202T", name: "Cyber Threat Intelligence & Zero Trust Security", credits: 3, max: 30, desc: "Enterprise identity architecture, cryptographic protocols, and SOC operations." },
  ];

  const electiveMap = new Map();
  for (const el of electivesDef) {
    const existing = await client.query(`
      SELECT id FROM electives WHERE group_id = $1 AND course_code = $2;
    `, [el.groupId, el.code]);
    if (existing.rows.length > 0) {
      electiveMap.set(el.code, existing.rows[0].id);
      await client.query(`
        UPDATE electives 
        SET name = $1, credits = $2, description = $3, max_seats = $4, is_active = true, updated_at = NOW()
        WHERE id = $5;
      `, [el.name, el.credits, el.desc, el.max, existing.rows[0].id]);
    } else {
      const ins = await client.query(`
        INSERT INTO electives (group_id, course_code, name, credits, description, max_seats, available_seats, is_active, is_full, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $6, true, false, NOW(), NOW())
        RETURNING id;
      `, [el.groupId, el.code, el.name, el.credits, el.desc, el.max]);
      electiveMap.set(el.code, ins.rows[0].id);
    }
  }
  console.log("Provisioned 5 courses across 2 baskets.");

  // 9. Seed 10 Students in Section A of MCA
  const studentsDef = [
    { reg: "RA2532241010001", name: "Karthik Raman", email: "kr8891@srmist.edu.in", g1: "21CAC101T", g2: "21CAE201T", confirmed: true },
    { reg: "RA2532241010002", name: "Priya Sharma", email: "ps2234@srmist.edu.in", g1: "21CAC102T", g2: "21CAE201T", confirmed: true },
    { reg: "RA2532241010003", name: "Arjun Nair", email: "an4412@srmist.edu.in", g1: "21CAC101T", g2: "21CAE202T", confirmed: true },
    { reg: "RA2532241010004", name: "Sneha Reddy", email: "sr9981@srmist.edu.in", g1: "21CAC102T", g2: "21CAE202T", confirmed: true },
    { reg: "RA2532241010005", name: "Vignesh Kumar", email: "vk3311@srmist.edu.in", g1: "21CAC103T", g2: "21CAE201T", confirmed: true },
    { reg: "RA2532241010006", name: "Divya Balaji", email: "db7721@srmist.edu.in", confirmed: false },
    { reg: "RA2532241010007", name: "Rohit Sundaram", email: "rs6654@srmist.edu.in", confirmed: false },
    { reg: "RA2532241010008", name: "Meera Krishnan", email: "mk1109@srmist.edu.in", confirmed: false },
    { reg: "RA2532241010009", name: "Aakash Verma", email: "av5543@srmist.edu.in", confirmed: false },
    { reg: "RA2532241010010", name: "Pooja Natarajan", email: "pn8872@srmist.edu.in", confirmed: false },
  ];

  const studentIds = [];
  for (const st of studentsDef) {
    let sId;
    const existingSt = await client.query(`SELECT id FROM users WHERE register_number = $1 OR email = $2;`, [st.reg, st.email]);
    if (existingSt.rows.length > 0) {
      sId = existingSt.rows[0].id;
      await client.query(`
        UPDATE users 
        SET name = $1, email = $2, register_number = $3, password_hash = $4, role = 'STUDENT',
            faculty_id = $5, department_id = $6, programme_id = $7, academic_batch_id = $8, section_id = $9,
            is_active = true, updated_at = NOW()
        WHERE id = $10;
      `, [st.name, st.email, st.reg, passwordHash, mca.faculty_id, mca.dept_id, mca.prog_id, mca.batch_id, sectionA.id, sId]);
    } else {
      const ins = await client.query(`
        INSERT INTO users (
          name, email, register_number, password_hash, role, 
          faculty_id, department_id, programme_id, academic_batch_id, section_id, 
          is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'STUDENT',
          $5, $6, $7, $8, $9,
          true, NOW(), NOW()
        ) RETURNING id;
      `, [st.name, st.email, st.reg, passwordHash, mca.faculty_id, mca.dept_id, mca.prog_id, mca.batch_id, sectionA.id]);
      sId = ins.rows[0].id;
    }
    st.userId = sId;
    studentIds.push(sId);
  }
  console.log("Provisioned 10 students in Section A of MCA.");

  // 10. Record Confirmed Registrations for First 5 Students
  // First clear any previous registrations for this event by these students
  await client.query(`
    DELETE FROM student_registrations WHERE event_id = $1 AND student_id = ANY($2);
  `, [eventId, studentIds]);
  await client.query(`
    DELETE FROM replay_events WHERE registration_event_id = $1 AND student_id = ANY($2);
  `, [eventId, studentIds]);

  let minutesAgo = 120;
  for (const st of studentsDef.filter(s => s.confirmed)) {
    const el1Id = electiveMap.get(st.g1);
    const el2Id = electiveMap.get(st.g2);
    const submitTime = new Date(Date.now() - minutesAgo * 60 * 1000);
    minutesAgo -= 20;

    // Insert student_registrations for Group 1
    await client.query(`
      INSERT INTO student_registrations (student_id, event_id, group_id, elective_id, status, is_locked, submitted_at, updated_at)
      VALUES ($1, $2, $3, $4, 'CONFIRMED', true, $5, $5);
    `, [st.userId, eventId, group1Id, el1Id, submitTime]);

    // Insert student_registrations for Group 2
    await client.query(`
      INSERT INTO student_registrations (student_id, event_id, group_id, elective_id, status, is_locked, submitted_at, updated_at)
      VALUES ($1, $2, $3, $4, 'CONFIRMED', true, $5, $5);
    `, [st.userId, eventId, group2Id, el2Id, submitTime]);

    // Also insert into main registrations table
    await client.query(`
      INSERT INTO registrations (student_id, event_id, status, is_finalized, receipt_number, submitted_at, created_at, updated_at)
      VALUES ($1, $2, 'CONFIRMED', true, $3, $4, $4, $4)
      ON CONFLICT (student_id, event_id) DO UPDATE 
      SET status = 'CONFIRMED', is_finalized = true, receipt_number = $3, submitted_at = $4;
    `, [st.userId, eventId, `SRM-MCA-2026-${st.reg.slice(-4)}`, submitTime]);

    // Insert replay_events for both selections
    const el1Def = electivesDef.find(e => e.code === st.g1);
    const el2Def = electivesDef.find(e => e.code === st.g2);

    await client.query(`
      INSERT INTO replay_events (
        registration_event_id, timestamp, student_id, student_name,
        event_type, subject_id, subject_name, new_subject,
        seat_before, seat_after, performed_by, metadata, created_at
      ) VALUES 
      ($1, $2, $3, $4, 'REGISTRATION_SUBMITTED', $5, $6, $6, 30, 29, $3, $7, $2),
      ($1, $2, $3, $4, 'REGISTRATION_SUBMITTED', $8, $9, $9, 30, 29, $3, $7, $2);
    `, [
      eventId, submitTime, st.userId, st.name,
      el1Id, el1Def.name, JSON.stringify({ electiveCode: el1Def.code, group: "Professional Elective - I" }),
      el2Id, el2Def.name
    ]);
  }
  console.log("Inserted 5 confirmed registrations with replay event audit entries.");

  // 11. Recalculate Available Seats
  for (const [code, elId] of electiveMap.entries()) {
    const regCountRes = await client.query(`
      SELECT count(*) as cnt FROM student_registrations WHERE elective_id = $1 AND status = 'CONFIRMED';
    `, [elId]);
    const taken = parseInt(regCountRes.rows[0].cnt, 10);
    const available = Math.max(0, 30 - taken);
    await client.query(`
      UPDATE electives 
      SET available_seats = $1, is_full = $2, updated_at = NOW() 
      WHERE id = $3;
    `, [available, available === 0, elId]);
  }
  console.log("Recalculated course seat quotas.");

  console.log("\n========================================================");
  console.log(" SIMULATION READY ACROSS ALL 3 PORTALS:");
  console.log("========================================================");
  console.log("1. COURSE COORDINATOR:");
  console.log("   Email: sabenabanu@srmist.edu.in");
  console.log("   Password: Electify@2026");
  console.log("   Role: COURSE_COORDINATOR (MCA. Computer Applications)");
  console.log("   Active Event: MCA 2026 Odd Semester Elective Selection (OPEN)");
  console.log("");
  console.log("2. CLASS TUTOR:");
  console.log("   Email: angelb1@srmist.edu.in");
  console.log("   Password: Electify@2026");
  console.log("   Role: CLASS_TUTOR (Section A, MCA. Computer Applications)");
  console.log("   Section: Section A (10 students: 5 registered, 5 pending)");
  console.log("");
  console.log("3. STUDENT PORTAL (CONFIRMED):");
  console.log("   Register No: RA2532241010001 (Karthik Raman)");
  console.log("   Password: Electify@2026");
  console.log("   Status: CONFIRMED (/dashboard/my-registration)");
  console.log("");
  console.log("4. STUDENT PORTAL (LIVE REGISTRATION READY TO TEST):");
  console.log("   Register No: RA2532241010006 (Divya Balaji)");
  console.log("   Password: Electify@2026");
  console.log("   Status: PENDING - Live picker ready to test submission!");
  console.log("========================================================\n");

  await client.end();
}

simulate().catch(err => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
