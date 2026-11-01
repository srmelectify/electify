import { Injectable, Inject } from "@nestjs/common";
import { DRIZZLE_DB } from "../database/database.module";
import { users, sections, tutorSections } from "@electify/db";
import { eq, and } from "drizzle-orm";

@Injectable()
export class FacultyService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async getTutorSections(tutorId: string) {
    return this.db
      .select({
        sectionId: sections.id,
        sectionLabel: sections.label,
        academicBatchId: sections.academicBatchId,
      })
      .from(tutorSections)
      .innerJoin(sections, eq(tutorSections.sectionId, sections.id))
      .where(eq(tutorSections.tutorId, tutorId));
  }

  async getSectionStudents(sectionId: string) {
    return this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        registerNumber: users.registerNumber,
        role: users.role,
        sectionId: users.sectionId,
        isEligible: users.isEligible,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.sectionId, sectionId), eq(users.role, "STUDENT")));
  }

  async getAllSections() {
    return this.db.select().from(sections);
  }
}
