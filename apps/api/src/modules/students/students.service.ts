import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { DRIZZLE_DB } from "../database/database.module";
import { users, studentRegistrations, electives } from "@electify/db";
import { eq, desc } from "drizzle-orm";

@Injectable()
export class StudentsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async getProfile(studentId: string) {
    const [student] = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        registerNumber: users.registerNumber,
        departmentId: users.departmentId,
        sectionId: users.sectionId,
        isEligible: users.isEligible,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1);

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    return student;
  }

  async getRegistrations(studentId: string) {
    return this.db
      .select({
        id: studentRegistrations.id,
        studentId: studentRegistrations.studentId,
        eventId: studentRegistrations.eventId,
        groupId: studentRegistrations.groupId,
        electiveId: studentRegistrations.electiveId,
        courseCode: electives.courseCode,
        courseName: electives.name,
        credits: electives.credits,
        status: studentRegistrations.status,
        isLocked: studentRegistrations.isLocked,
        submittedAt: studentRegistrations.submittedAt,
      })
      .from(studentRegistrations)
      .leftJoin(electives, eq(studentRegistrations.electiveId, electives.id))
      .where(eq(studentRegistrations.studentId, studentId))
      .orderBy(desc(studentRegistrations.submittedAt));
  }
}
